// Feedback khách hàng (shop nhập), trang Feedback, đánh giá sản phẩm (khách đã mua), phân quyền và sitemap.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { boot, OWNER, STAFF, jsonLd } from './helpers.js';

let ctx;
let owner;
let prod; // { id, slug, url }
let feedbackSvc;
let catalog;

const PHONE = '0987654321';
// Token chống spam hợp lệ (đã "cũ" 5 giây để qua kiểm tra gửi quá nhanh)
async function formToken() {
  const { config } = await import('../backend/config/index.js');
  const ts = (Date.now() - 5000).toString(36);
  return `${ts}.${crypto.createHmac('sha256', config.appSecret).update(`form:${ts}`).digest('base64url').slice(0, 24)}`;
}
const text = async (p) => (await ctx.raw(p)).text();
// Nhãn "Đã mua hàng" xuất hiện 1 lần trong mẫu Alpine (tải thêm) + 1 lần cho mỗi đánh giá đã xác nhận mua ở phần máy chủ in sẵn
const badges = (html) => (html.match(/Đã mua hàng/g) || []).length;
const h1Count = (html) => (html.match(/<h1[\s>]/g) || []).length;
const mk = (extra = {}) => owner.api('/feedbacks', 'POST', { name: 'Khách thử', content: 'Rất hài lòng với vòng ngọc', rating: 5, ...extra });

// Đơn hàng của PHONE chứa sản phẩm, với trạng thái chọn
async function orderFor(phone, status, productId = prod.id) {
  const r = await owner.api('/inquiries', 'POST', { type: 'order', customer: { name: 'Nguyễn Văn Hoa', phone }, items: [{ id: productId, name: 'SP', qty: 1, price: 1000 }] });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  if (status !== 'new') assert.equal((await owner.api(`/inquiries/${r.json.id}`, 'PATCH', { status })).status, 200);
  return r.json;
}

before(async () => {
  ctx = await boot({ content: true });
  owner = ctx.session();
  await owner.login(OWNER);
  feedbackSvc = await import('../backend/services/feedback.js');
  catalog = await import('../backend/services/catalog.js');
  const row = ctx.db.prepare("SELECT id, slug FROM products WHERE status = 'published' AND product_type_id = 1 ORDER BY id LIMIT 1").get();
  prod = { ...row, url: catalog.getProduct(row.slug).url };
});
after(() => ctx.close());

test('migration 014: có bảng mới; danh sách "Cảm nhận khách hàng" cũ được chuyển sang feedbacks', () => {
  for (const t of ['feedbacks', 'feedback_images', 'product_reviews']) {
    assert.ok(ctx.db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(t), t);
  }
  const sql = fs.readFileSync(new URL('../database/migrations/014_feedback.sql', import.meta.url), 'utf8');
  const copy = sql.slice(sql.indexOf('INSERT INTO feedbacks'));
  const old = JSON.parse(ctx.db.prepare("SELECT value FROM settings WHERE key = 'home'").pluck().get());
  ctx.db.prepare("UPDATE settings SET value = ? WHERE key = 'home'").run(JSON.stringify({ ...old, testimonials: [
    { name: '  Cô Lan ', content: ' Vòng đẹp ', avatar: null }, { name: '', content: 'không tên' }, { name: 'Anh Bình', content: 'Giao nhanh', avatar: 999999 },
  ] }));
  ctx.db.exec('DELETE FROM feedbacks');
  ctx.db.exec(copy);
  const rows = ctx.db.prepare('SELECT name, content, avatar_media_id, sort_order FROM feedbacks ORDER BY sort_order').all();
  assert.deepEqual(rows.map((r) => [r.name, r.content, r.avatar_media_id]), [['Cô Lan', 'Vòng đẹp', null], ['Anh Bình', 'Giao nhanh', null]], 'bỏ mục không tên, bỏ ảnh không tồn tại');
  ctx.db.exec('DELETE FROM feedbacks');
});

