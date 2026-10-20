// Feedback khách hàng (shop tự nhập, có ảnh chụp tin nhắn) và đánh giá sản phẩm (khách đã mua tự gửi, shop duyệt).
import { db, likeVn } from '../lib/db.js';
import { HttpError, toInt, bool, vnToday, vnDayOf, vnDateToUtc, formatDate } from '../lib/utils.js';
import { cleanText } from '../lib/sanitize.js';
import { getMediaMap } from './media.js';
import { getRaw } from './settings.js';
import { productsByIds, getProduct } from './catalog.js';
import { normalizePhone, phoneRe } from './inquiries.js';
import { mailReady, sendMail, reviewNotification } from './mailer.js';

const MAX_IMAGES = 12;
const dateRe = /^\d{4}-\d{2}-\d{2}$/;

// "2026-10-18" → "18/10/2026"
const fmtDay = (iso) => (dateRe.test(iso) ? iso.split('-').reverse().join('/') : '');

// ---------------- Feedback do shop nhập ----------------
function present(rows, { forPublic = false } = {}) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const marks = ids.map(() => '?').join(',');
  const links = db.prepare(`SELECT feedback_id, media_id FROM feedback_images WHERE feedback_id IN (${marks}) ORDER BY sort_order, media_id`).all(...ids);
  const media = getMediaMap([...rows.map((r) => r.avatar_media_id), ...links.map((l) => l.media_id)]);
  return rows.map((r) => {
    const images = links.filter((l) => l.feedback_id === r.id).map((l) => media[l.media_id]).filter(Boolean);
    const day = r.feedback_date || vnDayOf(r.created_at) || '';
    if (forPublic) {
      // Phía khách chỉ nhận đường dẫn ảnh và kích thước (không lộ tên file gốc, thư mục...)
      const slim = (m) => m && { sm: m.sm, md: m.md, lg: m.lg, width: m.width, height: m.height, alt: m.alt };
      return {
        id: r.id, name: r.name, role: r.role, content: r.content, rating: r.rating,
        avatar: slim(media[r.avatar_media_id]) || null, images: images.map(slim), date_label: fmtDay(day),
      };
    }
    const item = {
      id: r.id, name: r.name, role: r.role, content: r.content, rating: r.rating,
      avatar: media[r.avatar_media_id] || null, images,
      date_label: fmtDay(day),
    };
    return {
      ...item, avatar_media_id: r.avatar_media_id, image_ids: images.map((m) => m.id), feedback_date: r.feedback_date,
      show_home: !!r.show_home, show_page: !!r.show_page, active: !!r.active, sort_order: r.sort_order,
    };
  });
}

const ORDER = 'ORDER BY f.sort_order, f.id DESC';

export function listFeedbacksAdmin() {
  return present(db.prepare(`SELECT f.* FROM feedbacks f ${ORDER}`).all());
}

// Phía khách: scope = 'home' | 'page'. limit: lấy N đầu; page / perPage: phân trang.
export function listFeedbacksPublic({ scope = 'page', limit, page = 1, perPage = 12 } = {}) {
  const where = `f.active = 1 AND ${scope === 'home' ? 'f.show_home' : 'f.show_page'} = 1`;
  const total = db.prepare(`SELECT COUNT(*) FROM feedbacks f WHERE ${where}`).pluck().get();
  if (limit) return { items: present(db.prepare(`SELECT f.* FROM feedbacks f WHERE ${where} ${ORDER} LIMIT ?`).all(limit), { forPublic: true }), total, page: 1, pages: 1, perPage: limit };
  const pages = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(Number(page) || 1, 1), pages);
  const rows = db.prepare(`SELECT f.* FROM feedbacks f WHERE ${where} ${ORDER} LIMIT ? OFFSET ?`).all(perPage, (p - 1) * perPage);
  return { items: present(rows, { forPublic: true }), total, page: p, pages, perPage };
}

