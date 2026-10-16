#!/usr/bin/env bash
# ==========================================================
# CẬP NHẬT CODE MỚI LÊN VPS (sau khi đã upload/ghi đè source code)
#   cd /var/www/linh-nghi && bash deploy/update.sh
# Dữ liệu (database/data, database/uploads) và file .env được giữ nguyên.
# ==========================================================
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Sao lưu trước khi cập nhật"
node backend/scripts/backup.js

echo "==> Cài thư viện"
npm ci

echo "==> Build giao diện"
npm run build

echo "==> Cập nhật cấu trúc database"
npm run migrate

echo "==> Khởi động lại website"
pm2 reload linh-nghi || pm2 start deploy/ecosystem.config.cjs
pm2 save

echo "✔ Cập nhật xong"
