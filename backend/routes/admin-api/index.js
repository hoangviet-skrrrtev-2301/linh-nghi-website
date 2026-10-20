// API trang quản trị (đã yêu cầu đăng nhập ở router cha).
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import QRCode from 'qrcode';
import { config } from '../../config/index.js';
import { db } from '../../lib/db.js';
import { requireOwner } from '../../middleware/auth.js';
import { apiPermission, can, SETTINGS_PERMISSION, PERMISSION_GROUPS } from '../../config/permissions.js';
import * as roles from '../../services/roles.js';
import { HttpError, toInt } from '../../lib/utils.js';
import { verifyPassword, verifyTotp, generateTotpSecret, totpUri } from '../../lib/security.js';
import * as media from '../../services/media.js';
import * as catalog from '../../services/catalog.js';
import * as content from '../../services/content.js';
import * as feedback from '../../services/feedback.js';
import * as inquiries from '../../services/inquiries.js';
import { stockHistory } from '../../services/stock.js';
import * as customerImport from '../../services/customer-import.js';
import { dashboardStats } from '../../services/dashboard.js';
import { launchChecks } from '../../services/launch-check.js';
import * as users from '../../services/users.js';
import * as redirects from '../../services/redirects.js';
import * as settings from '../../services/settings.js';
import { SETTINGS_SCHEMA, SCHEMA_BY_KEY } from '../../config/settings-schema.js';
import { verifyConnection, sendMail, mailReady } from '../../services/mailer.js';

const router = Router();

