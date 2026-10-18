// Xử lý ảnh upload: kiểm tra, xoay đúng chiều, xóa thông tin EXIF, nén WebP nhiều kích thước.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { db, likeVn } from '../lib/db.js';
import { config } from '../config/index.js';
import { HttpError, safeJson } from '../lib/utils.js';
import { cleanText } from '../lib/sanitize.js';

const SIZES = { sm: 480, md: 960, lg: 1800 };
const MAX_PIXELS = 50_000_000;

sharp.cache(false);

export const DEFAULT_FOLDER = 'general';

// Tên thư mục: gọn, không có ký tự đường dẫn. Rỗng = thư mục mặc định.
export function normalizeFolder(name) {
  const n = cleanText(name, 80).replace(/[\\/<>"]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  return n || DEFAULT_FOLDER;
}

export async function saveImage(buffer, { originalName = '', folder = DEFAULT_FOLDER, alt = '', userId = null } = {}) {
  let meta;
  try {
    meta = await sharp(buffer, { limitInputPixels: MAX_PIXELS }).metadata();
  } catch {
    throw new HttpError(400, 'File không phải ảnh hợp lệ (ảnh HEIC của iPhone: hãy chuyển sang JPG trước khi tải lên)');
  }
  if (!['jpeg', 'png', 'webp', 'avif', 'heif', 'gif', 'tiff'].includes(meta.format)) {
    throw new HttpError(400, 'Chỉ hỗ trợ ảnh JPG, PNG, WebP, AVIF');
  }

  const now = new Date();
  const rel = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  const dir = path.join(config.paths.uploads, rel);
  fs.mkdirSync(dir, { recursive: true });
  const id = crypto.randomBytes(8).toString('hex');

  const base = sharp(buffer, { limitInputPixels: MAX_PIXELS, animated: false }).rotate();
  const variants = {};
  let width = meta.width, height = meta.height;
  // Ảnh xoay theo EXIF thì đổi chiều rộng/cao
  if (meta.orientation >= 5) [width, height] = [height, width];

  for (const [key, size] of Object.entries(SIZES)) {
    const file = `${id}-${key}.webp`;
    await base.clone()
      .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
      // Chất lượng theo cỡ: nhỏ 78, vừa 84, lớn 88 (ảnh xem chi tiết / phóng to cần nét cho ngọc)
      .webp({ quality: { sm: 78, md: 84, lg: 88 }[key], effort: 4 })
      .toFile(path.join(dir, file));
    variants[key] = `${rel}/${file}`;
  }

  const size = fs.statSync(path.join(config.paths.uploads, variants.lg)).size;
  const info = db.prepare(`INSERT INTO media (original_name, alt, width, height, size_bytes, variants, folder, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    String(originalName).slice(0, 200), String(alt).slice(0, 300), width, height, size, JSON.stringify(variants), normalizeFolder(folder), userId,
  );
  return getMedia(info.lastInsertRowid);
}

export function present(row) {
  if (!row) return null;
  const v = safeJson(row.variants, {});
  const url = (k) => (v[k] ? `/uploads/${v[k]}` : null);
  return {
    id: row.id,
    alt: row.alt,
    width: row.width,
    height: row.height,
    size_bytes: row.size_bytes,
    folder: row.folder,
    original_name: row.original_name,
    created_at: row.created_at,
    sm: url('sm'),
    md: url('md'),
    lg: url('lg'),
    url: url('lg'),
  };
}

export function getMedia(id) {
  if (!id) return null;
  return present(db.prepare('SELECT * FROM media WHERE id = ?').get(id));
}

export function getMediaMap(ids) {
  const list = [...new Set(ids.filter(Boolean).map(Number))];
  if (!list.length) return {};
  const rows = db.prepare(`SELECT * FROM media WHERE id IN (${list.map(() => '?').join(',')})`).all(...list);
  return Object.fromEntries(rows.map((r) => [r.id, present(r)]));
}

export function listMedia({ folder, page = 1, perPage = 40, q } = {}) {
  const where = [];
  const params = [];
  if (folder) { where.push('folder = ?'); params.push(folder); }
  if (q) { where.push('(vn(original_name) LIKE ? OR vn(alt) LIKE ?)'); params.push(likeVn(q), likeVn(q)); }
  const sqlWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) FROM media ${sqlWhere}`).pluck().get(...params);
  const rows = db.prepare(`SELECT * FROM media ${sqlWhere} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, perPage, (page - 1) * perPage);
  return { items: rows.map(present), total, page, perPage };
}

// ---------------- Thư mục ----------------
// Danh sách thư mục kèm số ảnh: gồm thư mục có ảnh và thư mục trống đã tạo
export function listFolders() {
  const counts = db.prepare('SELECT folder AS name, COUNT(*) AS count FROM media GROUP BY folder').all();
  const map = new Map(counts.map((r) => [r.name.toLowerCase(), r]));
  for (const r of db.prepare('SELECT name FROM media_folders').all()) {
    if (!map.has(r.name.toLowerCase())) map.set(r.name.toLowerCase(), { name: r.name, count: 0 });
  }
  if (!map.has(DEFAULT_FOLDER)) map.set(DEFAULT_FOLDER, { name: DEFAULT_FOLDER, count: 0 });
  const list = [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  // Thư mục mặc định luôn đứng đầu
  return [...list.filter((f) => f.name === DEFAULT_FOLDER), ...list.filter((f) => f.name !== DEFAULT_FOLDER)];
}

export function createFolder(name) {
  if (!cleanText(name, 80)) throw new HttpError(422, 'Vui lòng nhập tên thư mục');
  const clean = normalizeFolder(name);
  if (listFolders().some((f) => f.name.toLowerCase() === clean.toLowerCase())) throw new HttpError(409, `Thư mục “${clean}” đã có`);
  db.prepare('INSERT INTO media_folders (name) VALUES (?)').run(clean);
  return clean;
}

// Đổi tên (hoặc gộp vào thư mục đã có): chuyển toàn bộ ảnh sang tên mới
export function renameFolder(from, to) {
  if (from === DEFAULT_FOLDER) throw new HttpError(400, 'Không đổi tên được thư mục mặc định');
  if (!cleanText(to, 80)) throw new HttpError(422, 'Vui lòng nhập tên thư mục');
  const next = normalizeFolder(to);
  db.prepare('UPDATE media SET folder = ? WHERE folder = ?').run(next, from);
  db.prepare('DELETE FROM media_folders WHERE name = ?').run(from);
  db.prepare('INSERT OR IGNORE INTO media_folders (name) VALUES (?)').run(next);
  return next;
}

// Xóa thư mục: ảnh bên trong được chuyển về thư mục mặc định (không xóa ảnh)
export function deleteFolder(name) {
  if (name === DEFAULT_FOLDER) throw new HttpError(400, 'Không xóa được thư mục mặc định');
  const moved = db.prepare('UPDATE media SET folder = ? WHERE folder = ?').run(DEFAULT_FOLDER, name).changes;
  db.prepare('DELETE FROM media_folders WHERE name = ?').run(name);
  return moved;
}

export function moveMedia(ids, folder) {
  const list = [...new Set((Array.isArray(ids) ? ids : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 500);
  if (!list.length) throw new HttpError(422, 'Chưa chọn ảnh');
  const target = normalizeFolder(folder);
  db.prepare(`UPDATE media SET folder = ? WHERE id IN (${list.map(() => '?').join(',')})`).run(target, ...list);
  db.prepare('INSERT OR IGNORE INTO media_folders (name) VALUES (?)').run(target);
  return { moved: list.length, folder: target };
}

// Sửa tên ảnh (name) và / hoặc mô tả alt. Trường nào không gửi lên thì giữ nguyên.
export function updateMediaInfo(id, { name, alt } = {}) {
  const cur = db.prepare('SELECT original_name, alt FROM media WHERE id = ?').get(id);
  if (!cur) throw new HttpError(404, 'Không tìm thấy ảnh');
  const nextName = name === undefined ? cur.original_name : String(name || '').trim().slice(0, 200);
  const nextAlt = alt === undefined ? cur.alt : String(alt || '').trim().slice(0, 300);
  db.prepare('UPDATE media SET original_name = ?, alt = ? WHERE id = ?').run(nextName, nextAlt, id);
  return getMedia(id);
}
export const updateMediaAlt = (id, alt) => updateMediaInfo(id, { alt });

export function deleteMedia(id) {
  const row = db.prepare('SELECT * FROM media WHERE id = ?').get(id);
  if (!row) return false;
  db.prepare('DELETE FROM media WHERE id = ?').run(id);
  for (const rel of Object.values(safeJson(row.variants, {}))) {
    const file = path.join(config.paths.uploads, rel);
    // Chỉ xóa file nằm trong thư mục uploads
    if (file.startsWith(config.paths.uploads)) fs.rm(file, { force: true }, () => {});
  }
  return true;
}
