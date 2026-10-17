// Khởi tạo ứng dụng Express: bảo mật, file tĩnh, route.
import path from 'node:path';
import express from 'express';
import session from 'express-session';
import compression from 'compression';
import { config } from './config/index.js';
import { SqliteStore } from './lib/session-store.js';
import { viewHelpers } from './lib/views.js';
import { nonce, securityHeaders, permissionsPolicy } from './middleware/security.js';
import publicRoutes, { publicLocals } from './routes/public.js';
import apiPublic from './routes/api-public.js';
import seoRoutes from './routes/seo.js';
import adminRoutes from './routes/admin.js';
import { buildSeo } from './lib/seo.js';
import { canonicalUrl, applyRedirects } from './middleware/urls.js';
import { logNotFound } from './services/redirects.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // Chạy sau Nginx: tin header X-Forwarded-* từ 1 proxy để lấy đúng IP khách
  app.set('trust proxy', 1);
  app.set('query parser', 'simple');

  app.use(compression());
  app.use(nonce);
  app.use(securityHeaders);
  app.use(permissionsPolicy);
  app.use(viewHelpers);

  // ---------- File tĩnh ----------
  // Bộ nhớ đệm (cache) trình duyệt, chỉ bật khi chạy thật (production):
  //  - /uploads: tên file có mã ngẫu nhiên, không bao giờ đổi nội dung nên giữ 1 năm
  //  - /assets, /admin-assets gọi kèm ?v=<mã phiên bản> (đổi mỗi lần khởi động lại) nên giữ 1 năm; không kèm ?v= thì 7 ngày
  //  - /vendor (thư viện bên thứ ba): 30 ngày
  const YEAR = 365 * 24 * 3600;
  const versioned = (req, res, next) => { res.locals.versionedAsset = !!req.query.v; next(); };
  const assetCache = (res) => {
    if (!config.isProd) return res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Cache-Control', res.locals.versionedAsset ? `public, max-age=${YEAR}, immutable` : 'public, max-age=604800');
  };
  const long = { maxAge: config.isProd ? '30d' : 0, index: false };
  app.use('/assets', versioned, express.static(config.paths.frontendPublic, { index: false, setHeaders: (res) => assetCache(res) }));
  app.use('/uploads', express.static(config.paths.uploads, { index: false, fallthrough: false, dotfiles: 'deny', maxAge: config.isProd ? YEAR * 1000 : 0, immutable: config.isProd }));
  app.use('/admin-assets', versioned, express.static(config.paths.adminPublic, { index: false, setHeaders: (res) => assetCache(res) }));
  const nm = (p) => path.join(config.paths.nodeModules, p);
  const vendor = {
    alpine: nm('alpinejs/dist'),
    'alpine-collapse': nm('@alpinejs/collapse/dist'),
    'alpine-focus': nm('@alpinejs/focus/dist'),
    swiper: nm('swiper'),
    gsap: nm('gsap/dist'),
    photoswipe: nm('photoswipe/dist'),
    quill: nm('quill/dist'),
    'alpine-sort': nm('@alpinejs/sort/dist'),
  };
  for (const [name, dir] of Object.entries(vendor)) {
    app.use(`/vendor/${name}`, express.static(dir, { ...long, dotfiles: 'deny' }));
  }

  // Phiên đăng nhập (chỉ tạo khi vào trang quản trị)
  const ttlMs = config.sessionHours * 3600 * 1000;
  const sessionMw = session({
    name: 'lnsid',
    secret: config.sessionSecret,
    store: new SqliteStore({ ttlMs }),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: true,
    cookie: { httpOnly: true, sameSite: 'lax', secure: config.isProd, maxAge: ttlMs, path: config.adminPath },
  });

  // Một nội dung chỉ có một địa chỉ (bỏ "/" cuối, chữ thường), rồi áp dụng chuyển hướng 301 do shop cấu hình
  app.use(applyRedirects); // trước canonicalUrl để địa chỉ cũ có "/" cuối hay chữ hoa vẫn chỉ qua 1 lần chuyển hướng
  app.use(canonicalUrl);
  app.use(seoRoutes);
  app.use(config.adminPath, sessionMw, adminRoutes);
  app.use('/api', express.json({ limit: '50kb' }), apiPublic);
  app.use(publicRoutes);

  // ---------- 404 ----------
  app.use((req, res, next) => {
    const err = new Error('Trang không tồn tại');
    err.status = 404;
    next(err);
  });

  // ---------- Xử lý lỗi ----------
  app.use((err, req, res, next) => {
    let status = err.status || err.statusCode || 500;
    if (err.code === 'LIMIT_FILE_SIZE') {
      status = 413;
      err.message = `Ảnh vượt quá ${config.uploadMaxMb}MB`;
    }
    if (err.type === 'entity.too.large') {
      status = 413;
      err.message = 'Dữ liệu gửi lên quá lớn';
    }
    if (status >= 500) console.error(`[error] ${req.method} ${req.originalUrl}`, err);
    if (res.headersSent) return next(err);
    // Lỗi không phải trang HTML (ảnh / CSS / JS không tồn tại): trả nhanh bản chữ, không dựng trang 404 đầy đủ
    if (/^\/(uploads|assets|vendor|admin-assets)\//.test(req.path)) return res.status(status).type('text').set('Cache-Control', 'no-store').send('Not found');
    // Trang lỗi không được Google lập chỉ mục; ghi lại 404 để shop tạo chuyển hướng
    res.set('X-Robots-Tag', 'noindex');
    if (status === 404 && (req.method === 'GET' || req.method === 'HEAD') && !req.originalUrl.startsWith(config.adminPath)) logNotFound(req.path, req.get('referer'));
    const message = status >= 500 ? 'Đã có lỗi xảy ra, vui lòng thử lại sau' : err.message;
    if (res.headersSent) return next(err);

    const isApi = req.originalUrl.startsWith('/api/') || req.originalUrl.startsWith(`${config.adminPath}/api/`) || req.accepts(['html', 'json']) === 'json';
    if (isApi) return res.status(status).json({ ok: false, message, errors: err.details });
    if (req.originalUrl.startsWith(config.adminPath)) {
      return res.adminView('error.njk', { status, message }, status);
    }
    try {
      publicLocals(req, res);
      const pg = res.locals.s.pages;
      res.locals.seo = buildSeo(req, { title: status === 404 ? pg.error_404_title : status === 410 ? pg.error_410_title : pg.error_500_title, noindex: true });
      res.view('pages/error.njk', { status, message }, status);
    } catch (renderErr) {
      console.error('[error] Không render được trang lỗi', renderErr);
      res.status(status).type('text').send(message);
    }
  });

  return app;
}
