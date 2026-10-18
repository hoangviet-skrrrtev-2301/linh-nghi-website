// npm run import-content [-- --force] — nạp "gói nội dung" (database/content-pack/) vào máy này.
// Mặc định chỉ chạy khi database còn trống. --force ghi đè nội dung hiện có (tự giữ bản sao lưu trước) và PHẢI tắt website trước.
// Xong thì chạy "npm run migrate" (hoặc khởi động lại website) và "npm run create-admin" nếu chưa có tài khoản.
import { importPack } from '../lib/content-pack.js';

const force = process.argv.includes('--force');
const r = await importPack({ force });
if (!r.ok && r.reason === 'no-pack') {
  console.error('✘ Không có gói nội dung (database/content-pack/content.sqlite). Chạy "npm run export-content" ở máy gốc rồi git pull.');
  process.exit(1);
}
if (!r.ok && r.reason === 'not-empty') {
  console.error('✘ Database của máy này đã có dữ liệu. Muốn ghi đè bằng gói nội dung (có giữ bản sao lưu): npm run import-content -- --force');
  process.exit(1);
}
const { migrate, db } = await import('../lib/db.js');
migrate();
db.close();
console.log('✔ Đã nạp gói nội dung' + (r.info ? ` (tạo lúc ${r.info.createdAt})` : ''));
if (r.safety) console.log(`  Dữ liệu cũ được giữ tại ${r.safety} (khôi phục: npm run restore -- <thư-mục>)`);
console.log('Tiếp theo: npm run create-admin (nếu chưa có tài khoản quản trị), rồi npm run dev');
