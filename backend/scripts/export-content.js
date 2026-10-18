// npm run export-content — tạo "gói nội dung" sạch trong database/content-pack/ để commit lên GitHub và bàn giao.
// Gói có sản phẩm, ảnh, bài viết, cài đặt... nhưng KHÔNG có tài khoản, khách hàng, đơn hàng, nhật ký, mật khẩu email.
import { exportPack, PACK_DIR } from '../lib/content-pack.js';

try {
  const { counts, files } = exportPack();
  console.log(`\n✔ Đã tạo gói nội dung tại ${PACK_DIR}`);
  console.log('  Gồm: ' + Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ') + `, ${files} file ảnh`);
  console.log('  Không chứa: tài khoản quản trị, khách hàng, đơn hàng, nhật ký, cấu hình email.');
  console.log('\nBước tiếp theo:  git add database/content-pack && git commit -m "Cập nhật gói nội dung" && git push');
  console.log('Máy khác sau khi git pull: npm run import-content -- --force  (ghi đè nội dung trên máy đó, tự giữ bản sao lưu).');
} catch (err) {
  console.error('✘ ' + err.message);
  process.exit(1);
}
