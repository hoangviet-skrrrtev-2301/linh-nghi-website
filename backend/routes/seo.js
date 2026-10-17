// robots.txt, sitemap.xml, theme.css (biến màu/font sinh từ cài đặt Giao diện).
import { Router } from 'express';
import crypto from 'node:crypto';
import { config } from '../config/index.js';
import { getPublicSettings, getRaw } from '../services/settings.js';
import { buildRobots, buildSitemap } from '../lib/robots-sitemap.js';

const router = Router();

router.get('/robots.txt', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300').type('text/plain').send(buildRobots());
});

router.get('/sitemap.xml', (req, res, next) => {
  if (!getRaw('sitemap').sitemap_enabled) return next();
  res.set('Cache-Control', 'public, max-age=300').type('application/xml').send(buildSitemap());
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
${t.dark_mode === 'off' ? '' : `:root[data-theme="dark"]{
  color-scheme:dark;
  --c-primary:${t.dark_color_primary};--c-on-primary:${t.dark_color_primary_contrast};--c-accent:${t.dark_color_accent};
  --c-bg:${t.dark_color_bg};--c-surface:${t.dark_color_surface};--c-text:${t.dark_color_text};--c-muted:${t.dark_color_muted};
  --c-border:${t.dark_color_border};--c-footer:${t.dark_color_footer_bg};
}`}
${custom}`;
  const etag = `"${crypto.createHash('sha1').update(css).digest('base64url')}"`;
  res.set({ 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'no-cache', ETag: etag });
  if (req.get('if-none-match') === etag) return res.status(304).end();
  res.send(css);
});

export default router;
