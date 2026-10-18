// Các hàm tiện ích dùng chung.
import crypto from 'node:crypto';

export function slugify(input) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function formatVnd(value) {
  if (value == null || value === '') return '';
  return new Intl.NumberFormat('vi-VN').format(Number(value)) + '₫';
}

export function formatDate(value, withTime = false) {
  if (!value) return '';
  // SQLite lưu giờ UTC dạng "YYYY-MM-DD HH:MM:SS"
  const d = new Date(String(value).includes('T') ? value : String(value).replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return String(value);
  const opts = { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' };
  if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
  return new Intl.DateTimeFormat('vi-VN', opts).format(d);
}

export function stripHtml(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

export function truncate(text, length = 160) {
  const s = String(text || '');
  if (s.length <= length) return s;
  return s.slice(0, length - 1).replace(/\s+\S*$/, '') + '…';
}

export function safeJson(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// Ngày hôm nay theo giờ Việt Nam (YYYY-MM-DD)
export const vnToday = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);

// Ngày (giờ Việt Nam) do admin chọn khi nhập lại dữ liệu cũ → thời điểm lưu trong database (UTC, "YYYY-MM-DD HH:MM:SS").
// Hôm nay hoặc để trống: dùng đúng giờ hiện tại (trả null để SQL tự lấy datetime('now')). Ngày khác: 12:00 trưa giờ Việt Nam.
// Ngày sai định dạng, không có thật, ở tương lai hoặc trước năm 2000 thì báo lỗi 422.
export function vnDateToUtc(value, field = 'date') {
  const d = String(value ?? '').trim();
  if (!d) return null;
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d + 'T00:00:00Z')) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d;
  if (!ok) throw new HttpError(422, 'Ngày không hợp lệ', { [field]: 'Ngày không hợp lệ' });
  if (d > vnToday()) throw new HttpError(422, 'Không chọn ngày ở tương lai', { [field]: 'Không chọn ngày ở tương lai' });
  if (d < '2000-01-01') throw new HttpError(422, 'Ngày quá xa', { [field]: 'Ngày quá xa' });
  return d === vnToday() ? null : `${d} 05:00:00`;
}

export function inquiryCode(type, date) {
  const prefix = { order: 'DH', custom: 'CT', contact: 'LH' }[type] || 'YC';
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date : vnToday();
  const code6 = day.slice(2).replace(/-/g, '');
  return `${prefix}${code6}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export const toInt = (v, def = null) => {
  if (v === '' || v == null) return def;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
};

export const bool = (v) => v === true || v === 1 || v === '1' || v === 'true' || v === 'on';

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Ngày (giờ Việt Nam) của một thời điểm lưu trong database ("YYYY-MM-DD HH:MM:SS" UTC); rỗng nếu không có
export const vnDayOf = (ts) => {
  const t = Date.parse(String(ts || '').replace(' ', 'T') + 'Z');
  return Number.isNaN(t) ? '' : new Date(t + 7 * 36e5).toISOString().slice(0, 10);
};
