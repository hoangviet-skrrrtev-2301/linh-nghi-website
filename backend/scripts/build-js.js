// Minify JS giao diện khách và JS trang quản trị: nguồn ở frontend/src/js và admin/src/js, kết quả ở frontend/public/js và
// admin/public/js (đúng đường dẫn website đang tải; kết quả đưa lên git như CSS đã build, nên máy chủ / Vercel không cần bước build).
// Chạy: npm run build:js (tự chạy trong npm run build). Sửa file trong thư mục src xong PHẢI chạy lại; tests/build.test.js báo lỗi nếu quên.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// format: 'esm' cho tệp nạp bằng <script type="module"> hoặc import() (được đổi tên biến cấp cao nhất); tệp script thường giữ nguyên cấu trúc
export const ENTRIES = [
  { src: 'frontend/src/js/app.js', out: 'frontend/public/js/app.js', format: 'esm' },
  { src: 'frontend/src/js/order-image.js', out: 'frontend/public/js/order-image.js', format: 'esm' },
  { src: 'admin/src/js/core.js', out: 'admin/public/js/core.js' },
  { src: 'admin/src/js/pages.js', out: 'admin/public/js/pages.js' },
];

const banner = (src) => `/* Tệp được tạo tự động từ ${src}: sửa ở nguồn rồi chạy npm run build:js */\n`;

// Trả về nội dung đã minify của từng tệp (không ghi ra đĩa)
export async function buildAll() {
  const result = {};
  for (const e of ENTRIES) {
    const code = fs.readFileSync(path.join(ROOT, e.src), 'utf8');
    const r = await transform(code, { minify: true, target: 'es2020', legalComments: 'none', charset: 'utf8', sourcefile: e.src, ...(e.format ? { format: e.format } : {}) });
    result[e.out] = banner(e.src) + r.code;
  }
  return result;
}

export function writeAll(built) {
  for (const [out, code] of Object.entries(built)) {
    fs.mkdirSync(path.dirname(path.join(ROOT, out)), { recursive: true });
    fs.writeFileSync(path.join(ROOT, out), code);
  }
}

// Chạy trực tiếp: ghi tệp và in kích thước
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const built = await buildAll();
  writeAll(built);
  for (const e of ENTRIES) {
    const before = fs.statSync(path.join(ROOT, e.src)).size;
    const after = Buffer.byteLength(built[e.out]);
    console.log(`✔ ${e.out}  ${(before / 1024).toFixed(1)} KB → ${(after / 1024).toFixed(1)} KB`);
  }
}
