// npm run pull-backup — chép bản sao lưu MỚI NHẤT từ server về máy riêng của bạn (chạy trên máy tính, không chạy trên server).
// Bản sao lưu trên server (tạo mỗi đêm bởi cron) nằm chung ổ đĩa với website: ổ hỏng là mất cả hai. Lệnh này giữ thêm một bản ở nơi khác.
//
// Dùng:
//   npm run pull-backup -- --server root@IP --path /var/www/linh-nghi --to D:\SaoLuuLinhNghi --save   (lần đầu: nhập và LƯU cấu hình)
//   npm run pull-backup                                                                                  (các lần sau: đọc cấu hình đã lưu)
// Tùy chọn: --keep 30 (số bản giữ lại), --port 22, --key đường/dẫn/khóa-ssh,
//           --from-local thư-mục-backups (chép từ thư mục trên cùng máy / ổ mạng / USB thay vì qua SSH, dùng để thử)
// Yêu cầu: OpenSSH (ssh, scp) có sẵn trên Windows 10+, macOS, Linux; đăng nhập SSH bằng KHÓA (không hỏi mật khẩu). Xem docs/BAN_GIAO.md.
// Đặt lịch chạy mỗi ngày: Windows chạy deploy/dat-lich-tai-sao-luu.ps1; macOS / Linux dùng cron (xem tài liệu).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CONFIG_FILE = path.join(ROOT, '.pull-backup.json');
const STAMP = /^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}/;

const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
let saved = {};
try { saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch { /* chưa có cấu hình */ }
const cfg = {
  server: arg('server') ?? saved.server,
  path: arg('path') ?? saved.path ?? '/var/www/linh-nghi',
  to: arg('to') ?? saved.to ?? path.join(os.homedir(), 'SaoLuuLinhNghi'),
  keep: Number(arg('keep') ?? saved.keep ?? 30),
  port: arg('port') ?? saved.port,
  key: arg('key') ?? saved.key,
  fromLocal: arg('from-local'),
};
if (argv.includes('--save')) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ server: cfg.server, path: cfg.path, to: cfg.to, keep: cfg.keep, port: cfg.port, key: cfg.key }, null, 2));
  console.log(`✔ Đã lưu cấu hình vào ${CONFIG_FILE} (file này không đưa lên GitHub)`);
}

fs.mkdirSync(cfg.to, { recursive: true });
const logFile = path.join(cfg.to, 'pull-backup.log');
const log = (m) => { const line = `[${new Date().toLocaleString('vi-VN')}] ${m}`; console.log(line); try { fs.appendFileSync(logFile, line + '\n'); } catch { /* bỏ qua */ } };
const fail = (m) => { log('✘ ' + m); process.exit(1); };

if (!cfg.fromLocal && !cfg.server) {
  console.error('Chưa có địa chỉ server. Chạy lần đầu: npm run pull-backup -- --server root@IP --path /var/www/linh-nghi --to D:\\SaoLuuLinhNghi --save');
  process.exit(1);
}

const sshOpts = ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=25', '-o', 'StrictHostKeyChecking=accept-new', ...(cfg.key ? ['-i', cfg.key] : [])];
const ssh = (cmd) => execFileSync('ssh', [...sshOpts, ...(cfg.port ? ['-p', cfg.port] : []), cfg.server, cmd], { encoding: 'utf8', timeout: 60000 });
const backupsDir = `${cfg.path.replace(/\/+$/, '')}/database/backups`;

// 1) Tìm bản mới nhất
let latest;
try {
  const names = cfg.fromLocal ? fs.readdirSync(path.resolve(cfg.fromLocal)) : ssh(`ls -1 ${backupsDir}`).split(/\r?\n/);
  latest = names.map((s) => s.trim()).filter((s) => STAMP.test(s)).sort().at(-1);
} catch (e) {
  fail(`Không kết nối / đọc được bản sao lưu trên server: ${String(e.message).split('\n')[0]}. Kiểm tra SSH bằng khóa: ssh ${cfg.server}`);
}
if (!latest) fail('Server chưa có bản sao lưu nào (cron sao lưu chạy lúc 3 giờ sáng, xem logs/backup.log trên server).');