test('admin: thêm / sửa / xóa feedback, kiểm tra dữ liệu, nhiều ảnh, đổi thứ tự', async () => {
  assert.equal((await owner.api('/feedbacks', 'POST', { name: '', content: 'x' })).status, 400, 'thiếu tên');
  assert.equal((await owner.api('/feedbacks', 'POST', { name: 'A' })).status, 400, 'không có chữ lẫn ảnh');
  assert.equal((await mk({ feedback_date: '2999-01-01' })).status, 400, 'ngày tương lai');
  const media = ctx.db.prepare('SELECT id FROM media ORDER BY id LIMIT 3').pluck().all();
  assert.equal(media.length, 3);
  const a = await mk({ name: 'Minh Anh', role: 'Designer, TP.HCM', content: '', image_ids: [...media, 987654], avatar_media_id: media[0], rating: 9 });
  assert.equal(a.status, 200, JSON.stringify(a.json));
  let item = a.json.items.find((x) => x.id === a.json.id);
  assert.deepEqual(item.image_ids, media, 'giữ thứ tự ảnh, bỏ ảnh không tồn tại');
  assert.equal(item.rating, 5, 'số sao bị chặn ở 5');
  assert.equal(item.avatar.id, media[0]);

  const b = await mk({ name: 'Cô Lan', rating: 0 });
  const put = await owner.api(`/feedbacks/${a.json.id}`, 'PUT', { ...item, image_ids: [media[2]], content: 'Đã sửa', show_home: false });
  assert.equal(put.status, 200);
  item = put.json.items.find((x) => x.id === a.json.id);
  assert.deepEqual([item.image_ids, item.content, item.show_home], [[media[2]], 'Đã sửa', false]);

  const order = [b.json.id, a.json.id];
  assert.equal((await owner.api('/feedbacks/reorder', 'POST', { ids: order })).status, 200);
  assert.deepEqual((await owner.api('/feedbacks')).json.items.map((x) => x.id), order);

  const del = await owner.api(`/feedbacks/${b.json.id}`, 'DELETE');
  assert.deepEqual(del.json.items.map((x) => x.id), [a.json.id]);
  await owner.api(`/feedbacks/${a.json.id}`, 'DELETE');
  assert.equal(ctx.db.prepare('SELECT COUNT(*) FROM feedback_images').pluck().get(), 0, 'xóa feedback thì xóa liên kết ảnh');
});

test('phân quyền: có quyền "feedback" mới dùng được API và trang admin', async () => {
  const role = { id: (await owner.api('/roles', 'POST', { name: 'Chỉ đơn hàng', permissions: ['orders'] })).json.id };
  const row = (await owner.api('/users')).json.find((u) => u.email === STAFF.email);
  await owner.api(`/users/${row.id}`, 'PUT', { name: row.name, role: 'staff', role_id: role.id, active: true });
  const staff = ctx.session();
  await staff.login(STAFF);
  for (const p of ['/feedbacks', '/feedbacks/', '/Feedbacks', '/reviews', '/reviews?status=pending']) assert.equal((await staff.api(p)).status, 403, p);
  assert.equal((await staff.api('/feedbacks', 'POST', { name: 'x', content: 'y' })).status, 403);
  assert.equal((await staff.get('/admin/feedback')).status, 403);
  await owner.api(`/roles/${role.id}`, 'PUT', { name: 'Chỉ đơn hàng', permissions: ['orders', 'feedback'] });
  assert.equal((await staff.api('/feedbacks')).status, 200);
  assert.equal((await staff.api('/reviews')).status, 200);
  assert.equal((await staff.get('/admin/feedback')).status, 200);
  assert.equal((await staff.api('/redirects')).status, 403, 'quyền khác vẫn bị chặn');
});

