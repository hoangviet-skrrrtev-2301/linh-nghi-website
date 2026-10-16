// npm run migrate — tạo/cập nhật cấu trúc database
import { migrate } from '../lib/db.js';

const n = migrate();
console.log(n ? `Hoàn tất, đã chạy ${n} migration.` : 'Database đã ở phiên bản mới nhất.');
