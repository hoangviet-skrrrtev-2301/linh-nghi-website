// Điểm khởi chạy: node backend/server.js (hoặc npm start)
import { config } from './config/index.js';
import { migrate, pendingMigrations, db } from './lib/db.js';
import { createApp } from './app.js';
import { ensureFonts } from './services/fonts.js';
import { getPublicSettings } from './services/settings.js';

try {
  if (config.autoMigrate) migrate();
  else {
    const pending = pendingMigrations();
    if (pending.length) {
      console.error(`\n[migrate] Database chưa cập nhật: còn ${pending.length} migration chưa chạy (${pending.join(', ')}).\n` +
        '  Chạy: npm run backup && npm run migrate, rồi khởi động lại.\n  (Hoặc đặt AUTO_MIGRATE=1 trong .env để server tự chạy khi khởi động.)\n');
      process.exit(1);
    }
  }
} catch (err) {
  console.error(`\n[migrate] ${err.message}\n  Server không khởi động để tránh chạy trên database chưa cập nhật đủ. Gửi dòng lỗi này cho người phụ trách kỹ thuật.\n`);
  process.exit(1);
}

// Tự lưu font đang dùng về máy chủ (chạy nền, không chặn khởi động)
ensureFonts([getPublicSettings().theme.font_heading, getPublicSettings().theme.font_body]);

const userCount = db.prepare('SELECT COUNT(*) FROM users').pluck().get();
const app = createApp();

// Production: chỉ nghe nội bộ (Nginx đứng trước). Dev: nghe cả IPv4/IPv6 để "localhost" luôn vào được.
const host = config.isProd ? '127.0.0.1' : undefined;
const server = app.listen(config.port, host, () => {
  console.log(`\n  Website:      ${config.baseUrl}`);
  console.log(`  Trang admin:  ${config.baseUrl}${config.adminPath}`);
  console.log(`  Chế độ:       ${config.isProd ? 'production' : 'development'}\n`);
  if (!userCount) console.log('  ⚠ Chưa có tài khoản quản trị. Chạy: npm run create-admin\n');
});

function shutdown(signal) {
  console.log(`[server] Nhận ${signal}, đang dừng...`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
