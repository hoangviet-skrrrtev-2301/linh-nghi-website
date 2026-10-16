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
    new: 'bg-blue-50 text-blue-700', contacted: 'bg-amber-50 text-amber-700', confirmed: 'bg-violet-50 text-violet-700',
    completed: 'bg-emerald-50 text-emerald-700', cancelled: 'bg-slate-100 text-slate-500',
  };

  // Chuyển tiếng Việt thành đường dẫn (giống server)
  const slugify = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  window.Admin = { A, api, fmt, META, ME, STATUS_COLOR, slugify };

  document.addEventListener('alpine:init', () => {
    const Alpine = window.Alpine;

    Alpine.magic('fmt', () => fmt);
    Alpine.magic('meta', () => META);

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
      open: false, multiple: false, items: [], selected: [], q: '', page: 1, total: 0, loading: false, uploading: 0, cb: null,
      show({ multiple = false, onSelect }) {
        Object.assign(this, { open: true, multiple, selected: [], cb: onSelect, q: '', page: 1 });
        this.load();
      },
      async load() {
        this.loading = true;
        try {
          const r = await api(`/media?page=${this.page}&q=${encodeURIComponent(this.q)}`);
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
            list.slice(i, i + 5).forEach((f) => fd.append('files', f));
            const r = await api('/media', { method: 'POST', form: fd });
            this.items = [...r.items, ...this.items];
            r.items.forEach((m) => { if (this.multiple || i === 0) this.toggle(m); });
          }
          Alpine.store('toast').show(`Đã tải lên ${list.length} ảnh`);
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
    Alpine.data('richText', () => ({
      value: '',
      quill: null,
      init() {
        if (!window.Quill) return;
        this.quill = new window.Quill(this.$refs.editor, {
          theme: 'snow',
          placeholder: 'Nhập nội dung...',
          modules: {
            toolbar: {
              container: [[{ header: [2, 3, 4, false] }], ['bold', 'italic', 'underline', 'strike'], [{ list: 'ordered' }, { list: 'bullet' }],
                ['blockquote', 'link', 'image'], [{ align: [] }], ['clean']],
              handlers: {
                // Chèn ảnh từ thư viện thay vì nhúng base64
                image: () => Alpine.store('picker').show({
                  onSelect: (m) => {
                    if (!m) return;
                    const range = this.quill.getSelection(true);
                    this.quill.insertEmbed(range.index, 'image', m.md || m.lg, 'user');
                  },
                }),
              },
            },
          },
        });
        const set = (html) => {
          if ((html || '') === this.current()) return;
          // setContents không đụng tới vùng chọn, an toàn khi editor đang ẩn trong tab
          this.quill.setContents(this.quill.clipboard.convert({ html: html || '' }), 'silent');
        };
        set(this.value);
        this.$watch('value', set);
        this.quill.on('text-change', () => { this.value = this.current(); });
      },
      current() {
        const html = this.quill.root.innerHTML;
        return html === '<p><br></p>' ? '' : html;
      },
    }));

    // Công tắc bật/tắt. Dùng: <button x-data="toggle" x-modelable="on" x-model="form.x">
    Alpine.data('toggle', () => ({
      on: false,
      flip() { this.on = !this.on; },
    }));
  });
})();
