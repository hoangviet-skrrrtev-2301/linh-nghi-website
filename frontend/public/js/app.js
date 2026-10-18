// ==========================================================
// JavaScript giao diện khách (Alpine.js components & stores)
// Alpine được nạp sau file này nên mọi component đăng ký trong sự kiện "alpine:init".
// ==========================================================

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

// Ảnh thông tin đơn hàng cho khách tải về (vẽ tại trình duyệt, xem order-image.js).
// order = { code, items: [{name, size, qty, price}], total, customer }, gọi sau khi gửi đơn thành công.
async function buildReceipt(order) {
  const oi = CONFIG.orderImage;
  if (!oi?.enabled || !order.code) return null;
  try {
    // Chỉ tải file vẽ ảnh khi khách vừa đặt xong, các trang khác không tốn thêm dung lượng
    const { makeOrderImage } = await import('/assets/js/order-image.js');
    const blob = await makeOrderImage({
      ...order,
      shopName: CONFIG.shopName, logoUrl: CONFIG.logo, showPrices: CONFIG.showPrices,
      title: oi.title, note: oi.note,
      trackText: (oi.track || '').replace('{link}', `${location.origin}/tra-cuu-don`),
      dateText: new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full', timeStyle: 'short' }).format(new Date()),
      phone: CONFIG.phone, site: location.host,
    });
    if (!blob) return null;
    const filename = `don-hang-${order.code}.png`;
    const file = new File([blob], filename, { type: 'image/png' });
    return { url: URL.createObjectURL(blob), filename, file, canShare: !!navigator.canShare?.({ files: [file] }) };
  } catch { return null; }
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
    add(p, size = '', qty = 1, note = '') {
      if (p.sizes?.length && !size) {
        Alpine.store('toast').show(`Vui lòng chọn ${(p.size_cfg?.label || 'ni tay').toLowerCase()} trước khi thêm vào giỏ`);
        return false;
      }
      note = String(note || '').trim();
      const max = p.max_qty || 20;
      const key = `${p.id}-${size || ''}-${note}`;
      const found = this.items.find((i) => i.key === key);
      if (found) found.qty = Math.min(max, found.qty + qty);
      else this.items.push({ key, id: p.id, name: p.name, slug: p.slug, final_price: p.final_price, cover: p.cover, sizes: p.sizes || [], size_cfg: p.size_cfg || null, max_qty: max, size: size ? String(size) : '', note, qty: Math.min(max, qty) });
      this.save();
      Alpine.store('toast').show(`Đã thêm “${p.name}” vào giỏ`, { url: '/gio-hang', label: 'Xem giỏ' });
      return true;
    },
    remove(key) { this.items = this.items.filter((i) => i.key !== key); this.save(); },
    setQty(key, qty) {
      const it = this.items.find((i) => i.key === key);
      if (!it) return;
      if (qty < 1) return this.remove(key);
      it.qty = Math.min(it.max_qty || 20, qty);
      this.save();
    },
    setSize(key, size) {
      const it = this.items.find((i) => i.key === key);
      if (!it) return;
      it.size = String(size || '');
      it.key = `${it.id}-${it.size}-${it.note || ''}`;
      this.save();
    },
    setNote(key, note) {
      const it = this.items.find((i) => i.key === key);
      if (!it) return;
      it.note = String(note || '').trim().slice(0, 200);
      it.key = `${it.id}-${it.size}-${it.note}`;
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
          Object.assign(it, { url: p.url, name: p.name, final_price: p.final_price, cover: p.cover, sizes: p.sizes, size_cfg: p.size_cfg, max_qty: p.max_qty, stock_note: p.stock_note, unavailable: false });
          if (it.qty > (p.max_qty || 20)) it.qty = p.max_qty || 20;
        });
        this.save();
      } catch { /* bỏ qua lỗi mạng */ }
    },
  });

  // ---------------- Popup xem nhanh sản phẩm ----------------
  Alpine.store('quick', {
    open: false, loading: false, p: null, img: 0, size: '', note: '', cache: {},
    async show(slug) {
      this.open = true;
      this.img = 0;
      this.size = '';
      this.note = '';
      if (this.cache[slug]) { this.p = this.cache[slug]; return; }
      this.loading = true;
      try {
        this.p = this.cache[slug] = await api(`/api/products/${encodeURIComponent(slug)}`);
        if (!this.p.images.length && this.p.cover) this.p.images = [this.p.cover];
      } catch {
        this.open = false;
        window.location.href = `/san-pham/${slug}`; // địa chỉ cũ, máy chủ tự chuyển 301 sang địa chỉ phân cấp
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

  // Gợi ý sản phẩm khi gõ vào ô tìm kiếm: chờ khách dừng gõ 220ms rồi mới hỏi máy chủ, bỏ kết quả cũ về muộn
  Alpine.data('searchSuggest', () => ({
    q: '', items: [], groups: [], open: false, active: -1, seq: 0, timer: null, empty: false,
    vnd,
    get links() { return [...this.groups.map((g) => g.url), ...this.items.map((i) => i.url)]; },
    onInput() {
      clearTimeout(this.timer);
      this.active = -1;
      if (!CONFIG.searchSuggest || this.q.trim().length < 2) { this.items = []; this.groups = []; this.open = false; this.empty = false; return; }
      this.timer = setTimeout(() => this.load(), 220);
    },
    async load() {
      const mine = ++this.seq;
      try {
        const r = await api(`/api/search-suggest?q=${encodeURIComponent(this.q.trim())}`);
        if (mine !== this.seq) return;
        this.items = r.items; this.groups = r.groups;
        this.empty = !r.items.length && !r.groups.length;
        this.open = true;
      } catch { this.open = false; }
    },
    move(d) {
      const n = this.links.length;
      if (!this.open || !n) return;
      this.active = (this.active + 1 + d + n + 1) % (n + 1) - 1;   // -1 = đang ở ô gõ
    },
    enter(e) {
      if (this.open && this.active >= 0 && this.links[this.active]) { e.preventDefault(); window.location.href = this.links[this.active]; }
    },
    close() { this.open = false; this.active = -1; },
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
    open: false, mode: 'consult', p: null, size: '', qty: 1, note: '',
    show(p, mode = 'consult', size = '', qty = 1, note = '') {
      Object.assign(this, { open: true, mode: mode === 'order' && CONFIG.checkout ? 'order' : 'consult', p, size: size ? String(size) : '', qty, note: String(note || '') });
      window.dispatchEvent(new CustomEvent('consult-open'));
    },
  });

  Alpine.data('quickInquiry', () => ({
    loading: false, success: false, message: '', code: '', errors: {}, receipt: null,
    async share() { try { await navigator.share({ files: [this.receipt.file], title: CONFIG.shopName }); } catch { /* khách bấm hủy */ } },
    init() {
      // Mỗi lần mở popup thì xóa trạng thái lần gửi trước
      window.addEventListener('consult-open', () => { this.success = false; this.message = ''; this.errors = {}; this.receipt = null; });
    },
    async submit(form) {
      const st = Alpine.store('consult');
      const body = Object.fromEntries(new FormData(form).entries());
      const type = st.mode === 'order' ? 'order' : 'contact';
      if (type === 'order') {
        if (st.p.sizes?.length && !st.size) { this.message = `Vui lòng chọn ${(st.p.size_cfg?.label || 'ni tay').toLowerCase()} trước khi đặt`; return; }
        body.items = [{ id: st.p.id, qty: st.qty, size: st.size, note: st.note }];
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
        if (type === 'order') {
          this.receipt = await buildReceipt({
            code: this.code, customer: body, total: st.p.final_price != null ? st.p.final_price * st.qty : null,
            items: [{ name: st.p.name, size: st.size, size_label: st.p.size_cfg?.label, note: st.note, qty: st.qty, price: st.p.final_price }],
          });
        }
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
    note: '',
    qty: 1,
    maxQty: p.max_qty || 20,
    // "Ni khác": khách tự nhập ni riêng
    get chosenSize() { return this.size === 'other' ? this.customSize : this.size; },
    check() {
      if (p.sizes?.length && !this.chosenSize) {
        const label = (p.size_cfg?.label || 'ni tay').toLowerCase();
        Alpine.store('toast').show(this.size === 'other' ? `Vui lòng nhập ${label} của bạn` : `Vui lòng chọn ${label}`);
        return false;
      }
      return true;
    },
    addToCart() { if (this.check()) Alpine.store('cart').add(p, this.chosenSize, this.qty, this.note); },
    quickOrder() { if (this.check()) Alpine.store('consult').show(p, 'order', this.chosenSize, this.qty, this.note); },
    consult() { Alpine.store('consult').show(p, 'consult', this.chosenSize, 1, this.note); },
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
    // Các bước do server trả về theo từng loại (đơn hàng có thêm "Đang giao hàng", liên hệ ít bước hơn)
    get steps() { return this.result?.flow?.length ? this.result.flow.map((s) => (s.key === 'new' ? { ...s, label: 'Đã nhận' } : s)) : []; },
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
    loading: false, success: false, message: '', code: '', errors: {}, receipt: null,
    async share() { try { await navigator.share({ files: [this.receipt.file], title: CONFIG.shopName }); } catch { /* khách bấm hủy */ } },
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
        if (missing) { this.message = `Vui lòng chọn ${(missing.size_cfg?.label || 'ni').toLowerCase()} cho “${missing.name}”`; return; }
        if (cart.items.some((i) => i.unavailable)) { this.message = CONFIG.cartUnavailable || ''; return; }
        body.items = cart.items.map((i) => ({ id: i.id, qty: i.qty, size: i.size, note: i.note || '' }));
      }
      this.loading = true;
      try {
        const res = await api(`/api/inquiries/${type}`, { method: 'POST', body: JSON.stringify(body) });
        this.success = true;
        this.message = res.message;
        this.code = res.code || '';
        if (type === 'order') {
          const cart = Alpine.store('cart');
          // Chụp thông tin giỏ trước khi xóa để vẽ ảnh đơn hàng
          this.receipt = await buildReceipt({
            code: this.code, customer: body, total: cart.total,
            items: cart.items.map((i) => ({ name: i.name, size: i.size, size_label: i.size_cfg?.label, note: i.note, qty: i.qty, price: i.final_price })),
          });
          cart.clear();
        }
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
// Swiper (khoảng 45KB) chỉ tải khi trang thật sự có slider cần chạy: banner trang chủ từ 2 slide, hoặc sản phẩm từ 2 ảnh
let swiperLoading;
function loadSwiper() {
  if (window.Swiper) return Promise.resolve();
  swiperLoading ||= new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = '/vendor/swiper/swiper-bundle.min.js';
    el.onload = resolve;
    el.onerror = reject;
    document.head.append(el);
  });
  return swiperLoading;
}

async function initSwipers() {
  const hero = document.querySelector('.hero-swiper');
  const main = document.querySelector('.product-main');
  const needHero = hero && Number(hero.dataset.count) > 1;
  const needMain = main && main.querySelectorAll('.swiper-slide').length > 1;
  if (!needHero && !needMain) return;
  try { await loadSwiper(); } catch { return; }
  if (needHero) {
    // Cấu hình lấy từ cài đặt (data-* do máy chủ in ra): tự chuyển + thời gian, hiệu ứng, kéo / vuốt, mũi tên, tạm dừng khi rê chuột
    const d = hero.dataset;
    const count = Number(d.count);
    const delay = Number(d.autoplay) || 0;
    const drag = d.drag !== '0';
    const fade = d.effect !== 'slide';
    const section = hero.closest('section') || document;
    if (drag) hero.classList.add('is-draggable');
    new window.Swiper(hero, {
      loop: count > 2, rewind: count <= 2, speed: 900,
      ...(fade ? { effect: 'fade', fadeEffect: { crossFade: true } } : {}),
      autoplay: delay ? { delay, disableOnInteraction: false, pauseOnMouseEnter: d.pauseHover !== '0' } : false,
      allowTouchMove: drag, simulateTouch: drag, grabCursor: drag,
      navigation: d.arrows === '1' ? { prevEl: section.querySelector('.hero-prev'), nextEl: section.querySelector('.hero-next') } : false,
      pagination: { el: '.swiper-pagination', clickable: true },
      a11y: { enabled: true },
    });
  }
  if (needMain) {
    const thumbsEl = document.querySelector('.product-thumbs');
    const thumbs = thumbsEl ? new window.Swiper(thumbsEl, { slidesPerView: 'auto', spaceBetween: 10, watchSlidesProgress: true }) : null;
    new window.Swiper(main, { spaceBetween: 0, thumbs: thumbs ? { swiper: thumbs } : undefined });
  }
}

// PhotoSwipe chỉ tải khi trang có ảnh phóng to (trang chi tiết sản phẩm, gallery)
async function initLightbox() {
  const targets = document.querySelectorAll('[data-pswp]');
  if (!targets.length) return;
  const { default: PhotoSwipeLightbox } = await import('/vendor/photoswipe/photoswipe-lightbox.esm.min.js');
  targets.forEach((el) => {
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

// Gallery trang chủ lướt phải → trái: nhân đôi dãy ảnh để chạy vòng liên tục.
// Bản sao bỏ thuộc tính Alpine / PhotoSwipe, khi bấm thì chuyển về ảnh gốc tương ứng.
function initMarquee() {
  document.querySelectorAll('[data-marquee]').forEach((box) => {
    const track = box.querySelector('.gallery-marquee-track');
    const group = track.querySelector('.gallery-group');
    const originals = [...group.children];
    if (originals.length < 2) return;
    const copy = group.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    [...copy.children].forEach((clone, i) => {
      [...clone.attributes].forEach((a) => {
        if (a.name.startsWith('@') || a.name.startsWith('x-') || a.name.startsWith('data-pswp')) clone.removeAttribute(a.name);
      });
      clone.tabIndex = -1;
      clone.dataset.cloneOf = i;
    });
    track.appendChild(copy);
    track.addEventListener('click', (e) => {
      const clone = e.target.closest('[data-clone-of]');
      if (!clone) return;
      e.preventDefault();
      originals[Number(clone.dataset.cloneOf)]?.click();
    });
    box.classList.add('is-running');
  });
}

// Mục lục bài viết: đánh dấu mục đang đọc
function initToc() {
  const links = [...document.querySelectorAll('[data-toc-link]')];
  if (!links.length || !('IntersectionObserver' in window)) return;
  const byId = new Map();
  links.forEach((a) => { const id = a.getAttribute('href').slice(1); (byId.get(id) || byId.set(id, []).get(id)).push(a); });
  const heads = [...byId.keys()].map((id) => document.getElementById(id)).filter(Boolean);
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.remove('is-active'));
      byId.get(e.target.id)?.forEach((a) => a.classList.add('is-active'));
    });
  }, { rootMargin: '-100px 0px -70% 0px' });
  heads.forEach((h) => io.observe(h));
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
  initMarquee();
  initToc();
  // Slider chạy khi trình duyệt rảnh, không chen vào lúc hiển thị nội dung đầu trang
  (window.requestIdleCallback || ((fn) => setTimeout(fn, 200)))(initSwipers);
});
