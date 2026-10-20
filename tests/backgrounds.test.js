// "Nền các khối" (Giao diện › Nền các khối): chuyển cài đặt cũ, nền cho trang chủ / chân trang / thanh thông báo / phần đầu trang con / trang sản phẩm,
// và thứ tự các nhóm cài đặt trong "Nội dung từng trang".
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { boot, OWNER } from './helpers.js';
import { SETTINGS_CATEGORIES, SCHEMA_BY_KEY, BG_BLOCKS, HOME_SECTIONS } from '../backend/config/settings-schema.js';
import { SETTINGS_PERMISSION } from '../backend/config/permissions.js';

let ctx;
let owner;
let productUrl;
let mediaId;

const text = async (p) => (await ctx.raw(p)).text();
const none = { bg_mode: 'none', bg_color: '#f1ece1', bg_pattern: 'dots', bg_pattern_color: '#2e6b94', bg_pattern_strength: 18, bg_image: null, bg_overlay: 35, bg_overlay_color: '#000000', text_tone: 'auto' };
// Đặt nền cho một số khối, các khối còn lại về mặc định
function setBg(patch) {
  const blocks = ctx.settings.getForAdmin('backgrounds').blocks.map((b) => ({ ...b, ...none, ...(patch[b.key] || {}) }));
  ctx.settings.saveGroup('backgrounds', { blocks });
}
// Thẻ mở của một phần tử (đủ để đọc class + style)
const openTag = (html, re) => (html.match(re) || [''])[0];

before(async () => {
  ctx = await boot({ content: true });
  owner = ctx.session();
  await owner.login(OWNER);
  const catalog = await import('../backend/services/catalog.js');
  const slug = ctx.db.prepare("SELECT slug FROM products WHERE status = 'published' AND product_type_id = 1 ORDER BY id LIMIT 1").pluck().get();
  productUrl = catalog.getProduct(slug).url;
  mediaId = ctx.db.prepare('SELECT id FROM media ORDER BY id LIMIT 1').pluck().get();
  ctx.setSettings('features', { announcement: 'Miễn phí vận chuyển toàn quốc' });
});
after(() => ctx.close());

test('thứ tự nhóm "Nội dung từng trang" theo menu website; nhóm Nền các khối nằm ở mục Giao diện, quyền Giao diện', () => {
  const cat = (k) => SETTINGS_CATEGORIES.find((c) => c.key === k).groups;
  assert.deepEqual(cat('pages'), ['home', 'pages', 'size_guide', 'forms', 'feedback', 'about', 'contact', 'policies']);
  assert.deepEqual(cat('design'), ['theme', 'backgrounds', 'home_layout']);
  assert.equal(SETTINGS_PERMISSION.backgrounds, 'settings_design');
  // Các phần của nhóm Trang chủ theo đúng thứ tự khối trên trang (khối Feedback nằm ở nhóm riêng)
  assert.deepEqual(SCHEMA_BY_KEY.home.sections.map((s) => s.key), ['banner', 'info', 'featured', 'certs', 'categories', 'fengshui', 'size', 'custom', 'gallery', 'blog']);
  assert.deepEqual(SCHEMA_BY_KEY.forms.sections.map((s) => s.key), ['order', 'orderimage', 'custom', 'track', 'other']);
});

