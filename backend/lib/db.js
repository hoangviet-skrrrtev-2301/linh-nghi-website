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

export function migrate({ log = console.log } = {}) {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  const applied = new Set(db.prepare('SELECT name FROM _migrations').pluck().all());
  const files = fs.readdirSync(config.paths.migrations).filter((f) => f.endsWith('.sql')).sort();
  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(config.paths.migrations, file), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
    })();
    log(`[migrate] Đã chạy ${file}`);
    count++;
  }
  return count;
}

// Chạy nhiều câu lệnh trong 1 transaction: tx(() => { ... })
export const tx = (fn) => db.transaction(fn)();
