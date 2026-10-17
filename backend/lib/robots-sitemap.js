// Sinh nội dung robots.txt và sitemap.xml từ cài đặt (Admin › Cài đặt › Sitemap & robots.txt).
import { db } from './db.js';
import { config } from '../config/index.js';
import { getRaw } from '../services/settings.js';
import { safeJson } from './utils.js';
import { listPublicProductGroups } from '../services/catalog.js';

const AI_BOTS = ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'anthropic-ai', 'CCBot', 'Google-Extended', 'PerplexityBot', 'Bytespider', 'Applebot-Extended'];
const DIRECTIVE = /^(user-agent|allow|disallow|crawl-delay|sitemap|host)\s*:\s*\S*/i;

const lines = (text) => String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const abs = (p) => `${config.baseUrl}${p}`;

// ---------------- robots.txt ----------------
export function buildRobots() {
  const seo = getRaw('seo');
  const sm = getRaw('sitemap');
  if (!seo.allow_indexing) return 'User-agent: *\nDisallow: /\n';

  const out = ['User-agent: *', 'Allow: /'];
  // Chỉ nhận đường dẫn bắt đầu bằng "/", không chứa khoảng trắng. Đường dẫn trang quản trị không bao giờ được liệt kê ở đây.
  for (const p of lines(sm.robots_disallow)) {
    if (/^\/[^\s#]*$/.test(p) && !p.startsWith(config.adminPath)) out.push(`Disallow: ${p}`);
  }
  if (sm.sitemap_enabled) out.push('', `Sitemap: ${abs('/sitemap.xml')}`);

  if (sm.robots_block_ai) {
    for (const bot of AI_BOTS) out.push('', `User-agent: ${bot}`, 'Disallow: /');
  }

  // Quy tắc nâng cao do chủ shop dán vào: chỉ giữ dòng đúng cú pháp robots.txt
  const extra = lines(sm.robots_extra).filter((l) => l.startsWith('#') || DIRECTIVE.test(l)).map((l) => l.slice(0, 300));
  if (extra.some((l) => !l.startsWith('#'))) {
    out.push('');
    if (!/^user-agent/i.test(extra.find((l) => !l.startsWith('#')))) out.push('User-agent: *');
    out.push(...extra);
  }
  return `${out.join('\n')}\n`;
}

// ---------------- sitemap.xml ----------------
const xmlEsc = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
const iso = (d) => (d ? new Date(String(d).replace(' ', 'T') + 'Z').toISOString().slice(0, 10) : undefined);
const PRIORITIES = ['1.0', '0.9', '0.8', '0.7', '0.6', '0.5', '0.4', '0.3', '0.2', '0.1'];
const FREQS = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];

// Quy tắc loại trừ: "/san-pham/vong-x" (khớp đúng), "/blog/*" (khớp theo tiền tố)
function excluder(text) {
  const rules = lines(text).filter((r) => r.startsWith('/'));
  return (loc) => rules.some((r) => (r.endsWith('*') ? loc.startsWith(r.slice(0, -1)) : loc === r || loc.split('?')[0] === r));
}

function coverUrl(variants) {
  const lg = safeJson(variants, {}).lg;
  return lg ? abs(`/uploads/${lg}`) : '';
}

export function sitemapEntries() {
  const f = getRaw('features');
  const sm = getRaw('sitemap');
  const skip = excluder(sm.sitemap_exclude);
  const urls = [];
  const add = (u) => { if (!skip(u.loc)) urls.push(u); };

  if (sm.sitemap_pages) {
    add({ loc: '/', priority: '1.0', changefreq: 'daily' });
    add({ loc: '/san-pham', priority: '0.9', changefreq: 'daily' });
    add({ loc: '/ve-shop', priority: '0.5' });
    add({ loc: '/lien-he', priority: '0.5' });
    if (f.gallery) add({ loc: '/gallery', priority: '0.6' });
    if (f.size_guide) add({ loc: '/huong-dan-size', priority: '0.7' });
    if (f.custom_request) add({ loc: '/thiet-ke-rieng', priority: '0.7' });
    if (f.blog) add({ loc: '/blog', priority: '0.6', changefreq: 'weekly' });
  }
  if (sm.sitemap_categories) {
    for (const t of db.prepare(`SELECT slug FROM terms WHERE type = 'jade_type' AND active = 1`).all()) {
      add({ loc: `/san-pham/${t.slug}`, priority: '0.8' });
    }
    // Trang theo loại sản phẩm đang hoạt động (ví dụ Pháp phục)
    for (const g of listPublicProductGroups({ onlyNonJade: true })) add({ loc: `/san-pham/${g.slug}`, priority: '0.8' });
  }
  if (sm.sitemap_products) {
    const rows = db.prepare(`SELECT p.slug, p.name, p.updated_at, m.variants, jt.slug AS jade_slug,
        CASE WHEN pt.uses_jade_fields = 0 THEN pt.slug END AS type_slug FROM products p
      LEFT JOIN media m ON m.id = p.cover_media_id LEFT JOIN terms jt ON jt.id = p.jade_type_id LEFT JOIN product_types pt ON pt.id = p.product_type_id
      WHERE p.status = 'published'
      AND p.product_type_id IN (SELECT id FROM product_types WHERE active = 1) ORDER BY p.id`).all();
    for (const p of rows) {
      add({ loc: (p.jade_slug || p.type_slug) ? `/san-pham/${p.jade_slug || p.type_slug}/${p.slug}` : `/san-pham/${p.slug}`, lastmod: iso(p.updated_at), priority: '0.8', image: sm.sitemap_images ? coverUrl(p.variants) : '', title: p.name });
    }
  }
  if (sm.sitemap_posts && f.blog) {
    const rows = db.prepare(`SELECT p.slug, p.title, p.updated_at, m.variants, CASE WHEN pc.active = 1 THEN pc.slug END AS cat_slug FROM posts p
      LEFT JOIN media m ON m.id = p.cover_media_id LEFT JOIN post_categories pc ON pc.id = p.category_id WHERE p.status = 'published' AND p.published_at <= datetime('now') ORDER BY p.id`).all();
    for (const p of rows) {
      add({ loc: p.cat_slug ? `/blog/${p.cat_slug}/${p.slug}` : `/blog/${p.slug}`, lastmod: iso(p.updated_at), priority: '0.6', image: sm.sitemap_images ? coverUrl(p.variants) : '', title: p.title });
    }
  }
  // URL thêm tay: chỉ nhận đường dẫn của chính website này
  for (const x of sm.sitemap_extra || []) {
    let loc = String(x.url || '').trim();
    if (loc.startsWith(config.baseUrl)) loc = loc.slice(config.baseUrl.length) || '/';
    if (!/^\/[^\s<>"]*$/.test(loc)) continue;
    add({
      loc,
      priority: PRIORITIES.includes(x.priority) ? x.priority : '0.5',
      changefreq: FREQS.includes(x.changefreq) ? x.changefreq : undefined,
    });
  }
  // Bỏ trùng, giữ mục đầu tiên
  const seen = new Set();
  return urls.filter((u) => (seen.has(u.loc) ? false : seen.add(u.loc)));
}

export function buildSitemap() {
  const body = sitemapEntries().map((u) => {
    const img = u.image ? `<image:image><image:loc>${xmlEsc(u.image)}</image:loc><image:title>${xmlEsc(u.title || '')}</image:title></image:image>` : '';
    return `  <url><loc>${xmlEsc(abs(u.loc))}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ''}<priority>${u.priority}</priority>${img}</url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>\n`;
}
