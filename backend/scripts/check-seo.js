// npm run check:seo [-- http://localhost:3000]
// Kiểm tra SEO kỹ thuật của website đang chạy: canonical, noindex, robots.txt, sitemap, URL chuẩn hóa, schema, H1, ảnh, og:image.
// Chạy sau khi sửa template / route / cài đặt SEO, hoặc thêm kiểu trang / tham số mới. Thoát mã 1 nếu có lỗi.
const BASE = (process.argv[2] || process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const get = (p, o = {}) => fetch(p.startsWith('http') ? p : BASE + p, { redirect: 'manual', ...o });
const errors = [];
const notes = [];
const fail = (where, msg) => errors.push(`[${where}] ${msg}`);
const path = (u) => u.replace(/^https?:\/\/[^/]+/, '') || '/';

const meta = (head, name) => head.match(new RegExp(`<meta[^>]+(?:name|property)="${name}"[^>]*content="([^"]*)"`, 'i'))?.[1];
const canonicals = (head) => [...head.matchAll(/<link[^>]+rel="canonical"[^>]*href="([^"]*)"/gi)].map((m) => m[1]);

async function page(p) {
  const r = await get(p);
  const html = await r.text();
  const head = html.split('</head>')[0];
  const body = html.slice(head.length);
  const ld = [];
  let ldBad = 0;
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try { const o = JSON.parse(m[1]); ld.push(...(Array.isArray(o) ? o : o['@graph'] || [o])); } catch { ldBad++; }
  }
  return { r, html, head, body, ld, ldBad, robots: meta(head, 'robots') || '', xrobots: r.headers.get('x-robots-tag') || '' };
}

// ---------- robots.txt ----------
const robots = await (await get('/robots.txt')).text();
const indexing = !/^Disallow:\s*\/\s*$/m.test(robots);
if (!indexing) notes.push('Website đang TẮT index (robots.txt Disallow: /). Chỉ kiểm tra noindex và URL chuẩn hóa.');
else {
  if (!/^Sitemap:/m.test(robots)) fail('robots.txt', 'thiếu dòng Sitemap');
  if (!/^Disallow:\s*\/\*\?/m.test(robots)) notes.push('robots.txt không chặn địa chỉ có tham số (Disallow: /*?). Kiểm tra cài đặt "Chặn thu thập các địa chỉ có tham số".');
}

// ---------- sitemap ----------
const sm = await (await get('/sitemap.xml')).text();
const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => path(m[1]));
if (indexing && !urls.length) fail('sitemap.xml', 'sitemap trống hoặc không có');
notes.push(`sitemap: ${urls.length} địa chỉ`);

