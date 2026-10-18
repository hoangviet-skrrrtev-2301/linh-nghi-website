// BẢN XEM THỬ TRÊN VERCEL (đóng gói bằng esbuild thành api/app.bundle.mjs: runtime Vercel không chạy được require() module ESM của sanitize-html)
//  (không dùng cho website thật, xem docs/BAN_GIAO.md phần 8).
// Vercel chạy dạng serverless: ổ đĩa chỉ ghi được ở /tmp và mất khi bản chạy bị thu hồi. Vì vậy mỗi lần khởi động nguội,
// tệp này nạp "gói nội dung" (database/content-pack) vào /tmp rồi chạy đúng ứng dụng Express như thường.
// Hệ quả: xem được giao diện và thử admin, nhưng mọi thứ ghi thêm (đơn, sản phẩm sửa, ảnh tải lên, phiên đăng nhập) có thể mất bất cứ lúc nào.
import crypto from 'node:crypto';
import path from 'node:path';

// Khi đóng gói thành một tệp (api/app.bundle.mjs) thì gốc dự án là thư mục cha của tệp đó
process.env.LN_ROOT ||= path.resolve(import.meta.dirname, '..');
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

