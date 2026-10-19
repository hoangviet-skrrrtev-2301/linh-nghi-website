// Đọc cấu hình từ file .env và kiểm tra các giá trị bắt buộc.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// LN_ROOT: chỉ dùng cho bản đóng gói một tệp trên Vercel (backend/vercel-entry.js); bình thường để trống
const ROOT = process.env.LN_ROOT ? path.resolve(process.env.LN_ROOT) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const env = process.env;
// LN_DATA_DIR: lưu database + ảnh + font + sao lưu ở thư mục khác (bộ kiểm thử dùng thư mục tạm). Bình thường để trống.
const DATA = env.LN_DATA_DIR ? path.resolve(env.LN_DATA_DIR) : null;
const isProd = env.NODE_ENV === 'production';

function secret(name) {
  const value = env[name];
  if (value && value.length >= 32) return value;
  if (isProd) {
    console.error(`[config] Thiếu ${name} (tối thiểu 32 ký tự) trong file .env. Dừng ứng dụng.`);
    process.exit(1);
  }
  // Chế độ phát triển: sinh khóa cố định theo máy để không phải cấu hình ngay.
  console.warn(`[config] ${name} chưa được đặt, đang dùng khóa tạm cho môi trường dev.`);
  return crypto.createHash('sha256').update(`dev-${name}-${ROOT}`).digest('hex');
}

function normalizeAdminPath(p) {
  let value = (p || '/admin').trim();
  if (!value.startsWith('/')) value = '/' + value;
  return value.replace(/\/+$/, '') || '/admin';
}

export const config = {
  root: ROOT,
  isProd,
  port: Number(env.PORT) || 3000,
  baseUrl: (env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  adminPath: normalizeAdminPath(env.ADMIN_PATH),
  sessionSecret: secret('SESSION_SECRET'),
  appSecret: secret('APP_SECRET'),
  // Tự chạy migration khi server khởi động: bật mặc định khi dev, TẮT mặc định ở production (phải chạy `npm run migrate`,
  // deploy/update.sh đã làm). Đặt AUTO_MIGRATE=1 / 0 để đổi.
  autoMigrate: env.AUTO_MIGRATE !== undefined && env.AUTO_MIGRATE !== '' ? !['0', 'false', 'no'].includes(String(env.AUTO_MIGRATE).toLowerCase()) : !isProd,
  sessionHours: Number(env.SESSION_HOURS) || 8,
  uploadMaxMb: Number(env.UPLOAD_MAX_MB) || 10,
  paths: {
    frontendViews: path.join(ROOT, 'frontend/views'),
    frontendPublic: path.join(ROOT, 'frontend/public'),
    adminViews: path.join(ROOT, 'admin/views'),
    adminPublic: path.join(ROOT, 'admin/public'),
    database: DATA ? path.join(DATA, 'app.sqlite') : path.join(ROOT, 'database/data/app.sqlite'),
    migrations: path.join(ROOT, 'database/migrations'),
    seeds: path.join(ROOT, 'database/seeds'),
    uploads: DATA ? path.join(DATA, 'uploads') : path.join(ROOT, 'database/uploads'),
    fonts: DATA ? path.join(DATA, 'fonts') : path.join(ROOT, 'database/data/fonts'),
    backups: DATA ? path.join(DATA, 'backups') : path.join(ROOT, 'database/backups'),
    nodeModules: path.join(ROOT, 'node_modules'),
  },
};
