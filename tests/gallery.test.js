// Gallery: kiểu hiển thị (băng chuyền / lưới / xếp gạch), số dòng cột, chuyển động; trang Gallery giống hoặc khác trang chủ.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { boot } from './helpers.js';

let ctx;
const html = async (p) => (await ctx.raw(p)).text();
// Phần HTML của khối Gallery: từ thẻ section gần nhất phía trước nút "/gallery" cuối khối
const gallerySection = (h) => { const end = h.indexOf('href="/gallery" class="btn btn-outline"'); return end < 0 ? '' : h.slice(h.lastIndexOf('<section', end), end); };

before(async () => { ctx = await boot({ content: true }); });
after(() => ctx.close());

test('mặc định giữ cách cũ: nhiều ảnh hơn 2 dòng × 4 cột thì băng chuyền tự chạy, hướng phải sang trái', async () => {
  const count = ctx.db.prepare('SELECT COUNT(*) FROM gallery_items WHERE active = 1').pluck().get();
  assert.ok(count > 8, 'gói nội dung có hơn 8 ảnh gallery');
  const g = gallerySection(await html('/'));
  assert.match(g, /class="gallery-marquee"[^>]*data-gallery-carousel/);
  assert.match(g, /data-marquee data-dir="rtl"/);
  assert.match(g, /--rows: 2; --cols-md: 4; --cols-sm: 2/);
  assert.match(await html('/gallery'), /data-gallery-carousel/, 'trang Gallery mặc định giống trang chủ');
});

test('lưới tĩnh: không có băng chuyền, số cột theo cài đặt, tỷ lệ ảnh theo cài đặt', async () => {
  ctx.setSettings('home', { gallery_layout: 'grid', gallery_cols: '5', gallery_cols_mobile: '3', gallery_ratio: 'portrait' });
  const g = gallerySection(await html('/'));
  assert.match(g, /class="gallery-grid" style="--cols-md: 5; --cols-sm: 3"/);
  assert.ok(!g.includes('gallery-marquee'));
  assert.match(g, /aspect-ratio: 4 \/ 5/);
});

test('xếp gạch: giữ tỷ lệ gốc (không ép aspect-ratio)', async () => {
  ctx.setSettings('home', { gallery_layout: 'masonry', gallery_ratio: 'square' });
  const g = gallerySection(await html('/'));
  assert.match(g, /class="gallery-masonry"/);
  assert.ok(!g.includes('aspect-ratio'));
});

test('băng chuyền không chuyển động và hướng trái sang phải, 3 dòng', async () => {
  ctx.setSettings('home', { gallery_layout: 'carousel', gallery_rows: '3', gallery_autoscroll: false, gallery_ratio: 'square' });
  let g = gallerySection(await html('/'));
  assert.match(g, /data-gallery-carousel/);
  assert.ok(!g.includes('data-marquee'), 'tắt chuyển động thì không có data-marquee');
  assert.match(g, /--rows: 3/);
  ctx.setSettings('home', { gallery_autoscroll: true, gallery_direction: 'ltr', gallery_scroll_seconds: 90 });
  g = gallerySection(await html('/'));
  assert.match(g, /data-dir="ltr"/);
  assert.match(g, /--marquee-time: 90s/);
});

test('trang Gallery có thể chọn kiểu riêng, khác trang chủ', async () => {
  ctx.setSettings('pages', { gallery_page_layout: 'grid', gallery_page_cols: '3' });
  const page = await html('/gallery');
  assert.match(page, /class="gallery-grid" style="--cols-md: 3; --cols-sm: 2"/);
  assert.match(gallerySection(await html('/')), /data-gallery-carousel/, 'trang chủ không đổi');
});

test('giá trị lạ hoặc sai kiểu bị đưa về mặc định, không làm hỏng trang', async () => {
  ctx.setSettings('home', { gallery_cols: '4', gallery_autoscroll: true }); // các bài trước để lại 5 cột, ít ảnh hơn 2 × 5 thì "Tự động" ra lưới
  ctx.db.prepare("UPDATE settings SET value = json_set(value, '$.gallery_layout', 'xyz', '$.gallery_rows', '99', '$.gallery_scroll_seconds', -5) WHERE key = 'home'").run();
  ctx.settings.invalidateSettings();
  const res = await ctx.raw('/');
  assert.equal(res.status, 200);
  const g = gallerySection(await res.text());
  assert.match(g, /--rows: 2/, 'số dòng sai thì dùng 2');
  assert.match(g, /--marquee-time: 5s/, 'thời gian âm thì kẹp về mức tối thiểu');
  assert.match(g, /data-gallery-carousel/, 'kiểu lạ thì dùng "Tự động"');
});
