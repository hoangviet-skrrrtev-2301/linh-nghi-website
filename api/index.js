// BẢN XEM THỬ TRÊN VERCEL (không dùng cho website thật, xem docs/BAN_GIAO.md phần 8).
// Vercel chạy dạng serverless: ổ đĩa chỉ ghi được ở /tmp và mất khi bản chạy bị thu hồi. Vì vậy mỗi lần khởi động nguội,
// tệp này nạp "gói nội dung" (database/content-pack) vào /tmp rồi chạy đúng ứng dụng Express như thường.
// Hệ quả: xem được giao diện và thử admin, nhưng mọi thứ ghi thêm (đơn, sản phẩm sửa, ảnh tải lên, phiên đăng nhập) có thể mất bất cứ lúc nào.
import crypto from 'node:crypto';
import fs from 'node:fs';

process.env.NODE_ENV ||= 'production';
process.env.LN_DATA_DIR ||= '/tmp/linh-nghi';
process.env.LN_NO_FONTS = '1';   // không tải font về ổ đĩa tạm, dùng link Google
const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
if (!process.env.BASE_URL && host) process.env.BASE_URL = `https://${host}`;
// Khóa phiên / mã hóa: nên đặt SESSION_SECRET và APP_SECRET trong Vercel; nếu chưa có thì suy ra từ mã dự án (chỉ chấp nhận cho bản xem thử)
for (const name of ['SESSION_SECRET', 'APP_SECRET']) {
  if (!process.env[name] || process.env[name].length < 32) {
    process.env[name] = crypto.createHash('sha256').update(`preview-${name}-${process.env.VERCEL_PROJECT_ID || 'local'}`).digest('hex');
  }
}

const { config } = await import('../backend/config/index.js');
const { importPack } = await import('../backend/lib/content-pack.js');
if (!fs.existsSync(config.paths.database)) {
  const r = await importPack({ force: true });
  if (!r.ok) console.error('[vercel] Không nạp được gói nội dung:', r.reason);
}
const { migrate, db } = await import('../backend/lib/db.js');
migrate({ log: () => {} });

// Tài khoản admin thử: chỉ tạo khi đặt PREVIEW_ADMIN_EMAIL và PREVIEW_ADMIN_PASSWORD (tối thiểu 12 ký tự) trong Vercel
const email = process.env.PREVIEW_ADMIN_EMAIL;
const password = process.env.PREVIEW_ADMIN_PASSWORD;
if (email && password && !db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
  const users = await import('../backend/services/users.js');
  await users.createUser({ email, password, name: 'Quản trị xem thử', role: 'owner' });
}

const { createApp } = await import('../backend/app.js');
export default createApp();
