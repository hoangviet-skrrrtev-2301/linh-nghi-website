// Bộ lọc "giá liên hệ" ở danh sách sản phẩm.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { boot } from './helpers.js';

let ctx;
before(async () => { ctx = await boot({ content: true }); });
after(() => ctx.close());

test('gia_lh chỉ giữ sản phẩm không có giá, bỏ qua khoảng giá; ô lọc hiện trên trang', async () => {
  const { searchProducts } = await import('../backend/services/catalog.js');
  const all = searchProducts({}, { perPage: 200 }).items;
  const contact = all.filter((p) => p.final_price == null);
  ctx.db.prepare("UPDATE products SET price = NULL, sale_price = NULL WHERE id = ?").run(all.find((p) => p.final_price != null).id);
  const after1 = searchProducts({ gia_lh: '1' }, { perPage: 200 }).items;
  assert.equal(after1.length, contact.length + 1);
  assert.ok(after1.every((p) => p.final_price == null));
  assert.equal(searchProducts({ gia_lh: '1', gia_tu: '1000000' }, { perPage: 200 }).items.length, after1.length, 'khoảng giá bị bỏ qua');
  const h = await (await ctx.raw('/san-pham?gia_lh=1')).text();
  assert.match(h, /name="gia_lh"[^>]*checked/);
  const robots = await (await ctx.raw('/san-pham?gia_lh=1')).text();
  assert.match(robots, /noindex/);
});
