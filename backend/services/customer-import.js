// Nhập khách hàng hàng loạt từ bảng dán (Excel / Google Sheets) hoặc file CSV.
// Hai bước: xem trước (không ghi gì) → nhập thật. Bước nhập thật phân tích lại từ đầu, không tin kết quả xem trước từ trình duyệt.
import { z } from 'zod';
import { db, tx, foldVn } from '../lib/db.js';
import { HttpError, vnToday, vnDateToUtc } from '../lib/utils.js';
import { cleanText } from '../lib/sanitize.js';
import { phoneRe, normalizePhone } from './inquiries.js';

export const IMPORT_MAX_ROWS = 2000;
export const IMPORT_MAX_CHARS = 1_000_000;

// Cột nhận diện theo tên tiêu đề (không phân biệt hoa thường và dấu)
const ALIASES = {
  name: ['ho ten', 'ho va ten', 'ten', 'ten khach', 'ten khach hang', 'khach hang', 'name', 'full name'],
  phone: ['so dien thoai', 'dien thoai', 'sdt', 'so dt', 'phone', 'mobile', 'tel', 'zalo'],
  email: ['email', 'mail', 'e-mail'],
  address: ['dia chi', 'address'],
  source: ['nguon', 'nguon khach', 'source'],
  tags: ['nhan', 'tag', 'tags', 'phan loai'],
  wrist_size: ['ni tay', 'ni', 'so do', 'size', 'wrist', 'wrist size'],
  note: ['ghi chu', 'note', 'notes', 'mo ta'],
  created: ['ngay tao', 'ngay', 'ngay mua', 'ngay nhap', 'ngay den', 'date', 'created'],
};
// Không có dòng tiêu đề thì hiểu theo thứ tự này
const DEFAULT_ORDER = ['name', 'phone', 'email', 'address', 'source', 'tags', 'wrist_size', 'note'];
export const IMPORT_TEMPLATE_HEADER = ['Họ tên', 'Số điện thoại', 'Email', 'Địa chỉ', 'Nguồn', 'Nhãn', 'Ni tay', 'Ghi chú', 'Ngày tạo'];

// Đọc CSV / TSV: tự nhận dấu phân cách, hỗ trợ ô có dấu ngoặc kép (chứa dấu phẩy, xuống dòng, "" là dấu ")
export function parseDelimited(input) {
  const text = String(input || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const firstLine = text.split('\n').find((l) => l.trim()) || '';
  const count = (ch) => firstLine.split(ch).length - 1;
  const delim = count('\t') ? '\t' : count(';') > count(',') ? ';' : ',';
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  row.push(cell);
  rows.push(row);
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

// Xác định cột của từng trường; trả về { map: {field: index}, hasHeader }
function mapColumns(rows) {
  const head = (rows[0] || []).map((c) => foldVn(c).replace(/[^a-z0-9 -]/g, '').trim());
  const map = {};
  head.forEach((h, i) => {
    for (const [field, names] of Object.entries(ALIASES)) if (map[field] === undefined && names.includes(h)) map[field] = i;
  });
  if (Object.keys(map).length >= 2 || (map.phone !== undefined && map.name !== undefined)) return { map, hasHeader: true };
  return { map: Object.fromEntries(DEFAULT_ORDER.map((f, i) => [f, i])), hasHeader: false };
}

// Excel hay làm mất số 0 đầu của số điện thoại (0912... thành 912...): tự thêm lại
function cleanPhone(raw) {
  let p = String(raw || '').trim().replace(/[()]/g, '');
  if (/^\d{9}$/.test(p.replace(/[\s.-]/g, '')) && /^[35789]/.test(p.replace(/[\s.-]/g, ''))) p = '0' + p.replace(/[\s.-]/g, '');
  return p;
}

// Ngày trong file: 2026-09-15, 15/09/2026, 15-09-2026, 15.9.26 → YYYY-MM-DD; không đọc được thì trả null
function parseDateCell(raw) {
  const v = String(raw || '').trim();
  if (!v) return '';
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  let y; let mo; let d;
  if (m) [, y, mo, d] = m;
  else if ((m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/))) { [, d, mo, y] = m; if (y.length === 2) y = '20' + y; } else return null;
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return Number.isNaN(Date.parse(iso + 'T00:00:00Z')) || new Date(iso + 'T00:00:00Z').toISOString().slice(0, 10) !== iso ? null : iso;
}

const emailOk = (v) => z.string().email().safeParse(v).success;
const mergeTags = (...lists) => [...new Set(lists.flatMap((t) => String(t || '').split(/[,;]+/)).map((t) => cleanText(t, 40)).filter(Boolean))].join(', ');

function analyze(text, { source = '', tags = '', onDuplicate = 'skip', defaultDate = '' } = {}) {
  if (String(text || '').length > IMPORT_MAX_CHARS) throw new HttpError(413, 'Dữ liệu quá lớn, vui lòng chia nhỏ thành nhiều lần nhập');
  const all = parseDelimited(text);
  if (!all.length) throw new HttpError(422, 'Chưa có dữ liệu để nhập');
  const { map, hasHeader } = mapColumns(all);
  const lines = hasHeader ? all.slice(1) : all;
  if (!lines.length) throw new HttpError(422, 'Chỉ có dòng tiêu đề, chưa có khách nào');
  if (lines.length > IMPORT_MAX_ROWS) throw new HttpError(422, `Mỗi lần chỉ nhập tối đa ${IMPORT_MAX_ROWS} khách (file này có ${lines.length} dòng)`);

  const defaultSource = cleanText(source, 100);
  // Ngày mặc định cho các dòng không có cột ngày (mặc định hôm nay); ngày sai thì báo lỗi ngay
  const fallbackDate = parseDateCell(defaultDate);
  if (fallbackDate === null || (fallbackDate && (fallbackDate > vnToday() || fallbackDate < '2000-01-01'))) throw new HttpError(422, 'Ngày mặc định không hợp lệ (không chọn ngày ở tương lai)');
  const seen = new Map();
  const existingByPhone = new Map(db.prepare('SELECT id, name, phone, tags FROM customers').all().map((c) => [c.phone, c]));
  const rows = lines.map((cells, idx) => {
    const line = idx + 1 + (hasHeader ? 1 : 0);
    const get = (f) => (map[f] === undefined ? '' : String(cells[map[f]] ?? '').trim());
    const r = { line, name: cleanText(get('name'), 120), phone: '', email: cleanText(get('email'), 160), address: cleanText(get('address'), 400),
      source: cleanText(get('source'), 100) || defaultSource, tags: mergeTags(get('tags'), tags), wrist_size: cleanText(get('wrist_size'), 60),
      note: cleanText(get('note'), 5000), status: 'new', message: '', created_date: fallbackDate || '' };
    const cellDate = parseDateCell(get('created'));
    if (get('created')) {
      if (cellDate === null || cellDate > vnToday() || cellDate < '2000-01-01') r.message = 'Bỏ qua ngày sai hoặc ở tương lai, dùng ngày mặc định';
      else r.created_date = cellDate;
    }
    const rawPhone = cleanPhone(get('phone'));
    if (r.name.length < 2) return { ...r, phone: rawPhone, status: 'error', message: 'Thiếu họ tên' };
    if (!phoneRe.test(rawPhone)) return { ...r, phone: rawPhone, status: 'error', message: rawPhone ? 'Số điện thoại không hợp lệ' : 'Thiếu số điện thoại' };
    r.phone = normalizePhone(rawPhone);
    if (r.email && !emailOk(r.email)) { r.email = ''; r.message = 'Bỏ qua email sai định dạng'; }
    if (seen.has(r.phone)) return { ...r, status: 'skip', message: `Trùng số điện thoại với dòng ${seen.get(r.phone)} trong file` };
    seen.set(r.phone, line);
    const ex = existingByPhone.get(r.phone);
    if (ex) {
      r.existing_id = ex.id;
      r.status = onDuplicate === 'update' ? 'update' : 'skip';
      r.message = `${onDuplicate === 'update' ? 'Cập nhật' : 'Đã có'} khách “${ex.name}”${r.message ? ` · ${r.message}` : ''}`;
    }
    return r;
  });
  const counts = rows.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] || 0) + 1 }), { new: 0, update: 0, skip: 0, error: 0 });
  return { rows, counts, hasHeader, total: rows.length };
}

