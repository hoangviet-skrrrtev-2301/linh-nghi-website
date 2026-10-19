// Tổng quan: biểu đồ cắt đúng theo kỳ, đơn hủy không tính vào số đơn, doanh thu theo sản phẩm cộng lại đúng bằng Doanh thu.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { boot, OWNER } from './helpers.js';

let ctx;
let owner;
const stats = async (q) => (await owner.api('/dashboard?' + q)).json;
const customer = { name: 'Khách Thử', phone: '0912345678' };
const today = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);

before(async () => {
  ctx = await boot({ content: true });
  owner = ctx.session();
  await owner.login(OWNER);
});
after(() => ctx.close());

test('một tháng trọn vẹn: biểu đồ theo ngày, bắt đầu từ ngày 1 và kết thúc ngày cuối tháng', async () => {
  const d = await stats('range=custom&from=2026-10-01&to=2026-10-31');
  assert.equal(d.series.unit, 'day');
  assert.equal(d.series.buckets.length, 31);
  assert.equal(d.series.buckets[0].label, '01/10');
  assert.equal(d.series.buckets.at(-1).label, '31/10');
});

test('theo tuần: tuần đầu và cuối bị cắt đúng ranh giới kỳ, không lấn sang thứ Hai của tuần trước', async () => {
  const d = await stats('range=custom&from=2026-07-01&to=2026-10-19');
  assert.equal(d.series.unit, 'week');
  assert.equal(d.series.buckets[0].start, '2026-07-01');
  assert.equal(d.series.buckets.at(-1).end, '2026-10-19');
  for (const b of d.series.buckets) assert.ok(b.start >= '2026-07-01' && b.end <= '2026-10-19');
});

test('theo tháng: nhãn không còn dạng "10/26" dễ đọc nhầm thành ngày', async () => {
  const d = await stats('range=custom&from=2026-01-01&to=2026-10-19');
  assert.equal(d.series.unit, 'month');
  assert.equal(d.series.buckets[0].label, 'T1');
  assert.match(d.series.buckets.at(-1).title, /Tháng 10\/2026 \(01\/10 – 19\/10\)/);
  const y = await stats('range=custom&from=2025-06-10&to=2026-10-19');
  assert.equal(y.series.buckets[0].label, 'T6/25', 'kỳ qua nhiều năm có ghi năm');
});

test('đơn đã hủy không tính vào số đơn, thẻ và biểu đồ; được đếm riêng', async () => {
  const q = 'range=custom&from=2025-01-01&to=' + today;
  const before = await stats(q);
  const a = (await owner.api('/inquiries', 'POST', { type: 'order', customer, items: [{ name: 'X', qty: 1, price: 1000 }] })).json;
  const b = (await owner.api('/inquiries', 'POST', { type: 'order', customer, items: [{ name: 'Y', qty: 1, price: 1000 }] })).json;
  let d = await stats(q);
  assert.equal(d.totals.orders, before.totals.orders + 2);
  await owner.api(`/inquiries/${b.id}`, 'PATCH', { status: 'cancelled' });
  d = await stats(q);
  assert.equal(d.totals.orders, before.totals.orders + 1, 'đơn hủy không tính');
  assert.equal(d.totals.cancelled, before.totals.cancelled + 1);
  assert.equal(d.series.buckets.reduce((s, x) => s + x.order, 0), d.totals.orders, 'tổng cột biểu đồ = thẻ Đơn hàng');
  assert.equal(d.statusBreakdown.find((s) => s.status === 'cancelled').n, d.totals.cancelled, 'bảng tình trạng vẫn liệt kê đơn hủy');
  await owner.api(`/inquiries/${a.id}`, 'DELETE');
  await owner.api(`/inquiries/${b.id}`, 'DELETE');
});

test('doanh thu theo sản phẩm: cộng lại đúng bằng Doanh thu kể cả khi có điều chỉnh, kỳ khác thì số khác', async () => {
  const q = 'range=custom&from=2025-01-01&to=' + today;
  const base = (await stats(q)).totals.revenue;
  const o1 = (await owner.api('/inquiries', 'POST', { type: 'order', customer, items: [{ name: 'Vòng A', qty: 2, price: 1_000_000 }, { name: 'Vòng B', qty: 1, price: 3_000_000 }], adjustment: -100_000 })).json;
  const o2 = (await owner.api('/inquiries', 'POST', { type: 'order', customer, items: Array.from({ length: 7 }, (_, i) => ({ name: 'Món ' + i, qty: 1, price: 100_000 * (i + 1) })), adjustment: 33_333 })).json;
  const o3 = (await owner.api('/inquiries', 'POST', { type: 'order', customer, items: [{ name: 'Chưa xong', qty: 1, price: 9_000_000 }] })).json;
  await owner.api(`/inquiries/${o1.id}`, 'PATCH', { status: 'completed' });
  await owner.api(`/inquiries/${o2.id}`, 'PATCH', { status: 'completed' });

  const d = await stats(q);
  assert.equal(d.totals.revenue, base + 4_900_000 + 2_800_000 + 33_333);
  const sum = d.topProducts.reduce((s, p) => s + p.amount, 0) + (d.topOther?.amount || 0);
  assert.equal(sum, d.totals.revenue, 'sản phẩm + "khác" = Doanh thu');
  assert.equal(d.topProducts.length, 5);
  assert.ok(d.topOther.count >= 1);
  assert.ok(!d.topProducts.some((p) => p.name === 'Chưa xong'), 'đơn chưa hoàn thành không tính');
  const a = d.topProducts.find((p) => p.name === 'Vòng A');
  assert.equal(a.amount, Math.round(2_000_000 / 5_000_000 * 4_900_000), 'chia phần điều chỉnh theo tỷ lệ thành tiền');
  assert.deepEqual(d.topProducts.map((p) => p.amount), [...d.topProducts.map((p) => p.amount)].sort((x, y) => y - x), 'xếp theo doanh thu');

  const none = await stats('range=custom&from=2025-01-01&to=2025-01-31');
  assert.equal(none.totals.revenue, 0);
  assert.deepEqual(none.topProducts, []);
  assert.equal(none.topOther, null);
  for (const o of [o1, o2, o3]) await owner.api(`/inquiries/${o.id}`, 'DELETE');
});