// ---------- từng trang trong sitemap ----------
const SCHEMA_PAGE = new Set(['WebPage', 'AboutPage', 'ContactPage', 'CollectionPage', 'ItemPage', 'FAQPage', 'Product', 'BlogPosting', 'Article']);
const sample = indexing ? urls : ['/', '/san-pham'];
const linkSet = new Set();
for (const u of sample) {
  const pg = await page(u);
  const { r, head, body, ld } = pg;
  if (r.status !== 200) { fail(u, `trả ${r.status}`); continue; }
  const noindex = /noindex/i.test(pg.robots + pg.xrobots);
  if (!indexing) { if (!noindex) fail(u, 'index đang tắt nhưng trang không có noindex'); continue; }
  if (noindex) fail(u, 'có trong sitemap nhưng noindex');
  const c = canonicals(head);
  if (c.length !== 1) fail(u, `có ${c.length} thẻ canonical`);
  else if (path(c[0]) !== u) fail(u, `canonical (${path(c[0])}) khác địa chỉ trang`);
  else if (!/^https?:\/\//.test(c[0])) fail(u, 'canonical không phải địa chỉ tuyệt đối');
  if (!meta(head, 'og:image')) fail(u, 'thiếu og:image');
  if (!/<html[^>]+lang="/.test(pg.html)) fail(u, 'thiếu lang');
  const hs = [...body.matchAll(/<h([1-6])[\s>]/g)].map((m) => +m[1]);
  if (hs.filter((h) => h === 1).length !== 1) fail(u, `có ${hs.filter((h) => h === 1).length} thẻ H1`);
  if (hs.some((h, i) => i && h > hs[i - 1] + 1)) fail(u, 'tiêu đề nhảy cấp');
  if (pg.ldBad) fail(u, `${pg.ldBad} khối JSON-LD không đọc được`);
  const types = ld.map((o) => o['@type']);
  if (!types.some((t) => SCHEMA_PAGE.has(t))) fail(u, 'thiếu schema loại trang (WebPage / CollectionPage / Product / BlogPosting...)');
  if (u !== '/' && !types.includes('BreadcrumbList')) fail(u, 'thiếu BreadcrumbList');
  if (!types.includes('Organization') && !ld.some((o) => /Store$|^Organization$|LocalBusiness/.test(String(o['@type'])))) fail(u, 'thiếu schema doanh nghiệp');
  const prod = ld.find((o) => o['@type'] === 'Product');
  if (prod) {
    for (const k of ['name', 'image', 'sku', 'brand']) if (!prod[k]) fail(u, `Product thiếu ${k}`);
    const off = Array.isArray(prod.offers) ? prod.offers[0] : prod.offers;
    if (off) for (const k of ['price', 'priceCurrency', 'availability', 'url']) if (off[k] == null) fail(u, `Offer thiếu ${k}`);
  }
  // Ảnh trong nội dung: bỏ ảnh do Alpine nạp động (thuộc tính :src) và ảnh ẩn dùng khi rê chuột
  const imgs = [...body.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]).filter((t) => !/\s:src=/.test(t) && !/hover-img/.test(t));
  const noAlt = imgs.filter((t) => !/\salt=/.test(t)).length;
  const noDim = imgs.filter((t) => !/\swidth=/.test(t) || !/\sheight=/.test(t)).length;
  if (noAlt) fail(u, `${noAlt} ảnh thiếu alt`);
  if (noDim) fail(u, `${noDim} ảnh thiếu width/height (gây CLS)`);
  if (/<script\b(?![^>]*(defer|async|type="module"|type="application))[^>]*\ssrc=/i.test(head)) fail(u, 'có script chặn render trong <head>');
  if (linkSet.size < 120) for (const m of body.matchAll(/<a\b[^>]*href="(\/[^"#?]*)"/g)) linkSet.add(m[1]);
}

// ---------- biến thể địa chỉ ----------
const variants = [['/san-pham?trang=2', 'phân trang'], ['/san-pham?sap_xep=gia-tang', 'sắp xếp'], ['/san-pham?q=vong', 'tìm kiếm'], ['/san-pham?mau=xanh', 'lọc'], ['/gallery?album=x', 'album'], ['/san-pham?tham_so_la=1', 'tham số lạ']];
for (const [u, name] of variants) {
  const pg = await page(u);
  if (pg.r.status >= 300 && pg.r.status < 400) continue; // chuyển hướng cũng chấp nhận (VD trang không tồn tại)
  if (pg.r.status !== 200) continue;
  if (!/noindex/i.test(pg.robots + pg.xrobots)) fail(u, `biến thể ${name} chưa noindex`);
  if (canonicals(pg.head).length) fail(u, `biến thể ${name} vừa noindex vừa có canonical`);
}
if (indexing) {
  const t = await page('/san-pham?utm_source=test&utm_medium=x');
  const c = canonicals(t.head);
  if (t.r.status === 200 && (c.length !== 1 || /[?&]utm_/.test(c[0]))) fail('/san-pham?utm_source', 'canonical phải trỏ về địa chỉ sạch, không có tham số theo dõi');
  if (t.r.status === 200 && /noindex/i.test(t.robots)) fail('/san-pham?utm_source', 'tham số theo dõi không được làm trang noindex');
}

// ---------- chuẩn hóa địa chỉ + 404 ----------
for (const [u, want] of [['/san-pham/', '/san-pham'], ['/SAN-PHAM', '/san-pham'], ['//san-pham', '/san-pham'], ['/san-pham?trang=1', '/san-pham']]) {
  const r = await get(u);
  const loc = r.headers.get('location');
  if (r.status !== 301 || !loc || path(loc) !== want) fail(u, `phải chuyển 301 về ${want} (hiện ${r.status} ${loc || ''})`);
}
const nf = await page('/khong-ton-tai-' + Date.now());
if (nf.r.status !== 404) fail('404', `trang không tồn tại phải trả 404 (hiện ${nf.r.status})`);
if (!/noindex/i.test(nf.robots + nf.xrobots)) fail('404', 'trang 404 phải noindex');
for (const u of ['/gio-hang', '/tra-cuu-don']) {
  const pg = await page(u);
  if (pg.r.status === 200 && !/noindex/i.test(pg.robots + pg.xrobots)) fail(u, 'trang này phải noindex');
}

// ---------- liên kết nội bộ ----------
let bad = 0; let moved = 0;
for (const l of [...linkSet].slice(0, 120)) {
  if (/^\/(api|admin|fonts|uploads|assets|vendor)/.test(l)) continue;
  const r = await get(l);
  if (r.status >= 400) { bad++; fail('liên kết nội bộ', `${l} → ${r.status}`); } else if (r.status >= 300) { moved++; notes.push(`liên kết nội bộ bị chuyển hướng: ${l} → ${r.headers.get('location')}`); }
}
notes.push(`liên kết nội bộ đã kiểm tra: ${Math.min(linkSet.size, 120)}, hỏng: ${bad}, bị chuyển hướng: ${moved}`);

console.log(`Kiểm tra SEO: ${BASE}\n`);
notes.forEach((n) => console.log('  • ' + n));
if (errors.length) {
  console.log(`\n✗ ${errors.length} vấn đề:`);
  errors.forEach((e) => console.log('  ✗ ' + e));
  process.exit(1);
}
console.log('\n✔ Không phát hiện vấn đề SEO kỹ thuật.');
