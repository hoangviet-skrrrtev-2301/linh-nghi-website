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

  // Số dòng mỗi trang cho các danh sách chính (đầu tiên là mặc định); lựa chọn dùng chung và được nhớ trên trình duyệt
  const PER_PAGE = [20, 30, 50, 100];

  // Bộ khung cho trang danh sách có tìm kiếm + phân trang
  // perPageOptions (VD: [20, 30, 50]) bật ô chọn số dòng mỗi trang; lựa chọn được nhớ trên trình duyệt.
  // Bộ lọc + trang hiện tại được ghi vào địa chỉ trang để nút Quay lại trả về đúng danh sách vừa xem.
  const listPage = (endpoint, defaults = {}, perPageOptions = []) => ({
    items: [], total: 0, pages: 1, page: 1, loading: true, filters: { q: '', ...defaults },
    perPageOptions, perPage: perPageOptions[0] || 0, restored: false,
    restoreState() {
      this.restored = true;
      const u = new URLSearchParams(location.search);
      for (const k of Object.keys(this.filters)) if (u.has(k)) this.filters[k] = u.get(k);
      const pg = Number(u.get('page'));
      if (pg >= 1) this.page = Math.floor(pg);
      if (this.perPageOptions.length) {
        let saved = 0;
        try { saved = Number(localStorage.getItem('ln_admin_perpage')); } catch { /* chế độ riêng tư */ }
        const want = Number(u.get('per_page')) || saved;
        if (this.perPageOptions.includes(want)) this.perPage = want;
      }
    },
    syncUrl() {
      try {
        const u = new URLSearchParams();
        for (const [k, v] of Object.entries(this.filters)) u.set(k, v ?? '');
        if (this.page > 1) u.set('page', this.page);
        if (this.perPageOptions.length && this.perPage !== this.perPageOptions[0]) u.set('per_page', this.perPage);
        history.replaceState(history.state, '', location.pathname + '?' + u.toString());
        window.Admin.trailReplace();
      } catch { /* bỏ qua */ }
    },
    setPerPage(n) {
      this.perPage = Number(n);
      try { localStorage.setItem('ln_admin_perpage', String(this.perPage)); } catch { /* chế độ riêng tư */ }
      this.search();
    },
    async load() {
      if (!this.restored) this.restoreState();
      this.loading = true;
      try {
        const r = await api(`${endpoint}?${qs({ ...this.filters, page: this.page, per_page: this.perPage || '' })}`);
        this.items = r.items;
        this.total = r.total;
        this.pages = r.pages || Math.max(1, Math.ceil(r.total / (r.perPage || 30)));
        if (this.page > this.pages) { this.page = this.pages; this.syncUrl(); return this.load(); }
        this.syncUrl();
      } catch (e) { toast().error(e); }
      this.loading = false;
    },
    search() { this.page = 1; this.load(); },
    go(p) { if (p >= 1 && p <= this.pages) { this.page = p; this.load(); } },
    init() { this.load(); },
  });

  // ---------------- Tổng quan ----------------
  Alpine.data('dashboard', () => ({
    d: null, loading: true, range: '30d', from: '', to: '', metric: 'requests',
    // So sánh kỳ: mặc định tắt và không ghi nhớ, chỉ bật khi bấm nút "So sánh"
    compare: '', cfrom: '', cto: '',
    compareModes: [['prev', 'Kỳ liền trước'], ['year', 'Cùng kỳ năm trước'], ['custom', 'Tùy chọn']],
    ranges: [['7d', '7 ngày'], ['30d', '30 ngày'], ['month', 'Tháng này'], ['last_month', 'Tháng trước'], ['quarter', 'Quý này'], ['year', 'Năm nay'], ['custom', 'Tùy chọn']],
    statusColor: { new: 'bg-blue-500', contacted: 'bg-amber-500', confirmed: 'bg-violet-500', shipping: 'bg-sky-500', completed: 'bg-emerald-500', cancelled: 'bg-slate-400' },
    init() {
      try { Object.assign(this, JSON.parse(localStorage.getItem('ln_admin_dash') || '{}')); } catch { /* bỏ qua */ }
      if (!this.ranges.some((r) => r[0] === this.range)) this.range = '30d';
      this.load();
    },
    save() { try { localStorage.setItem('ln_admin_dash', JSON.stringify({ range: this.range, from: this.from, to: this.to, metric: this.metric })); } catch { /* chế độ riêng tư */ } },
    setRange(k) { this.range = k; this.save(); if (k !== 'custom' || (this.from && this.to)) this.load(); },
    setCompare(mode) {
      this.compare = mode;
      if (mode !== 'custom' || (this.cfrom && this.cto)) this.load();
      else if (!mode) this.load();
    },
    async load() {
      this.loading = true;
      // Bấm đổi kỳ liên tiếp: chỉ nhận kết quả của lần bấm cuối, không để câu trả lời chậm của kỳ cũ ghi đè
      const seq = (this.seq = (this.seq || 0) + 1);
      const q = { range: this.range, from: this.range === 'custom' ? this.from : '', to: this.range === 'custom' ? this.to : '', compare: this.compare };
      if (this.compare === 'custom') { q.cfrom = this.cfrom; q.cto = this.cto; }
      try {
        const data = await api(`/dashboard?${qs(q)}`);
        if (seq !== this.seq) return;
        this.d = data;
      } catch (e) { if (seq === this.seq) toast().error(e); }
      if (seq === this.seq) this.loading = false;
    },
    // ----- Thẻ số liệu -----
    val(key) { return this.d ? this.d.totals[key] : null; },
    money(n) { return window.Admin.fmt.vnd(n || 0); },
    show(key) { const v = this.val(key); return v == null ? '–' : (key === 'revenue' || key === 'aov') ? this.money(v) : v; },
    // Số của kỳ so sánh (chỉ có khi đang bật so sánh)
    prevShow(key) {
      const v = this.d?.prev?.[key];
      return v == null ? '' : (key === 'revenue' || key === 'aov') ? this.money(v) : String(v);
    },
    // So với kỳ đang chọn để so sánh; null khi tắt so sánh
    delta(key) {
      if (!this.d || !this.d.prev) return null;
      const cur = this.d.totals[key]; const prev = this.d.prev[key];
      if (!prev) return cur ? { text: 'mới', tone: 'up' } : null;
      const pct = Math.round(((cur - prev) / prev) * 100);
      return { text: (pct > 0 ? '+' : '') + pct + '%', tone: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' };
    },
    deltaClass(key) { const t = this.delta(key)?.tone; return t === 'up' ? 'bg-emerald-50 text-emerald-700' : t === 'down' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'; },
    deltaIcon(key) { const t = this.delta(key)?.tone; return t === 'up' ? '↑' : t === 'down' ? '↓' : '→'; },
    // ----- Biểu đồ -----
    compact(n) {
      if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + ' tỷ';
      if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + ' tr';
      if (n >= 1e3) return Math.round(n / 1e3) + 'k';
      return String(n);
    },
    // Biểu đồ số lượng: mỗi loại một cột riêng đặt cạnh nhau (không chồng) để so sánh được; bấm chú thích để ẩn / hiện từng loại
    seriesDefs: [
      { key: 'order', label: 'Đơn hàng', bar: 'bg-brand-500', dot: 'bg-brand-500', text: 'text-brand-700' },
      { key: 'custom', label: 'Yêu cầu custom', bar: 'bg-violet-500', dot: 'bg-violet-500', text: 'text-violet-700' },
      { key: 'contact', label: 'Khách liên hệ', bar: 'bg-amber-400', dot: 'bg-amber-400', text: 'text-amber-700' },
    ],
    hidden: {},
    get series() { return this.seriesDefs.filter((s) => !this.hidden[s.key]); },
    toggleSeries(k) {
      const left = this.seriesDefs.filter((s) => !this.hidden[s.key] && s.key !== k).length;
      if (!this.hidden[k] && !left) return; // luôn giữ lại ít nhất một loại
      this.hidden = { ...this.hidden, [k]: !this.hidden[k] };
    },
    seriesTotal(k) { return this.d?.totals[{ order: 'orders', custom: 'custom', contact: 'contact' }[k]] ?? 0; },
    cell(bk) { return this.metric === 'revenue' ? bk.revenue : this.series.reduce((s, x) => s + bk[x.key], 0); },
    get buckets() { return this.d?.series.buckets || []; },
    get max() { return Math.max(1, ...this.buckets.map((bk) => (this.metric === 'revenue' ? bk.revenue : Math.max(0, ...this.series.map((x) => bk[x.key]))))); },
    get axis() { const m = this.max; return [m, Math.round(m / 2), 0].map((v) => (this.metric === 'revenue' ? this.compact(v) : String(v))); },
    pct(v) { return (v / this.max) * 100; },
    barH(v) { return Math.max(this.pct(v), v ? 3 : 0); },
    lab(v) { return v ? (this.metric === 'revenue' ? this.compact(v) : String(v)) : ''; },
    // Số trên đầu cột chỉ hiện khi đủ chỗ (ít cột); nhiều cột thì xem trong bảng chi tiết hoặc rê chuột
    get showNumbers() { return this.buckets.length * (this.metric === 'revenue' ? 1 : this.series.length) <= 24; },
    // Chỉ ghi nhãn ngày ở một số cột cho khỏi chồng chữ
    showTick(i) { const n = this.buckets.length; const step = Math.max(1, Math.ceil(n / 8)); return i % step === 0 || (i === n - 1 && (n - 1) % step >= step / 2); },
    get chartTotal() { return this.metric === 'revenue' ? this.money(this.d?.totals.revenue) : this.series.map((s) => this.seriesTotal(s.key) + ' ' + s.label.toLowerCase()).join(' · '); },
    get statusTotal() { return Math.max(1, (this.d?.statusBreakdown || []).reduce((s, r) => s + r.n, 0)); },
  }));

  // ---------------- Sản phẩm ----------------
  Alpine.data('productsList', (status = '') => ({
    ...listPage('/products', { status, sort: 'noi_bat', type: '' }, PER_PAGE),
    selected: [],
    // Sửa nhanh giá ngay ở danh sách (bấm vào giá)
    editing: null, pf: { price: '', sale_price: '' }, priceBusy: false, priceError: '',
    startPrice(p) {
      this.editing = p.id; this.priceError = '';
      this.pf = { price: p.price ?? '', sale_price: p.sale_price ?? '' };
      this.$nextTick(() => document.getElementById('pf-price-' + p.id)?.focus());
    },
    async savePrice(p) {
      this.priceBusy = true; this.priceError = '';
      try {
        const r = await api(`/products/${p.id}/price`, { method: 'PATCH', body: { price: this.pf.price, sale_price: this.pf.sale_price } });
        Object.assign(p, { price: r.price, sale_price: r.sale_price, final_price: r.final_price, on_sale: r.on_sale });
        this.editing = null;
        toast().show('Đã cập nhật giá');
      } catch (e) { this.priceError = e.message; }
      this.priceBusy = false;
    },
    // Kéo thả đổi vị trí: chỉ khi đang xem theo "Thứ tự hiển thị" (đúng thứ tự khách thấy)
    get canDrag() { return this.filters.sort === 'noi_bat'; },
    async reorder(id, position) {
      const from = this.items.findIndex((p) => p.id === id);
      if (from < 0) return;
      this.items.splice(position, 0, this.items.splice(from, 1)[0]);
      try {
        await api('/products/reorder', { method: 'POST', body: { ids: this.items.map((p) => p.id) } });
        toast().show('Đã lưu thứ tự sản phẩm');
      } catch (e) { toast().error(e); this.load(); }
    },
    // Quản lý loại sản phẩm (Vòng tay ngọc, Pháp phục...) ngay trên trang này
    types: [], typesOpen: false, typeForm: null, typeSaving: false,
    // Mặc định luôn xem Vòng tay ngọc (loại chính); muốn xem loại khác hoặc tất cả thì chọn ở ô lọc
    async init() {
      await this.loadTypes();
      const main = this.types.find((t) => t.uses_jade_fields);
      if (main && this.filters.type === '') this.filters.type = main.id;
      this.load();
    },
    async loadTypes() { try { this.types = (await api('/product-types')).items; } catch (e) { toast().error(e); } },
    openType(t) {
      this.typeForm = t
        ? { ...t, active: !!t.active, size_options_text: (t.size_options || []).join(', '), spec_fields: (t.spec_fields || []).map((f) => ({ ...f, optionsText: (f.options || []).join(', ') })) }
        : { name: '', slug: '', description: '', active: false, in_main_list: false, sort_order: this.types.length, uses_jade_fields: false, spec_fields: [], size_label: 'Kích cỡ', size_unit: '', size_options_text: 'S, M, L, XL', size_free: false, info_label: '' };
    },
    addField() { this.typeForm.spec_fields.push({ key: '', label: '', kind: 'text', options: [], optionsText: '' }); },
    moveField(i, d) {
      const a = this.typeForm.spec_fields; const j = i + d;
      if (j < 0 || j >= a.length) return;
      [a[i], a[j]] = [a[j], a[i]];
    },
    async saveType() {
      this.typeSaving = true;
      try {
        const f = this.typeForm;
        const body = { ...f, size_options: f.size_options_text, spec_fields: f.spec_fields.map((s) => ({ key: s.key, label: s.label, kind: s.kind, options: s.kind === 'select' ? s.optionsText : [] })) };
        const r = await api(f.id ? `/product-types/${f.id}` : '/product-types', { method: f.id ? 'PUT' : 'POST', body });
        this.types = r.items; this.typeForm = null;
        toast().show('Đã lưu loại sản phẩm');
      } catch (e) { toast().error(e); }
      this.typeSaving = false;
    },
    async removeType(t) {
      if (!(await confirmBox({ title: `Xóa loại “${t.name}”?`, message: 'Chỉ xóa được khi loại này chưa có sản phẩm nào.', okLabel: 'Xóa' }))) return;
      try { this.types = (await api(`/product-types/${t.id}`, { method: 'DELETE' })).items; toast().show('Đã xóa loại sản phẩm'); } catch (e) { toast().error(e); }
    },
    async toggleType(t) {
      const body = { ...t, active: !t.active };
      if (!t.active && !(await confirmBox({ title: `Bật hoạt động loại “${t.name}”?`, message: 'Các sản phẩm đang ở trạng thái “Đang hiển thị” của loại này sẽ xuất hiện ngay trên website (trang Sản phẩm, tìm kiếm, sitemap), chung với sản phẩm khác, cho đến khi có trang riêng.', okLabel: 'Bật hoạt động', danger: false }))) return;
      try { this.types = (await api(`/product-types/${t.id}`, { method: 'PUT', body })).items; this.load(); toast().show(body.active ? 'Đã bật hoạt động' : 'Đã tắt hoạt động'); } catch (e) { toast().error(e); }
    },
    get allSelected() { return this.items.length > 0 && this.items.every((p) => this.selected.includes(p.id)); },
    toggleAll(on) { this.selected = on ? this.items.map((p) => p.id) : []; },
    // Ẩn / hiện / xóa nhiều sản phẩm đã tick (action: hide | show | delete)
    async bulk(action, ids = this.selected) {
      if (!ids.length) return;
      const label = { hide: 'Ẩn', show: 'Hiện', delete: 'Xóa' }[action];
      if (action === 'delete' && !(await confirmBox({ title: `Xóa ${ids.length} sản phẩm?`, message: 'Các sản phẩm này sẽ bị xóa vĩnh viễn, không khôi phục được. Nếu chỉ muốn khách không thấy, hãy chọn Ẩn.', okLabel: 'Xóa' }))) return;
      try {
        await api('/products/bulk', { method: 'POST', body: { ids, action } });
        toast().show(`${label} ${ids.length} sản phẩm thành công`);
        this.selected = [];
        this.load();
      } catch (e) { toast().error(e); }
    },
    toggleHide(p) { return this.bulk(p.status === 'published' ? 'hide' : 'show', [p.id]); },
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
    product_type_id: 1, attrs: {},
    specs: [], stock_status: 'in_stock', is_featured: false, is_bestseller: false, is_new: false, fengshui: '', is_customizable: false, status: 'draft', sort_order: 0,
    cover_media_id: null, cover: null, image_ids: [], images: [], certificates: [], seo_title: '', seo_description: '',
    track_stock: false, stock_qty: 0, stock_history: [],
  });

  Alpine.data('productEdit', (id) => ({
    id: id ? Number(id) : null, form: null, terms: {}, types: [], saving: false, slugTouched: !!id, tab: 'info', adding: null, newName: '', addingBusy: false,
    // Loại sản phẩm đang chọn: loại dùng bộ thuộc tính ngọc hay thông số tự đặt
    get type() { return this.types.find((t) => t.id === Number(this.form?.product_type_id)) || this.types[0] || null; },
    get isJade() { return !this.type || !!this.type.uses_jade_fields; },
    // Địa chỉ trên website theo phân cấp: /san-pham/<loại ngọc hoặc loại sản phẩm>/<đường dẫn sản phẩm>
    get publicPath() {
      const f = this.form || {};
      const parent = this.isJade ? (this.terms.jade_type || []).find((t) => t.id === Number(f.jade_type_id))?.slug : this.type?.slug;
      return parent ? `/san-pham/${parent}/${f.slug || ''}` : `/san-pham/${f.slug || ''}`;
    },
    async init() {
      try {
        this.terms = await api('/terms');
        this.types = (await api('/product-types')).items;
        if (this.id) {
          const p = await api(`/products/${this.id}`);
          this.form = {
            ...emptyProduct(), ...p,
            product_type_id: p.product_type_id || 1, attrs: p.attrs || {},
            price: p.price ?? '', sale_price: p.sale_price ?? '',
            jade_type_id: p.jade_type_id ?? '', color_id: p.color_id ?? '', style_id: p.style_id ?? '',
            sizesText: (p.sizes || []).join(', '),
            is_featured: !!p.is_featured, is_bestseller: !!p.is_bestseller, is_new: !!p.is_new, is_customizable: !!p.is_customizable,
            track_stock: !!p.track_stock, stock_qty: p.stock_qty ?? 0,
            images: (p.images || []).filter((m) => m.id !== p.cover_media_id),
            image_ids: (p.images || []).filter((m) => m.id !== p.cover_media_id).map((m) => m.id),
            cover: p.cover_media_id ? p.images.find((m) => m.id === p.cover_media_id) || p.cover : null,
            certificates: (p.certificates || []).map((c) => ({ ...c, image: c.image })),
          };
        } else {
          this.form = emptyProduct();
          // Mở từ trang danh sách với ?type=<id>: chọn sẵn loại sản phẩm
          const t = Number(new URLSearchParams(location.search).get('type'));
          if (t && this.types.some((x) => x.id === t)) this.form.product_type_id = t;
        }
      } catch (e) { toast().error(e); }
    },
    onName() { if (!this.slugTouched) this.form.slug = slugify(this.form.name); },
    // Bấm gợi ý nhanh (S, M, L...) để thêm / bỏ khỏi danh sách kích cỡ của sản phẩm
    get sizeList() { return String(this.form?.sizesText || '').split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean); },
    toggleSize(s) {
      const list = this.sizeList;
      const i = list.findIndex((x) => x.toLowerCase() === s.toLowerCase());
      if (i >= 0) list.splice(i, 1); else list.push(s);
      this.form.sizesText = list.join(', ');
    },
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
    ...listPage('/posts', { status: '', category: '' }, PER_PAGE),
    categories: [], catOpen: false, catForm: null, catSaving: false,
    init() { this.load(); this.loadCategories(); },
    async loadCategories() { try { this.categories = (await api('/post-categories')).items; } catch (e) { toast().error(e); } },
    openCat(cat) { this.catForm = cat ? { ...cat, active: !!cat.active } : { name: '', slug: '', description: '', sort_order: this.categories.length, active: true }; },
    async saveCat() {
      this.catSaving = true;
      try {
        const f = this.catForm;
        const r = await api(f.id ? `/post-categories/${f.id}` : '/post-categories', { method: f.id ? 'PUT' : 'POST', body: f });
        this.categories = r.items; this.catForm = null;
        toast().show('Đã lưu chuyên mục');
      } catch (e) { toast().error(e); }
      this.catSaving = false;
    },
    async removeCat(cat) {
      if (!(await confirmBox({ title: `Xóa chuyên mục “${cat.name}”?`, message: cat.total_count ? `${cat.total_count} bài viết trong chuyên mục sẽ chuyển về “Chưa phân loại”, bài viết không bị xóa.` : 'Chuyên mục này chưa có bài viết.', okLabel: 'Xóa' }))) return;
      try { this.categories = (await api(`/post-categories/${cat.id}`, { method: 'DELETE' })).items; this.load(); toast().show('Đã xóa chuyên mục'); } catch (e) { toast().error(e); }
    },
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
    id: id ? Number(id) : null, form: null, saving: false, slugTouched: !!id, categories: [], authors: [], newCat: '', addingCat: false,
    // Địa chỉ bài viết theo phân cấp: /blog/<chuyên mục>/<bài viết> (chưa có chuyên mục thì /blog/<bài viết>)
    get blogPrefix() { const c = this.categories.find((x) => x.id === Number(this.form?.category_id)); return c && c.active ? `/blog/${c.slug}/` : '/blog/'; },
    async addCategory() {
      if (!this.newCat.trim()) return;
      this.addingCat = true;
      try {
        const r = await api('/post-categories', { method: 'POST', body: { name: this.newCat } });
        this.categories = r.items; this.form.category_id = r.id; this.newCat = '';
        toast().show('Đã thêm chuyên mục');
      } catch (e) { toast().error(e); }
      this.addingCat = false;
    },
    async init() {
      const empty = { title: '', slug: '', excerpt: '', content: '', cover_media_id: null, cover: null, category_id: '', writer_id: '', status: 'draft', published_at: '', seo_title: '', seo_description: '' };
      try {
        this.categories = (await api('/post-categories')).items;
        this.authors = (await api('/authors')).items;
        this.form = this.id ? { ...empty, ...(await api(`/posts/${this.id}`)) } : empty;
        this.form.category_id = this.form.category_id || '';
        this.form.writer_id = this.form.writer_id || '';
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
    ...listPage('/media', { folder: '' }),
    uploading: 0, selected: null, folders: [], checked: [], moveTo: '', creating: false, newName: '', dropTarget: null,
    async init() { await this.loadFolders(); this.load(); },
    get totalAll() { return this.folders.reduce((n, f) => n + f.count, 0); },
    get uploadFolder() { return this.filters.folder || 'general'; },
    label: (name) => (name === 'general' ? 'Chung (mặc định)' : name),
    async loadFolders() { try { this.folders = (await api('/media/folders')).items; } catch (e) { toast().error(e); } },
    setFolder(name) { this.filters.folder = name; this.checked = []; this.selected = null; this.search(); },
    toggleCheck(id) {
      const i = this.checked.indexOf(id);
      if (i >= 0) this.checked.splice(i, 1); else this.checked.push(id);
    },
    async createFolder() {
      try {
        const r = await api('/media/folders', { method: 'POST', body: { name: this.newName } });
        this.folders = r.items; this.creating = false; this.newName = '';
        this.setFolder(r.name);
        toast().show(`Đã tạo thư mục “${r.name}”`);
      } catch (e) { toast().error(e); }
    },
    async renameFolder() {
      const to = window.prompt('Tên mới cho thư mục:', this.filters.folder);
      if (!to || to.trim() === this.filters.folder) return;
      try {
        const r = await api('/media/folders', { method: 'PUT', body: { from: this.filters.folder, to } });
        this.folders = r.items; this.filters.folder = r.name; this.search();
        toast().show('Đã đổi tên thư mục');
      } catch (e) { toast().error(e); }
    },
    async deleteFolder() {
      if (!(await confirmBox({ title: `Xóa thư mục “${this.filters.folder}”?`, message: 'Ảnh trong thư mục không bị xóa, sẽ được chuyển về thư mục "Chung".', okLabel: 'Xóa thư mục' }))) return;
      try {
        const r = await api(`/media/folders?${qs({ name: this.filters.folder })}`, { method: 'DELETE' });
        this.folders = r.items; this.setFolder('');
        toast().show(r.moved ? `Đã xóa thư mục, ${r.moved} ảnh chuyển về “Chung”` : 'Đã xóa thư mục');
      } catch (e) { toast().error(e); }
    },
    async move(ids, folder) {
      const r = await api('/media/move', { method: 'POST', body: { ids, folder } });
      this.folders = r.items;
      toast().show(`Đã chuyển ${r.moved} ảnh vào “${this.label(r.folder)}”`);
      return r;
    },
    async moveChecked() {
      try { await this.move(this.checked, this.moveTo); this.checked = []; this.moveTo = ''; this.selected = null; this.load(); } catch (e) { toast().error(e); }
    },
    async moveOne(folder) {
      try { await this.move([this.selected.id], folder); this.selected = null; this.load(); } catch (e) { toast().error(e); }
    },
    async upload(files, folder) {
      const list = [...files].filter((f) => f.type.startsWith('image/'));
      if (!list.length) return;
      const target = folder || this.uploadFolder;
      this.uploading = list.length;
      try {
        for (let i = 0; i < list.length; i += 5) {
          const fd = new FormData();
          fd.append('folder', target); // phải đứng trước file để server đọc được
          list.slice(i, i + 5).forEach((f) => fd.append('files', f));
          await api('/media', { method: 'POST', form: fd });
        }
        toast().show(`Đã tải ${list.length} ảnh vào “${this.label(target)}”`);
        this.page = 1;
        await this.loadFolders();
        this.load();
      } catch (e) { toast().error(e); }
      this.uploading = 0;
    },
    async saveAlt() {
      try {
        const r = await api(`/media/${this.selected.id}`, { method: 'PATCH', body: { name: this.selected.original_name, alt: this.selected.alt } });
        const row = this.items.find((x) => x.id === r.id); if (row) Object.assign(row, { original_name: r.original_name, alt: r.alt });
        toast().show('Đã lưu tên và mô tả ảnh');
      } catch (e) { toast().error(e); }
    },
    copy(url) { navigator.clipboard?.writeText(location.origin + url); toast().show('Đã sao chép đường dẫn'); },
    async remove(m) {
      if (!(await confirmBox({ title: 'Xóa ảnh vĩnh viễn?', message: 'Nếu ảnh đang được dùng ở sản phẩm, bài viết hoặc cài đặt, vị trí đó sẽ trống ảnh.' }))) return;
      await api(`/media/${m.id}`, { method: 'DELETE' });
      this.selected = null;
      toast().show('Đã xóa ảnh');
      this.loadFolders();
      this.load();
    },
  }));

  // Ngày hôm nay theo giờ Việt Nam (YYYY-MM-DD) cho ô chọn ngày
  const todayVn = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);

  // ---------------- Đơn hàng / yêu cầu ----------------
  Alpine.data('inquiriesList', (type) => ({
    ...listPage('/inquiries', { type: type || '', status: new URLSearchParams(location.search).get('status') || '', from: '', to: '' }, PER_PAGE),
    // Shop tự thêm đơn / yêu cầu từ kênh ngoài website
    add: { open: false, mode: 'existing', q: '', results: [], searching: false, customer: null, form: { name: '', phone: '', email: '', address: '' }, via: '', date: '', status: 'new', doneDate: '', busy: false, error: '' },
    openAdd() {
      this.add = { open: true, mode: 'existing', q: '', results: [], searching: false, customer: null, form: { name: '', phone: '', email: '', address: '' }, via: '', date: todayVn(), status: 'new', doneDate: todayVn(), busy: false, error: '' };
    },
    async searchCustomers() {
      const q = this.add.q.trim();
      if (!q) { this.add.results = []; return; }
      this.add.searching = true;
      try { this.add.results = (await api(`/customers?${qs({ q, by: 'created' })}`)).items.slice(0, 8); } catch (e) { toast().error(e); }
      this.add.searching = false;
    },
    async createManual() {
      const a = this.add;
      a.error = '';
      if (a.mode === 'existing' && !a.customer) { a.error = 'Vui lòng chọn một khách, hoặc chuyển sang “Khách mới”.'; return; }
      a.busy = true;
      try {
        const body = { type: this.filters.type || 'order', contact_via: a.via, created_date: a.date || todayVn(), status: a.status };
        if (a.status === 'completed') body.completed_date = a.doneDate || a.date || todayVn();
        if (a.mode === 'existing') body.customer_id = a.customer.id; else body.customer = { ...a.form, source: a.via };
        const r = await api('/inquiries', { method: 'POST', body });
        window.location.href = `${A}/inquiries/${r.id}`;
      } catch (e) { a.error = Object.values(e.data?.errors || {}).filter((v) => typeof v === 'string').join(' ') || e.message; a.busy = false; }
    },
  }));

  Alpine.data('inquiryDetail', (id) => ({
    d: null, saving: false, dirty: false, notify: false,
    ship: { carrier: '', tracking_code: '' },
    dates: { created: '', completed: '' },
    edit: { items: [], adjustment: 0, adjustment_note: '' },
    pick: { q: '', open: false, results: [] },
    async init() {
      try {
        this.setData(await api(`/inquiries/${id}`));
        this.notify = this.canNotify;   // mặc định gửi email báo khách nếu có thể, admin bỏ tick được
      } catch (e) { toast().error(e); }
    },
    get canNotify() { return !!(this.d?.email && this.d?.mail_ready); },
    get notifyHelp() {
      if (!this.d?.email) return 'Khách chưa để lại email nên không gửi được.';
      if (!this.d.mail_ready) return 'Chưa bật email trong Cài đặt › Email.';
      return 'Gửi tới ' + this.d.email + ' khi bạn đổi trạng thái.';
    },
    // Đổi trạng thái; có thể kèm email báo khách (tùy chọn tick ở trên)
    async changeStatus(status) {
      if (status === this.d.status) return;
      if (!(await this.confirmStatus(status))) return;
      await this.update({ status, notify_customer: this.notify && this.canNotify });
    },
    // Hỏi lại khi đổi trạng thái dễ gây nhầm: nhảy cách bước, hoàn thành, hủy, hoặc lùi khỏi trạng thái hoàn thành
    async confirmStatus(status) {
      const d = this.d;
      const label = (k) => d.flow.find((s) => s.key === k)?.label || k;
      const keys = d.flow.map((s) => s.key).filter((k) => k !== 'cancelled');
      const from = keys.indexOf(d.status), to = keys.indexOf(status);
      const isOrder = d.type === 'order';
      const skipped = from >= 0 && to > from + 1 ? keys.slice(from + 1, to).map(label) : [];
      const mail = this.notify && this.canNotify ? ' Email báo trạng thái mới sẽ được gửi cho khách.' : '';
      let message = '';
      let title = `Chuyển sang "${label(status)}"?`;
      let danger = false;
      if (d.status === 'completed' && status !== 'completed') {
        title = `Đưa đơn về "${label(status)}"?`;
        message = isOrder
          ? `Đơn đang ở trạng thái hoàn thành. Đưa về "${label(status)}" thì đơn này sẽ bị trừ khỏi doanh thu, và khi hoàn thành lại sẽ tính vào ngày hoàn thành mới.`
          : `Yêu cầu đang ở trạng thái "${label(d.status)}". Đưa về "${label(status)}" nghĩa là chưa xử lý xong.`;
      } else if (status === 'cancelled') {
        message = `Đơn sẽ chuyển sang "Đã hủy" và không còn tính vào doanh thu.`;
        danger = true;
      } else if (status === 'completed') {
        title = isOrder ? 'Xác nhận đơn đã hoàn thành?' : `Đánh dấu "${label(status)}"?`;
        message = isOrder
          ? `Doanh thu ${d.total != null ? '(' + window.Admin.fmt.vnd(d.total) + ') ' : ''}sẽ được tính vào hôm nay. Chỉ bấm khi khách đã nhận hàng và thanh toán xong.`
          : `Yêu cầu sẽ được đánh dấu "${label(status)}".`;
        if (skipped.length) message += ` Lưu ý: đơn chưa qua bước ${skipped.map((x) => '"' + x + '"').join(', ')}.`;
      } else if (skipped.length) {
        message = `Đơn đang ở "${label(d.status)}", bạn đang bỏ qua bước ${skipped.map((x) => '"' + x + '"').join(', ')}. Hãy chắc chắn đúng tình trạng thực tế.`;
      } else return true;
      return confirmBox({ title, message: message + mail, okLabel: 'Đồng ý', danger });
    },
    async saveDates() {
      const body = { created_date: this.dates.created };
      if (this.d.status === 'completed') body.completed_date = this.dates.completed;
      await this.update(body);
    },
    async saveShip() { await this.update({ carrier: this.ship.carrier, tracking_code: this.ship.tracking_code }); },
    // Nạp dữ liệu từ server. Phần dòng hàng đang sửa dở không bị ghi đè khi chỉ đổi trạng thái / ghi chú.
    setData(d, resetEdit = true) {
      this.d = d;
      this.ship = { carrier: d.carrier || '', tracking_code: d.tracking_code || '' };
      const vnDay = (t) => (t ? new Date(Date.parse(String(t).replace(' ', 'T') + 'Z') + 7 * 36e5).toISOString().slice(0, 10) : '');
      this.dates = { created: vnDay(d.created_at), completed: vnDay(d.completed_at) };
      if (resetEdit) {
        this.edit = {
          items: d.items.map((i) => ({ ...i, price: i.price ?? '' })),
          adjustment: d.adjustment || 0,
          adjustment_note: d.adjustment_note || '',
        };
        this.dirty = false;
      }
    },
    get calc() {
      const its = this.edit.items;
      const priced = its.length && its.every((i) => i.price !== '' && i.price != null);
      const sub = priced ? its.reduce((s, i) => s + Number(i.price) * (Number(i.qty) || 1), 0) : null;
      return { sub, total: sub == null ? null : sub + (Number(this.edit.adjustment) || 0) };
    },
    addLine() { this.edit.items.push({ id: null, name: '', sku: '', slug: '', size: '', size_label: '', note: '', qty: 1, price: '' }); this.dirty = true; },
    async searchProducts() {
      if (!this.pick.q.trim()) { this.pick.results = []; return; }
      try { this.pick.results = (await api(`/products?${qs({ q: this.pick.q, per_page: 8 })}`)).items; this.pick.open = true; } catch (e) { toast().error(e); }
    },
    addProduct(p) {
      this.edit.items.push({ id: p.id, name: p.name, sku: p.sku || '', slug: p.slug, size: '', size_label: p.size_cfg?.label || '', note: '', qty: 1, price: p.final_price ?? '' });
      this.pick = { q: '', open: false, results: [] };
      this.dirty = true;
    },
    async saveItems() {
      if (this.d.type === 'order' && this.d.status === 'completed' && !(await confirmBox({
        title: 'Đơn đã hoàn thành, vẫn sửa giá?',
        message: `Doanh thu của ngày hoàn thành${this.d.completed_at ? ' (' + window.Admin.fmt.date(this.d.completed_at) + ')' : ''} sẽ thay đổi theo tổng tiền mới (hiện là ${this.d.total != null ? window.Admin.fmt.vnd(this.d.total) : 'chưa có giá'}). Chỉ sửa khi số liệu cũ bị sai.`,
        okLabel: 'Vẫn lưu', danger: true,
      }))) return;
      this.saving = true;
      try {
        const body = {
          items: this.edit.items.map((i) => ({ ...i, price: i.price === '' ? null : Number(i.price) })),
          adjustment: Number(this.edit.adjustment) || 0,
          adjustment_note: this.edit.adjustment_note,
        };
        this.setData(await api(`/inquiries/${id}`, { method: 'PATCH', body }));
        toast().show('Đã lưu sản phẩm & giá');
      } catch (e) { toast().error(e); }
      this.saving = false;
    },
    async convert() {
      if (!(await confirmBox({ title: 'Lên đơn hàng từ yêu cầu này?', message: 'Yêu cầu này sẽ chuyển thành đơn hàng ngay trên cùng một bản ghi (mã DH mới, không tạo thêm bản ghi thứ hai). Khách vẫn tra cứu được bằng mã cũ.', okLabel: 'Lên đơn', danger: false }))) return;
      this.saving = true;
      try {
        this.setData(await api(`/inquiries/${id}/convert`, { method: 'POST' }));
        toast().show('Đã chuyển thành đơn hàng');
      } catch (e) { toast().error(e); }
      this.saving = false;
    },
    async update(patch) {
      this.saving = true;
      try {
        const r = await api(`/inquiries/${id}`, { method: 'PATCH', body: patch });
        this.setData(r, false);
        const mailMsg = { sent: ' và đã gửi email cho khách', failed: ', nhưng gửi email cho khách bị lỗi', no_email: ', khách chưa có email', not_configured: ', email chưa được cấu hình' }[r.notified] || '';
        toast().show('Đã cập nhật' + mailMsg, r.notified === 'failed' ? 'error' : undefined);
      } catch (e) { toast().error(e); }
      this.saving = false;
    },
    async resend() {
      try { this.setData(await api(`/inquiries/${id}/resend`, { method: 'POST' }), false); toast().show(this.d.mail_status === 'sent' ? 'Đã gửi lại email' : 'Gửi email chưa thành công, kiểm tra cấu hình SMTP', this.d.mail_status === 'sent' ? 'success' : 'error'); } catch (e) { toast().error(e); }
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

  // ---------------- Tác giả blog ----------------
  Alpine.data('authorsPage', () => ({
    items: [], form: null, saving: false, loading: true,
    async init() { await this.load(); },
    async load() { try { this.items = (await api('/authors')).items; } catch (e) { toast().error(e); } this.loading = false; },
    open(a) {
      this.form = a
        ? { ...a, active: !!a.active, linksText: (a.links || []).join('\n') }
        : { name: '', job_title: '', bio: '', avatar_media_id: null, avatar: null, linksText: '', active: true, sort_order: this.items.length };
    },
    async save() {
      this.saving = true;
      try {
        const f = this.form;
        const body = { ...f, links: f.linksText };
        const r = await api(f.id ? `/authors/${f.id}` : '/authors', { method: f.id ? 'PUT' : 'POST', body });
        this.items = r.items; this.form = null;
        toast().show('Đã lưu tác giả');
      } catch (e) { toast().error(e); }
      this.saving = false;
    },
    async remove(a) {
      if (!(await confirmBox({ title: `Xóa tác giả “${a.name}”?`, message: a.post_count ? `${a.post_count} bài viết của tác giả này sẽ chuyển sang ghi là của shop, bài viết không bị xóa.` : 'Tác giả chưa có bài viết nào.' }))) return;
      try { this.items = (await api(`/authors/${a.id}`, { method: 'DELETE' })).items; toast().show('Đã xóa tác giả'); } catch (e) { toast().error(e); }
    },
  }));

  // ---------------- Vai trò & phân quyền ----------------
  Alpine.data('rolesPage', () => ({
    roles: [], groups: [], form: null, saving: false, loading: true,
    async init() { await this.load(); },
    async load() { try { const r = await api('/roles'); this.roles = r.items; this.groups = r.groups; } catch (e) { toast().error(e); } this.loading = false; },
    open(r) { this.form = r ? { ...r, permissions: [...r.permissions] } : { name: '', description: '', permissions: [] }; },
    has(k) { return this.form.permissions.includes(k); },
    toggle(k) { const i = this.form.permissions.indexOf(k); if (i >= 0) this.form.permissions.splice(i, 1); else this.form.permissions.push(k); },
    groupAll(g) { return g.items.every((i) => this.has(i.key)); },
    toggleGroup(g) { const on = !this.groupAll(g); g.items.forEach((i) => { const h = this.has(i.key); if (on && !h) this.form.permissions.push(i.key); if (!on && h) this.toggle(i.key); }); },
    summary(r) { const n = r.permissions.length; return n ? n + ' quyền' : 'Chưa có quyền nào'; },
    async save() {
      this.saving = true;
      try {
        const f = this.form;
        const r = await api(f.id ? `/roles/${f.id}` : '/roles', { method: f.id ? 'PUT' : 'POST', body: f });
        this.roles = r.items; this.form = null;
        toast().show('Đã lưu vai trò');
      } catch (e) { toast().error(e); }
      this.saving = false;
    },
    async remove(r) {
      if (!(await confirmBox({ title: `Xóa vai trò “${r.name}”?`, message: r.user_count ? `Còn ${r.user_count} tài khoản đang dùng, hệ thống sẽ không cho xóa.` : 'Vai trò chưa có tài khoản nào.' }))) return;
      try { this.roles = (await api(`/roles/${r.id}`, { method: 'DELETE' })).items; toast().show('Đã xóa vai trò'); } catch (e) { toast().error(e); }
    },
  }));

  // ---------------- Chuyển hướng & 404 ----------------
  Alpine.data('redirectsPage', () => ({
    ...listPage('/redirects', { auto: '' }),
    tab: 'redirects', form: null, formError: '', saving: false, notFound: [],
    bulk: { open: false, text: '', status: 301, errors: [] },
    init() { this.load(); this.loadNotFound(); },
    async loadNotFound() { try { this.notFound = (await api('/redirects/not-found')).items; } catch (e) { toast().error(e); } },
    openForm(r) {
      this.formError = '';
      this.bulk.open = false;
      this.form = r ? { ...r, active: !!r.active } : { from_path: '', to_url: '', status: 301, note: '', active: true };
      this.tab = 'redirects';
      this.$nextTick(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    },
    fromNotFound(n) { this.openForm(null); this.form.from_path = n.path; },
    async save() {
      this.saving = true; this.formError = '';
      try {
        const f = this.form;
        await api(f.id ? `/redirects/${f.id}` : '/redirects', { method: f.id ? 'PUT' : 'POST', body: f });
        toast().show('Đã lưu chuyển hướng');
        this.form = null;
        this.load(); this.loadNotFound();
      } catch (e) { this.formError = e.message; }
      this.saving = false;
    },
    async toggle(r) {
      try { await api(`/redirects/${r.id}`, { method: 'PUT', body: { ...r, active: !r.active } }); r.active = r.active ? 0 : 1; } catch (e) { toast().error(e); }
    },
    async remove(r) {
      if (!(await confirmBox({ title: 'Xóa chuyển hướng?', message: `Đường dẫn ${r.from_path} sẽ không còn được chuyển hướng.`, okLabel: 'Xóa' }))) return;
      try { await api(`/redirects/${r.id}`, { method: 'DELETE' }); toast().show('Đã xóa'); this.load(); } catch (e) { toast().error(e); }
    },
    async runBulk() {
      this.saving = true; this.bulk.errors = [];
      try {
        const r = await api('/redirects/bulk', { method: 'POST', body: { text: this.bulk.text, status: this.bulk.status } });
        this.bulk.errors = r.errors;
        toast().show(`Đã thêm ${r.created}, cập nhật ${r.updated}${r.errors.length ? `, ${r.errors.length} dòng lỗi` : ''}`, r.errors.length ? 'error' : undefined);
        if (!r.errors.length) { this.bulk.text = ''; this.bulk.open = false; }
        this.load(); this.loadNotFound();
      } catch (e) { toast().error(e); }
      this.saving = false;
    },
    async clearNotFound(path) {
      try { await api(`/redirects/not-found${path ? '?path=' + encodeURIComponent(path) : ''}`, { method: 'DELETE' }); this.loadNotFound(); } catch (e) { toast().error(e); }
    },
  }));

  // ---------------- Khách hàng ----------------
  Alpine.data('customersList', () => ({
    ...listPage('/customers', { months: '', by: 'active', source: '', segment: '' }, PER_PAGE),
    summary: { customers: 0, inquiries: 0, spent: 0 }, sources: [],
    // Bộ lọc thu gọn: nút "Bộ lọc" mở khung, kết quả lọc hiện thành các chip bên dưới
    filtersOpen: false, preset: '',
    // Nhập hàng loạt
    imp: { open: false, text: '', source: '', tags: '', onDuplicate: 'skip', date: '', preview: null, busy: false, result: null, fileName: '' },
    selected: [], adding: false, saving: false, errors: {}, formError: '', dupId: null,
    form: { name: '', phone: '', email: '', address: '', wrist_size: '', note: '', tags: '', source: '', created_date: '' },
    segments: {}, segmentLabels: { lead: 'Người quan tâm', ordered: 'Đã đặt hàng', bought: 'Đã mua', repeat: 'Mua lại' },
    // 12 tháng gần nhất theo giờ Việt Nam, mới nhất trước
    get monthOptions() {
      const now = new Date(Date.now() + 7 * 36e5);
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        return { key, label: `Tháng ${d.getUTCMonth() + 1}/${d.getUTCFullYear()}` };
      });
    },
    get exportUrl() { return `${A}/api/customers/export.csv?${qs({ q: this.filters.q, months: this.filters.months, by: this.filters.by, source: this.filters.source, segment: this.filters.segment })}`; },
    get monthLabel() { return Object.fromEntries(this.monthOptions.map((m) => [m.key, m.label])); },
    // Các bộ lọc đang bật, dạng chip có nút bỏ
    get chips() {
      const list = [];
      if (this.selected.length) {
        const names = this.preset && this.preset !== 'pick' ? this.presetLabels[this.preset] : this.selected.map((k) => this.monthLabel[k] || k).join(', ');
        list.push({ key: 'time', text: 'Thời gian: ' + names });
        list.push({ key: 'by', text: this.filters.by === 'created' ? 'Tính theo: khách mới tạo' : 'Tính theo: có phát sinh đơn/yêu cầu', fixed: true });
      }
      if (this.filters.source) list.push({ key: 'source', text: 'Nguồn: ' + this.filters.source });
      return list;
    },
    get filterCount() { return (this.selected.length ? 1 : 0) + (this.filters.source ? 1 : 0); },
    setSegment(k) { this.filters.segment = this.filters.segment === k ? '' : k; this.search(); },
    presetLabels: { this: 'Tháng này', last: 'Tháng trước', 3: '3 tháng gần nhất', 6: '6 tháng gần nhất', year: 'Năm nay' },
    setPreset(v) {
      this.preset = v;
      const keys = this.monthOptions.map((m) => m.key);
      const year = keys[0].slice(0, 4);
      if (v === '') this.selected = [];
      else if (v === 'this') this.selected = [keys[0]];
      else if (v === 'last') this.selected = [keys[1]];
      else if (v === '3' || v === '6') this.selected = keys.slice(0, Number(v));
      else if (v === 'year') this.selected = keys.filter((k) => k.startsWith(year));
      else if (v === 'pick') { if (!this.selected.length) this.selected = [keys[0]]; }
      this.applyMonths();
    },
    clearChip(key) {
      if (key === 'time') { this.preset = ''; this.selected = []; this.applyMonths(); }
      if (key === 'source') { this.filters.source = ''; this.search(); }
    },
    clearAll() { this.preset = ''; this.selected = []; this.filters.source = ''; this.filters.months = ''; this.search(); },
    // ----- Nhập hàng loạt -----
    async readImportFile(ev) {
      const f = ev.target.files?.[0];
      if (!f) return;
      this.imp.fileName = f.name;
      this.imp.text = await f.text();
      this.imp.preview = null; this.imp.result = null;
      ev.target.value = '';
    },
    importBody() { const i = this.imp; return { text: i.text, source: i.source, tags: i.tags, on_duplicate: i.onDuplicate, default_date: i.date || todayVn() }; },
    async previewImport() {
      if (!this.imp.text.trim()) { toast().show('Hãy dán danh sách hoặc chọn file trước', 'error'); return; }
      this.imp.busy = true; this.imp.result = null;
      try { this.imp.preview = await api('/customers/import/preview', { method: 'POST', body: this.importBody() }); } catch (e) { toast().error(e); }
      this.imp.busy = false;
    },
    async runImport() {
      const c = this.imp.preview?.counts;
      if (!c || !(c.new + c.update)) return;
      this.imp.busy = true;
      try {
        this.imp.result = await api('/customers/import', { method: 'POST', body: this.importBody() });
        this.imp.preview = null; this.imp.text = ''; this.imp.fileName = '';
        toast().show(`Đã nhập ${this.imp.result.created} khách mới${this.imp.result.updated ? `, cập nhật ${this.imp.result.updated}` : ''}`);
        this.load();
      } catch (e) { toast().error(e); }
      this.imp.busy = false;
    },
    get importStatusLabel() { return { new: 'Mới', update: 'Cập nhật', skip: 'Bỏ qua', error: 'Lỗi' }; },
    async load() {
      if (!this.restored) {
        // Nạp bộ lọc, trang, số dòng từ địa chỉ để Quay lại từ trang chi tiết về đúng trang đang xem
        this.restoreState();
        this.selected = this.filters.months ? this.filters.months.split(',').filter(Boolean) : [];
        this.preset = this.selected.length ? 'pick' : '';
      }
      this.loading = true;
      try {
        const r = await api(`/customers?${qs({ ...this.filters, page: this.page, per_page: this.perPage })}`);
        this.items = r.items; this.total = r.total; this.pages = r.pages; this.summary = r.summary; this.sources = r.sources || []; this.segments = r.segments || {};
        if (this.page > this.pages) { this.page = this.pages; return this.load(); }
        this.syncUrl();
      } catch (e) { toast().error(e); }
      this.loading = false;
    },
    applyMonths() { this.filters.months = this.selected.join(','); this.search(); },
    toggleMonth(key) {
      const i = this.selected.indexOf(key);
      if (i >= 0) this.selected.splice(i, 1); else this.selected.push(key);
      this.applyMonths();
    },
    // n tháng gần nhất; skipCurrent = chỉ lấy tháng trước (không gồm tháng này)
    quick(n, skipCurrent = false) {
      const keys = this.monthOptions.map((m) => m.key);
      this.selected = skipCurrent ? [keys[1]] : keys.slice(0, n);
      this.applyMonths();
    },
    openNew() { this.adding = true; this.form.created_date = todayVn(); this.imp.date = this.imp.date || todayVn(); this.errors = {}; this.formError = ''; this.dupId = null; this.$nextTick(() => this.$el.querySelector('form input')?.focus()); },
    async create(thenOrder) {
      this.saving = true; this.errors = {}; this.formError = ''; this.dupId = null;
      try {
        const c = await api('/customers', { method: 'POST', body: this.form });
        if (thenOrder) {
          const o = await api('/inquiries', { method: 'POST', body: { customer_id: c.id, type: 'order', created_date: this.form.created_date || todayVn() } });
          window.location.href = `${A}/inquiries/${o.id}`;
        } else {
          window.location.href = `${A}/customers/${c.id}`;
        }
      } catch (e) {
        this.errors = e.data?.errors || {};
        this.dupId = e.data?.errors?.existing_id || null;
        this.formError = e.message;
        this.saving = false;
      }
    },
  }));

  Alpine.data('customerDetail', (id) => ({
    c: null, saving: false,
    async init() { try { this.c = await api(`/customers/${id}`); } catch (e) { toast().error(e); } },
    async save() {
      this.saving = true;
      try { this.c = await api(`/customers/${id}`, { method: 'PUT', body: this.c }); toast().show('Đã lưu thông tin khách'); } catch (e) { toast().error(e); }
      this.saving = false;
    },
    // Tạo đơn / yêu cầu mới cho khách này rồi mở trang chi tiết để điền sản phẩm và giá
    async newInquiry(type) {
      this.saving = true;
      try {
        const o = await api('/inquiries', { method: 'POST', body: { customer_id: Number(id), type } });
        window.location.href = `${A}/inquiries/${o.id}`;
      } catch (e) { toast().error(e); this.saving = false; }
    },
    async remove() {
      if (!(await confirmBox({ title: 'Xóa khách hàng?', message: 'Các đơn/yêu cầu cũ vẫn được giữ nhưng không còn liên kết với khách này.' }))) return;
      await api(`/customers/${id}`, { method: 'DELETE' });
      window.location.href = `${A}/customers`;
    },
  }));

  // ---------------- Cài đặt ----------------
  Alpine.data('settingsPage', (key, secKeys = []) => ({
    key, values: null, media: {}, saving: false, testing: false, openSec: {}, secKeys,
    // Các phần thu gọn / mở ra (nhóm cài đặt có "sections"); lưu lựa chọn trên trình duyệt này
    // Từng mục trong danh sách có thể gập (hero_slides, info_blocks, các khối trang chủ...); mặc định thu gọn
    openItems: {},
    itemOpen(field, i) { return !!this.openItems[field + ':' + i]; },
    toggleItem(field, i) { this.openItems[field + ':' + i] = !this.openItems[field + ':' + i]; },
    toggleItems(field, on) { (this.values[field] || []).forEach((_, i) => { this.openItems[field + ':' + i] = on; }); },
    isOpen(k) { return !!this.openSec[k]; },
    toggle(k) { this.openSec[k] = !this.openSec[k]; this.saveSec(); },
    toggleAll(on) { this.secKeys.forEach((k) => { this.openSec[k] = on; }); this.saveSec(); },
    saveSec() { try { localStorage.setItem('ln_admin_sec_' + key, JSON.stringify(this.openSec)); } catch { /* chế độ riêng tư */ } },
    initSec() {
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem('ln_admin_sec_' + key)) || {}; } catch { /* bỏ qua */ }
      this.secKeys.forEach((k, i) => { this.openSec[k] = k in saved ? !!saved[k] : i === 0; });
    },
    async init() {
      this.initSec();
      try {
        const r = await api(`/settings/${key}`);
        this.media = r.media || {};
        this.values = r.values;
      } catch (e) { toast().error(e); }
    },
    addItem(field, blank) { (this.values[field] ||= []).push(structuredClone(blank)); },
    // Chọn nhiều ảnh cùng lúc: mỗi ảnh thành một mục mới (VD mỗi ảnh một banner), mục chỉ có ảnh, chữ điền sau
    bulkAdd(field, imageKey, blank) {
      Alpine.store('picker').show({
        multiple: true,
        onSelect: (list) => {
          for (const m of list || []) {
            this.media[m.id] = m;
            const item = structuredClone(blank);
            item[imageKey] = m.id;
            (this.values[field] ||= []).push(item);
          }
        },
      });
    },
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
    users: [], roles: [], editing: null, saving: false,
    async init() { this.load(); },
    async load() {
      try { [this.users, this.roles] = await Promise.all([api('/users'), api('/roles').then((r) => r.items)]); } catch (e) { toast().error(e); }
    },
    // Ô chọn vai trò gộp: "owner" (Chủ shop) hoặc mã vai trò tùy chỉnh / có sẵn
    open(u) {
      this.editing = u
        ? { ...u, active: !!u.active, password: '', roleChoice: u.role === 'owner' ? 'owner' : String(u.role_id || 1) }
        : { email: '', name: '', role: 'staff', password: '', active: true, roleChoice: '1' };
    },
    async save() {
      this.saving = true;
      try {
        const e = { ...this.editing };
        e.role = e.roleChoice === 'owner' ? 'owner' : 'staff';
        e.role_id = e.role === 'staff' ? Number(e.roleChoice) : null;
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
