// robots.txt, sitemap.xml, theme.css (biến màu/font sinh từ cài đặt Giao diện).
import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../lib/db.js';
import { config } from '../config/index.js';
import { getPublicSettings, getRaw } from '../services/settings.js';

const router = Router();

router.get('/robots.txt', (req, res) => {
  const allow = getRaw('seo').allow_indexing;
  res.type('text/plain').send(allow
    ? `User-agent: *\nAllow: /\nDisallow: /gio-hang\nDisallow: /api/\n\nSitemap: ${config.baseUrl}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n');
});

router.get('/sitemap.xml', (req, res) => {
  const f = getRaw('features');
  const xmlEsc = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
  const iso = (d) => (d ? new Date(String(d).replace(' ', 'T') + 'Z').toISOString().slice(0, 10) : undefined);
  const urls = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/san-pham', priority: '0.9', changefreq: 'daily' },
    { loc: '/ve-shop', priority: '0.5' },
    { loc: '/lien-he', priority: '0.5' },
  ];
  if (f.gallery) urls.push({ loc: '/gallery', priority: '0.6' });
  if (f.size_guide) urls.push({ loc: '/huong-dan-size', priority: '0.7' });
  if (f.custom_request) urls.push({ loc: '/thiet-ke-rieng', priority: '0.7' });
  for (const t of db.prepare(`SELECT slug FROM terms WHERE type = 'jade_type' AND active = 1`).all()) {
    urls.push({ loc: `/san-pham?loai=${t.slug}`, priority: '0.8' });
  }
  for (const p of db.prepare(`SELECT slug, updated_at FROM products WHERE status = 'published'`).all()) {
    urls.push({ loc: `/san-pham/${p.slug}`, lastmod: iso(p.updated_at), priority: '0.8' });
  }
  if (f.blog) {
    urls.push({ loc: '/blog', priority: '0.6', changefreq: 'weekly' });
    for (const p of db.prepare(`SELECT slug, updated_at FROM posts WHERE status = 'published' AND published_at <= datetime('now')`).all()) {
      urls.push({ loc: `/blog/${p.slug}`, lastmod: iso(p.updated_at), priority: '0.6' });
    }
  }
  const body = urls.map((u) => `  <url><loc>${xmlEsc(config.baseUrl + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ''}<priority>${u.priority}</priority></url>`).join('\n');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
});

// Trình duyệt luôn tự tìm /favicon.ico
router.get('/favicon.ico', (req, res) => {
  const fav = getPublicSettings().site.favicon;
  res.redirect(302, fav?.sm || '/assets/images/favicon.svg');
});

const RADIUS = { none: ['0px', '0px', '0px'], sm: ['4px', '6px', '10px'], md: ['8px', '12px', '20px'], lg: ['14px', '22px', '32px'] };

router.get('/theme.css', (req, res) => {
  const t = getPublicSettings().theme;
  const [rs, rm, rl] = RADIUS[t.radius] || RADIUS.md;
  // Chặn đóng thẻ style hoặc nhúng url javascript trong CSS tùy chỉnh
  const custom = String(t.custom_css || '').replace(/<\/?style/gi, '').replace(/expression\s*\(|javascript:/gi, '');
  const css = `:root{
  --c-primary:${t.color_primary};--c-on-primary:${t.color_primary_contrast};--c-accent:${t.color_accent};
  --c-bg:${t.color_bg};--c-surface:${t.color_surface};--c-text:${t.color_text};--c-muted:${t.color_muted};
  --c-border:${t.color_border};--c-footer:${t.color_footer_bg};
  --ff-heading:'${t.font_heading}',Georgia,serif;--ff-body:'${t.font_body}',system-ui,sans-serif;
  --r-sm:${rs};--r-md:${rm};--r-lg:${rl};
}
${custom}`;
  const etag = `"${crypto.createHash('sha1').update(css).digest('base64url')}"`;
  res.set({ 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'no-cache', ETag: etag });
  if (req.get('if-none-match') === etag) return res.status(304).end();
  res.send(css);
});

export default router;