test('trang Feedback + khối trang chủ + chân trang + sitemap; tắt trang, đổi đường dẫn', async () => {
  ctx.setSettings('feedback', { page_per_page: 4 });
  for (let i = 1; i <= 5; i++) assert.equal((await mk({ name: `Khách số ${i}`, content: `Nội dung số ${i}`, show_home: i <= 4 })).status, 200);
  ctx.setSettings('home_layout', { sections: ctx.settings.getForAdmin('home_layout').sections.map((x) => ({ ...x, enabled: x.key === 'testimonials' ? true : x.enabled })) });

  const home = await text('/');
  assert.ok(home.includes('Khách số 1') && home.includes('Khách số 4'), 'khối trang chủ hiện 4 feedback đầu');
  assert.ok(!home.includes('Khách số 5'), 'show_home tắt thì không hiện ở trang chủ');
  assert.ok(home.includes('Xem tất cả feedback'), 'nút dẫn tới trang Feedback');
  assert.ok(home.includes('href="/feedback"'), 'liên kết ở chân trang / nút');
  assert.ok(home.includes('id="fb-data"'), 'dữ liệu cho cửa sổ chi tiết');

  const p1 = await text('/feedback');
  assert.equal(h1Count(p1), 1);
  assert.ok(p1.includes('Khách số 5') && !p1.includes('2 / '), 'trang 1 có 4 feedback');
  assert.equal((await ctx.raw('/feedback?trang=9')).headers.get('location'), '/feedback?trang=2', 'trang quá số trang về trang cuối');
  const p2 = await ctx.raw('/feedback?trang=2');
  assert.equal(p2.status, 200);
  assert.match(await p2.text(), /noindex/);
  assert.ok((await text('/sitemap.xml')).includes('/feedback<'), 'sitemap có trang Feedback');

  // Đổi đường dẫn: địa chỉ cũ chuyển 301; tên trùng trang khác bị từ chối
  ctx.setSettings('feedback', { page_slug: 'Khách Nói Gì' });
  assert.equal((await ctx.raw('/feedback')).headers.get('location'), '/khach-noi-gi');
  assert.equal((await ctx.raw('/khach-noi-gi')).status, 200);
  ctx.setSettings('feedback', { page_slug: 'blog' });
  assert.equal(ctx.settings.getRaw('feedback').page_slug, 'khach-noi-gi', 'tên trùng trang cố định thì giữ đường dẫn cũ');

  // Tắt trang: 404, biến mất khỏi chân trang và sitemap; khối trang chủ vẫn còn
  ctx.setSettings('feedback', { page_enabled: false });
  assert.equal((await ctx.raw('/khach-noi-gi')).status, 404);
  const home2 = await text('/');
  assert.ok(!home2.includes('Xem tất cả feedback') && !home2.includes('href="/khach-noi-gi"'));
  assert.ok(home2.includes('Khách số 1'));
  assert.ok(!(await text('/sitemap.xml')).includes('khach-noi-gi'));
  ctx.setSettings('feedback', { page_enabled: true, page_slug: 'feedback', page_per_page: 12 });
});

