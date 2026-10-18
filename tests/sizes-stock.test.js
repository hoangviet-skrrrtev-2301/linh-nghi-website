// Kích cỡ theo loại sản phẩm, quản lý kho (tùy chọn), ngày nhập lại dữ liệu cũ, phân loại khách, gợi ý tìm kiếm.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { boot, OWNER } from './helpers.js';

let ctx;
let owner;
let inq;
const customer = { name: 'Khách Kho', phone: '0911222333' };
const today = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);

before(async () => {
  ctx = await boot({ content: true });
  owner = ctx.session();
  await owner.login(OWNER);
  inq = await import('../backend/services/inquiries.js');
  // Bật loại Pháp phục để khách đặt được
  const types = (await owner.api('/product-types')).json.items;
  const pp = types.find((t) => !t.uses_jade_fields);
  const r = await owner.api(`/product-types/${pp.id}`, 'PUT', { ...pp, active: true, size_options: 'S, M, L' });
  assert.equal(r.status, 200);
  ctx.ppType = pp.id;
});
after(() => ctx.close());

const makeProduct = async (patch) => {
  const r = await owner.api('/products', 'POST', { name: 'SP thử ' + Math.random().toString(36).slice(2, 7), price: 1_000_000, status: 'published', ...patch });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  return r.json.id;
};
const order = (items, extra = {}) => inq.createInquiry('order', { ...customer, address: '12 Phố Thử, Hà Nội', items, ...extra });
const stockOf = (id) => ctx.db.prepare('SELECT stock_qty FROM products WHERE id = ?').pluck().get(id);

test('loại không phải ngọc: kích cỡ là chữ tự đặt, khách phải chọn đúng trong danh sách, có ô thông tin thêm', async () => {
  const id = await makeProduct({ product_type_id: ctx.ppType, sizes: 'S, M, Free size' });
  const p = (await owner.api(`/products/${id}`)).json;
  assert.deepEqual(p.sizes, ['S', 'M', 'Free size']);

  await assert.rejects(order([{ id, qty: 1 }]), (e) => e.status === 422, 'chưa chọn kích cỡ');
  await assert.rejects(order([{ id, qty: 1, size: 'XL' }]), (e) => e.status === 422 && /Kích cỡ/.test(e.message), 'kích cỡ ngoài danh sách');
  const ok = await order([{ id, qty: 1, size: 'm', note: 'Cao 165cm, nặng 55kg' }]);
  assert.equal(ok.items[0].size, 'M', 'chuẩn hóa theo danh sách');
  assert.equal(ok.items[0].size_label, 'Kích cỡ');
  assert.equal(ok.items[0].note, 'Cao 165cm, nặng 55kg');
  const wrist = ctx.db.prepare('SELECT wrist_size FROM customers WHERE phone = ?').pluck().get('0911222333');
  assert.equal(wrist, '', 'kích cỡ chữ không bị ghi nhầm vào ni tay của khách');
});

test('loại ngọc vẫn cho nhập ni riêng; sản phẩm không có danh sách kích cỡ thì bỏ qua kích cỡ gửi lên', async () => {
  const jade = await makeProduct({ product_type_id: 1, sizes: '54, 56' });
  const o = await order([{ id: jade, qty: 1, size: '58' }]);
  assert.equal(o.items[0].size, '58');
  assert.equal(o.items[0].size_label, 'Ni tay');
  const plain = await makeProduct({ product_type_id: 1 });
  const o2 = await order([{ id: plain, qty: 1, size: '99' }]);
  assert.equal(o2.items[0].size, '');
});

test('quản lý kho tắt thì sản phẩm được tick theo dõi vẫn bán như thường', async () => {
  const id = await makeProduct({ product_type_id: 1, track_stock: true, stock_qty: 1 });
  const o = await order([{ id, qty: 5 }]);
  assert.ok(o.code);
  assert.equal(stockOf(id), 1);
});

