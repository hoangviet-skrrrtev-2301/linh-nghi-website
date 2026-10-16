// npm run restore -- <thư-mục-sao-lưu>
// Khôi phục database + ảnh từ một bản sao lưu (tạo bởi "npm run backup").
// Dùng để: chuyển dữ liệu sang máy khác / VPS khác, hoặc quay lại dữ liệu cũ.
// ⚠ Hãy TẮT website trước khi chạy (Ctrl+C với npm run dev, hoặc "pm2 stop linh-nghi" trên VPS).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { config } from '../config/index.js';

const src = process.argv[2];
if (!src) {
  console.log('Cách dùng: npm run restore -- duong/dan/thu-muc-sao-luu');
  console.log('Thư mục sao lưu chứa file app.sqlite (và uploads.tar.gz nếu có).');
  const list = fs.existsSync(config.paths.backups) ? fs.readdirSync(config.paths.backups).filter((d) => !d.startsWith('.')) : [];
  if (list.length) console.log('\nCác bản sao lưu hiện có:\n  ' + list.map((d) => path.join('database/backups', d)).join('\n  '));
  process.exit(1);
}

const dir = path.resolve(src);
const dbFile = fs.existsSync(path.join(dir, 'app.sqlite')) ? path.join(dir, 'app.sqlite') : (dir.endsWith('.sqlite') ? dir : null);
if (!dbFile || !fs.existsSync(dbFile)) {
  console.error(`✘ Không tìm thấy app.sqlite trong ${dir}`);
  process.exit(1);
}
const uploadsTar = path.join(path.dirname(dbFile), 'uploads.tar.gz');

// Giữ lại dữ liệu hiện tại phòng khi cần quay lại
const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
const safety = path.join(config.paths.backups, `truoc-khi-khoi-phuc-${stamp}`);
fs.mkdirSync(safety, { recursive: true });
if (fs.existsSync(config.paths.database)) fs.copyFileSync(config.paths.database, path.join(safety, 'app.sqlite'));
console.log(`• Đã giữ bản dữ liệu hiện tại tại: ${safety}`);

fs.mkdirSync(path.dirname(config.paths.database), { recursive: true });
for (const ext of ['', '-wal', '-shm']) fs.rmSync(config.paths.database + ext, { force: true });
fs.copyFileSync(dbFile, config.paths.database);
console.log('✔ Đã khôi phục database');

if (fs.existsSync(uploadsTar)) {
  // Trên Windows dùng tar.exe của hệ thống (tar của Git Bash hiểu sai đường dẫn "D:\...")
  const winTar = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
  const TAR = process.platform === 'win32' && fs.existsSync(winTar) ? winTar : 'tar';
  execFileSync(TAR, ['-xzf', uploadsTar], { cwd: path.dirname(config.paths.uploads) });
  console.log('✔ Đã khôi phục thư mục ảnh');
} else {
  console.log('• Không có uploads.tar.gz, bỏ qua phần ảnh (copy thủ công thư mục database/uploads nếu cần)');
}
console.log('\nXong. Chạy "npm run migrate" rồi khởi động lại website.');
console.log('Lưu ý: nếu file .env của máy này khác máy cũ (APP_SECRET khác), cần nhập lại mật khẩu email SMTP và bật lại 2FA.');
