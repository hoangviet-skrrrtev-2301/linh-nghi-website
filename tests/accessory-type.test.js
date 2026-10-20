// Loại sản phẩm "Phụ kiện" (tạo sẵn, chưa hoạt động) chạy song song với Pháp phục; xóa / ẩn sản phẩm, bài viết thì trang trả 404.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { boot, OWNER } from './helpers.js';

let ctx;
let owner;
before(async () => { ctx = await boot({ content: true }); owner = ctx.session(); await owner.login(OWNER); });
after(() => ctx.close());

const text = async (p) => (await ctx.raw(p)).text();

test('Phụ kiện có sẵn, chưa hoạt động: khách không thấy; bật lên thì có trang riêng, menu, sitemap, chi tiết, tìm kiếm, tách khỏi Pháp phục', async () => {
  const types = (await owner.api('/product-types')).json.items;
  const acc = types.find((t) => t.slug === 'phu-kien');
  assert.ok(acc && !acc.active && !acc.uses_jade_fields);
  assert.ok(acc.spec_fields.length >= 4, 'có thông số mẫu để chủ shop sửa');
  const made = await owner.api('/products', 'POST', { name: 'Nhẫn ngọc thử', price: null, status: 'published', product_type_id: acc.id, attrs: { loai_phu_kien: 'Nhẫn', chat_lieu: 'Bạc 925' }, sizes: '12, 14' });
  assert.equal(made.status, 200, JSON.stringify(made.json));
  const slug = (await owner.api(`/products/${made.json.id}`)).json.slug;

  assert.equal((await ctx.raw('/san-pham/phu-kien')).status, 404, 'chưa hoạt động thì ẩn hoàn toàn');
  assert.equal((await ctx.raw(`/san-pham/phu-kien/${slug}`)).status, 404);

  const put = await owner.api(`/product-types/${acc.id}`, 'PUT', { ...acc, active: true });
  assert.equal(put.status, 200);
  const list = await ctx.raw('/san-pham/phu-kien');
  assert.equal(list.status, 200);
  assert.match(await list.text(), /Nhẫn ngọc thử/);
  const detail = await text(`/san-pham/phu-kien/${slug}`);
  assert.match(detail, /Bạc 925/, 'thông số tự đặt hiện ở trang chi tiết');
  assert.match(await text('/sitemap.xml'), new RegExp(`/san-pham/phu-kien/${slug}`));
  assert.match(await text('/sitemap.xml'), /\/san-pham\/phu-kien</);
  assert.doesNotMatch(await text('/san-pham/phap-phuc'), /Nhẫn ngọc thử/, 'không lẫn sang loại khác');
  assert.doesNotMatch(await text('/san-pham'), /Nhẫn ngọc thử/, 'không hiện chung trong Tất cả sản phẩm');
  assert.match(await text('/san-pham?q=nhan+ngoc'), /Nhẫn ngọc thử/, 'tìm kiếm thấy');
  ctx.slug = slug; ctx.id = made.json.id;
});

test('ẩn hoặc xóa sản phẩm: trang trả 404, noindex, và biến khỏi sitemap', async () => {
  await owner.api(`/products/${ctx.id}`, 'PUT', { ...(await owner.api(`/products/${ctx.id}`)).json, status: 'draft' });
  const hidden = await ctx.raw(`/san-pham/phu-kien/${ctx.slug}`);
  assert.equal(hidden.status, 404);
  assert.match(await hidden.text(), /noindex/);
  assert.doesNotMatch(await text('/sitemap.xml'), new RegExp(ctx.slug));
  const del = await owner.api(`/products/${ctx.id}`, 'DELETE');
  assert.equal(del.status, 200);
  assert.equal((await ctx.raw(`/san-pham/phu-kien/${ctx.slug}`)).status, 404);
  assert.equal((await ctx.raw(`/san-pham/${ctx.slug}`)).status, 404);
});

test('xóa bài viết: trang trả 404, noindex, biến khỏi sitemap', async () => {
  const post = ctx.db.prepare("SELECT id, slug FROM posts WHERE status = 'published' LIMIT 1").get();
  const url = (await text('/sitemap.xml')).match(new RegExp(`<loc>[^<]*/blog/[^<]*${post.slug}</loc>`))[0].replace(/<\/?loc>/g, '').replace(/^https?:\/\/[^/]+/, '');
  assert.equal((await ctx.raw(url)).status, 200);
  const del = await owner.api(`/posts/${post.id}`, 'DELETE');
  assert.equal(del.status, 200);
  const gone = await ctx.raw(url);
  assert.equal(gone.status, 404);
  assert.match(await gone.text(), /noindex/);
  assert.doesNotMatch(await text('/sitemap.xml'), new RegExp(post.slug));
});