export function saveFeedback(id, data) {
  const name = cleanText(data.name, 100);
  if (!name) throw new HttpError(400, 'Vui lòng nhập tên khách hàng');
  const content = cleanText(data.content, 3000);
  const ids = [...new Set((Array.isArray(data.image_ids) ? data.image_ids : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, MAX_IMAGES);
  const media = getMediaMap(ids);
  const imageIds = ids.filter((n) => media[n]);
  if (!content && !imageIds.length) throw new HttpError(400, 'Vui lòng nhập nội dung hoặc thêm ít nhất một ảnh feedback');
  const day = String(data.feedback_date || '').trim();
  if (day && (!dateRe.test(day) || day > vnToday())) throw new HttpError(400, 'Ngày feedback không hợp lệ (không được ở tương lai)');
  const avatar = toInt(data.avatar_media_id);
  const v = {
    name, role: cleanText(data.role, 120), content,
    rating: Math.min(5, Math.max(0, toInt(data.rating, 0) || 0)),
    avatar_media_id: avatar && getMediaMap([avatar])[avatar] ? avatar : null,
    feedback_date: day,
    show_home: bool(data.show_home ?? true) ? 1 : 0,
    show_page: bool(data.show_page ?? true) ? 1 : 0,
    active: bool(data.active ?? true) ? 1 : 0,
    sort_order: toInt(data.sort_order, 0) || 0,
  };
  return db.transaction(() => {
    let fid = id;
    if (id) {
      const res = db.prepare(`UPDATE feedbacks SET name=@name, role=@role, content=@content, rating=@rating, avatar_media_id=@avatar_media_id,
        feedback_date=@feedback_date, show_home=@show_home, show_page=@show_page, active=@active, sort_order=@sort_order, updated_at=datetime('now') WHERE id=@id`).run({ ...v, id });
      if (!res.changes) throw new HttpError(404, 'Không tìm thấy feedback');
    } else {
      fid = db.prepare(`INSERT INTO feedbacks (name, role, content, rating, avatar_media_id, feedback_date, show_home, show_page, active, sort_order)
        VALUES (@name, @role, @content, @rating, @avatar_media_id, @feedback_date, @show_home, @show_page, @active, @sort_order)`).run(v).lastInsertRowid;
    }
    db.prepare('DELETE FROM feedback_images WHERE feedback_id = ?').run(fid);
    const ins = db.prepare('INSERT INTO feedback_images (feedback_id, media_id, sort_order) VALUES (?, ?, ?)');
    imageIds.forEach((m, i) => ins.run(fid, m, i));
    return fid;
  })();
}

// Kéo thả đổi thứ tự trong admin: ids theo thứ tự mới
export function reorderFeedbacks(ids) {
  const upd = db.prepare("UPDATE feedbacks SET sort_order = ?, updated_at = datetime('now') WHERE id = ?");
  db.transaction(() => ids.forEach((fid, i) => upd.run(i, fid)))();
}

export function deleteFeedback(id) {
  db.prepare('DELETE FROM feedbacks WHERE id = ?').run(id);
}

// ---------------- Đánh giá sản phẩm ----------------
export const REVIEW_STATUS = { pending: 'Chờ duyệt', approved: 'Đang hiện', hidden: 'Đã ẩn' };

// Tên hiển thị công khai: "Nguyễn Văn Hoa" → "N. Hoa" (kiểu rút gọn) hoặc giữ nguyên
export function displayName(name, mode) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (mode !== 'short' || parts.length < 2) return parts.join(' ');
  return `${[...parts[0]][0].toUpperCase()}. ${parts[parts.length - 1]}`;
}

// Đơn Hoàn thành gần nhất của số điện thoại có chứa sản phẩm này (điều kiện để được đánh giá)
export function reviewEligibleOrder(phone, productId) {
  return db.prepare(`SELECT i.id, i.customer_id, i.name FROM inquiries i
    WHERE i.type = 'order' AND i.status = 'completed' AND i.phone = ?
      AND EXISTS (SELECT 1 FROM json_each(i.items) j WHERE json_extract(j.value, '$.id') = ?)
    ORDER BY i.id DESC LIMIT 1`).get(phone, productId) || null;
}

// Điều kiện gửi đánh giá (Cài đặt › reviews_require):
//   customer      = số điện thoại có trong hệ thống khách hàng (mặc định)
//   any_order     = có đơn Hoàn thành bất kỳ
//   product_order = có đơn Hoàn thành chứa đúng sản phẩm này
// verified = số điện thoại có đơn Hoàn thành chứa đúng sản phẩm (hiện nhãn "Đã mua hàng")
function reviewIdentity(phone, productId, mode) {
  const order = reviewEligibleOrder(phone, productId);
  if (order) return { ok: true, verified: 1, customerId: order.customer_id, inquiryId: order.id, name: order.name };
  if (mode === 'product_order') return { ok: false };
  if (mode === 'any_order') {
    const any = db.prepare("SELECT id, customer_id, name FROM inquiries WHERE type = 'order' AND status = 'completed' AND phone = ? ORDER BY id DESC LIMIT 1").get(phone);
    return any ? { ok: true, verified: 0, customerId: any.customer_id, inquiryId: null, name: any.name } : { ok: false };
  }
  const c = db.prepare('SELECT id, name FROM customers WHERE phone = ?').get(phone);
  return c ? { ok: true, verified: 0, customerId: c.id, inquiryId: null, name: c.name } : { ok: false };
}

// Email nền báo shop có đánh giá chờ duyệt (cùng người nhận với thông báo đơn hàng)
async function notifyReview(review, productName) {
  if (!mailReady()) return;
  const mail = getRaw('mail');
  const to = (mail.notify_to || mail.user || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!to.length) return;
  const n = reviewNotification(review, productName);
  await sendMail({ to, subject: n.subject, html: n.html });
}

export function submitReview(input = {}) {
  const f = getRaw('feedback');
  if (!f.reviews_enabled) throw new HttpError(403, 'Tính năng đánh giá sản phẩm đang tắt');
  const errors = {};
  const rawPhone = String(input.phone || '').trim();
  if (!phoneRe.test(rawPhone)) errors.phone = 'Số điện thoại không hợp lệ';
  const rating = toInt(input.rating, 0);
  if (!(rating >= 1 && rating <= 5)) errors.rating = 'Vui lòng chọn số sao';
  const content = cleanText(input.content, 1500);
  const minLen = Math.min(Math.max(Number(f.reviews_min_length) || 0, 0), 500);
  if (content.length < minLen) errors.content = `Vui lòng viết ít nhất ${minLen} ký tự`;
  const product = getProduct(String(input.product || ''));
  if (!product) throw new HttpError(404, 'Không tìm thấy sản phẩm');
  if (Object.keys(errors).length) throw new HttpError(422, 'Vui lòng kiểm tra lại thông tin', errors);

  const phone = normalizePhone(rawPhone);
  const who = reviewIdentity(phone, product.id, f.reviews_require);
  if (!who.ok) throw new HttpError(422, f.reviews_not_eligible, { phone: f.reviews_not_eligible });
  const dup = db.prepare('SELECT id FROM product_reviews WHERE product_id = ? AND phone = ?').get(product.id, phone);
  if (dup) throw new HttpError(422, f.reviews_duplicate, { phone: f.reviews_duplicate });

  const status = f.reviews_auto_approve ? 'approved' : 'pending';
  const name = cleanText(input.name, 80) || who.name;
  db.prepare(`INSERT INTO product_reviews (product_id, customer_id, inquiry_id, name, phone, rating, content, status, source, verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'customer', ?)`).run(product.id, who.customerId, who.inquiryId, name, phone, rating, content, status, who.verified);
  if (status === 'pending' && f.reviews_notify) {
    notifyReview({ rating, name, phone, content, verified: who.verified }, product.name)
      .catch((err) => console.error('[mail]', err.message));
  }
  return { status, message: status === 'approved' ? f.reviews_success_approved : f.reviews_success_pending };
}

// Danh sách công khai (đã duyệt). productId: của một sản phẩm; bỏ trống: mọi sản phẩm (tab "Đánh giá sản phẩm" ở trang Feedback)
export function listReviewsPublic({ productId, limit = 6, offset = 0 } = {}) {
  const f = getRaw('feedback');
  const where = ["r.status = 'approved'"];
  const params = [];
  if (productId) { where.push('r.product_id = ?'); params.push(productId); }
  const total = db.prepare(`SELECT COUNT(*) FROM product_reviews r WHERE ${where.join(' AND ')}`).pluck().get(...params);
  const rows = db.prepare(`SELECT r.* FROM product_reviews r WHERE ${where.join(' AND ')} ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?`)
    .all(...params, Math.min(Math.max(limit, 1), 50), Math.max(offset, 0));
  const products = Object.fromEntries(productsByIds(rows.map((r) => r.product_id)).map((p) => [p.id, p]));
  const items = rows.filter((r) => products[r.product_id]).map((r) => {
    const p = products[r.product_id];
    return {
      id: r.id, name: displayName(r.name, f.reviews_name_display), rating: r.rating, content: r.content, verified: !!r.verified,
      date_label: formatDate(r.created_at),
      product: { name: p.name, url: p.url, cover: p.cover ? { sm: p.cover.sm, width: p.cover.width, height: p.cover.height } : null },
    };
  });
  // next: vị trí đọc tiếp (kể cả dòng bị bỏ qua vì sản phẩm không còn bán)
  return { items, total, offset: Math.max(offset, 0), next: Math.max(offset, 0) + rows.length, limit };
}

// customerOnly: chỉ tính đánh giá khách tự gửi (dùng cho schema Google, không tính đánh giá do shop nhập)
export function reviewSummary(productId, { customerOnly = false } = {}) {
  const r = db.prepare(`SELECT COUNT(*) AS count, AVG(rating) AS avg FROM product_reviews WHERE product_id = ? AND status = 'approved'${customerOnly ? " AND source = 'customer'" : ''}`).get(productId);
  return { count: r.count, avg: r.count ? Math.round(r.avg * 10) / 10 : 0 };
}

// ---- Quản trị ----
export function listReviewsAdmin({ status, q, page = 1, perPage = 20 } = {}) {
  const where = [];
  const params = [];
  if (status && REVIEW_STATUS[status]) { where.push('r.status = ?'); params.push(status); }
  if (q) { where.push('(vn(r.name) LIKE ? OR vn(r.phone) LIKE ? OR vn(r.content) LIKE ? OR vn(p.name) LIKE ?)'); const l = likeVn(q); params.push(l, l, l, l); }
  const sql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) FROM product_reviews r JOIN products p ON p.id = r.product_id ${sql}`).pluck().get(...params);
  const pages = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(Number(page) || 1, 1), pages);
  const items = db.prepare(`SELECT r.*, p.name AS product_name, p.slug AS product_slug, i.code AS order_code FROM product_reviews r
    JOIN products p ON p.id = r.product_id LEFT JOIN inquiries i ON i.id = r.inquiry_id ${sql} ORDER BY (r.status = 'pending') DESC, r.created_at DESC, r.id DESC LIMIT ? OFFSET ?`)
    .all(...params, perPage, (p - 1) * perPage);
  const counts = Object.fromEntries(db.prepare('SELECT status, COUNT(*) AS c FROM product_reviews GROUP BY status').all().map((r) => [r.status, r.c]));
  return { items, total, page: p, pages, counts: { pending: counts.pending || 0, approved: counts.approved || 0, hidden: counts.hidden || 0 } };
}

// Chủ shop tự nhập đánh giá (ví dụ khách nhắn qua Zalo): không cần số điện thoại, ghi source = 'shop'.
function shopReviewValues(data) {
  const name = cleanText(data.name, 80);
  if (!name) throw new HttpError(400, 'Vui lòng nhập tên người đánh giá');
  const rating = toInt(data.rating, 0);
  if (!(rating >= 1 && rating <= 5)) throw new HttpError(400, 'Vui lòng chọn số sao từ 1 đến 5');
  const status = REVIEW_STATUS[data.status] ? data.status : 'approved';
  return { name, rating, content: cleanText(data.content, 1500), status, created_at: vnDateToUtc(data.date, 'date') };
}

export function createReviewByShop(data) {
  const productId = toInt(data.product_id);
  if (!productId || !getProduct(productId, { publicOnly: false })) throw new HttpError(400, 'Vui lòng chọn sản phẩm');
  const v = shopReviewValues(data);
  return db.prepare(`INSERT INTO product_reviews (product_id, name, phone, rating, content, status, source, verified, created_at)
    VALUES (?, ?, '', ?, ?, ?, 'shop', 0, COALESCE(?, datetime('now')))`).run(productId, v.name, v.rating, v.content, v.status, v.created_at).lastInsertRowid;
}

// Chỉ sửa được đánh giá do shop nhập; đánh giá khách gửi giữ nguyên (chỉ duyệt / ẩn / xóa)
export function updateReviewByShop(id, data) {
  const row = db.prepare('SELECT source FROM product_reviews WHERE id = ?').get(id);
  if (!row) throw new HttpError(404, 'Không tìm thấy đánh giá');
  if (row.source !== 'shop') throw new HttpError(400, 'Đánh giá do khách gửi không sửa được, chỉ duyệt, ẩn hoặc xóa');
  const v = shopReviewValues(data);
  const productId = toInt(data.product_id);
  if (!productId || !getProduct(productId, { publicOnly: false })) throw new HttpError(400, 'Vui lòng chọn sản phẩm');
  db.prepare("UPDATE product_reviews SET product_id = ?, name = ?, rating = ?, content = ?, status = ?, created_at = COALESCE(?, created_at), updated_at = datetime('now') WHERE id = ?")
    .run(productId, v.name, v.rating, v.content, v.status, v.created_at, id);
}

export function setReviewStatus(id, status) {
  if (!REVIEW_STATUS[status]) throw new HttpError(400, 'Trạng thái không hợp lệ');
  const res = db.prepare("UPDATE product_reviews SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  if (!res.changes) throw new HttpError(404, 'Không tìm thấy đánh giá');
}

export function deleteReview(id) {
  db.prepare('DELETE FROM product_reviews WHERE id = ?').run(id);
}
