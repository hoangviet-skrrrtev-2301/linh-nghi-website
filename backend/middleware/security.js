// Header bảo mật, CSRF, chống spam, giới hạn tần suất.
import crypto from 'node:crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';
import { randomToken, safeEqual } from '../lib/security.js';
import { HttpError } from '../lib/utils.js';

export function nonce(req, res, next) {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
}

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      // Alpine.js cần 'unsafe-eval' để chạy biểu thức trong thuộc tính x-data / @click.
      // Toàn bộ nội dung người dùng nhập đều được escape / sanitize nên rủi ro được kiểm soát.
      scriptSrc: ["'self'", "'unsafe-eval'", (req, res) => `'nonce-${res.locals.nonce}'`,
        'https://www.googletagmanager.com', 'https://connect.facebook.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://www.googletagmanager.com', 'https://www.facebook.com'],
      frameSrc: ['https://www.google.com', 'https://maps.google.com', 'https://www.youtube.com', 'https://www.youtube-nocookie.com'],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      ...(config.isProd ? { upgradeInsecureRequests: [] } : {}),
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: config.isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
});

// ---------- CSRF cho trang quản trị (token lưu trong session) ----------
export function csrf(req, res, next) {
  if (!req.session.csrf) req.session.csrf = randomToken(24);
  res.locals.csrfToken = req.session.csrf;
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const token = req.get('x-csrf-token') || req.body?._csrf;
  if (!safeEqual(token, req.session.csrf)) {
    return next(new HttpError(403, 'Phiên làm việc đã hết hạn, vui lòng tải lại trang'));
  }
  next();
}

// ---------- Chống spam form công khai ----------
// Token form = thời điểm tạo + chữ ký HMAC. Bot gửi quá nhanh hoặc dùng token giả sẽ bị chặn.
const sign = (ts) => crypto.createHmac('sha256', config.appSecret).update(`form:${ts}`).digest('base64url').slice(0, 24);

export function formToken() {
  const ts = Date.now().toString(36);
  return `${ts}.${sign(ts)}`;
}

function sameOrigin(req) {
  const source = req.get('origin') || req.get('referer');
  if (!source) return false;
  try {
    const host = new URL(source).host;
    return host === req.get('host') || host === new URL(config.baseUrl).host;
  } catch {
    return false;
  }
}

export function publicFormGuard(req, res, next) {
  if (!sameOrigin(req)) return next(new HttpError(403, 'Yêu cầu không hợp lệ'));
  const body = req.body || {};
  // Honeypot: ô ẩn, người thật không điền
  if (body.website) return res.status(201).json({ ok: true, code: '', message: 'Đã gửi thành công' });
  const [ts, sig] = String(body._ft || '').split('.');
  const age = Date.now() - Number.parseInt(ts, 36);
  if (!ts || !safeEqual(sig, sign(ts)) || !(age > 2500 && age < 24 * 3600 * 1000)) {
    return next(new HttpError(400, 'Biểu mẫu đã hết hạn, vui lòng tải lại trang và gửi lại'));
  }
  next();
}

// ---------- Giới hạn tần suất ----------
const limiter = (opts) => rateLimit({
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res, next, options) => next(new HttpError(429, options.message)),
  ...opts,
});

export const loginLimiter = limiter({ windowMs: 15 * 60 * 1000, limit: 10, message: 'Đăng nhập sai quá nhiều lần, vui lòng thử lại sau 15 phút' });
export const formLimiter = limiter({ windowMs: 10 * 60 * 1000, limit: 6, message: 'Bạn gửi quá nhiều lần, vui lòng thử lại sau ít phút' });
export const trackLimiter = limiter({ windowMs: 10 * 60 * 1000, limit: 12, message: 'Bạn tra cứu quá nhiều lần, vui lòng thử lại sau ít phút' });
export const apiLimiter = limiter({ windowMs: 60 * 1000, limit: 120, message: 'Quá nhiều yêu cầu, vui lòng chậm lại' });
export const adminLimiter = limiter({ windowMs: 60 * 1000, limit: 300, message: 'Quá nhiều yêu cầu' });