test('đánh giá sản phẩm (mức chặt nhất): chỉ khách có đơn HOÀN THÀNH chứa sản phẩm đó, mỗi người một lần', async () => {
  ctx.setSettings('feedback', { reviews_require: 'product_order' });
  const bad = (body) => assert.rejects(async () => feedbackSvc.submitReview({ product: prod.slug, rating: 5, content: 'Vòng rất đẹp, đeo vừa tay', ...body }), (e) => e.status === 422 || e.status === 404);
  await bad({ phone: PHONE }); // chưa mua
  await orderFor(PHONE, 'confirmed');
  await bad({ phone: PHONE }); // có trong hệ thống nhưng đơn chưa hoàn thành
  const other = ctx.db.prepare("SELECT id FROM products WHERE status = 'published' AND id <> ? ORDER BY id LIMIT 1").pluck().get(prod.id);
  await orderFor(PHONE, 'completed', other);
  await bad({ phone: PHONE }); // đơn hoàn thành nhưng là sản phẩm khác
  await bad({ phone: '12345' });
  await orderFor(PHONE, 'completed');
  await bad({ phone: PHONE, rating: 0 });
  await bad({ phone: PHONE, content: 'ngắn' });
  await assert.rejects(async () => feedbackSvc.submitReview({ product: 'khong-co-san-pham-nay', phone: PHONE, rating: 5, content: 'Vòng rất đẹp, đeo vừa tay' }), (e) => e.status === 404);

  // "+84 987 654 321" cũng là số này; tên bỏ trống thì lấy tên trong đơn
  const ok = feedbackSvc.submitReview({ product: prod.slug, phone: '+84 987 654 321', rating: 4, content: 'Vòng rất đẹp, đeo vừa tay' });
  assert.equal(ok.status, 'pending');
  await bad({ phone: PHONE }); // trùng: đã đánh giá rồi
  const row = ctx.db.prepare('SELECT * FROM product_reviews').get();
  assert.deepEqual([row.name, row.phone, row.status, row.source, row.verified], ['Nguyễn Văn Hoa', PHONE, 'pending', 'customer', 1]);

  // Chờ duyệt: chưa hiện số sao ở đâu cả
  let page = await text(prod.url);
  assert.ok(!page.includes('1 đánh giá') && !page.includes('aggregateRating'));
  assert.equal(feedbackSvc.listReviewsPublic({ productId: prod.id }).total, 0);

  // Duyệt: hiện số sao + danh sách + schema, tên rút gọn, không lộ số điện thoại
  assert.equal((await owner.api(`/reviews/${row.id}/status`, 'PUT', { status: 'approved' })).status, 200);
  page = await text(prod.url);
  assert.ok(page.includes('1 đánh giá') && page.includes('Vòng rất đẹp, đeo vừa tay'));
  assert.ok(page.includes('N. Hoa') && !page.includes('Nguyễn Văn Hoa') && !page.includes(PHONE));
  assert.equal(badges(page), 2, 'đúng sản phẩm đã mua thì có nhãn');
  const product = jsonLd(page).find((x) => x['@type'] === 'Product');
  assert.deepEqual([product.aggregateRating.ratingValue, product.aggregateRating.reviewCount], [4, 1]);
  assert.equal(h1Count(page), 1);
  const list = await text('/san-pham');
  assert.ok(list.includes('4 (1)'), 'số sao nhỏ trên thẻ sản phẩm');

  // Tab "Đánh giá sản phẩm" ở trang Feedback + API xem thêm
  const fbPage = await text('/feedback');
  assert.ok(fbPage.includes('Đánh giá sản phẩm') && fbPage.includes('Vòng rất đẹp, đeo vừa tay'));
  const api = await (await ctx.raw(`/api/reviews?product=${prod.slug}&offset=0&limit=5`)).json();
  assert.deepEqual([api.total, api.items.length, api.next], [1, 1, 1]);
  assert.ok(!JSON.stringify(api).includes(PHONE));

  // Ẩn / xóa
  await owner.api(`/reviews/${row.id}/status`, 'PUT', { status: 'hidden' });
  assert.ok(!(await text(prod.url)).includes('aggregateRating'));
  assert.equal((await owner.api(`/reviews?status=hidden`)).json.total, 1);
  assert.equal((await owner.api(`/reviews/${row.id}/status`, 'PUT', { status: 'bậy' })).status, 400);
  await owner.api(`/reviews/${row.id}`, 'DELETE');
  assert.equal(ctx.db.prepare('SELECT COUNT(*) FROM product_reviews').pluck().get(), 0);
});

