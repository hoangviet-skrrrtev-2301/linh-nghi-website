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

export function inquiryCode(type) {
  const prefix = { order: 'DH', custom: 'CT', contact: 'LH' }[type] || 'YC';
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: '2-digit', month: '2-digit', day: '2-digit' })
    .format(new Date()).replace(/-/g, '');
  return `${prefix}${date}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
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
