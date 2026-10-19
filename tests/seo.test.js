// SEO kỹ thuật và trang khách: canonical, noindex, robots.txt, sitemap, chuẩn hóa địa chỉ, schema, banner (fetchpriority), trang chính sách.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { boot, jsonLd, head } from './helpers.js';

let ctx;
const html = async (p, o) => (await ctx.raw(p, o)).text();
const robotsOf = (h) => head(h).match(/<meta name="robots" content="([^"]*)"/)?.[1];
const canonicalsOf = (h) => [...head(h).matchAll(/<link rel="canonical" href="([^"]*)"/g)].map((m) => m[1]);

before(async () => {
  ctx = await boot({ content: true });
  ctx.setSettings('seo', { allow_indexing: true });
});
after(() => ctx.close());

test('robots.txt: tắt index thì chặn toàn bộ; bật thì chặn địa chỉ có tham số nhưng cho CSS / JS', async () => {
  ctx.setSettings('seo', { allow_indexing: false });
  assert.match(await html('/robots.txt'), /^User-agent: \*\nDisallow: \/\n/);
  ctx.setSettings('seo', { allow_indexing: true });
  const r = await html('/robots.txt');
  assert.match(r, /Disallow: \/\*\?/);
  assert.match(r, /Allow: \/assets\//);
  assert.match(r, /Allow: \/theme\.css/);
  assert.match(r, /Sitemap: /);
});

test('trang chủ: đúng 1 canonical tuyệt đối, index, có og:image và đúng 1 H1', async () => {
  const h = await html('/');
  assert.equal(canonicalsOf(h).length, 1);
  assert.match(canonicalsOf(h)[0], /^https?:\/\//);
  assert.match(robotsOf(h), /^index, follow/);
  assert.match(head(h), /property="og:image"/);
  assert.equal((h.match(/<h1[\s>]/g) || []).length, 1);
});

test('địa chỉ có tham số lọc / sắp xếp / tìm kiếm / phân trang: noindex và KHÔNG có canonical', async () => {
  for (const p of ['/san-pham?trang=2', '/san-pham?sap_xep=gia-tang', '/san-pham?q=vong', '/san-pham?mau=xanh-luc', '/gallery?album=x', '/san-pham?tham_so_la=1']) {
    const res = await ctx.raw(p);
    if (res.status !== 200) continue; // có thể được chuyển hướng (ví dụ trang không tồn tại)
    const h = await res.text();
    assert.match(robotsOf(h), /^noindex/, `${p} phải noindex`);
    assert.equal(canonicalsOf(h).length, 0, `${p} không được có canonical`);
  }
});

test('tham số theo dõi (utm...) vẫn index và canonical về địa chỉ sạch', async () => {
  const h = await html('/san-pham?utm_source=x&utm_medium=y&fbclid=z');
  assert.match(robotsOf(h), /^index/);
  assert.equal(canonicalsOf(h).length, 1);
  assert.doesNotMatch(canonicalsOf(h)[0], /\?/);
});

test('giỏ hàng, tra cứu đơn: noindex và không có canonical', async () => {
  for (const p of ['/gio-hang', '/tra-cuu-don']) {
    const h = await html(p);
    assert.match(robotsOf(h), /^noindex/);
    assert.equal(canonicalsOf(h).length, 0);
  }
});

test('địa chỉ chuẩn hóa: dấu "/" cuối, chữ hoa, "//", ?trang=1 chuyển 301; trang không có trả 404 + noindex', async () => {
  for (const [from, to] of [['/san-pham/', '/san-pham'], ['/SAN-PHAM', '/san-pham'], ['//san-pham', '/san-pham'], ['/san-pham?trang=1', '/san-pham']]) {
    const r = await ctx.raw(from);
    assert.equal(r.status, 301, from);
    assert.equal(r.headers.get('location'), to, from);
  }
  const nf = await ctx.raw('/khong-ton-tai-' + Date.now());
  assert.equal(nf.status, 404);
  assert.match(robotsOf(await nf.text()), /^noindex/);
});

test('sitemap: mọi địa chỉ sạch (không tham số), trả 200, canonical khớp, không noindex', async () => {
  const xml = await html('/sitemap.xml');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname + new URL(m[1]).search);
  assert.ok(urls.length > 10);
  for (const u of urls) {
    assert.doesNotMatch(u, /\?/, u);
    const res = await ctx.raw(u);
    assert.equal(res.status, 200, u);
    const h = await res.text();
    assert.doesNotMatch(robotsOf(h), /noindex/, u);
    assert.equal(new URL(canonicalsOf(h)[0]).pathname, u, `canonical của ${u}`);
  }
});

test('mọi trang có JSON-LD hợp lệ; sản phẩm có Product + Offer; trang con có BreadcrumbList', async () => {
  const xml = await html('/sitemap.xml');
  const prodUrl = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname).find((u) => /^\/san-pham\/[^/]+\/[^/]+$/.test(u));
  assert.ok(prodUrl, 'có sản phẩm trong sitemap');
  const h = await html(prodUrl);
  const ld = jsonLd(h);
  const product = ld.find((o) => o['@type'] === 'Product');
  assert.ok(product?.name && product.image?.length && product.sku);
  const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
  assert.ok(offer && offer.priceCurrency === 'VND' && offer.availability && offer.url);
  assert.ok(ld.some((o) => o['@type'] === 'BreadcrumbList'));
  assert.ok(jsonLd(await html('/')).some((o) => /Store$|^Organization$|LocalBusiness/.test(o['@type'])));
});