test('điều kiện số điện thoại theo cài đặt: mặc định chỉ cần có trong hệ thống; nhãn "Đã mua hàng" chỉ khi đúng sản phẩm', async () => {
  const [a, b] = ctx.db.prepare("SELECT id, slug FROM products WHERE status = 'published' AND product_type_id = 1 ORDER BY id DESC LIMIT 2").all();
  const send = (slug, phone) => feedbackSvc.submitReview({ product: slug, phone, rating: 5, content: 'Vòng đẹp, đóng gói cẩn thận' });
  const expect422 = (slug, phone) => assert.throws(() => send(slug, phone), (e) => e.status === 422 && !!e.details?.phone);
  ctx.setSettings('feedback', { reviews_require: 'customer', reviews_auto_approve: true });

  expect422(a.slug, '0966000111'); // chưa có trong hệ thống
  await orderFor('0966000111', 'new', b.id); // có hồ sơ khách (chỉ mới đặt, chưa hoàn thành)
  assert.equal(send(a.slug, '0966000111').status, 'approved');
  assert.equal(ctx.db.prepare("SELECT verified FROM product_reviews WHERE phone = '0966000111'").pluck().get(), 0, 'chưa mua đúng sản phẩm: không có nhãn đã mua');
  const html = await text(catalog.getProduct(a.slug).url);
  assert.ok(html.includes('Vòng đẹp, đóng gói cẩn thận') && badges(html) === 1, 'không có nhãn đã mua');
  assert.equal(feedbackSvc.listReviewsPublic({ productId: a.id }).items.find((r) => r.content.startsWith('Vòng đẹp')).verified, false);

  // Mức "có đơn hoàn thành bất kỳ"
  ctx.setSettings('feedback', { reviews_require: 'any_order' });
  await orderFor('0966000222', 'new', b.id);
  expect422(a.slug, '0966000222'); // chỉ có đơn mới
  await orderFor('0966000222', 'completed', b.id);
  assert.equal(send(a.slug, '0966000222').status, 'approved');
  ctx.setSettings('feedback', { reviews_require: 'customer', reviews_auto_approve: false });
});

test('shop tự thêm / sửa đánh giá: không cần số điện thoại, có nhãn riêng, không vào schema Google, không sửa được đánh giá của khách', async () => {
  const p = ctx.db.prepare("SELECT id, slug FROM products WHERE status = 'published' AND product_type_id = 1 ORDER BY id LIMIT 1 OFFSET 3").get();
  const url = catalog.getProduct(p.slug).url;
  const post = (body) => owner.api('/reviews', 'POST', { product_id: p.id, name: 'Chị Thảo', rating: 5, content: 'Khách nhắn Zalo: vòng rất đẹp', status: 'approved', ...body });
  assert.equal((await post({ rating: 9 })).status, 400, 'số sao sai');
  assert.equal((await post({ name: '' })).status, 400, 'thiếu tên');
  assert.equal((await post({ product_id: 99999 })).status, 400, 'không có sản phẩm');
  assert.equal((await post({ date: '2999-01-01' })).status, 422, 'ngày tương lai');

  const a = await post({ date: '2026-01-05' });
  const b = await post({ name: 'Anh Dũng', rating: 4, content: '' });
  assert.equal([a, b].filter((x) => x.status === 200).length, 2, 'nhiều đánh giá không số điện thoại cùng một sản phẩm');
  const list = (await owner.api('/reviews?q=Thảo')).json.items;
  assert.deepEqual([list[0].source, list[0].phone, list[0].created_at.slice(0, 10)], ['shop', '', '2026-01-05']);

  const page = await text(url);
  assert.ok(page.includes('Khách nhắn Zalo: vòng rất đẹp') && page.includes('2 đánh giá') && page.includes('4.5'), 'tính vào số sao hiển thị');
  assert.equal(badges(page), 1, 'đánh giá shop thêm không có nhãn đã mua');
  assert.ok(!page.includes('aggregateRating'), 'không đưa đánh giá shop thêm vào schema Google');
  assert.ok((await text('/san-pham')).includes('4.5 (2)'), 'sao nhỏ trên thẻ sản phẩm');

  const put = await owner.api(`/reviews/${a.json.id}`, 'PUT', { product_id: p.id, name: 'Chị Thảo', rating: 3, content: 'Đã sửa', status: 'hidden' });
  assert.equal(put.status, 200);
  assert.ok(!(await text(url)).includes('Đã sửa'), 'đã ẩn');
  const customer = ctx.db.prepare("SELECT id FROM product_reviews WHERE source = 'customer' LIMIT 1").pluck().get();
  assert.ok(customer, 'có đánh giá của khách từ các kiểm thử trước');
  assert.equal((await owner.api(`/reviews/${customer}`, 'PUT', { product_id: p.id, name: 'x', rating: 1 })).status, 400, 'đánh giá khách gửi không sửa được');
  assert.equal((await owner.api(`/reviews/${customer}/status`, 'PUT', { status: 'hidden' })).status, 200, 'nhưng ẩn được');
});

