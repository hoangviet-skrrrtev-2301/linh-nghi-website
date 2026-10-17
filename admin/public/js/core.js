// ==========================================================
// JS lõi trang quản trị: gọi API, thông báo, xác nhận, chọn ảnh, soạn thảo.
// Các component trang cụ thể nằm trong pages.js
// ==========================================================
(function () {
  const A = document.querySelector('meta[name="admin-path"]').content;
  const CSRF = document.querySelector('meta[name="csrf-token"]').content;
  const META = JSON.parse(document.getElementById('admin-meta')?.textContent || '{}');
  const ME = JSON.parse(document.getElementById('admin-user')?.textContent || 'null');

  async function api(path, { method = 'GET', body, form, raw } = {}) {
    const headers = { 'X-CSRF-Token': CSRF, Accept: 'application/json' };
    let payload;
    if (form) payload = form;
    else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const res = await fetch(`${A}/api${path}`, { method, headers, body: payload, credentials: 'same-origin' });
    if (res.status === 401) {
      window.location.href = `${A}/login?next=${encodeURIComponent(location.pathname + location.search)}`;
      throw new Error('Phiên đăng nhập đã hết hạn');
    }
    if (raw) return res;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || `Lỗi ${res.status}`);
      err.data = data;
      throw err;
    }
    return data;
  }

  const fmt = {
    vnd: (n) => (n == null || n === '' ? '—' : new Intl.NumberFormat('vi-VN').format(n) + '₫'),
    date(v, time = true) {
      if (!v) return '';
      const d = new Date(String(v).includes('T') ? v : String(v).replace(' ', 'T') + 'Z');
      return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', ...(time ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(d);
    },
    bytes: (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB'),
  };

  const STATUS_COLOR = {
    new: 'bg-blue-50 text-blue-700', contacted: 'bg-amber-50 text-amber-700', confirmed: 'bg-violet-50 text-violet-700', shipping: 'bg-sky-50 text-sky-700',
    completed: 'bg-emerald-50 text-emerald-700', cancelled: 'bg-slate-100 text-slate-500',
  };

  // Chuyển tiếng Việt thành đường dẫn (giống server)
  const slugify = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  // ---- Lịch sử các trang admin vừa đi qua (trong tab này) để nút Quay lại về ĐÚNG trang vừa xem ----
  // Không dựa vào document.referrer (có thể bị trống do trình duyệt / tiện ích): tự ghi lại trong sessionStorage.
  const TRAIL = 'ln_admin_trail';
  const here = () => location.pathname + location.search;
  const readTrail = () => { try { const t = JSON.parse(sessionStorage.getItem(TRAIL) || '[]'); return Array.isArray(t) ? t : []; } catch (e) { return []; } };
  const writeTrail = (t) => { try { sessionStorage.setItem(TRAIL, JSON.stringify(t.slice(-60))); } catch (e) { /* chế độ riêng tư */ } };
  function syncTrail() {
    const t = readTrail();
    const cur = here();
    const type = performance.getEntriesByType?.('navigation')[0]?.type;
    if (type === 'back_forward') {
      // Đi lùi / tiến: cắt lịch sử về trang hiện tại nếu đã có, chưa có thì coi là trang mới
      const i = t.lastIndexOf(cur);
      if (i >= 0) t.length = i + 1; else t.push(cur);
    } else if (type === 'reload') {
      if (t[t.length - 1] !== cur) t.push(cur);
    } else if (t[t.length - 1] !== cur) t.push(cur);
    writeTrail(t);
  }
  // Trang đổi địa chỉ tại chỗ (danh sách ghi bộ lọc vào URL): cập nhật mục cuối cho khớp
  function trailReplace() { const t = readTrail(); if (t.length) t[t.length - 1] = here(); else t.push(here()); writeTrail(t); }
  syncTrail();
  // Trang được khôi phục từ bộ nhớ đệm khi bấm Back của trình duyệt (script không chạy lại)
  window.addEventListener('pageshow', (e) => { if (e.persisted) syncTrail(); });

  // Quay lại đúng trang vừa xem; chưa có trang trước (mở thẳng bằng đường dẫn) thì về danh sách của mục (`fallback`)
  function goBack(fallback) {
    if (readTrail().length > 1 && history.length > 1) history.back();
    else location.href = fallback || A;
  }

  window.Admin = { A, api, fmt, META, ME, STATUS_COLOR, slugify, goBack, trailReplace };

  document.addEventListener('alpine:init', () => {
    const Alpine = window.Alpine;

    Alpine.magic('fmt', () => fmt);
    Alpine.magic('meta', () => META);

    // ---------------- Chế độ sáng / tối (data-theme đặt sớm trong <head> của layout.njk) ----------------
    Alpine.store('theme', {
      dark: document.documentElement.getAttribute('data-theme') === 'dark',
      toggle() {
        this.dark = !this.dark;
        document.documentElement.removeAttribute('data-theme');
        if (this.dark) document.documentElement.setAttribute('data-theme', 'dark');
        try { localStorage.setItem('ln_admin_theme', this.dark ? 'dark' : 'light'); } catch (e) { /* chế độ riêng tư */ }
      },
    });

    // ---------------- Thông báo ----------------
    Alpine.store('toast', {
      items: [],
      show(message, type = 'success') {
        const id = Math.random();
        this.items.push({ id, message, type });
        setTimeout(() => { this.items = this.items.filter((t) => t.id !== id); }, type === 'error' ? 6000 : 3000);
      },
      error(err) { this.show(err?.message || String(err), 'error'); },
    });

    // ---------------- Hộp xác nhận ----------------
    Alpine.store('confirm', {
      open: false, title: '', message: '', danger: true, okLabel: 'Xóa', resolve: null,
      ask({ title = 'Bạn chắc chắn?', message = '', okLabel = 'Xóa', danger = true } = {}) {
        Object.assign(this, { open: true, title, message, okLabel, danger });
        return new Promise((r) => { this.resolve = r; });
      },
      answer(v) { this.open = false; this.resolve?.(v); },
    });

    // ---------------- Chọn ảnh từ thư viện / upload ----------------
    Alpine.store('picker', {
      open: false, multiple: false, items: [], selected: [], q: '', folder: '', folders: [], page: 1, total: 0, loading: false, uploading: 0, cb: null,
      show({ multiple = false, onSelect }) {
        Object.assign(this, { open: true, multiple, selected: [], cb: onSelect, q: '', page: 1 });
        this.loadFolders();
        this.load();
      },
      async loadFolders() {
        try { this.folders = (await api('/media/folders')).items; } catch (e) { /* không chặn việc chọn ảnh */ }
      },
      async load() {
        this.loading = true;
        try {
          const r = await api(`/media?page=${this.page}&q=${encodeURIComponent(this.q)}&folder=${encodeURIComponent(this.folder)}`);
          this.items = r.items;
          this.total = r.total;
        } catch (e) { Alpine.store('toast').error(e); }
        this.loading = false;
      },
      toggle(m) {
        if (!this.multiple) { this.selected = [m]; return; }
        const i = this.selected.findIndex((s) => s.id === m.id);
        if (i >= 0) this.selected.splice(i, 1); else this.selected.push(m);
      },
      isSelected(m) { return this.selected.some((s) => s.id === m.id); },
      async upload(files) {
        const list = [...files].filter((f) => f.type.startsWith('image/'));
        if (!list.length) return;
        this.uploading = list.length;
        try {
          // Upload từng nhóm 5 ảnh để tránh quá tải
          for (let i = 0; i < list.length; i += 5) {
            const fd = new FormData();
            fd.append('folder', this.folder || 'general'); // phải đứng trước file để server đọc được
            list.slice(i, i + 5).forEach((f) => fd.append('files', f));
            const r = await api('/media', { method: 'POST', form: fd });
            this.items = [...r.items, ...this.items];
            r.items.forEach((m) => { if (this.multiple || i === 0) this.toggle(m); });
          }
          Alpine.store('toast').show(`Đã tải lên ${list.length} ảnh`);
          this.loadFolders();
        } catch (e) { Alpine.store('toast').error(e); }
        this.uploading = 0;
      },
      confirm() {
        this.cb?.(this.multiple ? this.selected : this.selected[0]);
        this.open = false;
      },
    });

    // Ô chọn 1 ảnh. Dùng: <div x-data="mediaField(preview)" x-modelable="value" x-model="form.cover_media_id">
    Alpine.data('mediaField', (initial = null) => ({
      value: null,
      preview: initial,
      pick() {
        Alpine.store('picker').show({ onSelect: (m) => { if (m) { this.value = m.id; this.preview = m; } } });
      },
      clear() { this.value = null; this.preview = null; },
    }));

    // Danh sách nhiều ảnh, kéo thả để sắp xếp. value = mảng id
    Alpine.data('mediaList', (initial = []) => ({
      value: [],
      items: initial || [],
      // Gọi bởi x-sort khi kéo thả: đưa ảnh có id vào vị trí mới
      reorder(id, position) {
        const from = this.items.findIndex((m) => m.id === id);
        if (from < 0) return;
        this.items.splice(position, 0, this.items.splice(from, 1)[0]);
        this.sync();
      },
      sync() { this.value = this.items.map((m) => m.id); },
      add() {
        Alpine.store('picker').show({
          multiple: true,
          onSelect: (list) => {
            const ids = new Set(this.items.map((m) => m.id));
            this.items.push(...list.filter((m) => !ids.has(m.id)));
            this.sync();
          },
        });
      },
      remove(i) { this.items.splice(i, 1); this.sync(); },
    }));

    // Trình soạn thảo văn bản (Quill). Dùng: x-data="richText" x-modelable="value" x-model="form.content"
    // Có: tiêu đề, cỡ chữ, in đậm / nghiêng / gạch chân / gạch ngang / mã / chỉ số trên-dưới, màu chữ + màu nền, danh sách,
    // thụt lề, căn lề, trích dẫn, liên kết, ảnh (alt, đổi cỡ, căn lề), bảng (thêm / xóa hàng, cột), đường kẻ ngang,
    // hoàn tác / làm lại, đếm chữ, cảnh báo ảnh chưa có alt, toàn màn hình. Thanh công cụ dính ở đầu khi cuộn trang dài.
    const ICONS = {
      undo: '<svg viewBox="0 0 18 18"><path class="ql-stroke" fill="none" d="M4.5 7.5h6.5a3.5 3.5 0 010 7H7M4.5 7.5l3-3M4.5 7.5l3 3"/></svg>',
      redo: '<svg viewBox="0 0 18 18"><path class="ql-stroke" fill="none" d="M13.5 7.5H7a3.5 3.5 0 000 7h4M13.5 7.5l-3-3M13.5 7.5l-3 3"/></svg>',
      table: '<svg viewBox="0 0 18 18"><rect class="ql-stroke" fill="none" x="2.5" y="3.5" width="13" height="11" rx="1"/><path class="ql-stroke" fill="none" d="M2.5 7.5h13M2.5 11h13M7 3.5v11M11.5 3.5v11"/></svg>',
      divider: '<svg viewBox="0 0 18 18"><path class="ql-stroke" d="M3 9h12"/><path class="ql-stroke ql-thin" d="M5 5h8M5 13h8"/></svg>',
      fullscreen: '<svg viewBox="0 0 18 18"><path class="ql-stroke" fill="none" d="M2.5 6.5v-4h4M11.5 2.5h4v4M15.5 11.5v4h-4M6.5 15.5h-4v-4"/></svg>',
    };
    // Gợi ý (tooltip) tiếng Việt cho các nút trên thanh công cụ
    const TITLES = [
      ['.ql-undo', 'Hoàn tác (Ctrl+Z)'], ['.ql-redo', 'Làm lại (Ctrl+Y)'], ['.ql-bold', 'In đậm (Ctrl+B)'], ['.ql-italic', 'In nghiêng (Ctrl+I)'],
      ['.ql-underline', 'Gạch chân (Ctrl+U)'], ['.ql-strike', 'Gạch ngang'], ['.ql-code', 'Chữ đơn cách (mã)'],
      ['.ql-script[value="sub"]', 'Chỉ số dưới'], ['.ql-script[value="super"]', 'Chỉ số trên'],
      ['.ql-color', 'Màu chữ'], ['.ql-background', 'Màu nền chữ (tô sáng)'],
      ['.ql-list[value="ordered"]', 'Danh sách đánh số'], ['.ql-list[value="bullet"]', 'Danh sách chấm tròn'],
      ['.ql-indent[value="-1"]', 'Giảm thụt lề'], ['.ql-indent[value="+1"]', 'Tăng thụt lề'],
      ['.ql-blockquote', 'Trích dẫn'], ['.ql-link', 'Chèn liên kết (Ctrl+K)'], ['.ql-image', 'Chèn ảnh từ thư viện'],
      ['.ql-table', 'Chèn bảng'], ['.ql-divider', 'Đường kẻ ngang'], ['.ql-clean', 'Xóa định dạng'], ['.ql-fullscreen', 'Toàn màn hình (Esc để thoát)'],
      ['.ql-header', 'Kiểu tiêu đề'], ['.ql-size', 'Cỡ chữ'], ['.ql-align', 'Căn lề'],
    ];
    const WIDTHS = [['25%', '25%'], ['50%', '50%'], ['75%', '75%'], ['100%', '100%'], ['', 'Gốc']];
    let blotsReady = false;

    Alpine.data('richText', () => {
      // Quill và phần tử ảnh đang chọn giữ ngoài dữ liệu của Alpine: nếu để trong đối tượng phản ứng (Proxy) thì Quill bị lỗi
      let quill = null;
      let imgEl = null;
      const range0 = (q) => q.getSelection() || { index: Math.max(0, q.getLength() - 1), length: 0 };
      return {
        value: '',
        full: false,
        lastRange: null,
        inTable: false,
        tableForm: { open: false, rows: 3, cols: 3 },
        img: null, // { alt, width, align } của ảnh đang chọn
        widths: WIDTHS,
        stats: { words: 0, noAlt: 0 },
        init() {
          const Quill = window.Quill;
          if (!Quill) return;
          if (!blotsReady) {
            blotsReady = true;
            // Đường kẻ ngang <hr>
            const BlockEmbed = Quill.import('blots/block/embed');
            class Divider extends BlockEmbed {}
            Divider.blotName = 'divider';
            Divider.tagName = 'hr';
            Quill.register(Divider);
          }
          quill = new Quill(this.$refs.editor, {
            theme: 'snow',
            placeholder: 'Nhập nội dung...',
            modules: {
              table: true,
              history: { delay: 800, maxStack: 200, userOnly: true },
              toolbar: {
                container: [
                  ['undo', 'redo'],
                  [{ header: [2, 3, 4, false] }, { size: ['small', false, 'large'] }],
                  ['bold', 'italic', 'underline', 'strike', 'code'], [{ script: 'sub' }, { script: 'super' }],
                  [{ color: [] }, { background: [] }],
                  [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
                  [{ align: [] }],
                  ['blockquote', 'link', 'image', 'table', 'divider'],
                  ['clean', 'fullscreen'],
                ],
                handlers: {
                  undo: () => quill.history.undo(),
                  redo: () => quill.history.redo(),
                  // Chèn ảnh từ thư viện thay vì nhúng base64.
                  // Phải ghi nhớ vị trí con trỏ trước khi mở hộp chọn ảnh, vì lúc đó editor mất focus.
                  image: () => {
                    const range = quill.getSelection() || this.lastRange || { index: Math.max(0, quill.getLength() - 1) };
                    Alpine.store('picker').show({
                      multiple: true,
                      onSelect: (list) => {
                        let at = range.index;
                        for (const m of list || []) {
                          quill.insertEmbed(at, 'image', m.md || m.lg, 'user');
                          // Mô tả ảnh (alt) lấy sẵn từ thư viện ảnh nếu đã có, chưa có thì nhắc nhập
                          if (m.alt) quill.formatText(at, 1, 'alt', m.alt, 'user');
                          at += 1;
                        }
                        quill.setSelection(at, 0, 'silent');
                        this.refreshStats();
                      },
                    });
                  },
                  table: () => {
                    if (this.inTable) { Alpine.store('toast').show('Con trỏ đang ở trong bảng. Dùng thanh “Bảng” bên dưới để thêm / xóa hàng, cột.'); return; }
                    this.tableForm.open = !this.tableForm.open;
                  },
                  divider: () => {
                    const r = range0(quill);
                    quill.insertEmbed(r.index, 'divider', true, 'user');
                    quill.setSelection(r.index + 1, 0, 'silent');
                  },
                  fullscreen: () => { this.full = !this.full; },
                },
              },
            },
          });
          const tb = quill.getModule('toolbar').container;
          for (const [name, svg] of Object.entries(ICONS)) { const b = tb.querySelector('.ql-' + name); if (b) b.innerHTML = svg; }
          for (const [sel, title] of TITLES) tb.querySelectorAll(sel).forEach((el) => { el.title = title; });

          // Thanh công cụ + các thanh phụ (bảng, ảnh) nằm chung một khối dính ở đầu khi cuộn bài dài
          const sticky = document.createElement('div');
          sticky.className = 'rt-sticky';
          tb.before(sticky);
          sticky.append(tb, this.$refs.panels);

          quill.on('selection-change', (r) => {
            if (!r) return;
            this.lastRange = r;
            this.inTable = !!quill.getModule('table').getTable(r)[0];
            if (this.inTable) this.tableForm.open = false;
          });
          // Bấm vào ảnh để chỉnh: mô tả (alt), kích thước, căn lề. Bấm chỗ khác thì bỏ chọn ảnh.
          quill.root.addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG') this.selectImage(e.target); else this.clearImage();
          });
          // Chặn ảnh dán thẳng vào (dạng base64 sẽ không được lưu): bắt dùng nút Ảnh để chọn từ thư viện
          const Delta = Quill.import('delta');
          quill.clipboard.addMatcher('IMG', (node, delta) => {
            if (/^data:|^blob:/i.test(node.getAttribute('src') || '')) { Alpine.store('toast').show('Ảnh dán trực tiếp không được lưu. Hãy dùng nút Ảnh để chọn từ Thư viện ảnh.', 'error'); return new Delta(); }
            return delta;
          });

          const fsBtn = tb.querySelector('.ql-fullscreen');
          this.$watch('full', (v) => {
            document.body.classList.toggle('overflow-hidden', v);
            if (fsBtn) fsBtn.classList.toggle('ql-active', v);
            quill.focus();
          });
          window.addEventListener('keydown', (e) => {
            // Không thoát khi đang mở hộp chọn ảnh (Esc lúc đó chỉ đóng hộp ảnh)
            if (e.key === 'Escape' && this.full && !Alpine.store('picker').open) this.full = false;
          });
          const set = (html) => {
            if ((html || '') === this.current()) return;
            // setContents không đụng tới vùng chọn, an toàn khi editor đang ẩn trong tab
            quill.setContents(quill.clipboard.convert({ html: html || '' }), 'silent');
            this.clearImage();
            this.refreshStats();
          };
          set(this.value);
          this.$watch('value', set);
          quill.on('text-change', () => {
            this.value = this.current();
            this.refreshStats();
            if (imgEl && !quill.root.contains(imgEl)) this.clearImage();
          });
          this.refreshStats();
        },
        current() {
          const html = quill.root.innerHTML;
          return html === '<p><br></p>' ? '' : html;
        },
        // ---- Thống kê: số từ, số ảnh chưa có mô tả (alt) ----
        refreshStats() {
          if (!quill) return;
          const text = quill.getText().trim();
          this.stats = {
            words: text ? text.split(/\s+/).length : 0,
            noAlt: [...quill.root.querySelectorAll('img')].filter((i) => !(i.getAttribute('alt') || '').trim()).length,
          };
        },
        // Chọn ảnh đầu tiên chưa có alt để nhập
        gotoNoAlt() {
          const el = [...quill.root.querySelectorAll('img')].find((i) => !(i.getAttribute('alt') || '').trim());
          if (!el) return;
          el.scrollIntoView({ block: 'center', behavior: 'smooth' });
          this.selectImage(el);
          this.$nextTick(() => this.$refs.panels.querySelector('input[name="rt-alt"]')?.focus());
        },
        // ---- Ảnh ----
        selectImage(el) {
          if (imgEl && imgEl !== el) imgEl.classList.remove('rt-img-active');
          imgEl = el;
          el.classList.add('rt-img-active');
          const block = el.closest('p, h2, h3, h4, li');
          const align = ['center', 'right', 'justify'].find((a) => block?.classList.contains('ql-align-' + a)) || '';
          this.img = { alt: el.getAttribute('alt') || '', width: el.getAttribute('width') || '', align };
        },
        clearImage() {
          if (imgEl) imgEl.classList.remove('rt-img-active');
          imgEl = null; this.img = null;
        },
        // Áp dụng thuộc tính lên đúng ảnh đang chọn
        formatImage(name, value) {
          if (!imgEl) return;
          const blot = window.Quill.find(imgEl);
          if (!blot) return;
          quill.formatText(quill.getIndex(blot), 1, name, value || false, 'user');
          this.img[name] = value || '';
          this.refreshStats();
        },
        setImageWidth(w) {
          w = String(w || '').trim();
          if (w && !/^\d{1,4}(px|%)?$/.test(w)) { Alpine.store('toast').show('Kích thước dạng 50%, hoặc số điểm ảnh như 480', 'error'); return; }
          this.formatImage('width', w);
        },
        setImageAlign(a) {
          if (!imgEl) return;
          const blot = window.Quill.find(imgEl);
          quill.formatLine(quill.getIndex(blot), 1, 'align', a || false, 'user');
          this.img.align = a;
        },
        removeImage() {
          if (!imgEl) return;
          const blot = window.Quill.find(imgEl);
          const at = quill.getIndex(blot);
          this.clearImage();
          quill.deleteText(at, 1, 'user');
        },
        // ---- Bảng ----
        insertTable() {
          const rows = Math.min(20, Math.max(1, Number(this.tableForm.rows) || 3));
          const cols = Math.min(8, Math.max(1, Number(this.tableForm.cols) || 3));
          quill.focus();
          const r = this.lastRange || range0(quill);
          quill.setSelection(r.index, 0, 'silent');
          quill.getModule('table').insertTable(rows, cols);
          this.tableForm.open = false;
        },
        tableCmd(name) {
          quill.focus();
          const m = quill.getModule('table');
          m[name]();
          this.inTable = !!m.getTable()[0];
        },
      };
    });

    // Công tắc bật/tắt. Dùng: <button x-data="toggle" x-modelable="on" x-model="form.x">
    Alpine.data('toggle', () => ({
      on: false,
      flip() { this.on = !this.on; },
    }));
  });
})();