test('quản lý kho: chặn đặt quá số còn, trừ khi xác nhận, hoàn khi lùi / hủy / sửa / xóa; hết hàng tự hiện Đã bán', async () => {
  ctx.setSettings('features', { inventory_enabled: true, inventory_deduct_at: 'confirmed', inventory_block_over: true, inventory_display: 'low', inventory_low: 3 });
  const id = await makeProduct({ product_type_id: 1, track_stock: true, stock_qty: 5 });
  assert.equal(stockOf(id), 5);

  await assert.rejects(order([{ id, qty: 6 }]), (e) => e.status === 422 && /chỉ còn 5/.test(e.message));
  const o = await order([{ id, qty: 2 }]);
  assert.equal(stockOf(id), 5, 'đơn mới chưa chiếm kho');

  const patch = (body) => owner.api(`/inquiries/${o.id}`, 'PATCH', body);
  await patch({ status: 'confirmed' });
  assert.equal(stockOf(id), 3);
  await patch({ status: 'shipping' });
  assert.equal(stockOf(id), 3, 'đổi sang bước sau không trừ lần hai');
  await patch({ items: [{ id, name: 'x', qty: 1, price: 1000 }] });
  assert.equal(stockOf(id), 4, 'sửa số lượng thì kho điều chỉnh theo');
  await patch({ status: 'cancelled' });
  assert.equal(stockOf(id), 5, 'hủy đơn hoàn kho');
  await patch({ status: 'confirmed' });
  assert.equal(stockOf(id), 4);
  await patch({ status: 'contacted' });
  assert.equal(stockOf(id), 5, 'lùi trạng thái hoàn kho');
  await patch({ status: 'confirmed' });
  assert.equal((await owner.api(`/inquiries/${o.id}`, 'DELETE')).status, 200);
  assert.equal(stockOf(id), 5, 'xóa đơn hoàn kho');

  const log = ctx.db.prepare('SELECT COUNT(*) FROM stock_log WHERE product_id = ?').pluck().get(id);
  assert.ok(log >= 6, 'có nhật ký kho');

  // Sắp hết: hiện chữ cho khách; hết hẳn: Đã bán và không đặt được
  await owner.api(`/products/${id}`, 'PUT', { ...(await owner.api(`/products/${id}`)).json, stock_qty: 2, status: 'published' });
  const catalog = await import('../backend/services/catalog.js');
  assert.match(catalog.getProduct(id).stock_note, /chỉ còn 2/);
  await owner.api(`/products/${id}`, 'PUT', { ...(await owner.api(`/products/${id}`)).json, stock_qty: 0, status: 'published' });
  assert.equal(catalog.getProduct(id).stock_status, 'sold_out');
  await assert.rejects(order([{ id, qty: 1 }]), (e) => e.status === 422);
});

test('đơn do shop tạo ở trạng thái đã xác nhận cũng trừ kho; chọn ngày cũ ghi đúng ngày tạo và ngày hoàn thành', async () => {
  const id = await makeProduct({ product_type_id: 1, track_stock: true, stock_qty: 4 });
  const r = await owner.api('/inquiries', 'POST', {
    type: 'order', customer: { name: 'Khách Cũ', phone: '0955000111' }, items: [{ id, name: 'x', qty: 3, price: 2_000_000 }],
    status: 'completed', created_date: '2026-09-01', completed_date: '2026-09-05',
  });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(stockOf(id), 1);
  assert.match(r.json.code, /^DH260901-/);
  assert.ok(r.json.created_at.startsWith('2026-09-01'));
  assert.ok(r.json.completed_at.startsWith('2026-09-05'));
  const cust = ctx.db.prepare('SELECT created_at FROM customers WHERE phone = ?').pluck().get('0955000111');
  assert.ok(cust.startsWith('2026-09-01'), 'khách mới nhập cùng đơn lấy ngày của đơn');

  // sửa ngày sau đó
  const e = await owner.api(`/inquiries/${r.json.id}`, 'PATCH', { created_date: '2026-08-20', completed_date: '2026-08-25' });
  assert.ok(e.json.created_at.startsWith('2026-08-20'));
  assert.ok(e.json.completed_at.startsWith('2026-08-25'));
});

test('ngày không hợp lệ bị từ chối; mặc định là hôm nay', async () => {
  const base = { type: 'order', customer: { name: 'Khách Ngày', phone: '0955000222' }, items: [{ name: 'x', qty: 1, price: 1000 }] };
  assert.equal((await owner.api('/inquiries', 'POST', { ...base, created_date: '2999-01-01' })).status, 422, 'tương lai');
  assert.equal((await owner.api('/inquiries', 'POST', { ...base, created_date: '31/02/2026' })).status, 422, 'định dạng sai');
  assert.equal((await owner.api('/inquiries', 'POST', { ...base, status: 'completed', created_date: '2026-09-10', completed_date: '2026-09-01' })).status, 422, 'hoàn thành trước ngày tạo');
  assert.equal(ctx.db.prepare("SELECT COUNT(*) FROM customers WHERE phone = '0955000222'").pluck().get(), 0, 'lỗi ngày thì không tạo khách dở dang');
  const ok = await owner.api('/inquiries', 'POST', base);
  assert.equal(ok.status, 200);
  assert.ok(ok.json.code.startsWith('DH' + today.slice(2).replace(/-/g, '')));
});

