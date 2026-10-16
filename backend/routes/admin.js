// Trang quản trị: đăng nhập, 2FA và các trang giao diện admin.
import { Router } from 'express';
import express from 'express';
import { config } from '../config/index.js';
import { csrf, loginLimiter, adminLimiter } from '../middleware/security.js';
import { loadUser, requireAuth, requireOwner } from '../middleware/auth.js';
import { verifyPassword, verifyTotp, DUMMY_HASH } from '../lib/security.js';
import { findByEmail, isLocked, recordFailure, recordSuccess, getTotpSecret, getUserWithSecrets, audit, ROLES } from '../services/users.js';
import { getPublicSettings } from '../services/settings.js';
import { SETTINGS_SCHEMA, SCHEMA_BY_KEY } from '../config/settings-schema.js';
import { TERM_TYPES, STOCK_LABEL } from '../services/catalog.js';
import { INQUIRY_TYPES, INQUIRY_STATUS } from '../services/inquiries.js';
import { HttpError } from '../lib/utils.js';
import apiRouter from './admin-api/index.js';

const router = Router();

router.use(adminLimiter);
router.use((req, res, next) => {
  // Không cho Google lập chỉ mục, không cache trang quản trị
  res.set({ 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' });
  next();
});
router.use(express.urlencoded({ extended: false, limit: '100kb' }));
router.use(express.json({ limit: '2mb' }));
router.use(csrf);
router.use(loadUser);
router.use((req, res, next) => {
  const s = getPublicSettings();
  res.locals.shop = s.site;
  res.locals.A = config.adminPath;
  res.locals.currentPath = req.path;
  res.locals.meta = {
    termTypes: TERM_TYPES, stockLabels: STOCK_LABEL, inquiryTypes: INQUIRY_TYPES, inquiryStatus: INQUIRY_STATUS, roles: ROLES,
  };
  next();
});

// ---------------- Đăng nhập ----------------
const safeNext = (n) => (typeof n === 'string' && n.startsWith(config.adminPath) && !n.startsWith('//') ? n : config.adminPath);

router.get('/login', (req, res) => {
  if (req.user) return res.redirect(config.adminPath);
  res.adminView('login.njk', { next: safeNext(req.query.next), step: 'password' });
});

function startSession(req, res, user, next) {
  const target = safeNext(req.body.next);
  // Tạo session mới sau khi đăng nhập để chống tấn công cố định phiên (session fixation)
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.userId = user.id;
    req.session.csrf = null;
    recordSuccess(user);
    req.user = user;
    audit(req, 'login', 'user', user.id);
    req.session.save(() => res.redirect(target));
  });
}

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = findByEmail(email);
    const ok = await verifyPassword(String(password || ''), user?.password_hash || DUMMY_HASH);
    const fail = (message) => res.adminView('login.njk', { error: message, email, next: safeNext(req.body.next), step: 'password' }, 401);

    if (!user || !user.active) return fail('Email hoặc mật khẩu không đúng');
    if (isLocked(user)) return fail('Tài khoản tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau 15 phút.');
    if (!ok) {
      recordFailure(user);
      return fail('Email hoặc mật khẩu không đúng');
    }
    if (user.totp_enabled) {
      req.session.pending2fa = { userId: user.id, at: Date.now() };
      return res.adminView('login.njk', { step: 'totp', next: safeNext(req.body.next) });
    }
    startSession(req, res, user, next);
  } catch (err) {
    next(err);
  }
});

router.post('/login/2fa', loginLimiter, (req, res, next) => {
  const pending = req.session.pending2fa;
  if (!pending || Date.now() - pending.at > 5 * 60 * 1000) {
    req.session.pending2fa = null;
    return res.adminView('login.njk', { error: 'Phiên xác thực đã hết hạn, vui lòng đăng nhập lại', step: 'password' }, 401);
  }
  const user = getUserWithSecrets(pending.userId);
  if (!user || !user.active || isLocked(user)) return res.redirect(`${config.adminPath}/login`);
  if (!verifyTotp(getTotpSecret(user), req.body.code)) {
    recordFailure(user);
    return res.adminView('login.njk', { error: 'Mã xác thực không đúng', step: 'totp', next: safeNext(req.body.next) }, 401);
  }
  req.session.pending2fa = null;
  startSession(req, res, user, next);
});

router.post('/logout', (req, res) => {
  if (req.user) audit(req, 'logout', 'user', req.user.id);
  req.session.destroy(() => {
    res.clearCookie('lnsid', { path: config.adminPath });
    res.redirect(`${config.adminPath}/login`);
  });
});

// ---------------- API ----------------
router.use('/api', requireAuth, apiRouter);

// ---------------- Các trang admin ----------------
router.use(requireAuth);

const page = (tpl, extra = {}) => (req, res) => res.adminView(tpl, { params: req.params, query: req.query, ...extra });

router.get('/', page('pages/dashboard.njk'));
router.get('/products', page('pages/products.njk'));
router.get('/products/new', page('pages/product-edit.njk'));
router.get('/products/:id', page('pages/product-edit.njk'));
router.get('/terms', page('pages/terms.njk'));
router.get('/gallery', page('pages/gallery.njk'));
router.get('/posts', page('pages/posts.njk'));
router.get('/posts/new', page('pages/post-edit.njk'));
router.get('/posts/:id', page('pages/post-edit.njk'));
router.get('/media', page('pages/media.njk'));
router.get('/inquiries', page('pages/inquiries.njk'));
router.get('/inquiries/:id', page('pages/inquiry-detail.njk'));
router.get('/customers', page('pages/customers.njk'));
router.get('/customers/:id', page('pages/customer-detail.njk'));
router.get('/account', page('pages/account.njk'));
router.get('/settings', (req, res) => res.redirect(`${config.adminPath}/settings/site`));
router.get('/settings/:key', (req, res, next) => {
  const group = SCHEMA_BY_KEY[req.params.key];
  if (!group || (group.ownerOnly && req.user.role !== 'owner')) return next(new HttpError(404, 'Không tìm thấy trang'));
  const groups = SETTINGS_SCHEMA.filter((g) => !g.ownerOnly || req.user.role === 'owner').map((g) => ({ key: g.key, label: g.label }));
  res.adminView('pages/settings.njk', { group, groups });
});
router.get('/users', requireOwner, page('pages/users.njk'));
router.get('/audit', requireOwner, page('pages/audit.njk'));

export default router;
