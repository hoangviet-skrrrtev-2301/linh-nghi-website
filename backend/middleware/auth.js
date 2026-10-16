// Kiểm tra đăng nhập và phân quyền trang quản trị.
import { config } from '../config/index.js';
import { getUser } from '../services/users.js';
import { HttpError } from '../lib/utils.js';

export function loadUser(req, res, next) {
  if (req.session?.userId) {
    const user = getUser(req.session.userId);
    if (user?.active) {
      req.user = user;
      res.locals.currentUser = user;
    } else {
      req.session.userId = null;
    }
  }
  next();
}

const wantsJson = (req) => req.path.startsWith('/api/') || req.xhr || req.accepts(['html', 'json']) === 'json';

export function requireAuth(req, res, next) {
  if (req.user) return next();
  if (wantsJson(req)) return next(new HttpError(401, 'Bạn cần đăng nhập lại'));
  const target = req.originalUrl.startsWith(config.adminPath) ? req.originalUrl : config.adminPath;
  res.redirect(`${config.adminPath}/login?next=${encodeURIComponent(target)}`);
}

export function requireOwner(req, res, next) {
  if (req.user?.role === 'owner') return next();
  next(new HttpError(403, 'Chỉ tài khoản Chủ shop mới thực hiện được thao tác này'));
}
