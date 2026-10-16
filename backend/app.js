// Khởi tạo ứng dụng Express: bảo mật, file tĩnh, route.
import path from 'node:path';
import express from 'express';
import session from 'express-session';
import compression from 'compression';
import { config } from './config/index.js';
import { SqliteStore } from './lib/session-store.js';
import { viewHelpers } from './lib/views.js';
import { nonce, securityHeaders } from './middleware/security.js';
import publicRoutes, { publicLocals } from './routes/public.js';
import apiPublic from './routes/api-public.js';
import seoRoutes from './routes/seo.js';
import adminRoutes from './routes/admin.js';
import { buildSeo } from './lib/seo.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // Chạy sau Nginx: tin header X-Forwarded-* từ 1 proxy để lấy đúng IP khách
  app.set('trust proxy', 1);
  app.set('query parser', 'simple');

  app.use(compression());
  app.use(nonce);
  app.use(securityHeaders);
  app.use(viewHelpers);

  // ---------- File tĩnh ----------
  const long = { maxAge: config.isProd ? '30d' : 0, immutable: config.isProd, index: false };
  app.use('/assets', express.static(config.paths.frontendPublic, { ...long, immutable: false, maxAge: config.isProd ? '7d' : 0 }));
  app.use('/uploads', express.static(config.paths.uploads, { ...long, fallthrough: false }));
  app.use('/admin-assets', express.static(config.paths.adminPublic, { index: false, maxAge: config.isProd ? '1d' : 0 }));
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
    const message = status >= 500 ? 'Đã có lỗi xảy ra, vui lòng thử lại sau' : err.message;
    if (res.headersSent) return next(err);

    const isApi = req.originalUrl.startsWith('/api/') || req.originalUrl.startsWith(`${config.adminPath}/api/`) || req.accepts(['html', 'json']) === 'json';
    if (isApi) return res.status(status).json({ ok: false, message, errors: err.details });
    if (req.originalUrl.startsWith(config.adminPath)) {
      return res.adminView('error.njk', { status, message }, status);
    }
    try {
      publicLocals(req, res);
      res.locals.seo = buildSeo(req, { title: status === 404 ? 'Không tìm thấy trang' : 'Lỗi', noindex: true });
      res.view('pages/error.njk', { status, message }, status);
    } catch (renderErr) {
      console.error('[error] Không render được trang lỗi', renderErr);
      res.status(status).type('text').send(message);
    }
  });

  return app;
}
