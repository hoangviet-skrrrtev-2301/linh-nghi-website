// Đơn hàng, trạng thái và doanh thu: bấm nhầm Hoàn thành rồi sửa lại, sửa giá, hủy, lên đơn, xóa sản phẩm không làm đổi doanh thu.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { boot, OWNER } from './helpers.js';

let ctx;
let owner;
const revenue = async () => (await owner.api('/dashboard?range=30d')).json.totals.revenue;
const customer = { name: 'Khách Thử', phone: '0912345678' };

before(async () => {
  ctx = await boot({ content: true });
  owner = ctx.session();
  await owner.login(OWNER);
});
after(() => ctx.close());

test('tạo đơn thủ công: tổng tiền = dòng hàng + điều chỉnh', async () => {
  const r = await owner.api('/inquiries', 'POST', { type: 'order', customer, items: [{ name: 'Vòng thử', qty: 2, price: 1_000_000 }], adjustment: 50_000 });
  assert.equal(r.status, 200);
  assert.equal(r.json.total, 2_050_000);
  assert.equal(r.json.status, 'new');
});

test('doanh thu chỉ tính đơn Hoàn thành; lùi trạng thái thì trừ lại; hoàn thành lại thì tính lại', async () => {
  const base = await revenue();
  const o = (await owner.api('/inquiries', 'POST', { type: 'order', customer, items: [{ name: 'A', qty: 1, price: 3_000_000 }] })).json;
  assert.equal(await revenue(), base, 'đơn mới chưa tính doanh thu');

  let r = await owner.api(`/inquiries/${o.id}`, 'PATCH', { status: 'completed' }); // bấm nhầm: nhảy thẳng sang hoàn thành
  assert.equal(r.json.status, 'completed');
  assert.ok(r.json.completed_at);
  assert.equal(await revenue(), base + 3_000_000);

  r = await owner.api(`/inquiries/${o.id}`, 'PATCH', { status: 'confirmed' }); // sửa lại cho đúng
  assert.equal(r.json.completed_at, null, 'lùi trạng thái thì xóa ngày hoàn thành');
  assert.equal(await revenue(), base);

  await owner.api(`/inquiries/${o.id}`, 'PATCH', { status: 'completed' });
  assert.equal(await revenue(), base + 3_000_000);

  r = await owner.api(`/inquiries/${o.id}`, 'PATCH', { items: [{ name: 'A', qty: 1, price: 2_000_000 }], adjustment: 0 }); // sửa giá đơn đã hoàn thành
  assert.equal(r.json.total, 2_000_000);
  assert.equal(await revenue(), base + 2_000_000, 'doanh thu đổi theo giá mới');

  await owner.api(`/inquiries/${o.id}`, 'PATCH', { status: 'cancelled' });
  assert.equal(await revenue(), base, 'đơn hủy không tính');
});

test('trạng thái ngoài chuỗi của loại bị từ chối; giao hàng lưu đơn vị và mã vận đơn', async () => {
  const o = (await owner.api('/inquiries', 'POST', { type: 'order', customer, items: [{ name: 'B', qty: 1, price: 1000 }] })).json;
  assert.equal((await owner.api(`/inquiries/${o.id}`, 'PATCH', { status: 'khong-co' })).status, 400);
  const c = (await owner.api('/inquiries', 'POST', { type: 'contact', customer, message: 'hỏi' })).json;
  assert.equal((await owner.api(`/inquiries/${c.id}`, 'PATCH', { status: 'shipping' })).status, 400, 'lời nhắn liên hệ không có bước giao hàng');
  const r = await owner.api(`/inquiries/${o.id}`, 'PATCH', { status: 'shipping', carrier: 'GHN', tracking_code: 'ABC123' });
  assert.equal(r.json.carrier, 'GHN');
  assert.equal(r.json.tracking_code, 'ABC123');
  assert.ok(r.json.shipped_at);
});

test('lên đơn từ custom: đổi loại của chính bản ghi, giữ mã cũ', async () => {
  const c = (await owner.api('/inquiries', 'POST', { type: 'custom', customer, message: 'thiết kế riêng' })).json;
  const r = await owner.api(`/inquiries/${c.id}/convert`, 'POST');
  assert.equal(r.status, 200);
  assert.equal(r.json.id, c.id, 'không tạo bản ghi thứ hai');
  assert.equal(r.json.type, 'order');
  assert.equal(r.json.origin_code, c.code);
});

test('xóa hoặc ẩn sản phẩm đã bán không làm đổi doanh thu và dòng hàng của đơn', async () => {
  const prod = ctx.db.prepare('SELECT id, name FROM products ORDER BY id LIMIT 1').get();
  const o = (await owner.api('/inquiries', 'POST', { type: 'order', customer, status: 'completed', items: [{ id: prod.id, name: prod.name, qty: 1, price: 4_000_000 }] })).json;
  const before = await revenue();
  ctx.db.prepare("UPDATE products SET status = 'draft' WHERE id = ?").run(prod.id);
  assert.equal(await revenue(), before, 'ẩn sản phẩm');
  ctx.db.prepare('DELETE FROM products WHERE id = ?').run(prod.id);
  assert.equal(await revenue(), before, 'xóa sản phẩm');
  const again = (await owner.api(`/inquiries/${o.id}`)).json;
  assert.equal(again.items[0].name, prod.name);
  assert.equal(again.total, 4_000_000);
});

test('danh sách chọn số dòng: mặc định 20, tối đa 100', async () => {
  const def = (await owner.api('/inquiries?type=order')).json;
  assert.ok(def.items.length <= 20);
  const huge = (await owner.api('/inquiries?type=order&per_page=5000')).json;
  assert.ok(huge.items.length <= 100);
});