test('thêm khách và nhập hàng loạt có ngày; cột ngày trong file ưu tiên hơn ngày mặc định', async () => {
  const c = await owner.api('/customers', 'POST', { name: 'Khách Nhập Lại', phone: '0966111222', created_date: '2026-03-15' });
  assert.equal(c.status, 200);
  assert.ok(c.json.created_at.startsWith('2026-03-15'));
  assert.equal((await owner.api('/customers', 'POST', { name: 'Khách Tương Lai', phone: '0966111333', created_date: '2999-01-01' })).status, 422);

  const text = 'Họ tên\tSố điện thoại\tNgày tạo\nAn\t0977000001\t20/05/2026\nBình\t0977000002\t\nCường\t0977000003\tsai-ngay';
  const prev = await owner.api('/customers/import/preview', 'POST', { text, default_date: '2026-04-01' });
  assert.equal(prev.status, 200);
  const rows = Object.fromEntries(prev.json.rows.map((r) => [r.name, r]));
  assert.equal(rows.An.created_date, '2026-05-20');
  assert.equal(rows['Bình'].created_date, '2026-04-01');
  assert.equal(rows['Cường'].created_date, '2026-04-01', 'ngày sai dùng ngày mặc định');
  const done = await owner.api('/customers/import', 'POST', { text, default_date: '2026-04-01' });
  assert.equal(done.json.created, 3);
  const got = ctx.db.prepare("SELECT name, created_at FROM customers WHERE phone LIKE '09770000%' ORDER BY phone").all();
  assert.ok(got[0].created_at.startsWith('2026-05-20'));
  assert.ok(got[1].created_at.startsWith('2026-04-01'));
});

test('phân loại khách tự tính: người quan tâm → đã đặt hàng → đã mua → mua lại', async () => {
  const seg = async (phone) => {
    const r = await owner.api(`/customers?q=${phone}`);
    return r.json.items.find((c) => c.phone === phone)?.segment;
  };
  const phone = '0988777666';
  const c = (await owner.api('/inquiries', 'POST', { type: 'contact', customer: { name: 'Người Hỏi', phone }, message: 'hỏi giá vòng' })).json;
  assert.equal(await seg(phone), 'lead');
  const o1 = (await owner.api('/inquiries', 'POST', { type: 'order', customer_id: c.customer_id, items: [{ name: 'A', qty: 1, price: 1000 }] })).json;
  assert.equal(await seg(phone), 'ordered');
  await owner.api(`/inquiries/${o1.id}`, 'PATCH', { status: 'cancelled' });
  assert.equal(await seg(phone), 'lead', 'đơn hủy thì vẫn là người quan tâm');
  await owner.api(`/inquiries/${o1.id}`, 'PATCH', { status: 'completed' });
  assert.equal(await seg(phone), 'bought');
  const o2 = (await owner.api('/inquiries', 'POST', { type: 'order', customer_id: c.customer_id, items: [{ name: 'B', qty: 1, price: 1000 }], status: 'completed' })).json;
  assert.ok(o2.id);
  assert.equal(await seg(phone), 'repeat');

  const list = await owner.api('/customers?segment=repeat');
  assert.ok(list.json.items.every((x) => x.segment === 'repeat'));
  assert.ok(list.json.segments.repeat >= 1 && 'lead' in list.json.segments);
  // kết thúc không mua của liên hệ / custom có tên riêng
  const closed = (await owner.api(`/inquiries/${c.id}`, 'PATCH', { status: 'cancelled' })).json;
  assert.equal(closed.status_label, 'Không phát sinh đơn');
});

test('gợi ý tìm kiếm: không phân biệt dấu, có sản phẩm kèm giá; tắt được; chuỗi quá ngắn trả rỗng', async () => {
  const q = async (s) => (await (await ctx.raw('/api/search-suggest?q=' + encodeURIComponent(s))).json());
  const name = ctx.db.prepare("SELECT name FROM products WHERE status = 'published' AND product_type_id = 1 LIMIT 1").pluck().get();
  const word = name.split(' ').find((w) => w.length >= 3) || name;
  const r = await q(word);
  assert.ok(r.items.length >= 1, 'có gợi ý cho từ trong tên sản phẩm');
  assert.ok(r.items[0].url.startsWith('/san-pham/'));
  assert.ok('final_price' in r.items[0] && 'cover' in r.items[0]);
  const folded = await q(word.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toUpperCase());
  assert.ok(folded.items.length >= 1, 'gõ không dấu / chữ hoa vẫn ra');
  assert.deepEqual((await q('a')).items, []);
  assert.ok((await q('<script>')).items.length === 0);
  ctx.setSettings('features', { search_suggest: false });
  assert.deepEqual((await q(word)).items, []);
  ctx.setSettings('features', { search_suggest: true });
});

test('sắp xếp "Bán chạy nhất" theo số đã bán (đơn đã xác nhận trở đi)', async () => {
  const a = await makeProduct({ product_type_id: 1, name: 'Vòng bán ít' });
  const b = await makeProduct({ product_type_id: 1, name: 'Vòng bán nhiều' });
  const place = async (id, qty, status) => owner.api('/inquiries', 'POST', { type: 'order', customer: { name: 'Khách Mua', phone: '0944555666' }, items: [{ id, name: 'x', qty, price: 1000 }], status });
  await place(a, 1, 'completed');
  await place(b, 3, 'confirmed');
  await place(a, 9, 'new');   // đơn mới chưa tính
  const catalog = await import('../backend/services/catalog.js');
  const ids = catalog.searchProducts({ sap_xep: 'ban_chay' }, { perPage: 100 }).items.map((p) => p.id);
  assert.ok(ids.indexOf(b) !== -1 && ids.indexOf(b) < ids.indexOf(a), 'bán nhiều xếp trước');
});
