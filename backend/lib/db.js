// Kết nối SQLite và chạy migration.
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from '../config/index.js';

fs.mkdirSync(path.dirname(config.paths.database), { recursive: true });

export const db = new Database(config.paths.database);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');

// Tìm kiếm tiếng Việt không phân biệt hoa/thường và dấu: "áo", "Áo", "ao" đều khớp "Áo dài".
// SQLite chỉ so khớp chữ hoa/thường với ký tự không dấu, nên dùng hàm tự đăng ký vn(cột) LIKE foldVn(từ khóa).
export function foldVn(value) {
  return String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase();
}
db.function('vn', { deterministic: true }, (value) => foldVn(value));
// Mẫu cho LIKE: %từ khóa%
export const likeVn = (q) => `%${foldVn(String(q).trim())}%`;

const migrationFiles = (dir) => fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

function appliedMigrations() {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  return new Set(db.prepare('SELECT name FROM _migrations').pluck().all());
}

// Các file migration chưa chạy (để server production từ chối khởi động khi chưa chạy `npm run migrate`)
export function pendingMigrations({ dir = config.paths.migrations } = {}) {
  const applied = appliedMigrations();
  return migrationFiles(dir).filter((f) => !applied.has(f));
}

// Chụp database trước khi đổi cấu trúc (VACUUM INTO: một file nhất quán, không cần dừng server). Giữ 5 bản gần nhất.
function snapshotBeforeMigrate() {
  const root = path.join(path.dirname(config.paths.database), 'pre-migrate');
  fs.mkdirSync(root, { recursive: true });
  // Có mili giây để hai lần chạy sát nhau không trùng tên (VACUUM INTO không ghi đè file có sẵn)
  const file = path.join(root, `${new Date().toISOString().replace(/[:T]/g, '-').replace('.', '-').slice(0, 23)}.sqlite`);
  db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  const all = fs.readdirSync(root).filter((f) => f.endsWith('.sqlite')).sort();
  for (const old of all.slice(0, Math.max(0, all.length - 5))) fs.rmSync(path.join(root, old), { force: true });
  return file;
}

// Chạy các migration chưa chạy, mỗi file trong một transaction (lỗi thì file đó không để lại gì).
// Database đã có dữ liệu thì tự chụp một bản trước khi chạy; lỗi thì dừng ngay và nói rõ file nào, bản chụp ở đâu.
export function migrate({ log = console.log, dir = config.paths.migrations } = {}) {
  const applied = appliedMigrations();
  const pending = migrationFiles(dir).filter((f) => !applied.has(f));
  if (!pending.length) return 0;
  const snapshot = applied.size ? snapshotBeforeMigrate() : null;
  if (snapshot) log(`[migrate] Đã chụp database trước khi chạy: ${snapshot}`);
  let count = 0;
  for (const file of pending) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    try {
      db.transaction(() => {
        db.exec(sql);
        db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
      })();
    } catch (err) {
      const e = new Error(`Migration ${file} lỗi: ${err.message}. Chưa có thay đổi nào của file này được lưu${count ? ` (${count} file trước đó đã chạy xong)` : ''}.${snapshot ? ` Bản chụp trước khi chạy: ${snapshot}` : ''}`);
      e.cause = err; e.migration = file;
      throw e;
    }
    log(`[migrate] Đã chạy ${file}`);
    count++;
  }
  return count;
}

// Chạy nhiều câu lệnh trong 1 transaction: tx(() => { ... })
export const tx = (fn) => db.transaction(fn)();
