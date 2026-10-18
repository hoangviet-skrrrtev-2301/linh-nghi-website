#!/usr/bin/env bash
# Chạy thử website trên macOS / Linux:  bash chay-thu.sh
# Tự động: cài thư viện (lần đầu), tạo .env, tạo database, nạp nội dung bàn giao, tạo tài khoản admin, rồi khởi động.
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Chưa cài Node.js. Tải bản LTS tại https://nodejs.org rồi chạy lại."
  exit 1
fi
[ -d node_modules ] || { echo "Đang cài thư viện, lần đầu có thể mất vài phút..."; npm install; }
npm run bootstrap
echo
echo "Đang khởi động website. Để tắt, bấm Ctrl + C."
npm run dev
