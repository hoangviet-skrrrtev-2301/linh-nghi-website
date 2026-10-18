// npm run bootstrap — cài đặt máy mới bằng MỘT lệnh (sau khi đã chạy "npm install"):
//   1. kiểm tra phiên bản Node          2. tạo file .env nếu chưa có
//   3. tạo database + chạy migration    4. nạp "gói nội dung" (hoặc dữ liệu mẫu) nếu database còn trống
//   5. tạo tài khoản Chủ shop (mật khẩu ngẫu nhiên, in ra một lần) nếu chưa có tài khoản nào
// Chạy lại nhiều lần vẫn an toàn: dữ liệu đã có thì không bị ghi đè.
// Tùy chọn: --email a@b.vn --password MatKhau12345 --seed (dùng dữ liệu mẫu thay vì gói nội dung) --no-admin
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const flag = (name) => process.argv.includes(`--${name}`);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const step = (n, text) => console.log(`\n[${n}] ${text}`);

// 1) Node
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 12)) {
  console.error(`✘ Cần Node.js từ 22.12 trở lên (máy này đang là ${process.versions.node}). Tải bản LTS tại https://nodejs.org`);
  process.exit(1);
}
step(1, `Node.js ${process.versions.node} đạt yêu cầu`);

// 2) .env
const envFile = path.join(ROOT, '.env');
if (!fs.existsSync(envFile)) {
  fs.copyFileSync(path.join(ROOT, '.env.example'), envFile);
  step(2, 'Đã tạo file .env từ .env.example (máy cá nhân không cần điền khóa bảo mật, website tự dùng khóa tạm)');
} else step(2, 'File .env đã có, giữ nguyên');

// 3) CSS (đã có sẵn trên GitHub; chỉ build nếu thiếu)
if (!fs.existsSync(path.join(ROOT, 'frontend/public/css/app.css')) || !fs.existsSync(path.join(ROOT, 'admin/public/css/admin.css'))) {
  step(3, 'Chưa có CSS, đang build...');
  execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build:css'], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
} else step(3, 'CSS giao diện đã có sẵn');

// 4) Database + nội dung
const { packExists, importPack, packInfo } = await import('../lib/content-pack.js');
const { config } = await import('../config/index.js');
let hasData = false;
if (fs.existsSync(config.paths.database)) {
  const Database = (await import('better-sqlite3')).default;
  const d = new Database(config.paths.database, { readonly: true });
  const tbl = (t) => !!d.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(t);
  hasData = (tbl('products') && d.prepare('SELECT COUNT(*) FROM products').pluck().get() > 0) || (tbl('users') && d.prepare('SELECT COUNT(*) FROM users').pluck().get() > 0);
  d.close();
}
if (hasData) {
  step(4, 'Database đã có dữ liệu, giữ nguyên (muốn nạp lại gói nội dung: npm run import-content -- --force)');
} else if (packExists() && !flag('seed')) {
  const r = await importPack({ force: true });
  step(4, `Đã nạp gói nội dung từ GitHub${r.info ? ` (tạo lúc ${r.info.createdAt})` : ''}: sản phẩm, ảnh, bài viết, cài đặt`);
}
const { migrate, db } = await import('../lib/db.js');
const applied = migrate({ log: () => {} });
if (!hasData && (!packExists() || flag('seed'))) {
  step(4, 'Không có gói nội dung, đang tạo dữ liệu mẫu...');
  execFileSync(process.execPath, [path.join(ROOT, 'backend/scripts/seed.js')], { cwd: ROOT, stdio: 'inherit' });
}
console.log(`    Database sẵn sàng${applied ? ` (đã chạy ${applied} migration mới)` : ''}`);

// 5) Tài khoản quản trị
let credentials = null;
if (!flag('no-admin')) {
  const users = db.prepare('SELECT COUNT(*) FROM users').pluck().get();
  if (users === 0) {
    const { createUser } = await import('../services/users.js');
    const email = arg('email') || 'admin@linhnghi.local';
    const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const random = Array.from(crypto.randomBytes(14), (b) => alphabet[b % alphabet.length]).join('');
    const password = arg('password') || `${random}7`;
    await createUser({ email, name: 'Chủ shop', password, role: 'owner' });
    credentials = { email, password };
    step(5, 'Đã tạo tài khoản Chủ shop');
  } else step(5, 'Đã có tài khoản quản trị, không tạo thêm (quên mật khẩu: npm run create-admin)');
}
db.close();

const info = packInfo();
console.log('\n══════════════════════════════════════════════');
console.log(' CÀI ĐẶT XONG. Khởi động website bằng:  npm run dev');
console.log(` Website:     ${config.baseUrl}`);
console.log(` Trang admin: ${config.baseUrl}${config.adminPath}`);
if (credentials) {
  console.log(` Email:       ${credentials.email}`);
  console.log(` Mật khẩu:    ${credentials.password}   <-- ghi lại ngay, chỉ hiện một lần`);
  console.log(' (đổi mật khẩu ở góc trên bên phải › Tài khoản & bảo mật; quên thì chạy: npm run create-admin)');
}
if (info) console.log(` Nội dung lấy từ gói bàn giao tạo lúc ${info.createdAt}`);
console.log('══════════════════════════════════════════════');
