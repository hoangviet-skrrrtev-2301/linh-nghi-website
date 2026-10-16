// Điểm khởi chạy: node backend/server.js (hoặc npm start)
import { config } from './config/index.js';
import { migrate, db } from './lib/db.js';
import { createApp } from './app.js';

migrate();

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
