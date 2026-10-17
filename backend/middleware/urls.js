// Chuẩn hóa địa chỉ trang (một nội dung chỉ có MỘT địa chỉ) và áp dụng chuyển hướng do shop cấu hình.
import { config } from '../config/index.js';
import { matchRedirect } from '../services/redirects.js';
import { HttpError } from '../lib/utils.js';

const isAdmin = (p) => p === config.adminPath || p.startsWith(`${config.adminPath}/`);

// 301 về dạng chuẩn: bỏ "/" cuối, gộp "//", chữ thường. Giữ nguyên chuỗi truy vấn (?trang=2...).
// Tránh Google coi /san-pham/ và /san-pham là hai trang trùng nội dung.
export function canonicalUrl(req, res, next) {
  if ((req.method !== 'GET' && req.method !== 'HEAD') || isAdmin(req.path) || req.path.startsWith('/api/')) return next();
  let p = req.path;
  let clean = p.replace(/\/{2,}/g, '/').replace(/(.)\/+$/, '$1');
  if (!clean.includes('%')) clean = clean.toLowerCase(); // đường dẫn mã hóa %xx giữ nguyên chữ hoa của mã
  if (clean === p) return next();
  const qi = req.originalUrl.indexOf('?');
  res.redirect(301, clean + (qi >= 0 ? req.originalUrl.slice(qi) : ''));
}

// Chuyển hướng cấu hình trong Admin › Chuyển hướng 301 (đường dẫn khớp chính xác)
export function applyRedirects(req, res, next) {
  if ((req.method !== 'GET' && req.method !== 'HEAD') || isAdmin(req.path)) return next();
  const hit = matchRedirect(req.path);
  if (!hit) return next();
  if (hit.status === 410) return next(new HttpError(410, 'Nội dung này đã được gỡ'));
  // Cho phép trình duyệt nhớ ngắn hạn để khi shop sửa chuyển hướng sẽ có hiệu lực sớm
  res.set('Cache-Control', 'public, max-age=300');
  res.redirect(hit.status, hit.to);
}
