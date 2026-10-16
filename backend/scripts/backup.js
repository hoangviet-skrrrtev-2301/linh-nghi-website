// npm run backup — sao lưu database + ảnh vào database/backups, giữ lại 14 bản gần nhất.
// Trên VPS được chạy tự động mỗi đêm bằng cron (xem deploy/setup-vps.sh).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { db } from '../lib/db.js';
import { config } from '../config/index.js';

const KEEP = Number(process.env.BACKUP_KEEP) || 14;
const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
const dir = path.join(config.paths.backups, stamp);
fs.mkdirSync(dir, { recursive: true });

await db.backup(path.join(dir, 'app.sqlite'));
console.log(`✔ Database -> ${dir}/app.sqlite`);

// Nén thư mục ảnh (dùng tar có sẵn trên Linux/macOS và Windows 10+).
// Trên Windows dùng tar.exe của hệ thống (tar của Git Bash hiểu sai đường dẫn "D:\...").
const winTar = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
const TAR = process.platform === 'win32' && fs.existsSync(winTar) ? winTar : 'tar';
try {
  const base = path.dirname(config.paths.uploads);
  execFileSync(TAR, ['-czf', path.relative(base, path.join(dir, 'uploads.tar.gz')), path.basename(config.paths.uploads)], { cwd: base });
  console.log(`✔ Ảnh -> ${dir}/uploads.tar.gz`);
} catch (err) {
  console.warn('⚠ Không nén được thư mục ảnh:', err.message);
}

const all = fs.readdirSync(config.paths.backups, { withFileTypes: true })
  .filter((d) => d.isDirectory()).map((d) => d.name).sort();
for (const old of all.slice(0, Math.max(0, all.length - KEEP))) {
  fs.rmSync(path.join(config.paths.backups, old), { recursive: true, force: true });
  console.log(`  Xóa bản cũ: ${old}`);
}
db.close();