const dest = path.join(cfg.to, latest);
const marker = path.join(dest, '.complete');

// 2) Tải về (nếu chưa có bản đầy đủ)
if (fs.existsSync(marker)) {
  log(`Bản ${latest} đã có đầy đủ ở ${dest}, không tải lại.`);
} else {
  fs.rmSync(dest, { recursive: true, force: true }); // bản dang dở của lần trước
  try {
    if (cfg.fromLocal) fs.cpSync(path.join(path.resolve(cfg.fromLocal), latest), dest, { recursive: true });
    else {
      // chạy trong thư mục đích và dùng đường dẫn tương đối ("." ) để tránh scp hiểu "D:\..." là tên máy
      execFileSync('scp', ['-r', '-B', ...sshOpts.slice(2), ...(cfg.port ? ['-P', cfg.port] : []), `${cfg.server}:${backupsDir}/${latest}`, '.'], { cwd: cfg.to, stdio: 'pipe', timeout: 30 * 60 * 1000 });
    }
  } catch (e) {
    fs.rmSync(dest, { recursive: true, force: true });
    fail(`Tải bản ${latest} thất bại: ${String(e.stderr || e.message).split('\n')[0]}`);
  }
  // 3) Kiểm tra: database mở được và nguyên vẹn, có file ảnh
  const dbFile = path.join(dest, 'app.sqlite');
  if (!fs.existsSync(dbFile) || fs.statSync(dbFile).size < 4096) { fs.rmSync(dest, { recursive: true, force: true }); fail(`Bản ${latest} thiếu hoặc hỏng app.sqlite.`); }
  let products = 0;
  try {
    const d = new Database(dbFile, { readonly: true });
    const ok = d.pragma('integrity_check', { simple: true });
    try { products = d.prepare('SELECT COUNT(*) FROM products').pluck().get(); } catch { /* chưa có bảng */ }
    d.close();
    if (ok !== 'ok') throw new Error(`integrity_check: ${ok}`);
  } catch (e) { fs.rmSync(dest, { recursive: true, force: true }); fail(`Database của bản ${latest} không hợp lệ: ${e.message}`); }
  const tar = path.join(dest, 'uploads.tar.gz');
  const hasImages = fs.existsSync(tar) && fs.statSync(tar).size > 0;
  fs.writeFileSync(marker, JSON.stringify({ pulledAt: new Date().toISOString(), products, hasImages }));
  const mb = (f) => (fs.existsSync(f) ? (fs.statSync(f).size / 1048576).toFixed(1) : '0');
  log(`✔ Đã tải bản ${latest} về ${dest} (database ${mb(dbFile)} MB, ${products} sản phẩm; ảnh ${hasImages ? mb(tar) + ' MB' : 'KHÔNG CÓ file ảnh'}).`);
  if (!hasImages) log('⚠ Bản sao lưu không có uploads.tar.gz: ảnh chưa được sao lưu.');
}

// 4) Giữ N bản mới nhất
const complete = fs.readdirSync(cfg.to).filter((n) => STAMP.test(n) && fs.existsSync(path.join(cfg.to, n, '.complete'))).sort();
for (const old of complete.slice(0, Math.max(0, complete.length - Math.max(cfg.keep, 1)))) {
  fs.rmSync(path.join(cfg.to, old), { recursive: true, force: true });
  log(`  Xóa bản cũ: ${old}`);
}

// 5) Ghi dấu lên server để trang Tổng quan biết đã có bản chép ra ngoài
if (!cfg.fromLocal) {
  try { ssh(`touch ${backupsDir}/.last-pull`); } catch { /* không bắt buộc */ }
}
log(`Xong. Đang giữ ${Math.min(complete.length, cfg.keep)} bản trong ${cfg.to}. Khôi phục: npm run restore -- "${dest}"`);
