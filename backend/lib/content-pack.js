// "Gói nội dung" để bàn giao: bản sao SẠCH của database + ảnh, lưu trong git (database/content-pack/).
// Chứa: sản phẩm, danh mục, gallery, blog, tác giả, ảnh, cài đặt website, chuyển hướng, vai trò.
// KHÔNG chứa: tài khoản quản trị (mật khẩu băm), khách hàng, đơn hàng / yêu cầu, nhật ký, phiên đăng nhập, cấu hình email.
// Module này không nạp lib/db.js để có thể thay file database trước khi ứng dụng mở nó.
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from '../config/index.js';
import { SETTINGS_SCHEMA } from '../config/settings-schema.js';

// LN_PACK_DIR: nơi đặt gói nội dung (bộ kiểm thử dùng thư mục tạm để không ghi đè gói thật trong git)
export const PACK_DIR = process.env.LN_PACK_DIR ? path.resolve(process.env.LN_PACK_DIR) : path.join(config.root, 'database/content-pack');
export const PACK_DB = path.join(PACK_DIR, 'content.sqlite');
export const PACK_UPLOADS = path.join(PACK_DIR, 'uploads');

// Thứ tự xóa tôn trọng khóa ngoại; đây là dữ liệu riêng tư / vận hành, không đưa vào gói
const PRIVATE_TABLES = ['sessions', 'audit_logs', 'not_found_log', 'inquiries', 'customers', 'users'];
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const has = (db, table) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
const count = (db, table) => (has(db, table) ? db.prepare(`SELECT COUNT(*) FROM ${table}`).pluck().get() : 0);

export function packExists() {
  return fs.existsSync(PACK_DB);
}

export function packInfo() {
  try { return JSON.parse(fs.readFileSync(path.join(PACK_DIR, 'manifest.json'), 'utf8')); } catch { return null; }
}

