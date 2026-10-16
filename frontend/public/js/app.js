// ==========================================================
// JavaScript giao diện khách (Alpine.js components & stores)
// Alpine được nạp sau file này nên mọi component đăng ký trong sự kiện "alpine:init".
// ==========================================================
import PhotoSwipeLightbox from '/vendor/photoswipe/photoswipe-lightbox.esm.min.js';

const CONFIG = JSON.parse(document.getElementById('app-config')?.textContent || '{}');
const CART_KEY = 'ln_cart_v1';
const vnd = (n) => (n == null ? '' : new Intl.NumberFormat('vi-VN').format(n) + '₫');

const storage = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* chế độ riêng tư */ }
  },
};

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'same-origin',
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || 'Có lỗi xảy ra, vui lòng thử lại'), { data, status: res.status });
  return data;
}

document.addEventListener('alpine:init', () => {
  const Alpine = window.Alpine;

  Alpine.store('app', CONFIG);

  // ---------------- Thông báo nhỏ ----------------
  // Chế độ sáng/tối: thuộc tính data-theme đặt sớm bởi script trong <head> (layouts/base.njk)
  Alpine.store('theme', {
    dark: document.documentElement.getAttribute('data-theme') === 'dark',
    toggle() {
      this.dark = !this.dark;
      document.documentElement.toggleAttribute('data-theme', false);
      if (this.dark) document.documentElement.setAttribute('data-theme', 'dark');
      try { localStorage.setItem('ln_theme', this.dark ? 'dark' : 'light'); } catch { /* chế độ riêng tư */ }
    },
  });

  Alpine.store('toast', {
    items: [],
    show(message, link = null, ms = 3500) {
      const id = Math.random();
      this.items.push({ id, message, link });
      setTimeout(() => { this.items = this.items.filter((t) => t.id !== id); }, ms);
    },
  });

  // ---------------- Giỏ hàng (lưu trên trình duyệt) ----------------
  Alpine.store('cart', {
    items: storage.get(CART_KEY, []),
    vnd,
    get count() { return this.items.reduce((s, i) => s + i.qty, 0); },
    get total() {
      if (this.items.some((i) => i.final_price == null)) return null;
      return this.items.reduce((s, i) => s + i.final_price * i.qty, 0);
    },
    save() { storage.set(CART_KEY, this.items); },
    add(p, size = '', qty = 1) {
      if (p.sizes?.length && !size) {
        Alpine.store('toast').show('Vui lòng chọn ni tay trước khi thêm vào giỏ');
        return false;
      }
      const key = `${p.id}-${size || ''}`;
      const found = this.items.find((i) => i.key === key);
      if (found) found.qty = Math.min(20, found.qty + qty);
      else this.items.push({ key, id: p.id, name: p.name, slug: p.slug, final_price: p.final_price, cover: p.cover, sizes: p.sizes || [], size: size ? String(size) : '', qty });
      this.save();
      Alpine.store('toast').show(`Đã thêm “${p.name}” vào giỏ`, { url: '/gio-hang', label: 'Xem giỏ' });
      return true;
    },
    remove(key) { this.items = this.items.filter((i) => i.key !== key); this.save(); },
    setQty(key, qty) {
      const it = this.items.find((i) => i.key === key);
      if (!it) return;
      if (qty < 1) return this.remove(key);
      it.qty = Math.min(20, qty);
      this.save();
    },
    setSize(key, size) {
      const it = this.items.find((i) => i.key === key);
      if (!it) return;
      it.size = String(size || '');
      it.key = `${it.id}-${it.size}`;
      this.save();
    },
    clear() { this.items = []; this.save(); },
    // Cập nhật giá / tình trạng mới nhất từ server
    async refresh() {
      if (!this.items.length) return;
      try {
        const { items } = await api(`/api/cart?ids=${[...new Set(this.items.map((i) => i.id))].join(',')}`);
        const map = Object.fromEntries(items.map((p) => [p.id, p]));
        this.items.forEach((it) => {
          const p = map[it.id];
          if (!p || p.stock_status === 'sold_out') { it.unavailable = true; return; }
          Object.assign(it, { name: p.name, final_price: p.final_price, cover: p.cover, sizes: p.sizes, unavailable: false });
        });
        this.save();
      } catch { /* bỏ qua lỗi mạng */ }
    },
  });

  // ---------------- Popup xem nhanh sản phẩm ----------------
  Alpine.store('quick', {
    open: false, loading: false, p: null, img: 0, size: '', cache: {},
    async show(slug) {
      this.open = true;
      this.img = 0;
      this.size = '';
      if (this.cache[slug]) { this.p = this.cache[slug]; return; }
      this.loading = true;
      try {
        this.p = this.cache[slug] = await api(`/api/products/${encodeURIComponent(slug)}`);
        if (!this.p.images.length && this.p.cover) this.p.images = [this.p.cover];
      } catch {
        this.open = false;
        window.location.href = `/san-pham/${slug}`;
      } finally {
        this.loading = false;
      }
    },
    close() { this.open = false; },
  });

  // ---------------- Popup nội dung ----------------
  Alpine.store('info', {
    open: false, title: '', html: '',
    // Nội dung lấy từ thẻ <template> (đã được làm sạch phía server)
    fromTemplate(title, id) {
      this.title = title;
      this.html = document.getElementById(id)?.innerHTML || '';
      this.open = true;
    },
  });

  // ---------------- Components ----------------
  Alpine.data('siteHeader', () => ({
    scrolled: window.scrollY > 10, menuOpen: false, searchOpen: false,
    onScroll() { this.scrolled = window.scrollY > 10; },
  }));

  Alpine.data('welcomePopup', () => ({
    open: false,
    init() {
      if (!CONFIG.welcome || storage.get('ln_welcome_seen', false)) return;
      setTimeout(() => { this.open = true; }, (CONFIG.welcomeDelay || 5) * 1000);
    },
    close() { this.open = false; storage.set('ln_welcome_seen', true); },
  }));

  // ---------------- Popup tư vấn / đặt nhanh 1 sản phẩm ----------------
  Alpine.store('consult', {
    open: false, mode: 'consult', p: null, size: '', qty: 1,
    show(p, mode = 'consult', size = '', qty = 1) {
      Object.assign(this, { open: true, mode: mode === 'order' && CONFIG.checkout ? 'order' : 'consult', p, size: size ? String(size) : '', qty });
      window.dispatchEvent(new CustomEvent('consult-open'));
    },
  });

  Alpine.data('quickInquiry', () => ({
    loading: false, success: false, message: '', code: '', errors: {},
    init() {
      // Mỗi lần mở popup thì xóa trạng thái lần gửi trước
      window.addEventListener('consult-open', () => { this.success = false; this.message = ''; this.errors = {}; });
    },
    async submit(form) {
      const st = Alpine.store('consult');
      const body = Object.fromEntries(new FormData(form).entries());
      const type = st.mode === 'order' ? 'order' : 'contact';
      if (type === 'order') {
        if (st.p.sizes?.length && !st.size) { this.message = 'Vui lòng chọn ni tay trước khi đặt'; return; }
        body.items = [{ id: st.p.id, qty: st.qty, size: st.size }];
      } else {
        body.product = [st.p?.name, st.p?.sku && `(mã ${st.p.sku})`].filter(Boolean).join(' ');
        if (!body.message) body.message = `Tôi cần tư vấn về sản phẩm ${st.p?.name || ''}`;
      }
      this.loading = true;
      this.errors = {};
      this.message = '';
      try {
        const res = await api(`/api/inquiries/${type}`, { method: 'POST', body: JSON.stringify(body) });
        this.success = true;
        this.message = res.message;
        this.code = res.code || '';
        form.reset();
        window.gtag?.('event', 'generate_lead', { form_type: type });
        window.fbq?.('track', 'Lead');
      } catch (err) {
        this.errors = err.data?.errors || {};
        this.message = err.message;
      } finally {
        this.loading = false;
      }
    },
  }));

  Alpine.data('productBuy', (p) => ({
    size: p.sizes?.length === 1 ? p.sizes[0] : '',
    customSize: '',
    qty: 1,
    // "Ni khác": khách tự nhập ni riêng
    get chosenSize() { return this.size === 'other' ? this.customSize : this.size; },
    check() {
      if (p.sizes?.length && !this.chosenSize) {
        Alpine.store('toast').show(this.size === 'other' ? 'Vui lòng nhập ni tay của bạn' : 'Vui lòng chọn ni tay');
        return false;
      }
      return true;
    },
    addToCart() { if (this.check()) Alpine.store('cart').add(p, this.chosenSize, this.qty); },
    quickOrder() { if (this.check()) Alpine.store('consult').show(p, 'order', this.chosenSize, this.qty); },
    consult() { Alpine.store('consult').show(p, 'consult', this.chosenSize); },
  }));

  Alpine.data('productFilters', () => ({
    drawer: false,
    submit() {
      // Trên di động chờ bấm nút "Xem kết quả", trên máy tính lọc ngay
      if (window.matchMedia('(min-width: 1024px)').matches) this.$refs.form.requestSubmit();
    },
    price(min, max) {
      const f = this.$refs.form;
      f.gia_tu.value = min || '';
      f.gia_den.value = max || '';
      f.requestSubmit();
    },
    init() {
      // Không gửi các ô trống lên URL cho gọn
      this.$refs.form.addEventListener('formdata', (e) => {
        for (const [k, v] of [...e.formData.entries()]) if (v === '') e.formData.delete(k);
      });
    },
  }));

  Alpine.data('sizeCalc', (table) => ({
    hand: '',
    get result() {
      const h = Number(this.hand);
      if (!h) return null;
      for (const [i, row] of table.entries()) {
        const [lo, hi] = String(row.hand).split(/[–-]/).map((x) => Number.parseFloat(x.replace(',', '.')));
        if (h >= lo && h <= (hi || lo)) return { i, size: row.size, note: row.note };
      }
      return null;
    },
  }));

  // Tra cứu tình trạng đơn bằng mã + số điện thoại
  Alpine.data('trackForm', (preset = '') => ({
    code: preset, phone: '', loading: false, error: '', result: null, statusNote: '',
    steps: [{ key: 'new', label: 'Đã nhận' }, { key: 'contacted', label: 'Đã liên hệ' }, { key: 'confirmed', label: 'Đã xác nhận' }, { key: 'completed', label: 'Hoàn thành' }],
    get stepIndex() { return this.steps.findIndex((s) => s.key === this.result?.status); },
    vnd: (n) => new Intl.NumberFormat('vi-VN').format(n) + 'đ',
    fmtDate(v) {
      const d = new Date(String(v).replace(' ', 'T') + 'Z');
      return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' });
    },
    async submit(form) {
      this.error = '';
      this.result = null;
      this.loading = true;
      try {
        const body = { code: this.code, phone: this.phone, _ft: form.querySelector('[name="_ft"]').value, website: form.querySelector('[name="website"]').value };
        const res = await api('/api/track', { method: 'POST', body: JSON.stringify(body) });
        this.result = res.inquiry;
        this.statusNote = res.status_note;
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
  }));

  // Form gửi đơn hàng / custom / liên hệ
  Alpine.data('inquiryForm', (type) => ({
    loading: false, success: false, message: '', code: '', errors: {},
    init() {
      if (type === 'order') Alpine.store('cart').refresh();
    },
    async submit(form) {
      this.errors = {};
      this.message = '';
      const body = Object.fromEntries(new FormData(form).entries());
      if (type === 'order') {
        const cart = Alpine.store('cart');
        const missing = cart.items.find((i) => i.sizes?.length && !i.size);
        if (missing) { this.message = `Vui lòng chọn ni cho “${missing.name}”`; return; }
        if (cart.items.some((i) => i.unavailable)) { this.message = 'Vui lòng xóa sản phẩm không còn bán khỏi giỏ'; return; }
        body.items = cart.items.map((i) => ({ id: i.id, qty: i.qty, size: i.size }));
      }
      this.loading = true;
      try {
        const res = await api(`/api/inquiries/${type}`, { method: 'POST', body: JSON.stringify(body) });
        this.success = true;
        this.message = res.message;
        this.code = res.code || '';
        if (type === 'order') Alpine.store('cart').clear();
        form.reset();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.gtag?.('event', 'generate_lead', { form_type: type });
        window.fbq?.('track', 'Lead');
      } catch (err) {
        this.errors = err.data?.errors || {};
        this.message = err.message;
        const first = Object.keys(this.errors)[0];
        if (first) form.querySelector(`[name="${first}"]`)?.focus();
      } finally {
        this.loading = false;
      }
    },
  }));
});

// ---------------- Slider, phóng to ảnh, hiệu ứng ----------------
function initSwipers() {
  if (!window.Swiper) return;
  const hero = document.querySelector('.hero-swiper');
  if (hero && Number(hero.dataset.count) > 1) {
    new window.Swiper(hero, {
      loop: true, speed: 900, effect: 'fade', fadeEffect: { crossFade: true },
      autoplay: { delay: 5500, disableOnInteraction: false },
      pagination: { el: '.swiper-pagination', clickable: true },
    });
  }
  const main = document.querySelector('.product-main');
  if (main) {
    const thumbsEl = document.querySelector('.product-thumbs');
    const thumbs = thumbsEl ? new window.Swiper(thumbsEl, { slidesPerView: 'auto', spaceBetween: 10, watchSlidesProgress: true }) : null;
    new window.Swiper(main, { spaceBetween: 0, thumbs: thumbs ? { swiper: thumbs } : undefined });
  }
}

function initLightbox() {
  document.querySelectorAll('[data-pswp]').forEach((el) => {
    const lightbox = new PhotoSwipeLightbox({
      gallery: el,
      children: 'a[data-pswp-width]',
      pswpModule: () => import('/vendor/photoswipe/photoswipe.esm.min.js'),
      bgOpacity: 0.92,
      showHideAnimationType: 'zoom',
    });
    lightbox.init();
  });
}

function initReveal() {
  const items = document.querySelectorAll('.reveal');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!CONFIG.animations || reduce || !('IntersectionObserver' in window)) {
    document.documentElement.classList.add('no-anim');
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      // Các phần tử cùng hàng xuất hiện lần lượt
      const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
      el.style.setProperty('--reveal-delay', `${Math.min(siblings.indexOf(el), 6) * 70}ms`);
      el.classList.add('is-in');
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  items.forEach((el) => io.observe(el));
  // Phòng hờ: nếu vì lý do nào đó phần tử chưa hiện sau 4 giây thì hiện luôn
  setTimeout(() => items.forEach((el) => el.getBoundingClientRect().top < window.innerHeight && el.classList.add('is-in')), 4000);
}

function ready(fn) {
  if (document.readyState !== 'loading') fn();
  else document.addEventListener('DOMContentLoaded', fn);
}

ready(() => {
  initReveal();
  initLightbox();
  // Swiper nạp bằng thẻ defer, chạy sau khi tải xong
  if (window.Swiper) initSwipers();
  else window.addEventListener('load', initSwipers, { once: true });
});
