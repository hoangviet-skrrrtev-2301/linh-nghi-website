// Đơn đặt hàng, yêu cầu custom, lời nhắn liên hệ và danh sách khách hàng.
import { z } from 'zod';
import { db, tx } from '../lib/db.js';
import { inquiryCode, safeJson, HttpError, toInt } from '../lib/utils.js';
import { cleanText } from '../lib/sanitize.js';
import { productsByIds } from './catalog.js';
import { getRaw, getPublicSettings } from './settings.js';
import { sendMail, mailReady, shopNotification, customerConfirmation } from './mailer.js';

export const INQUIRY_TYPES = { order: 'Đơn hàng', custom: 'Thiết kế riêng', contact: 'Liên hệ' };
export const INQUIRY_STATUS = {
  new: 'Mới',
  contacted: 'Đã liên hệ',
  confirmed: 'Đã xác nhận',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const phoneRe = /^(\+?84|0)[\d\s.-]{8,13}$/;
const str = (max) => z.string().trim().max(max).optional().default('');

const base = z.object({
  name: z.string().trim().min(2, 'Vui lòng nhập họ tên').max(120),
  phone: z.string().trim().regex(phoneRe, 'Số điện thoại không hợp lệ'),
  email: z.union([z.literal(''), z.string().trim().email('Email không hợp lệ').max(160)]).optional().default(''),
  address: str(400),
  contact_via: str(60),
  message: str(3000),
});

const schemas = {
  order: base.extend({
    address: z.string().trim().min(5, 'Vui lòng nhập địa chỉ nhận hàng').max(400),
    items: z.array(z.object({
      id: z.coerce.number().int().positive(),
      qty: z.coerce.number().int().min(1).max(20),
      size: z.string().trim().max(20).optional().default(''),
    })).min(1, 'Giỏ hàng đang trống').max(30),
  }),
  custom: base.extend({
    jade_type: str(120),
    color: str(120),
    style: str(120),
    size: z.string().trim().min(1, 'Vui lòng nhập ni tay hoặc số đo').max(60),
    element: str(60),
    budget: str(60),
    purpose: str(200),
    deadline: str(60),
    accessory: str(120),
    message: z.string().trim().min(10, 'Vui lòng mô tả chiếc vòng bạn mong muốn (tối thiểu 10 ký tự)').max(3000),
  }),
  contact: base.extend({
    // Yêu cầu tư vấn từ trang / popup sản phẩm: tên + mã sản phẩm khách quan tâm
    product: str(250),
    size: str(60),
    message: z.string().trim().min(5, 'Vui lòng nhập nội dung').max(3000),
  }),
};

function normalizePhone(phone) {
  let p = phone.replace(/[^\d+]/g, '');
  if (p.startsWith('+84')) p = '0' + p.slice(3);
  else if (p.startsWith('84') && p.length > 10) p = '0' + p.slice(2);
  return p;
}

function upsertCustomer({ name, phone, email, address, wrist }) {
  const existing = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
  if (existing) {
    db.prepare(`UPDATE customers SET name = ?, email = CASE WHEN ? != '' THEN ? ELSE email END,
      address = CASE WHEN ? != '' THEN ? ELSE address END, wrist_size = CASE WHEN ? != '' THEN ? ELSE wrist_size END,
      updated_at = datetime('now') WHERE id = ?`).run(name, email, email, address, address, wrist, wrist, existing.id);
    return existing.id;
  }
  return db.prepare('INSERT INTO customers (name, phone, email, address, wrist_size) VALUES (?, ?, ?, ?, ?)')
    .run(name, phone, email, address, wrist).lastInsertRowid;
}

function present(row) {
  if (!row) return null;
  return {
    ...row,
    items: safeJson(row.items, []),
    details: safeJson(row.details, {}),
    type_label: INQUIRY_TYPES[row.type],
    status_label: INQUIRY_STATUS[row.status],
  };
}

// Khách tra cứu theo mã + số điện thoại. Chỉ trả các trường công khai (không có địa chỉ, email, ghi chú nội bộ).
// Mã sai hoặc số điện thoại sai đều trả null để không lộ mã nào tồn tại.
export function lookupInquiry(code, phone) {
  const c = String(code || '').trim().toUpperCase().replace(/\s+/g, '');
  const p = normalizePhone(String(phone || ''));
  if (!/^[A-Z]{2}\d{6}-[0-9A-F]{6}$/.test(c) || p.length < 9) return null;
  const row = db.prepare('SELECT * FROM inquiries WHERE code = ? AND phone = ?').get(c, p);
  if (!row) return null;
  const inq = present(row);
  const showPrice = getPublicSettings().features.show_prices;
  return {
    code: inq.code,
    type: inq.type,
    type_label: inq.type_label,
    status: inq.status,
    status_label: inq.status_label,
    created_at: inq.created_at,
    updated_at: inq.updated_at,
    items: inq.items.map((i) => ({ name: i.name, size: i.size, qty: i.qty, price: showPrice ? i.price : null })),
    total: showPrice ? inq.total : null,
    product: inq.details?.product || '',
  };
}

export async function createInquiry(type, input, meta = {}) {
  const features = getRaw('features');
  if (type === 'order' && !features.checkout) throw new HttpError(403, 'Chức năng đặt hàng đang tạm tắt');
  if (type === 'custom' && !features.custom_request) throw new HttpError(403, 'Chức năng thiết kế riêng đang tạm tắt');

  // Trường bị thiếu coi như chuỗi rỗng để hiện đúng thông báo lỗi tiếng Việt
  const body = { ...(input && typeof input === 'object' ? input : {}) };
  for (const k of Object.keys(schemas[type].shape)) if (body[k] == null && k !== 'items') body[k] = '';
  if (type === 'order' && !Array.isArray(body.items)) body.items = [];
  const parsed = schemas[type].safeParse(body);
  if (!parsed.success) {
    const errors = Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message]));
    throw new HttpError(422, 'Vui lòng kiểm tra lại thông tin', errors);
  }
  const data = parsed.data;
  const phone = normalizePhone(data.phone);

  // Tính lại giá từ database, không tin giá do trình duyệt gửi lên
  let items = [];
  let total = null;
  if (type === 'order') {
    const products = Object.fromEntries(productsByIds(data.items.map((i) => i.id)).map((p) => [p.id, p]));
    items = data.items.filter((i) => products[i.id]).map((i) => ({
      id: i.id,
      name: products[i.id].name,
      sku: products[i.id].sku,
      slug: products[i.id].slug,
      size: cleanText(i.size, 20),
      qty: i.qty,
      price: products[i.id].final_price,
    }));
    if (!items.length) throw new HttpError(422, 'Sản phẩm trong giỏ không còn tồn tại', { items: 'Giỏ hàng không hợp lệ' });
    const soldOut = items.filter((i) => products[i.id].stock_status === 'sold_out');
    if (soldOut.length) throw new HttpError(422, `Sản phẩm đã bán: ${soldOut.map((i) => i.name).join(', ')}`);
    total = items.every((i) => i.price != null) ? items.reduce((s, i) => s + i.price * i.qty, 0) : null;
  }

  const DETAIL_KEYS = {
    custom: ['jade_type', 'color', 'style', 'size', 'element', 'budget', 'purpose', 'deadline', 'accessory'],
    contact: ['product', 'size'],
  };
  const details = Object.fromEntries((DETAIL_KEYS[type] || []).filter((k) => data[k]).map((k) => [k, data[k]]));

  const id = tx(() => {
    const customerId = upsertCustomer({
      name: data.name, phone, email: data.email, address: data.address,
      wrist: type === 'custom' ? data.size : (items.find((i) => i.size)?.size || ''),
    });
    return db.prepare(`INSERT INTO inquiries (code, type, customer_id, name, phone, email, address, contact_via, items, total, details, message, ip, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      inquiryCode(type), type, customerId, data.name, phone, data.email, data.address, data.contact_via,
      JSON.stringify(items), total, JSON.stringify(details), data.message,
      String(meta.ip || '').slice(0, 64), String(meta.userAgent || '').slice(0, 300),
    ).lastInsertRowid;
  });

  const inquiry = getInquiry(id);
  // Gửi email nền, không bắt khách chờ
  notify(inquiry).catch((err) => console.error('[mail]', err.message));
  return inquiry;
}

async function notify(inq) {
  if (!mailReady()) {
    db.prepare(`UPDATE inquiries SET mail_status = 'not_configured' WHERE id = ?`).run(inq.id);
    return;
  }
  const mail = getRaw('mail');
  const shop = getPublicSettings().site;
  const to = (mail.notify_to || mail.user || '').split(',').map((s) => s.trim()).filter(Boolean);
  let status = 'sent';
  try {
    const n = shopNotification(inq);
    await sendMail({ to, subject: n.subject, html: n.html, replyTo: inq.email || undefined });
    if (mail.send_customer_copy && inq.email) {
      const c = customerConfirmation(inq);
      await sendMail({ to: inq.email, subject: c.subject, html: c.html, replyTo: shop.email || undefined });
    }
  } catch (err) {
    status = 'failed';
    console.error('[mail] Gửi email thất bại:', err.message);
  }
  db.prepare('UPDATE inquiries SET mail_status = ? WHERE id = ?').run(status, inq.id);
}

export function resendNotification(id) {
  const inq = getInquiry(id);
  if (!inq) throw new HttpError(404, 'Không tìm thấy');
  return notify(inq);
}

export function getInquiry(id) {
  return present(db.prepare('SELECT * FROM inquiries WHERE id = ?').get(id));
}

export function listInquiries({ type, status, q, page = 1, perPage = 30, customerId, from, to } = {}) {
  const where = [];
  const params = [];
  if (type) { where.push('type = ?'); params.push(type); }
  if (status) { where.push('status = ?'); params.push(status); }
  if (customerId) { where.push('customer_id = ?'); params.push(customerId); }
  if (from) { where.push('date(created_at) >= date(?)'); params.push(from); }
  if (to) { where.push('date(created_at) <= date(?)'); params.push(to); }
  if (q) {
    where.push('(code LIKE ? OR name LIKE ? OR phone LIKE ? OR email LIKE ? OR message LIKE ?)');
    params.push(...Array(5).fill(`%${q}%`));
  }
  const sql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) FROM inquiries ${sql}`).pluck().get(...params);
  const rows = db.prepare(`SELECT * FROM inquiries ${sql} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, perPage, (Math.max(1, page) - 1) * perPage);
  return { items: rows.map(present), total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export function updateInquiry(id, { status, admin_note }) {
  const cur = getInquiry(id);
  if (!cur) throw new HttpError(404, 'Không tìm thấy');
  db.prepare(`UPDATE inquiries SET status = ?, admin_note = ?, updated_at = datetime('now') WHERE id = ?`).run(
    INQUIRY_STATUS[status] ? status : cur.status,
    admin_note !== undefined ? cleanText(admin_note, 5000) : cur.admin_note,
    id,
  );
  return getInquiry(id);
}

export function deleteInquiry(id) {
  db.prepare('DELETE FROM inquiries WHERE id = ?').run(id);
}

export function inquiryStats() {
  const byType = db.prepare(`SELECT type, COUNT(*) AS total, SUM(status = 'new') AS new_count FROM inquiries GROUP BY type`).all();
  const last30 = db.prepare(`SELECT date(created_at, '+7 hours') AS d, COUNT(*) AS c FROM inquiries
    WHERE created_at >= datetime('now', '-30 days') GROUP BY d ORDER BY d`).all();
  const revenue = db.prepare(`SELECT COALESCE(SUM(total), 0) FROM inquiries WHERE type = 'order' AND status = 'completed'
    AND created_at >= datetime('now', 'start of month')`).pluck().get();
  return { byType, last30, revenue };
}

// ---------------- Khách hàng ----------------
export function listCustomers({ q, page = 1, perPage = 30 } = {}) {
  const where = q ? 'WHERE c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.tags LIKE ?' : '';
  const params = q ? Array(4).fill(`%${q}%`) : [];
  const total = db.prepare(`SELECT COUNT(*) FROM customers c ${where}`).pluck().get(...params);
  const items = db.prepare(`SELECT c.*, COUNT(i.id) AS inquiry_count, MAX(i.created_at) AS last_inquiry_at,
      COALESCE(SUM(CASE WHEN i.type = 'order' AND i.status = 'completed' THEN i.total END), 0) AS total_spent
    FROM customers c LEFT JOIN inquiries i ON i.customer_id = c.id ${where}
    GROUP BY c.id ORDER BY COALESCE(MAX(i.created_at), c.created_at) DESC LIMIT ? OFFSET ?`)
    .all(...params, perPage, (Math.max(1, page) - 1) * perPage);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export function getCustomer(id) {
  const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  if (!c) return null;
  c.inquiries = listInquiries({ customerId: id, perPage: 200 }).items;
  return c;
}

export function updateCustomer(id, data) {
  const res = db.prepare(`UPDATE customers SET name = ?, email = ?, address = ?, wrist_size = ?, note = ?, tags = ?,
    updated_at = datetime('now') WHERE id = ?`).run(
    cleanText(data.name, 120), cleanText(data.email, 160), cleanText(data.address, 400),
    cleanText(data.wrist_size, 60), cleanText(data.note, 5000), cleanText(data.tags, 300), toInt(id),
  );
  if (!res.changes) throw new HttpError(404, 'Không tìm thấy khách hàng');
  return getCustomer(id);
}

export function deleteCustomer(id) {
  db.prepare('DELETE FROM customers WHERE id = ?').run(id);
}

export function customersCsv() {
  const rows = listCustomers({ perPage: 100000 }).items;
  const head = ['Họ tên', 'Điện thoại', 'Email', 'Địa chỉ', 'Ni tay', 'Nhãn', 'Ghi chú', 'Số yêu cầu', 'Đã mua (VND)', 'Ngày tạo'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  // Chặn công thức Excel độc hại (CSV injection)
  const safe = (v) => (/^[=+\-@]/.test(String(v ?? '')) ? `'${v}` : v);
  const lines = rows.map((r) => [r.name, r.phone, r.email, r.address, r.wrist_size, r.tags, r.note, r.inquiry_count, r.total_spent, r.created_at].map((v) => esc(safe(v))).join(','));
  return '﻿' + [head.map(esc).join(','), ...lines].join('\r\n');
}