// Phân quyền theo vai trò (backend/config/permissions.js): chặn trước khi vào từng đường dẫn
router.use((req, res, next) => (apiPermission(req.user, req.method, req.path) ? next() : next(new HttpError(403, 'Bạn chưa được cấp quyền thực hiện thao tác này'))));
const { audit } = users;
const id = (req) => {
  const n = toInt(req.params.id);
  if (!n) throw new HttpError(400, 'ID không hợp lệ');
  return n;
};
// Bọc handler: tự bắt lỗi async
const h = (fn) => async (req, res, next) => {
  try {
    const out = await fn(req, res);
    if (out !== undefined && !res.headersSent) res.json(out);
  } catch (err) {
    next(err);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.uploadMaxMb * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

// ---------------- Tổng quan ----------------
router.get('/me', h((req) => ({ user: req.user })));

router.get('/dashboard', h((req) => ({
  // Số liệu theo kỳ chọn (range = 7d | 30d | month | last_month | quarter | year | custom + from, to)
  ...dashboardStats({ range: req.query.range, from: req.query.from, to: req.query.to, compare: req.query.compare, cfrom: req.query.cfrom, cto: req.query.cto }),
  counts: {
    products: db.prepare(`SELECT COUNT(*) FROM products WHERE status = 'published'`).pluck().get(),
    drafts: db.prepare(`SELECT COUNT(*) FROM products WHERE status = 'draft'`).pluck().get(),
    customers: db.prepare('SELECT COUNT(*) FROM customers').pluck().get(),
    posts: db.prepare(`SELECT COUNT(*) FROM posts WHERE status = 'published'`).pluck().get(),
  },
  latest: inquiries.listInquiries({ perPage: 20 }).items,
  mailConfigured: settings.getRaw('mail').enabled,
  launch: launchChecks(),
})));

// ---------------- Thư viện ảnh ----------------
router.get('/media/folders', h(() => ({ items: media.listFolders() })));
router.post('/media/folders', h((req) => {
  const name = media.createFolder(req.body?.name);
  audit(req, 'create', 'media_folder', name);
  return { name, items: media.listFolders() };
}));
router.put('/media/folders', h((req) => {
  const name = media.renameFolder(String(req.body?.from || ''), req.body?.to);
  audit(req, 'update', 'media_folder', name, `từ "${req.body?.from}"`);
  return { name, items: media.listFolders() };
}));
router.delete('/media/folders', h((req) => {
  const moved = media.deleteFolder(String(req.query.name || ''));
  audit(req, 'delete', 'media_folder', req.query.name, `${moved} ảnh chuyển về thư mục mặc định`);
  return { moved, items: media.listFolders() };
}));
router.post('/media/move', h((req) => {
  const r = media.moveMedia(req.body?.ids, req.body?.folder);
  audit(req, 'update', 'media', r.folder, `chuyển ${r.moved} ảnh`);
  return { ...r, items: media.listFolders() };
}));
router.get('/media', h((req) => media.listMedia({ folder: req.query.folder, q: req.query.q, page: toInt(req.query.page, 1) })));

router.post('/media', upload.array('files', 20), h(async (req) => {
  if (!req.files?.length) throw new HttpError(400, 'Chưa chọn ảnh hoặc định dạng không hỗ trợ');
  const out = [];
  for (const f of req.files) {
    out.push(await media.saveImage(f.buffer, {
      originalName: f.originalname, folder: req.body.folder, userId: req.user.id,
    }));
  }
  audit(req, 'upload', 'media', out.map((m) => m.id).join(','));
  return { items: out };
}));

router.patch('/media/:id', h((req) => {
  const m = media.updateMediaInfo(id(req), { name: req.body?.name, alt: req.body?.alt });
  audit(req, 'update', 'media', req.params.id, 'sửa tên / mô tả ảnh');
  return m;
}));
router.delete('/media/:id', h((req) => {
  media.deleteMedia(id(req));
  settings.invalidateSettings();
  audit(req, 'delete', 'media', req.params.id);
  return { ok: true };
}));

// ---------------- Danh mục ----------------
router.get('/terms', h((req) => (req.query.type ? catalog.listTerms(req.query.type) : catalog.allTermsGrouped())));
router.post('/terms', h((req) => {
  const tid = catalog.saveTerm(null, req.body);
  audit(req, 'create', 'term', tid, req.body.name);
  return { id: tid };
}));
router.put('/terms/:id', h((req) => {
  catalog.saveTerm(id(req), req.body);
  audit(req, 'update', 'term', req.params.id, req.body.name);
  return { ok: true };
}));
router.delete('/terms/:id', h((req) => {
  catalog.deleteTerm(id(req));
  audit(req, 'delete', 'term', req.params.id);
  return { ok: true };
}));

// ---------------- Sản phẩm ----------------
router.get('/products', h((req) => catalog.searchProducts(
  { q: req.query.q, status: req.query.status, type: req.query.type, loai: req.query.loai, sap_xep: req.query.sort || 'moi' },
  { page: req.query.page, perPage: Math.min(200, toInt(req.query.per_page, 30)), includeDrafts: true },
)));
// ---------------- Chuyển hướng 301 & nhật ký 404 (chỉ Chủ shop được sửa) ----------------
router.get('/redirects', h((req) => redirects.listRedirects({ q: req.query.q, auto: req.query.auto, page: toInt(req.query.page, 1), perPage: Math.min(100, Math.max(1, toInt(req.query.per_page, 30))) })));
router.get('/redirects/not-found', h(() => ({ items: redirects.listNotFound({ limit: 50 }) })));
router.delete('/redirects/not-found', h((req) => { redirects.clearNotFound(req.query.path ? String(req.query.path) : ''); audit(req, 'delete', 'not_found_log', req.query.path || 'all'); return { ok: true }; }));
router.post('/redirects/bulk', h((req) => {
  const r = redirects.bulkRedirects(String(req.body?.text || ''), { status: toInt(req.body?.status, 301) });
  audit(req, 'import', 'redirects', '', `${r.created} mới, ${r.updated} cập nhật, ${r.errors.length} lỗi`);
  return r;
}));
router.post('/redirects', h((req) => {
  const r = redirects.saveRedirect(null, req.body || {});
  audit(req, 'create', 'redirect', r.id, `${r.from_path} → ${r.to_url || '410'}`);
  return r;
}));
router.put('/redirects/:id', h((req) => {
  const r = redirects.saveRedirect(id(req), req.body || {});
  audit(req, 'update', 'redirect', r.id, `${r.from_path} → ${r.to_url || '410'}`);
  return r;
}));
router.delete('/redirects/:id', h((req) => { redirects.deleteRedirect(id(req)); audit(req, 'delete', 'redirect', req.params.id); return { ok: true }; }));

// Loại sản phẩm (nhóm hàng): Vòng tay ngọc, Pháp phục...
router.get('/product-types', h(() => ({ items: catalog.listProductTypes() })));
router.post('/product-types', h((req) => {
  const tid = catalog.saveProductType(null, req.body);
  audit(req, 'create', 'product_type', tid, req.body.name);
  return { id: tid, items: catalog.listProductTypes() };
}));
router.put('/product-types/:id', h((req) => {
  catalog.saveProductType(id(req), req.body);
  audit(req, 'update', 'product_type', req.params.id, req.body.name);
  return { items: catalog.listProductTypes() };
}));
router.delete('/product-types/:id', h((req) => {
  catalog.deleteProductType(id(req));
  audit(req, 'delete', 'product_type', req.params.id);
  return { items: catalog.listProductTypes() };
}));
router.get('/products/:id', h((req) => {
  const p = catalog.getProduct(id(req), { publicOnly: false });
  if (!p) throw new HttpError(404, 'Không tìm thấy sản phẩm');
  return { ...p, stock_history: stockHistory(p.id) };
}));
router.post('/products', h((req) => {
  const pid = catalog.saveProduct(null, req.body, req.user.id);
  audit(req, 'create', 'product', pid, req.body.name);
  return { id: pid };
}));
// Sửa nhanh giá ngay ở danh sách: { price, sale_price } (để trống = Liên hệ / không khuyến mãi)
router.patch('/products/:id/price', h((req) => {
  const r = catalog.updateProductPrice(id(req), req.body || {});
  const f = (v) => (v == null ? 'Liên hệ' : v);
  audit(req, 'update', 'product', req.params.id, `giá ${f(r.before.price)} → ${f(r.price)}, khuyến mãi ${r.before.sale_price ?? '–'} → ${r.sale_price ?? '–'}`);
  return r;
}));
router.put('/products/:id', h((req) => {
  catalog.saveProduct(id(req), req.body, req.user.id);
  audit(req, 'update', 'product', req.params.id, req.body.name);
  return { id: id(req) };
}));
router.post('/products/:id/duplicate', h((req) => {
  const pid = catalog.duplicateProduct(id(req));
  audit(req, 'duplicate', 'product', pid);
  return { id: pid };
}));
// Kéo thả đổi vị trí sản phẩm: { ids: [...] } theo thứ tự mới của các sản phẩm đang hiện
router.post('/products/reorder', h((req) => {
  const n = catalog.reorderProducts([].concat(req.body?.ids || []));
  audit(req, 'reorder', 'product', '', `${n} sản phẩm`);
  return { ok: true };
}));
// Ẩn / hiện / xóa nhiều sản phẩm: { ids: [..], action: 'hide' | 'show' | 'delete' }
router.post('/products/bulk', h((req) => {
  const r = catalog.bulkProducts(req.body.ids, req.body.action);
  audit(req, req.body.action, 'product', r.ids.join(','), `${r.changed} sản phẩm`);
  return r;
}));
router.delete('/products/:id', h((req) => {
  catalog.deleteProduct(id(req));
  audit(req, 'delete', 'product', req.params.id);
  return { ok: true };
}));

// ---------------- Gallery ----------------
router.get('/gallery', h(() => content.listGallery({ activeOnly: false })));
router.post('/gallery', h((req) => {
  // Cho phép thêm nhiều ảnh một lần
  const ids = [].concat(req.body.media_ids || req.body.media_id || []);
  const created = ids.map((mid) => content.saveGalleryItem(null, { ...req.body, media_id: mid }));
  audit(req, 'create', 'gallery', created.join(','));
  return { ids: created };
}));
router.put('/gallery/:id', h((req) => {
  content.saveGalleryItem(id(req), req.body);
  return { ok: true };
}));
router.post('/gallery/reorder', h((req) => {
  content.reorderGallery([].concat(req.body.ids || []).map((x) => toInt(x)).filter(Boolean));
  return { ok: true };
}));
router.delete('/gallery/:id', h((req) => {
  content.deleteGalleryItem(id(req));
  audit(req, 'delete', 'gallery', req.params.id);
  return { ok: true };
}));

// ---------------- Blog ----------------
router.get('/posts', h((req) => content.listPosts({ includeDrafts: true, q: req.query.q, status: req.query.status, categoryId: req.query.category, page: req.query.page, perPage: Math.min(100, Math.max(1, toInt(req.query.per_page, 20))) })));
// Chuyên mục blog
// Tác giả blog (khung giới thiệu cuối bài + schema); quyền "Blog và tác giả"
router.get('/authors', h(() => ({ items: content.listAuthors() })));
router.post('/authors', h((req) => {
  const aid = content.saveAuthor(null, req.body || {});
  audit(req, 'create', 'author', aid, req.body?.name);
  return { items: content.listAuthors(), id: aid };
}));
router.put('/authors/:id', h((req) => {
  content.saveAuthor(id(req), req.body || {});
  audit(req, 'update', 'author', req.params.id, req.body?.name);
  return { items: content.listAuthors() };
}));
router.delete('/authors/:id', h((req) => {
  content.deleteAuthor(id(req));
  audit(req, 'delete', 'author', req.params.id);
  return { items: content.listAuthors() };
}));
// Feedback khách hàng (shop nhập, có ảnh) và đánh giá sản phẩm của khách đã mua; quyền "Feedback & đánh giá"
router.get('/feedbacks', h(() => ({ items: feedback.listFeedbacksAdmin() })));
router.post('/feedbacks', h((req) => {
  const fid = feedback.saveFeedback(null, req.body || {});
  audit(req, 'create', 'feedback', fid, req.body?.name);
  return { items: feedback.listFeedbacksAdmin(), id: fid };
}));
router.post('/feedbacks/reorder', h((req) => {
  feedback.reorderFeedbacks([].concat(req.body?.ids || []).map((x) => toInt(x)).filter(Boolean));
  return { ok: true };
}));
router.put('/feedbacks/:id', h((req) => {
  feedback.saveFeedback(id(req), req.body || {});
  audit(req, 'update', 'feedback', req.params.id, req.body?.name);
  return { items: feedback.listFeedbacksAdmin() };
}));
router.delete('/feedbacks/:id', h((req) => {
  feedback.deleteFeedback(id(req));
  audit(req, 'delete', 'feedback', req.params.id);
  return { items: feedback.listFeedbacksAdmin() };
}));
router.get('/reviews', h((req) => feedback.listReviewsAdmin({ status: req.query.status, q: req.query.q, page: req.query.page, perPage: Math.min(100, Math.max(1, toInt(req.query.per_page, 20))) })));
router.post('/reviews', h((req) => {
  const rid = feedback.createReviewByShop(req.body || {});
  audit(req, 'create', 'review', rid, String(req.body?.name || ''));
  return { ok: true, id: rid };
}));
router.put('/reviews/:id', h((req) => {
  feedback.updateReviewByShop(id(req), req.body || {});
  audit(req, 'update', 'review', req.params.id, String(req.body?.name || ''));
  return { ok: true };
}));
router.put('/reviews/:id/status', h((req) => {
  feedback.setReviewStatus(id(req), req.body?.status);
  audit(req, 'update', 'review', req.params.id, String(req.body?.status || ''));
  return { ok: true };
}));
router.delete('/reviews/:id', h((req) => {
  feedback.deleteReview(id(req));
  audit(req, 'delete', 'review', req.params.id);
  return { ok: true };
}));
router.get('/post-categories', h(() => ({ items: content.listPostCategories() })));
router.post('/post-categories', h((req) => {
  const cid = content.savePostCategory(null, req.body);
  audit(req, 'create', 'post_category', cid, req.body.name);
  return { id: cid, items: content.listPostCategories() };
}));
router.put('/post-categories/:id', h((req) => {
  content.savePostCategory(id(req), req.body);
  audit(req, 'update', 'post_category', req.params.id, req.body.name);
  return { items: content.listPostCategories() };
}));
router.delete('/post-categories/:id', h((req) => {
  content.deletePostCategory(id(req));
  audit(req, 'delete', 'post_category', req.params.id);
  return { items: content.listPostCategories() };
}));
router.get('/posts/:id', h((req) => {
  const p = content.getPost(id(req), { publicOnly: false });
  if (!p) throw new HttpError(404, 'Không tìm thấy bài viết');
  return p;
}));
router.post('/posts', h((req) => {
  const pid = content.savePost(null, req.body, req.user.id);
  audit(req, 'create', 'post', pid, req.body.title);
  return { id: pid };
}));
router.put('/posts/:id', h((req) => {
  content.savePost(id(req), req.body, req.user.id);
  audit(req, 'update', 'post', req.params.id, req.body.title);
  return { id: id(req) };
}));
router.delete('/posts/:id', h((req) => {
  content.deletePost(id(req));
  audit(req, 'delete', 'post', req.params.id);
  return { ok: true };
}));

// ---------------- Đơn hàng / yêu cầu ----------------
router.get('/inquiries', h((req) => inquiries.listInquiries({
  type: req.query.type, status: req.query.status, q: req.query.q, from: req.query.from, to: req.query.to, page: toInt(req.query.page, 1),
  perPage: Math.min(100, Math.max(1, toInt(req.query.per_page, 20))),
})));
router.get('/inquiries/:id', h((req) => {
  const inq = inquiries.getInquiry(id(req));
  if (!inq) throw new HttpError(404, 'Không tìm thấy');
  return { ...inq, mail_ready: mailReady() };
}));
router.post('/inquiries', h((req) => {
  const inq = inquiries.createAdminInquiry(req.body?.type || 'order', req.body || {}, req.user.id);
  audit(req, 'create', 'inquiry', inq.code, `admin tạo ${inq.type}`);
  return inq;
}));
router.patch('/inquiries/:id', h(async (req) => {
  const before = inquiries.getInquiry(id(req));
  const inq = inquiries.updateInquiry(id(req), req.body || {});
  // Admin tick "gửi email báo khách" và trạng thái vừa đổi thì gửi email; kết quả trả về để hiện thông báo
  const statusChanged = before && before.status !== inq.status;
  const notified = req.body?.notify_customer && statusChanged ? await inquiries.notifyStatusChange(inq.id) : null;
  audit(req, 'update', 'inquiry', inq.code, `status=${inq.status}${req.body?.items !== undefined ? ' sửa dòng hàng/giá' : ''}${req.body?.adjustment !== undefined ? ' điều chỉnh giá' : ''}${req.body?.tracking_code !== undefined ? ' vận đơn' : ''}${notified ? ` email=${notified}` : ''}`);
  return { ...inquiries.getInquiry(inq.id), mail_ready: mailReady(), notified };
}));
router.post('/inquiries/:id/convert', h((req) => {
  const before = inquiries.getInquiry(id(req));
  const order = inquiries.convertToOrder(id(req));
  audit(req, 'update', 'inquiry', order.code, `lên đơn từ ${before?.code} (cùng một bản ghi)`);
  return { ...order, mail_ready: mailReady() };
}));
router.post('/inquiries/:id/resend', h(async (req) => {
  await inquiries.resendNotification(id(req));
  return inquiries.getInquiry(id(req));
}));
router.delete('/inquiries/:id', h((req) => {
  inquiries.deleteInquiry(id(req));
  audit(req, 'delete', 'inquiry', req.params.id);
  return { ok: true };
}));

// ---------------- Khách hàng ----------------
router.get('/customers/export.csv', (req, res) => {
  audit(req, 'export', 'customers');
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="khach-hang-${new Date().toISOString().slice(0, 10)}.csv"` });
  res.send(inquiries.customersCsv({ q: req.query.q, months: req.query.months, by: req.query.by, source: req.query.source, segment: req.query.segment }));
});
// Nhập khách hàng hàng loạt: xem trước (không ghi) rồi nhập thật
router.get('/customers/import-template.csv', (req, res) => {
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="mau-nhap-khach-hang.csv"' });
  res.send(customerImport.importTemplateCsv());
});
router.post('/customers/import/preview', h((req) => customerImport.previewCustomerImport(String(req.body?.text || ''), {
  source: req.body?.source, tags: req.body?.tags, onDuplicate: req.body?.on_duplicate, defaultDate: req.body?.default_date,
})));
router.post('/customers/import', h((req) => {
  const result = customerImport.importCustomers(String(req.body?.text || ''), { source: req.body?.source, tags: req.body?.tags, onDuplicate: req.body?.on_duplicate, defaultDate: req.body?.default_date });
  audit(req, 'import', 'customers', '', `${result.created} mới, ${result.updated} cập nhật, ${result.skipped} bỏ qua, ${result.failed} lỗi`);
  return result;
}));
router.get('/customers', h((req) => inquiries.listCustomers({
  q: req.query.q, months: req.query.months, by: req.query.by, source: req.query.source, segment: req.query.segment, page: toInt(req.query.page, 1),
  perPage: Math.min(100, Math.max(1, toInt(req.query.per_page, 20))),
})));
router.post('/customers', h((req) => {
  const c = inquiries.createCustomer(req.body || {});
  audit(req, 'create', 'customer', c.id, c.name);
  return c;
}));
router.get('/customers/:id', h((req) => {
  const c = inquiries.getCustomer(id(req));
  if (!c) throw new HttpError(404, 'Không tìm thấy khách hàng');
  return c;
}));
router.put('/customers/:id', h((req) => {
  const c = inquiries.updateCustomer(id(req), req.body);
  audit(req, 'update', 'customer', req.params.id);
  return c;
}));
router.delete('/customers/:id', h((req) => {
  inquiries.deleteCustomer(id(req));
  audit(req, 'delete', 'customer', req.params.id);
  return { ok: true };
}));

// ---------------- Cài đặt ----------------
const groupAllowed = (req, key) => can(req.user, SETTINGS_PERMISSION[key] || 'owner-only');
const canEdit = (req, key) => {
  const g = SCHEMA_BY_KEY[key];
  if (!g) throw new HttpError(404, 'Nhóm cấu hình không tồn tại');
  if (!groupAllowed(req, key)) throw new HttpError(403, 'Bạn chưa được cấp quyền sửa mục cài đặt này');
  return g;
};

router.get('/settings', h((req) => SETTINGS_SCHEMA.filter((g) => groupAllowed(req, g.key))));
router.get('/settings/:key', h((req) => {
  const group = canEdit(req, req.params.key);
  const values = settings.getForAdmin(req.params.key);
  // Gửi kèm thông tin ảnh để hiện ảnh xem trước
  const ids = [];
  const walk = (fields, data) => fields.forEach((f) => {
    if (f.type === 'image' && data?.[f.name]) ids.push(data[f.name]);
    if (f.type === 'list') (data?.[f.name] || []).forEach((it) => walk(f.fields, it));
  });
  walk(group.fields, values);
  return { group, values, media: media.getMediaMap(ids) };
}));
router.put('/settings/:key', h((req) => {
  canEdit(req, req.params.key);
  const values = settings.saveGroup(req.params.key, req.body || {});
  audit(req, 'update', 'settings', req.params.key);
  return { values };
}));
router.post('/settings/mail/test', h(async (req) => {
  await verifyConnection();
  const m = settings.getRaw('mail');
  const to = (m.notify_to || m.user).split(',')[0].trim();
  await sendMail({ to, subject: 'Email thử nghiệm từ website', html: '<p>Cấu hình email hoạt động tốt. Bạn sẽ nhận thông báo đơn hàng tại địa chỉ này.</p>' });
  audit(req, 'test', 'mail');
  return { ok: true, message: `Đã gửi email thử tới ${to}` };
}));

// Tải bản sao lưu database (chỉ Chủ shop)
router.get('/backup', h(async (req, res) => {
  fs.mkdirSync(config.paths.backups, { recursive: true });
  const file = path.join(config.paths.backups, `download-${Date.now()}.sqlite`);
  await db.backup(file);
  audit(req, 'backup', 'database');
  res.download(file, `backup-${new Date().toISOString().slice(0, 10)}.sqlite`, () => fs.rm(file, { force: true }, () => {}));
}));

// ---------------- Tài khoản cá nhân ----------------
router.put('/account', h(async (req) => {
  const me = users.getUserWithSecrets(req.user.id);
  if (req.body.new_password) {
    if (!(await verifyPassword(String(req.body.current_password || ''), me.password_hash))) {
      throw new HttpError(400, 'Mật khẩu hiện tại không đúng');
    }
    await users.setPassword(me.id, req.body.new_password, req.sessionID);
    audit(req, 'change_password', 'user', me.id);
  }
  if (req.body.name) await users.updateUser(me.id, { name: req.body.name });
  return { user: users.getUser(me.id) };
}));

router.post('/account/2fa/setup', h(async (req) => {
  const secret = generateTotpSecret();
  req.session.totpSetup = secret;
  const uri = totpUri(secret, req.user.email, settings.getRaw('site').name || 'Admin');
  return { secret, qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }) };
}));

router.post('/account/2fa/enable', h((req) => {
  const secret = req.session.totpSetup;
  if (!secret) throw new HttpError(400, 'Vui lòng tạo mã QR trước');
  if (!verifyTotp(secret, req.body.code)) throw new HttpError(400, 'Mã xác thực không đúng, hãy thử lại');
  users.setTotp(req.user.id, secret, true);
  req.session.totpSetup = null;
  audit(req, 'enable_2fa', 'user', req.user.id);
  return { ok: true };
}));

router.post('/account/2fa/disable', h(async (req) => {
  const me = users.getUserWithSecrets(req.user.id);
  if (!(await verifyPassword(String(req.body.password || ''), me.password_hash))) throw new HttpError(400, 'Mật khẩu không đúng');
  users.setTotp(me.id, null, false);
  audit(req, 'disable_2fa', 'user', me.id);
  return { ok: true };
}));

// ---------------- Quản lý tài khoản (Chủ shop) ----------------
// Vai trò và phân quyền (chỉ Chủ shop)
router.get('/roles', requireOwner, h(() => ({ items: roles.listRoles(), groups: PERMISSION_GROUPS })));
router.post('/roles', requireOwner, h((req) => {
  const rid = roles.saveRole(null, req.body || {});
  audit(req, 'create', 'role', rid, req.body?.name);
  return { items: roles.listRoles(), id: rid };
}));
router.put('/roles/:id', requireOwner, h((req) => {
  roles.saveRole(id(req), req.body || {});
  audit(req, 'update', 'role', req.params.id, req.body?.name);
  return { items: roles.listRoles() };
}));
router.delete('/roles/:id', requireOwner, h((req) => {
  roles.deleteRole(id(req));
  audit(req, 'delete', 'role', req.params.id);
  return { items: roles.listRoles() };
}));
router.get('/users', requireOwner, h(() => users.listUsers()));
router.post('/users', requireOwner, h(async (req) => {
  const uid = await users.createUser(req.body);
  audit(req, 'create', 'user', uid, req.body.email);
  return { id: uid };
}));
router.put('/users/:id', requireOwner, h(async (req) => {
  const u = await users.updateUser(id(req), req.body);
  audit(req, 'update', 'user', req.params.id);
  return u;
}));
router.post('/users/:id/reset-2fa', requireOwner, h((req) => {
  users.setTotp(id(req), null, false);
  audit(req, 'reset_2fa', 'user', req.params.id);
  return { ok: true };
}));
router.delete('/users/:id', requireOwner, h((req) => {
  users.deleteUser(id(req), req.user.id);
  audit(req, 'delete', 'user', req.params.id);
  return { ok: true };
}));

router.get('/audit', h((req) => users.listAudit({ page: toInt(req.query.page, 1) })));

export default router;