test('banner trang chủ: ảnh đầu eager + fetchpriority=high, các ảnh sau lazy + low (slider)', async () => {
  const ids = ctx.db.prepare("SELECT id FROM media WHERE folder = 'sample' LIMIT 3").pluck().all();
  const slide = (id, title) => ({ image: id, alt: '', eyebrow: '', title, subtitle: '', cta_label: '', cta_url: '', link_url: '' });
  ctx.setSettings('home', { hero_mode: 'slider', hero_slides: [slide(ids[0], 'Banner một'), slide(ids[1], ''), slide(ids[2], 'Banner ba')] });
  let h = await html('/');
  let imgs = [...h.matchAll(/<img\b[^>]*hero-img[^>]*>/g)].map((m) => m[0]);
  assert.equal(imgs.length, 3);
  assert.match(imgs[0], /loading="eager"/);
  assert.match(imgs[0], /fetchpriority="high"/);
  for (const t of imgs.slice(1)) { assert.match(t, /loading="lazy"/); assert.match(t, /fetchpriority="low"/); }
  for (const t of imgs) assert.match(t, /width="\d+" height="\d+"/);
  assert.equal((h.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(h, /<link rel="preload" as="image"[^>]*fetchpriority="high"/);

  ctx.setSettings('home', { hero_mode: 'stack' });
  h = await html('/');
  imgs = [...h.matchAll(/<img\b[^>]*hero-img[^>]*>/g)].map((m) => m[0]);
  assert.match(imgs[0], /fetchpriority="high"/);
  assert.doesNotMatch(imgs[1], /fetchpriority/);
  assert.doesNotMatch(h, /hero-swiper/, 'kiểu xếp nối tiếp không có slider');

  // Không banner nào có tiêu đề: vẫn đúng một H1 (ẩn)
  ctx.setSettings('home', { hero_mode: 'slider', hero_slides: [slide(ids[0], ''), slide(ids[1], '')] });
  h = await html('/');
  assert.equal((h.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(h, /<h1 class="sr-only">/);
});

test('trang chính sách: hiện ở chân trang, có trong sitemap, đổi đường dẫn thì 301, trang tắt trả 404', async () => {
  let h = await html('/');
  const footer = h.slice(h.indexOf('<footer'));
  assert.equal((footer.match(/href="\/chinh-sach\/[^"]*"/g) || []).length, 4);
  assert.match(await html('/sitemap.xml'), /\/chinh-sach\/chinh-sach-doi-tra/);
  assert.equal((await ctx.raw('/chinh-sach/chinh-sach-doi-tra')).status, 200);

  const pages = ctx.settings.getForAdmin('policies').policy_pages;
  const edited = pages.map((p, i) => (i === 0 ? { ...p, slug: 'doi-tra-hang' } : i === 1 ? { ...p, enabled: false } : p));
  ctx.setSettings('policies', { policy_pages: edited });
  const old = await ctx.raw('/chinh-sach/chinh-sach-doi-tra');
  assert.equal(old.status, 301);
  assert.equal(old.headers.get('location'), '/chinh-sach/doi-tra-hang');
  assert.equal((await ctx.raw('/chinh-sach/doi-tra-hang')).status, 200);
  assert.equal((await ctx.raw('/chinh-sach/chinh-sach-bao-mat')).status, 404);

  // thêm trang trùng đường dẫn: tự thêm hậu tố, nội dung bị làm sạch
  ctx.setSettings('policies', { policy_pages: [...edited, { key: '', enabled: true, reviewed: true, title: 'Trang mới', slug: 'doi-tra-hang', content: '<p>ok</p><script>alert(1)</script>' }] });
  const slugs = ctx.settings.getForAdmin('policies').policy_pages.map((p) => p.slug);
  assert.equal(new Set(slugs).size, slugs.length, 'đường dẫn không được trùng');
  h = await html('/chinh-sach/doi-tra-hang-2');
  assert.doesNotMatch(h, /<script>alert/);

  // tắt cột và dòng nhỏ: không còn liên kết chính sách ở chân trang
  const cols = ctx.settings.getForAdmin('footer').columns.map((c) => (c.key === 'policies' ? { ...c, enabled: false } : c));
  ctx.setSettings('footer', { columns: cols });
  h = await html('/');
  assert.equal(((h.slice(h.indexOf('<footer')).match(/href="\/chinh-sach\//g)) || []).length, 0);
});

test('chuyên mục blog: mặc định được index, có canonical và có trong sitemap; tắt thì noindex và rời sitemap', async () => {
  const slug = ctx.db.prepare('SELECT slug FROM post_categories WHERE active = 1 AND id IN (SELECT category_id FROM posts WHERE status = \'published\') LIMIT 1').pluck().get();
  assert.ok(slug, 'gói nội dung có chuyên mục có bài');
  const sitemap = () => html('/sitemap.xml');

  let h = await html(`/blog/${slug}`);
  assert.match(robotsOf(h), /^index, follow/);
  assert.equal(canonicalsOf(h).length, 1);
  assert.ok(canonicalsOf(h)[0].endsWith(`/blog/${slug}`));
  assert.ok((await sitemap()).includes(`/blog/${slug}</loc>`), 'chuyên mục nằm trong sitemap');
  assert.match(robotsOf(await html(`/blog/${slug}?trang=2`)) || 'noindex', /noindex/, 'trang có tham số vẫn noindex');

  ctx.setSettings('sitemap', { sitemap_blog_categories: false });
  assert.ok(!(await sitemap()).includes(`/blog/${slug}</loc>`), 'tắt mục sitemap thì rời sitemap');
  ctx.setSettings('sitemap', { sitemap_blog_categories: true });

  ctx.setSettings('pages', { blog_category_index: false });
  h = await html(`/blog/${slug}`);
  assert.match(robotsOf(h), /^noindex/);
  assert.ok(!(await sitemap()).includes(`/blog/${slug}</loc>`), 'chuyên mục noindex thì không có trong sitemap');
  ctx.setSettings('pages', { blog_category_index: true });
});
