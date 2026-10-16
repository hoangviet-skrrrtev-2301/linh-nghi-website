// ==========================================================
// Component Alpine cho từng trang quản trị.
// Mỗi hàm tương ứng một trang trong admin/views/pages/*.njk
// ==========================================================
document.addEventListener('alpine:init', () => {
  const { api, A, slugify } = window.Admin;
  const Alpine = window.Alpine;
  const toast = () => Alpine.store('toast');
  const confirmBox = (opts) => Alpine.store('confirm').ask(opts);
  const qs = (obj) => new URLSearchParams(Object.entries(obj).filter(([, v]) => v !== '' && v != null)).toString();

  // Bộ khung cho trang danh sách có tìm kiếm + phân trang
  const listPage = (endpoint, defaults = {}) => ({
    items: [], total: 0, pages: 1, page: 1, loading: true, filters: { q: '', ...defaults },
    async load() {
      this.loading = true;
      try {
        const r = await api(`${endpoint}?${qs({ ...this.filters, page: this.page })}`);
        this.items = r.items;
        this.total = r.total;
        this.pages = r.pages || Math.max(1, Math.ceil(r.total / (r.perPage || 30)));
      } catch (e) { toast().error(e); }
      this.loading = false;
    },
    search() { this.page = 1; this.load(); },
    go(p) { if (p >= 1 && p <= this.pages) { this.page = p; this.load(); } },
    init() { this.load(); },
  });

  // ---------------- Tổng quan ----------------
  Alpine.data('dashboard', () => ({
    d: null,
    async init() {
      try { this.d = await api('/dashboard'); } catch (e) { toast().error(e); }
    },
    count(type, key = 'total') { return this.d?.stats.byType.find((t) => t.type === type)?.[key] || 0; },
    get chart() {
      const days = [];
      const map = Object.fromEntries((this.d?.stats.last30 || []).map((r) => [r.d, r.c]));
      for (let i = 29; i >= 0; i--) {
        const dt = new Date(Date.now() - i * 864e5 + 7 * 36e5).toISOString().slice(0, 10);
        days.push({ d: dt, c: map[dt] || 0 });
      }
      const max = Math.max(1, ...days.map((x) => x.c));
      return days.map((x) => ({ ...x, h: Math.round((x.c / max) * 100) }));
    },
  }));

  // ---------------- Sản phẩm ----------------
  Alpine.data('productsList', (status = '') => ({
    ...listPage('/products', { status, sort: 'moi' }),
    async remove(p) {
      if (!(await confirmBox({ title: 'Xóa sản phẩm?', message: `“${p.name}” sẽ bị xóa vĩnh viễn.` }))) return;
      try { await api(`/products/${p.id}`, { method: 'DELETE' }); toast().show('Đã xóa sản phẩm'); this.load(); } catch (e) { toast().error(e); }
    },
    async duplicate(p) {
      try {
        const r = await api(`/products/${p.id}/duplicate`, { method: 'POST' });
        window.location.href = `${A}/products/${r.id}`;
      } catch (e) { toast().error(e); }
    },
  }));

  const emptyProduct = () => ({
    name: '', slug: '', sku: '', short_description: '', description: '', price: '', sale_price: '',
    jade_type_id: '', color_id: '', style_id: '', element_ids: [], sizesText: '', bead_size: '', origin: '', weight: '',
    specs: [], stock_status: 'in_stock', is_featured: false, is_bestseller: false, is_new: false, fengshui: '', is_customizable: false, status: 'draft', sort_order: 0,
    cover_media_id: null, cover: null, image_ids: [], images: [], certificates: [], seo_title: '', seo_description: '',
  });

  Alpine.data('productEdit', (id) => ({
    id: id ? Number(id) : null, form: null, terms: {}, saving: false, slugTouched: !!id, tab: 'info', adding: null, newName: '', addingBusy: false,
    async init() {
      try {
        this.terms = await api('/terms');
        if (this.id) {
          const p = await api(`/products/${this.id}`);
          this.form = {
            ...emptyProduct(), ...p,
            price: p.price ?? '', sale_price: p.sale_price ?? '',
            jade_type_id: p.jade_type_id ?? '', color_id: p.color_id ?? '', style_id: p.style_id ?? '',
            sizesText: (p.sizes || []).join(', '),
            is_featured: !!p.is_featured, is_bestseller: !!p.is_bestseller, is_new: !!p.is_new, is_customizable: !!p.is_customizable,
            images: (p.images || []).filter((m) => m.id !== p.cover_media_id),
            image_ids: (p.images || []).filter((m) => m.id !== p.cover_media_id).map((m) => m.id),
            cover: p.cover_media_id ? p.images.find((m) => m.id === p.cover_media_id) || p.cover : null,
            certificates: (p.certificates || []).map((c) => ({ ...c, image: c.image })),
          };
        } else {
          this.form = emptyProduct();
        }
      } catch (e) { toast().error(e); }
    },
    onName() { if (!this.slugTouched) this.form.slug = slugify(this.form.name); },
    toggleElement(tid) {
      const i = this.form.element_ids.indexOf(tid);
      if (i >= 0) this.form.element_ids.splice(i, 1); else this.form.element_ids.push(tid);
    },
    // Thêm nhanh một lựa chọn danh mục (loại ngọc, màu, kiểu dáng, mệnh) ngay trong form sản phẩm
    startAdd(type) {
      this.adding = type; this.newName = '';
      this.$nextTick(() => this.$refs['add_' + type]?.focus());
    },
    async confirmAdd(type, field) {
      const name = this.newName.trim();
      if (!name) { toast().show('Vui lòng nhập tên', 'error'); return; }
      const exist = (this.terms[type] || []).find((t) => t.name.toLowerCase() === name.toLowerCase());
      let tid = exist?.id;
      if (!tid) {
        this.addingBusy = true;
        try {
          tid = (await api('/terms', { method: 'POST', body: { type, name, sort_order: (this.terms[type] || []).length } })).id;
          this.terms = await api('/terms');
          toast().show(`Đã thêm “${name}”`);
        } catch (e) { toast().error(e); this.addingBusy = false; return; }
        this.addingBusy = false;
      }
      if (field) this.form[field] = tid;
      else if (!this.form.element_ids.includes(tid)) this.form.element_ids.push(tid);
      this.adding = null; this.newName = '';
    },
    addCert() { this.form.certificates.push({ issuer: '', code: '', issued_date: '', note: '', media_id: null, image: null }); },
    addSpec() { this.form.specs.push({ label: '', value: '' }); },
    async save(publish) {
      if (!this.form.name.trim()) { toast().show('Vui lòng nhập tên sản phẩm', 'error'); this.tab = 'info'; return; }
      this.saving = true;
      const body = { ...this.form, sizes: this.form.sizesText, status: publish === undefined ? this.form.status : publish ? 'published' : 'draft' };
      try {
        const r = await api(this.id ? `/products/${this.id}` : '/products', { method: this.id ? 'PUT' : 'POST', body });
        this.form.status = body.status;
        toast().show('Đã lưu sản phẩm');
        if (!this.id) window.location.href = `${A}/products/${r.id}`;
      } catch (e) { toast().error(e); }
      this.saving = false;
    },
    async remove() {
      if (!(await confirmBox({ title: 'Xóa sản phẩm này?', message: 'Thao tác không thể hoàn tác.' }))) return;
      await api(`/products/${this.id}`, { method: 'DELETE' });
      window.location.href = `${A}/products`;
    },
  }));

  // ---------------- Danh mục ----------------
  Alpine.data('termsPage', () => ({
    type: 'jade_type', terms: {}, editing: null, saving: false,
    async init() { await this.load(); },
    async load() { try { this.terms = await api('/terms'); } catch (e) { toast().error(e); } },
    get list() { return this.terms[this.type] || []; },
    open(t) {
      this.editing = t
        ? { ...t, active: !!t.active, image: t.image }
        : { type: this.type, name: '', slug: '', description: '', color_hex: '', media_id: null, image: null, sort_order: this.list.length, active: true };
    },
    async save() {
      this.saving = true;
      try {
        const e = this.editing;
        await api(e.id ? `/terms/${e.id}` : '/terms', { method: e.id ? 'PUT' : 'POST', body: e });
        toast().show('Đã lưu');
        this.editing = null;
        await this.load();
      } catch (err) { toast().error(err); }
      this.saving = false;
    },
    async remove(t) {
      if (!(await confirmBox({ title: `Xóa “${t.name}”?`, message: 'Sản phẩm đang dùng mục này sẽ không còn được gắn phân loại.' }))) return;
      await api(`/terms/${t.id}`, { method: 'DELETE' });
      toast().show('Đã xóa');
      this.load();
    },
  }));

  // ---------------- Gallery ----------------
  Alpine.data('galleryPage', () => ({
    items: [], products: [], loading: true,
    async init() {
      await this.load();
      api('/products?sort=ten&per_page=200').then((r) => { this.products = r.items; }).catch(() => {});
    },
    async reorder(id, position) {
      const from = this.items.findIndex((g) => g.id === id);
      if (from < 0) return;
      this.items.splice(position, 0, this.items.splice(from, 1)[0]);
      try {
        await api('/gallery/reorder', { method: 'POST', body: { ids: this.items.map((i) => i.id) } });
        toast().show('Đã lưu thứ tự');
      } catch (e) { toast().error(e); }
    },
    async load() {
      this.loading = true;
      try { this.items = (await api('/gallery')).map((g) => ({ ...g, active: !!g.active })); } catch (e) { toast().error(e); }
      this.loading = false;
    },
    add() {
      Alpine.store('picker').show({
        multiple: true,
        onSelect: async (list) => {
          if (!list.length) return;
          await api('/gallery', { method: 'POST', body: { media_ids: list.map((m) => m.id), sort_order: this.items.length } });
          toast().show(`Đã thêm ${list.length} ảnh`);
          this.load();
        },
      });
    },
    async save(g) {
      try { await api(`/gallery/${g.id}`, { method: 'PUT', body: g }); toast().show('Đã lưu'); } catch (e) { toast().error(e); }
    },
    async remove(g) {
      if (!(await confirmBox({ title: 'Gỡ ảnh khỏi Gallery?', message: 'Ảnh gốc vẫn còn trong Thư viện ảnh.', okLabel: 'Gỡ' }))) return;
      await api(`/gallery/${g.id}`, { method: 'DELETE' });
      this.items = this.items.filter((x) => x.id !== g.id);
    },
  }));

  // ---------------- Blog ----------------
  Alpine.data('postsList', () => ({
    ...listPage('/posts', { status: '' }),
    async remove(p) {
      if (!(await confirmBox({ title: 'Xóa bài viết?', message: `“${p.title}” sẽ bị xóa vĩnh viễn.` }))) return;
      await api(`/posts/${p.id}`, { method: 'DELETE' });
      toast().show('Đã xóa');
      this.load();
    },
  }));

  // Đổi "YYYY-MM-DD HH:MM:SS" (UTC) sang giờ VN cho ô datetime-local
  const toLocalInput = (v) => {
    if (!v) return '';
    const d = new Date(String(v).replace(' ', 'T') + 'Z');
    return new Date(d.getTime() + 7 * 36e5).toISOString().slice(0, 16);
  };

  Alpine.data('postEdit', (id) => ({
    id: id ? Number(id) : null, form: null, saving: false, slugTouched: !!id,
    async init() {
      const empty = { title: '', slug: '', excerpt: '', content: '', cover_media_id: null, cover: null, status: 'draft', published_at: '', seo_title: '', seo_description: '' };
      try {
        this.form = this.id ? { ...empty, ...(await api(`/posts/${this.id}`)) } : empty;
        this.form.published_at = toLocalInput(this.form.published_at);
      } catch (e) { toast().error(e); }
    },
    onTitle() { if (!this.slugTouched) this.form.slug = slugify(this.form.title); },
    async save(publish) {
      this.saving = true;
      const body = { ...this.form, status: publish === undefined ? this.form.status : publish ? 'published' : 'draft' };
      try {
        const r = await api(this.id ? `/posts/${this.id}` : '/posts', { method: this.id ? 'PUT' : 'POST', body });
        this.form.status = body.status;
        toast().show('Đã lưu bài viết');
        if (!this.id) window.location.href = `${A}/posts/${r.id}`;
      } catch (e) { toast().error(e); }
      this.saving = false;
    },
  }));

  // ---------------- Thư viện ảnh ----------------
  Alpine.data('mediaPage', () => ({
    ...listPage('/media'),
    uploading: 0, selected: null,
    async upload(files) {
      const list = [...files].filter((f) => f.type.startsWith('image/'));
      if (!list.length) return;
      this.uploading = list.length;
      try {
        for (let i = 0; i < list.length; i += 5) {
          const fd = new FormData();
          list.slice(i, i + 5).forEach((f) => fd.append('files', f));
          await api('/media', { method: 'POST', form: fd });
        }
        toast().show(`Đã tải lên ${list.length} ảnh`);
        this.page = 1;
        this.load();
      } catch (e) { toast().error(e); }
      this.uploading = 0;
    },
    async saveAlt() {
      try { await api(`/media/${this.selected.id}`, { method: 'PATCH', body: { alt: this.selected.alt } }); toast().show('Đã lưu mô tả ảnh'); } catch (e) { toast().error(e); }
    },
    copy(url) { navigator.clipboard?.writeText(location.origin + url); toast().show('Đã sao chép đường dẫn'); },
    async remove(m) {
      if (!(await confirmBox({ title: 'Xóa ảnh vĩnh viễn?', message: 'Nếu ảnh đang được dùng ở sản phẩm, bài viết hoặc cài đặt, vị trí đó sẽ trống ảnh.' }))) return;
      await api(`/media/${m.id}`, { method: 'DELETE' });
      this.selected = null;
      toast().show('Đã xóa ảnh');
      this.load();
    },
  }));

  // ---------------- Đơn hàng / yêu cầu ----------------
  Alpine.data('inquiriesList', (type) => ({
    ...listPage('/inquiries', { type: type || '', status: '', from: '', to: '' }),
  }));

  Alpine.data('inquiryDetail', (id) => ({
    d: null, saving: false,
    async init() { try { this.d = await api(`/inquiries/${id}`); } catch (e) { toast().error(e); } },
    async update(patch) {
      this.saving = true;
      try { this.d = await api(`/inquiries/${id}`, { method: 'PATCH', body: patch }); toast().show('Đã cập nhật'); } catch (e) { toast().error(e); }
      this.saving = false;
    },
    async resend() {
      try { this.d = await api(`/inquiries/${id}/resend`, { method: 'POST' }); toast().show(this.d.mail_status === 'sent' ? 'Đã gửi lại email' : 'Gửi email chưa thành công, kiểm tra cấu hình SMTP', this.d.mail_status === 'sent' ? 'success' : 'error'); } catch (e) { toast().error(e); }
    },
    async remove() {
      if (!(await confirmBox({ title: 'Xóa yêu cầu này?', message: 'Dữ liệu sẽ bị xóa vĩnh viễn.' }))) return;
      await api(`/inquiries/${id}`, { method: 'DELETE' });
      window.location.href = `${A}/inquiries?type=${this.d.type}`;
    },
    get detailRows() {
      const x = this.d?.details || {};
      return [['Sản phẩm quan tâm', x.product], ['Dây / mặt / phụ kiện', x.accessory], ['Loại ngọc', x.jade_type], ['Màu sắc', x.color], ['Kiểu dáng', x.style], ['Ni / số đo', x.size], ['Mệnh', x.element], ['Ngân sách', x.budget], ['Mục đích', x.purpose], ['Thời gian cần', x.deadline]].filter((r) => r[1]);
    },
  }));

  // ---------------- Khách hàng ----------------
  Alpine.data('customersList', () => ({ ...listPage('/customers') }));

  Alpine.data('customerDetail', (id) => ({
    c: null, saving: false,
    async init() { try { this.c = await api(`/customers/${id}`); } catch (e) { toast().error(e); } },
    async save() {
      this.saving = true;
      try { this.c = await api(`/customers/${id}`, { method: 'PUT', body: this.c }); toast().show('Đã lưu thông tin khách'); } catch (e) { toast().error(e); }
      this.saving = false;
    },
    async remove() {
      if (!(await confirmBox({ title: 'Xóa khách hàng?', message: 'Các đơn/yêu cầu cũ vẫn được giữ nhưng không còn liên kết với khách này.' }))) return;
      await api(`/customers/${id}`, { method: 'DELETE' });
      window.location.href = `${A}/customers`;
    },
  }));

  // ---------------- Cài đặt ----------------
  Alpine.data('settingsPage', (key) => ({
    key, values: null, media: {}, saving: false, testing: false,
    async init() {
      try {
        const r = await api(`/settings/${key}`);
        this.media = r.media || {};
        this.values = r.values;
      } catch (e) { toast().error(e); }
    },
    addItem(field, blank) { (this.values[field] ||= []).push(structuredClone(blank)); },
    move(field, i, d) {
      const arr = this.values[field];
      const j = i + d;
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    },
    async removeItem(field, i) {
      if (!(await confirmBox({ title: 'Xóa mục này?', okLabel: 'Xóa' }))) return;
      this.values[field].splice(i, 1);
    },
    async save() {
      this.saving = true;
      try {
        const r = await api(`/settings/${key}`, { method: 'PUT', body: this.values });
        this.values = r.values;
        toast().show('Đã lưu cài đặt');
      } catch (e) { toast().error(e); }
      this.saving = false;
    },
    async testMail() {
      this.testing = true;
      try {
        await this.save();
        const r = await api('/settings/mail/test', { method: 'POST' });
        toast().show(r.message);
      } catch (e) { toast().error(e); }
      this.testing = false;
    },
  }));

  // ---------------- Tài khoản quản trị ----------------
  Alpine.data('usersPage', () => ({
    users: [], editing: null, saving: false,
    async init() { this.load(); },
    async load() { try { this.users = await api('/users'); } catch (e) { toast().error(e); } },
    open(u) { this.editing = u ? { ...u, active: !!u.active, password: '' } : { email: '', name: '', role: 'staff', password: '', active: true }; },
    async save() {
      this.saving = true;
      try {
        const e = this.editing;
        await api(e.id ? `/users/${e.id}` : '/users', { method: e.id ? 'PUT' : 'POST', body: e });
        toast().show('Đã lưu tài khoản');
        this.editing = null;
        this.load();
      } catch (err) { toast().error(err); }
      this.saving = false;
    },
    async reset2fa(u) {
      if (!(await confirmBox({ title: 'Tắt xác thực 2 bước?', message: `Dùng khi ${u.name} bị mất điện thoại.`, okLabel: 'Tắt 2FA' }))) return;
      await api(`/users/${u.id}/reset-2fa`, { method: 'POST' });
      toast().show('Đã tắt 2FA');
      this.load();
    },
    async remove(u) {
      if (!(await confirmBox({ title: `Xóa tài khoản ${u.email}?` }))) return;
      try { await api(`/users/${u.id}`, { method: 'DELETE' }); this.load(); } catch (e) { toast().error(e); }
    },
  }));

  Alpine.data('accountPage', (me) => ({
    me: { ...me }, pw: { current_password: '', new_password: '', confirm: '' }, setup: null, code: '', disablePw: '', saving: false,
    async saveProfile() {
      try { await api('/account', { method: 'PUT', body: { name: this.me.name } }); toast().show('Đã lưu'); } catch (e) { toast().error(e); }
    },
    async changePassword() {
      if (this.pw.new_password !== this.pw.confirm) { toast().show('Mật khẩu nhập lại không khớp', 'error'); return; }
      this.saving = true;
      try {
        await api('/account', { method: 'PUT', body: this.pw });
        this.pw = { current_password: '', new_password: '', confirm: '' };
        toast().show('Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.');
      } catch (e) { toast().error(e); }
      this.saving = false;
    },
    async start2fa() { try { this.setup = await api('/account/2fa/setup', { method: 'POST' }); } catch (e) { toast().error(e); } },
    async enable2fa() {
      try {
        await api('/account/2fa/enable', { method: 'POST', body: { code: this.code } });
        this.me.totp_enabled = 1; this.setup = null; this.code = '';
        toast().show('Đã bật xác thực 2 bước');
      } catch (e) { toast().error(e); }
    },
    async disable2fa() {
      try {
        await api('/account/2fa/disable', { method: 'POST', body: { password: this.disablePw } });
        this.me.totp_enabled = 0; this.disablePw = '';
        toast().show('Đã tắt xác thực 2 bước');
      } catch (e) { toast().error(e); }
    },
  }));

  Alpine.data('auditPage', () => ({ ...listPage('/audit') }));
});