// Tạo gói từ database hiện tại. Trả về { counts, files }.
export function exportPack() {
  if (!fs.existsSync(config.paths.database)) throw new Error('Chưa có database để xuất (chạy npm run setup trước).');
  fs.mkdirSync(PACK_DIR, { recursive: true });
  fs.rmSync(PACK_DB, { force: true });
  fs.rmSync(PACK_UPLOADS, { recursive: true, force: true });

  // 1) Sao chép nguyên vẹn rồi gỡ dữ liệu riêng tư khỏi BẢN SAO (database đang dùng không bị đụng tới)
  const src = new Database(config.paths.database, { readonly: true, fileMustExist: true });
  src.exec(`VACUUM INTO ${q(PACK_DB)}`);
  src.close();

  const dst = new Database(PACK_DB);
  dst.pragma('foreign_keys = OFF');
  dst.pragma('journal_mode = DELETE');
  const ownerOnly = SETTINGS_SCHEMA.filter((g) => g.ownerOnly).map((g) => g.key); // nhóm cài đặt chứa bí mật (email SMTP)
  dst.transaction(() => {
    for (const t of PRIVATE_TABLES) if (has(dst, t)) dst.exec(`DELETE FROM ${t}`);
    if (has(dst, 'sqlite_sequence')) dst.exec(`DELETE FROM sqlite_sequence WHERE name IN (${PRIVATE_TABLES.map(q).join(',')})`);
    if (ownerOnly.length) dst.prepare(`DELETE FROM settings WHERE key IN (${ownerOnly.map(() => '?').join(',')})`).run(...ownerOnly);
    // Không để lại dấu vết tài khoản đã tạo nội dung
    if (has(dst, 'media')) dst.exec('UPDATE media SET created_by = NULL');
    if (has(dst, 'posts')) dst.exec('UPDATE posts SET author_id = NULL');
    if (has(dst, 'users')) dst.exec('UPDATE users SET role_id = NULL');
  })();
  dst.exec('VACUUM'); // ghi lại file để dữ liệu đã xóa không còn nằm trong các trang trống

  // 2) Kiểm tra lần cuối: gói tuyệt đối không có dữ liệu riêng tư
  const leaks = PRIVATE_TABLES.filter((t) => count(dst, t) > 0);
  const mailLeft = ownerOnly.length ? dst.prepare(`SELECT COUNT(*) FROM settings WHERE key IN (${ownerOnly.map(() => '?').join(',')})`).pluck().get(...ownerOnly) : 0;
  if (leaks.length || mailLeft) {
    dst.close();
    fs.rmSync(PACK_DB, { force: true });
    throw new Error(`Gói nội dung còn dữ liệu riêng tư (${[...leaks, mailLeft ? 'settings' : ''].filter(Boolean).join(', ')}), đã hủy.`);
  }

  // 3) Chỉ chép những ảnh thật sự được dùng trong thư viện ảnh
  let files = 0;
  const media = has(dst, 'media') ? dst.prepare('SELECT variants FROM media').all() : [];
  for (const m of media) {
    let variants = {};
    try { variants = JSON.parse(m.variants); } catch { /* bỏ qua dòng hỏng */ }
    for (const rel of Object.values(variants)) {
      const from = path.resolve(config.paths.uploads, rel);
      if (!from.startsWith(path.resolve(config.paths.uploads) + path.sep) || !fs.existsSync(from)) continue;
      const to = path.join(PACK_UPLOADS, rel);
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
      files++;
    }
  }

  const counts = Object.fromEntries(['products', 'product_types', 'terms', 'posts', 'authors', 'gallery_items', 'media', 'redirects', 'roles', 'settings']
    .filter((t) => has(dst, t)).map((t) => [t, count(dst, t)]));
  const migrations = has(dst, '_migrations') ? dst.prepare('SELECT name FROM _migrations ORDER BY name').pluck().all() : [];
  dst.close();

  const manifest = { createdAt: new Date().toISOString(), lastMigration: migrations.at(-1) || null, counts, imageFiles: files };
  fs.writeFileSync(path.join(PACK_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(PACK_DIR, 'README.txt'), [
    'GÓI NỘI DUNG (do "npm run export-content" tạo ra, đừng sửa tay)',
    '',
    'Chứa sản phẩm, danh mục, gallery, blog, tác giả, ảnh, cài đặt website. KHÔNG chứa tài khoản quản trị, khách hàng, đơn hàng, nhật ký, cấu hình email.',
    'Máy mới: chạy "npm run bootstrap" (tự nhập gói này nếu database còn trống) hoặc "npm run import-content".',
    'Muốn cập nhật gói sau khi sửa nội dung trên máy của bạn: "npm run export-content" rồi commit thư mục này.',
    '',
  ].join('\n'));
  return { counts, files, manifest };
}

// Nạp gói vào database của máy này. Chỉ chạy khi database trống, trừ khi force (khi đó tự giữ bản sao lưu trước).
export async function importPack({ force = false } = {}) {
  if (!packExists()) return { ok: false, reason: 'no-pack' };
  const dbFile = config.paths.database;
  if (fs.existsSync(dbFile)) {
    const cur = new Database(dbFile, { readonly: true, fileMustExist: true });
    const filled = count(cur, 'products') > 0 || count(cur, 'users') > 0 || count(cur, 'posts') > 0;
    if (filled && !force) { cur.close(); return { ok: false, reason: 'not-empty' }; }
    if (filled) {
      cur.close();
      const rw = new Database(dbFile, { fileMustExist: true });
      const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
      const dir = path.join(config.paths.backups, `truoc-khi-nhap-goi-${stamp}`);
      fs.mkdirSync(dir, { recursive: true });
      await rw.backup(path.join(dir, 'app.sqlite'));
      rw.close();
      var safety = dir; // eslint-disable-line no-var
    } else cur.close();
  }
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  for (const ext of ['', '-wal', '-shm']) fs.rmSync(dbFile + ext, { force: true });
  fs.copyFileSync(PACK_DB, dbFile);
  if (fs.existsSync(PACK_UPLOADS)) fs.cpSync(PACK_UPLOADS, config.paths.uploads, { recursive: true, force: true });
  return { ok: true, safety, info: packInfo() };
}