test('tự duyệt: đánh giá hiện ngay; tắt tính năng đánh giá thì ẩn hết và từ chối gửi', async () => {
  const phone = '0911000111';
  await orderFor(phone, 'completed');
  ctx.setSettings('feedback', { reviews_auto_approve: true, reviews_name_display: 'full' });
  const r = feedbackSvc.submitReview({ product: prod.slug, phone, rating: 5, name: 'Chị Mai', content: 'Tuyệt vời, sẽ ủng hộ tiếp' });
  assert.equal(r.status, 'approved');
  const page = await text(prod.url);
  assert.ok(page.includes('Chị Mai') && page.includes('aggregateRating'));

  ctx.setSettings('feedback', { reviews_enabled: false });
  const off = await text(prod.url);
  assert.ok(!off.includes('Chị Mai') && !off.includes('aggregateRating') && !off.includes('id="danh-gia"'));
  assert.ok(!(await text('/san-pham')).includes('5 (1)'));
  assert.deepEqual(await (await ctx.raw(`/api/reviews?product=${prod.slug}`)).json(), { items: [], total: 0 });
  assert.throws(() => feedbackSvc.submitReview({ product: prod.slug, phone: '0911000222', rating: 5, content: 'Vòng rất đẹp, đeo vừa tay' }), (e) => e.status === 403);

  // Bật lại nhưng tắt khai báo cho Google: vẫn hiện số sao cho khách, không có aggregateRating
  ctx.setSettings('feedback', { reviews_enabled: true, reviews_schema: false });
  const on = await text(prod.url);
  assert.ok(on.includes('Chị Mai') && !on.includes('aggregateRating'));
});

test('API gửi đánh giá: cần cùng nguồn + token chống spam; hợp lệ thì 201, sai điều kiện thì 422 kèm lỗi từng ô', async () => {
  const phone = '0922333444';
  await orderFor(phone, 'completed');
  ctx.setSettings('feedback', { reviews_auto_approve: false });
  const post = async (body, headers = {}) => ctx.raw('/api/reviews', { method: 'POST', headers: { 'content-type': 'application/json', origin: ctx.base, ...headers }, body: JSON.stringify(body) });
  const good = { product: prod.slug, phone, rating: 5, content: 'Chất lượng tốt, đóng gói đẹp' };
  assert.equal((await post({ ...good, _ft: await formToken() }, { origin: 'https://evil.example' })).status, 403, 'khác nguồn');
  assert.equal((await post(good)).status, 400, 'thiếu token');
  const wrong = await post({ ...good, phone: '0900999888', _ft: await formToken() });
  assert.equal(wrong.status, 422);
  assert.ok((await wrong.json()).errors.phone, 'lỗi gắn vào ô số điện thoại');
  const r = await post({ ...good, _ft: await formToken() });
  assert.equal(r.status, 201);
  assert.match((await r.json()).message, /duyệt/);
});

test('Email báo đánh giá mới: có sản phẩm, số sao, nhận xét (escape HTML) và liên kết trang duyệt', async () => {
  const { reviewNotification } = await import('../backend/services/mailer.js');
  const n = reviewNotification({ rating: 4, name: 'An <b>', phone: '0911222333', content: 'Đẹp <script>', verified: 1 }, 'Vòng thử');
  assert.match(n.subject, /4★.*Vòng thử/);
  assert.match(n.html, /Đẹp &lt;script&gt;/);
  assert.ok(!n.html.includes('<script>'));
  assert.match(n.html, /\/feedback"/);
});