test('migration 016: nền đã đặt ở Bố cục trang chủ được chuyển sang nhóm mới, bỏ banner, giữ giá trị', () => {
  const sql = fs.readFileSync(new URL('../database/migrations/016_backgrounds.sql', import.meta.url), 'utf8');
  ctx.db.prepare("DELETE FROM settings WHERE key = 'backgrounds'").run();
  ctx.db.prepare("INSERT INTO settings (key, value) VALUES ('home_layout', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify({ sections: [
    { key: 'banner', enabled: true, bg_mode: 'color' },
    { key: 'info', enabled: true, bg_mode: 'pattern', bg_color: '#112233', bg_pattern: 'waves', bg_pattern_strength: 30, text_tone: 'light', bg_image: null },
    { key: 'featured', enabled: false },
  ] }));
  ctx.db.exec(sql);
  const blocks = JSON.parse(ctx.db.prepare("SELECT value FROM settings WHERE key = 'backgrounds'").pluck().get()).blocks;
  assert.deepEqual(blocks.map((b) => b.key), ['info', 'featured']);
  assert.deepEqual([blocks[0].bg_mode, blocks[0].bg_color, blocks[0].bg_pattern, blocks[0].bg_pattern_strength, blocks[0].text_tone], ['pattern', '#112233', 'waves', 30, 'light']);
  assert.deepEqual([blocks[1].bg_mode, blocks[1].bg_overlay], ['none', 35], 'thiếu giá trị thì dùng mặc định');
  ctx.db.exec(sql); // chạy lại không ghi đè dữ liệu đã có
  assert.equal(JSON.parse(ctx.db.prepare("SELECT value FROM settings WHERE key = 'backgrounds'").pluck().get()).blocks.length, 2);
  ctx.settings.invalidateSettings?.();
});

test('admin: danh sách nền đủ mọi khối theo thứ tự trong code, thêm khối mới tự bổ sung, có nhãn', async () => {
  const r = await owner.api('/settings/backgrounds');
  assert.equal(r.status, 200);
  const blocks = r.json.blocks || r.json.values?.blocks;
  assert.deepEqual(blocks.map((b) => b.key), BG_BLOCKS.map((b) => b.key));
  assert.ok(blocks.every((b) => b.label), 'có nhãn');
  assert.ok(BG_BLOCKS.some((b) => b.key === 'footer') && BG_BLOCKS.some((b) => b.key === 'announcement'));
  assert.ok(!BG_BLOCKS.some((b) => b.key === 'banner'), 'banner có nền riêng, không đổi ở đây');
  assert.deepEqual(BG_BLOCKS.filter((b) => HOME_SECTIONS.some((h) => h.key === b.key)).length, HOME_SECTIONS.filter((h) => h.bg).length);
  assert.equal((await owner.get('/admin/settings/backgrounds')).status, 200);
});

