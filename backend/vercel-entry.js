// BẢN XEM THỬ TRÊN VERCEL (đóng gói bằng esbuild thành api/app.bundle.mjs: runtime Vercel không chạy được require() module ESM của sanitize-html)
//  (không dùng cho website thật, xem docs/BAN_GIAO.md phần 8).
// Vercel chạy dạng serverless: ổ đĩa chỉ ghi được ở /tmp và mất khi bản chạy bị thu hồi. Vì vậy mỗi lần khởi động nguội,
// tệp này nạp "gói nội dung" (database/content-pack) vào /tmp rồi chạy đúng ứng dụng Express như thường.
// Hệ quả: xem được giao diện và thử admin, nhưng mọi thứ ghi thêm (đơn, sản phẩm sửa, ảnh tải lên, phiên đăng nhập) có thể mất bất cứ lúc nào.
// Thứ tự nạp quan trọng: biến môi trường → đặt database vào /tmp → mở database → ứng dụng.
import './vercel-env.js';
import './vercel-prepare.js';
import { migrate, db } from './lib/db.js';
import { createUser } from './services/users.js';
import { createApp } from './app.js';

migrate({ log: () => {} });

// Tài khoản admin thử: chỉ tạo khi đặt PREVIEW_ADMIN_EMAIL và PREVIEW_ADMIN_PASSWORD trong Vercel
const email = process.env.PREVIEW_ADMIN_EMAIL;
const password = process.env.PREVIEW_ADMIN_PASSWORD;
if (email && password && !db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
  await createUser({ email, password, name: 'Quản trị xem thử', role: 'owner' });
}

export default createApp();
