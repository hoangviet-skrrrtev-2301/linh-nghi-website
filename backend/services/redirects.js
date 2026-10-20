// Chuyển hướng 301 / 302 / 410 do shop cấu hình, tự tạo khi đổi đường dẫn, và nhật ký 404.
import { db, likeVn } from '../lib/db.js';
import { config } from '../config/index.js';
import { HttpError, toInt } from '../lib/utils.js';
import { cleanText } from '../lib/sanitize.js';

// Các đường dẫn hệ thống không cho tạo chuyển hướng (tránh tự khóa mình)
const PROTECTED = ['/api', '/assets', '/uploads', '/vendor', '/admin-assets', '/robots.txt', '/sitemap.xml', '/theme.css', '/favicon.ico'];

// Khóa so khớp: giải mã %xx, chữ thường, bỏ query / "#", gộp "//", bỏ "/" cuối
export function pathKey(input) {
  let p = String(input || '').trim().split('#')[0].split('?')[0];
  try { p = decodeURIComponent(p); } catch { /* giữ nguyên nếu mã hóa sai */ }
  p = p.toLowerCase().replace(/\/{2,}/g, '/');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p;
}

function checkFrom(raw) {
  const from = pathKey(raw);
  if (!from.startsWith('/') || from === '/') throw new HttpError(422, 'Đường dẫn cũ phải bắt đầu bằng “/” và không phải trang chủ (ví dụ /san-pham/vong-cu)');
  if (/[\s<>"]/.test(from) || from.length > 300) throw new HttpError(422, 'Đường dẫn cũ không hợp lệ');
  if (from === config.adminPath || from.startsWith(`${config.adminPath}/`) || PROTECTED.some((x) => from === x || from.startsWith(`${x}/`))) {
    throw new HttpError(422, 'Không tạo chuyển hướng cho đường dẫn hệ thống / quản trị');
  }
  return from;
}

function checkTo(raw) {
  const to = String(raw || '').trim();
  if (/^https?:\/\//i.test(to)) {
    try { return new URL(to).href; } catch { throw new HttpError(422, 'Địa chỉ đích không hợp lệ'); }
  }
  if (!to.startsWith('/') || to.startsWith('//') || /[\s<>"\\]/.test(to) || to.length > 500) {
    throw new HttpError(422, 'Địa chỉ đích phải là đường dẫn trong website (bắt đầu bằng “/”) hoặc địa chỉ đầy đủ https://...');
  }
  return to;
}

// ---- Bộ nhớ đệm: toàn bộ chuyển hướng đang bật (số lượng nhỏ) ----
let cache = null;
const load = () => {
  cache = new Map(db.prepare('SELECT * FROM redirects WHERE active = 1').all().map((r) => [r.from_path, r]));
  return cache;
};
export const invalidate = () => { cache = null; };

// Đi theo chuỗi chuyển hướng nội bộ; nếu vòng về chính đường dẫn cũ thì từ chối
function assertNoLoop(from, to) {
  const map = cache || load();
  let cur = pathKey(to);
  for (let i = 0; i < 12; i++) {
    if (cur === from) throw new HttpError(422, 'Chuyển hướng này tạo thành vòng lặp');
    const next = map.get(cur);
    if (!next || !next.to_url || /^https?:/i.test(next.to_url)) return;
    cur = pathKey(next.to_url);
  }
  throw new HttpError(422, 'Chuỗi chuyển hướng quá dài, hãy trỏ thẳng tới trang đích cuối cùng');
}

const hitBuffer = new Map();
setInterval(() => {
  if (!hitBuffer.size) return;
  const upd = db.prepare("UPDATE redirects SET hits = hits + ?, last_hit_at = datetime('now') WHERE from_path = ?");
  for (const [k, n] of hitBuffer) upd.run(n, k);
  hitBuffer.clear();
}, 30_000).unref();

// Tìm chuyển hướng cho một đường dẫn: { status, to } hoặc null
export function matchRedirect(reqPath) {
  const row = (cache || load()).get(pathKey(reqPath));
  if (!row) return null;
  hitBuffer.set(row.from_path, (hitBuffer.get(row.from_path) || 0) + 1);
  return { status: row.status, to: row.to_url };
}

export function listRedirects({ q = '', auto = '', page = 1, perPage = 30 } = {}) {
  const where = [];
  const params = [];
  if (q) { where.push('(vn(from_path) LIKE ? OR vn(to_url) LIKE ? OR vn(note) LIKE ?)'); params.push(...Array(3).fill(likeVn(q))); }
  if (auto === '1' || auto === '0') { where.push('auto = ?'); params.push(Number(auto)); }
  const sql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) FROM redirects ${sql}`).pluck().get(...params);
  const items = db.prepare(`SELECT * FROM redirects ${sql} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, perPage, (Math.max(1, page) - 1) * perPage);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export function saveRedirect(id, data) {
  const from = checkFrom(data.from_path);
  const status = [301, 302, 410].includes(toInt(data.status)) ? toInt(data.status) : 301;
  const to = status === 410 ? '' : checkTo(data.to_url);
  if (status !== 410 && !/^https?:/i.test(to) && pathKey(to) === from) throw new HttpError(422, 'Đường dẫn cũ và mới đang giống nhau');
  load();
  if (status !== 410) assertNoLoop(from, to);
  const dup = db.prepare('SELECT id FROM redirects WHERE from_path = ? AND id != ?').pluck().get(from, id || 0);
  if (dup) throw new HttpError(409, 'Đường dẫn cũ này đã có chuyển hướng', { existing_id: dup });
  const v = { from_path: from, to_url: to, status, note: cleanText(data.note, 300), active: data.active === false || data.active === 0 ? 0 : 1 };
  let rid = id;
  if (id) {
    const res = db.prepare("UPDATE redirects SET from_path=@from_path, to_url=@to_url, status=@status, note=@note, active=@active, updated_at=datetime('now') WHERE id=@id").run({ ...v, id });
    if (!res.changes) throw new HttpError(404, 'Không tìm thấy chuyển hướng');
  } else {
    rid = db.prepare('INSERT INTO redirects (from_path, to_url, status, note, active) VALUES (@from_path, @to_url, @status, @note, @active)').run(v).lastInsertRowid;
  }
  // Đường dẫn này đã được xử lý bằng chuyển hướng thì không cần ghi nhận 404 nữa
  db.prepare('DELETE FROM not_found_log WHERE path = ?').run(from);
  invalidate();
  return db.prepare('SELECT * FROM redirects WHERE id = ?').get(rid);
}

export function deleteRedirect(id) {
  db.prepare('DELETE FROM redirects WHERE id = ?').run(id);
  invalidate();
}

// Nhập hàng loạt: mỗi dòng "đường dẫn cũ, đường dẫn mới" (cách nhau dấu phẩy, tab hoặc dấu ->). Trả về báo cáo từng dòng lỗi.
export function bulkRedirects(text, { status = 301 } = {}) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).slice(0, 500);
  const out = { created: 0, updated: 0, errors: [] };
  lines.forEach((line, i) => {
    const [from, to] = line.split(/\s*(?:->|=>|,|\t)\s*/);
    try {
      const key = checkFrom(from);
      const existing = db.prepare('SELECT id FROM redirects WHERE from_path = ?').pluck().get(key);
      saveRedirect(existing || null, { from_path: from, to_url: to, status });
      if (existing) out.updated++; else out.created++;
    } catch (e) { out.errors.push(`Dòng ${i + 1} (${line.slice(0, 60)}): ${e.message}`); }
  });
  return out;
}

