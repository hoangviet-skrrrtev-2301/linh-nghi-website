// Cấu hình PM2: giữ website luôn chạy, tự khởi động lại khi lỗi hoặc khi VPS reboot.
// Dùng: pm2 start deploy/ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'linh-nghi',
      script: 'backend/server.js',
      cwd: __dirname + '/..',
      instances: 1, // SQLite: chạy 1 tiến trình là tốt nhất
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '400M',
      out_file: 'logs/out.log',
      error_file: 'logs/error.log',
      time: true,
      kill_timeout: 10000,
    },
  ],
};