// Bước xem trước: không ghi gì vào database
export function previewCustomerImport(text, options) {
  const { rows, counts, hasHeader, total } = analyze(text, options);
  return { counts, hasHeader, total, rows: rows.slice(0, 300), truncated: total > 300 };
}

// Bước nhập thật: một transaction, lỗi giữa chừng thì không lưu gì
export function importCustomers(text, options) {
  const { rows, counts } = analyze(text, options);
  const insert = db.prepare("INSERT INTO customers (name, phone, email, address, wrist_size, note, tags, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))");
  const pick = (v, old) => (v !== '' && v != null ? v : old);
  tx(() => {
    for (const r of rows) {
      if (r.status === 'new') { const ts = vnDateToUtc(r.created_date); insert.run(r.name, r.phone, r.email, r.address, r.wrist_size, r.note, r.tags, r.source, ts, ts); }
      else if (r.status === 'update') {
        const cur = db.prepare('SELECT * FROM customers WHERE id = ?').get(r.existing_id);
        db.prepare(`UPDATE customers SET name = ?, email = ?, address = ?, wrist_size = ?, note = ?, tags = ?, source = ?, updated_at = datetime('now') WHERE id = ?`).run(
          pick(r.name, cur.name), pick(r.email, cur.email), pick(r.address, cur.address), pick(r.wrist_size, cur.wrist_size),
          pick(r.note, cur.note), mergeTags(cur.tags, r.tags), pick(r.source, cur.source), cur.id,
        );
      }
    }
  });
  return {
    created: counts.new, updated: counts.update, skipped: counts.skip, failed: counts.error,
    problems: rows.filter((r) => r.status === 'error' || r.status === 'skip').slice(0, 100).map((r) => ({ line: r.line, name: r.name, phone: r.phone, message: r.message })),
  };
}

export function importTemplateCsv() {
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const sample = [['Nguyễn Văn A', '0912345678', 'a@example.com', '12 Phố Huế, Hà Nội', 'Zalo', 'VIP', '56', 'Thích ngọc xanh, hợp mệnh Mộc', vnToday().split('-').reverse().join('/')]];
  return '﻿' + [IMPORT_TEMPLATE_HEADER, ...sample].map((r) => r.map(esc).join(',')).join('\r\n');
}