// Khi đổi đường dẫn của một trang (đổi slug, đổi loại / chuyên mục): tự chuyển 301 từ đường dẫn cũ sang mới.
// Đồng thời dọn: chuyển hướng cũ trỏ tới đường dẫn vừa bỏ được trỏ thẳng tới đường dẫn mới (không để chuỗi dài);
// chuyển hướng bắt đầu từ chính đường dẫn mới bị xóa (không thành vòng lặp).
export function addAutoRedirect(oldPath, newPath) {
  const from = pathKey(oldPath);
  const to = String(newPath || '');
  if (!from || !to || from === pathKey(to)) return;
  db.prepare('DELETE FROM redirects WHERE from_path = ?').run(pathKey(to));
  db.prepare("UPDATE redirects SET to_url = ?, updated_at = datetime('now') WHERE to_url = ? AND status != 410").run(to, oldPath);
  db.prepare(`INSERT INTO redirects (from_path, to_url, status, auto, note) VALUES (?, ?, 301, 1, 'Tự tạo khi đổi đường dẫn')
    ON CONFLICT(from_path) DO UPDATE SET to_url = excluded.to_url, status = 301, active = 1, updated_at = datetime('now')`).run(from, to);
  invalidate();
}

// Đường dẫn vừa được dùng lại làm địa chỉ thật: bỏ chuyển hướng tự tạo bắt đầu từ chính nó (tránh vòng lặp)
export function dropAutoRedirectFrom(path) {
  db.prepare('DELETE FROM redirects WHERE from_path = ? AND auto = 1').run(pathKey(path));
  invalidate();
}

// ---- Nhật ký 404 ----
// Gom trong bộ nhớ rồi ghi 30 giây một lần: bot dò đường dẫn không làm database bị ghi liên tục
const nfBuffer = new Map();
export function logNotFound(reqPath, referer = '') {
  const p = pathKey(reqPath);
  if (!p || p.length > 250 || nfBuffer.size > 500) return;
  const cur = nfBuffer.get(p);
  if (cur) cur.n++; else nfBuffer.set(p, { n: 1, referer: String(referer || '').slice(0, 300) });
}
setInterval(() => {
  if (!nfBuffer.size) return;
  for (const [p, v] of nfBuffer) writeNotFound(p, v.n, v.referer);
  nfBuffer.clear();
}, 30_000).unref();

function writeNotFound(p, n, referer) {
  try {
    const exists = db.prepare('UPDATE not_found_log SET hits = hits + ?, last_seen = datetime(\'now\') WHERE path = ?').run(n, p).changes;
    if (exists) return;
    // Giới hạn số dòng để bot dò đường dẫn không làm phình database
    if (db.prepare('SELECT COUNT(*) FROM not_found_log').pluck().get() >= 1000) {
      db.prepare('DELETE FROM not_found_log WHERE id IN (SELECT id FROM not_found_log ORDER BY hits ASC, last_seen ASC LIMIT 100)').run();
    }
    db.prepare('INSERT INTO not_found_log (path, hits, referer) VALUES (?, ?, ?)').run(p, n, referer);
  } catch { /* ghi nhật ký lỗi thì bỏ qua, không ảnh hưởng trang 404 */ }
}

export function listNotFound({ limit = 50 } = {}) {
  return db.prepare('SELECT * FROM not_found_log ORDER BY hits DESC, last_seen DESC LIMIT ?').all(limit);
}

export function clearNotFound(path) {
  if (path) db.prepare('DELETE FROM not_found_log WHERE path = ?').run(pathKey(path));
  else db.prepare('DELETE FROM not_found_log').run();
}