// Bảng dạng thẻ trên điện thoại: gắn nhãn cột (lấy từ thead) vào từng ô để CSS .table-stack hiển thị "Nhãn: giá trị".
// Dòng do Alpine (x-for) sinh ra sau nên theo dõi thay đổi của tbody.
(function () {
  function label(table) {
    var heads = Array.prototype.map.call(table.querySelectorAll('thead th'), function (th) {
      return th.classList.contains('stack-title') ? '' : th.textContent.trim();
    });
    Array.prototype.forEach.call(table.querySelectorAll('tbody tr'), function (tr) {
      Array.prototype.forEach.call(tr.children, function (td, i) {
        if (td.hasAttribute('data-label')) return;
        td.setAttribute('data-label', heads[i] || '');
        if (heads[i] === '' && table.querySelectorAll('thead th')[i] && table.querySelectorAll('thead th')[i].classList.contains('stack-title')) td.classList.add('stack-title');
      });
    });
  }
  var queued = false;
  function labelAll() {
    queued = false;
    Array.prototype.forEach.call(document.querySelectorAll('table.table-stack'), label);
  }
  function init() {
    labelAll();
    // Bảng có thể xuất hiện muộn (trong x-if) hoặc dòng sinh thêm (x-for): theo dõi cả trang, gom lại mỗi khung hình
    new MutationObserver(function () { if (!queued) { queued = true; requestAnimationFrame(labelAll); } })
      .observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
})();
