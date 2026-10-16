// Xử lý ảnh upload: kiểm tra, xoay đúng chiều, xóa thông tin EXIF, nén WebP nhiều kích thước.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { db } from '../lib/db.js';
import { config } from '../config/index.js';
import { HttpError, safeJson } from '../lib/utils.js';

const SIZES = { sm: 480, md: 960, lg: 1800 };
const MAX_PIXELS = 50_000_000;

sharp.cache(false);

export async function saveImage(buffer, { originalName = '', folder = 'general', alt = '', userId = null } = {}) {
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
      .webp({ quality: key === 'sm' ? 78 : 84, effort: 4 })
      .toFile(path.join(dir, file));
    variants[key] = `${rel}/${file}`;
  }

  const size = fs.statSync(path.join(config.paths.uploads, variants.lg)).size;
  const info = db.prepare(`INSERT INTO media (original_name, alt, width, height, size_bytes, variants, folder, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    String(originalName).slice(0, 200), String(alt).slice(0, 300), width, height, size, JSON.stringify(variants), folder, userId,
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
  if (q) { where.push('(original_name LIKE ? OR alt LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  const sqlWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) FROM media ${sqlWhere}`).pluck().get(...params);
  const rows = db.prepare(`SELECT * FROM media ${sqlWhere} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, perPage, (page - 1) * perPage);
  return { items: rows.map(present), total, page, perPage };
}

export function updateMediaAlt(id, alt) {
  db.prepare('UPDATE media SET alt = ? WHERE id = ?').run(String(alt || '').slice(0, 300), id);
  return getMedia(id);
}

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