test('chân trang, thanh thông báo, phần đầu trang con, trang sản phẩm: nền màu / họa tiết / ảnh, chữ tự đổi theo nền', async () => {
  // Mặc định: không có nền riêng
  setBg({});
  let home = await text('/');
  assert.ok(!/<footer[^>]*background-color/.test(home) && !home.includes('footer-on-light'));

  setBg({
    footer: { bg_mode: 'color', bg_color: '#f3efe6' },                      // nền sáng → chữ tối
    announcement: { bg_mode: 'pattern', bg_color: '#1e3a4f', bg_pattern: 'diagonal', bg_pattern_strength: 25 },
    page_head: { bg_mode: 'color', bg_color: '#e8f0f5' },
    product_reviews: { bg_mode: 'color', bg_color: '#faf3e0' },
    product_related: { bg_mode: 'image', bg_image: mediaId, bg_overlay: 40 },
    info: { bg_mode: 'color', bg_color: '#223344' },
  });
  home = await text('/');
  const footer = openTag(home, /<footer[^>]*>/);
  assert.ok(footer.includes('background-color:#f3efe6') && footer.includes('footer-on-light') && footer.includes('color:#1d2b36'), footer);
  const bar = openTag(home, /<div class="panel-primary[^>]*>/);
  assert.ok(bar.includes('pat-diagonal') && bar.includes('--pat-strength:25%') && bar.includes('background-color:#1e3a4f') && bar.includes('color:#fff'), bar);
  assert.match(home, /<div class="home-block has-bg [^"]*" style="background-color:#223344;[^"]*color:#fff;/, 'khối trang chủ');

  for (const p of ['/gallery', '/san-pham', '/blog', '/huong-dan-size', '/thiet-ke-rieng', '/lien-he', '/tra-cuu-don']) {
    assert.ok((await text(p)).includes('background-color:#e8f0f5'), `phần đầu trang ${p}`);
  }
  const product = await text(productUrl);
  assert.ok(/id="danh-gia"[^>]*style="background-color:#faf3e0/.test(product), 'đánh giá sản phẩm');
  const related = openTag(product, /<section class="section border-t border-line [^>]*>/);
  assert.ok(/background-image:linear-gradient\(color-mix\([^)]*\),color-mix\([^)]*\)\),url\((?:"|&quot;)\/uploads\//.test(related), related);
  assert.ok(related.includes('color:#fff'), 'ảnh nền tối + lớp phủ → chữ sáng');

  // Chữ chọn tay thắng tự động; màu sai bị đưa về mặc định
  setBg({ footer: { bg_mode: 'color', bg_color: '#f3efe6', text_tone: 'light' } });
  assert.ok(!(await text('/')).includes('footer-on-light'));
  setBg({ footer: { bg_mode: 'color', bg_color: 'đỏ<script>' } });
  const bad = openTag(await text('/'), /<footer[^>]*>/);
  assert.ok(bad.includes('background-color:#f1ece1') && !bad.includes('script'), bad);
});

test('thanh menu (header): nền tùy chỉnh giữ khi cuộn, chữ + logo đổi theo nền, khung sổ xuống không bị ảnh hưởng', async () => {
  const header = (html) => html.slice(html.indexOf('<header'), html.indexOf('</header>'));
  // Mặc định: lớp nền theo cuộn của Alpine, không có lớp chữ riêng
  setBg({});
  let h = header(await text('/'));
  assert.ok(h.includes("scrolled ? 'bg-surface/90 backdrop-blur-md' : 'bg-bg'") && !h.includes('header-tone-'));

  // Nền tối → chữ sáng + logo trắng (nếu có)
  setBg({ header: { bg_mode: 'color', bg_color: '#1e3a4f' } });
  h = header(await text('/'));
  const layer = openTag(h, /<div aria-hidden="true" class="pointer-events-none absolute[^>]*>/);
  assert.ok(layer.includes('background-color:#1e3a4f') && !layer.includes('--c-surface'), layer);
  assert.ok(!layer.includes(':class'), 'có nền riêng thì không đổi nền theo cuộn');
  assert.ok(h.includes('header-tone-light'), 'nền tối → chữ sáng');
  assert.ok(!/<header[^>]*--c-surface/.test(h) && !/<aside[^>]*style=/.test(h), 'không đổi biến màu của khung sổ xuống / menu điện thoại');

  // Nền sáng → chữ tối; họa tiết thêm lớp họa tiết lên lớp nền
  setBg({ header: { bg_mode: 'pattern', bg_color: '#f3efe6', bg_pattern: 'grid' } });
  h = header(await text('/'));
  assert.ok(h.includes('header-tone-dark') && /<div aria-hidden="true" class="[^"]*pat-grid/.test(h));
  setBg({});
});

test('khối trang chủ tắt vẫn không hiện; bật lại nền còn nguyên; đổi nền không làm mất cài đặt Bố cục trang chủ', async () => {
  setBg({ info: { bg_mode: 'color', bg_color: '#223344' } });
  const layout = ctx.settings.getForAdmin('home_layout');
  const toggled = layout.sections.map((s) => (s.key === 'info' ? { ...s, enabled: false } : s));
  const saved = ctx.settings.saveGroup('home_layout', { ...layout, sections: toggled });
  assert.ok(saved.sections.every((s) => !('bg_mode' in s)), 'Bố cục trang chủ chỉ còn bật / tắt, không còn trường nền');
  assert.ok(!/background-color:#223344/.test(await text('/')), 'khối tắt thì không hiện');
  ctx.settings.saveGroup('home_layout', { ...layout, sections: layout.sections.map((s) => (s.key === 'info' ? { ...s, enabled: true } : s)) });
  assert.ok(/background-color:#223344/.test(await text('/')), 'bật lại: nền vẫn còn');
  setBg({});
});
