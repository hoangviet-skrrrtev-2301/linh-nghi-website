#!/usr/bin/env bash
# ==========================================================
# ĐẨY BẢN SAO LƯU MỚI NHẤT RA DỊCH VỤ LƯU TRỮ NGOÀI SERVER (tùy chọn)
# Bằng rclone: Google Drive, Dropbox, OneDrive, Amazon S3, Cloudflare R2, Backblaze B2...
# Chạy tự động sau mỗi lần sao lưu đêm (cron do setup-vps.sh đặt). Chưa cài rclone hoặc chưa đặt OFFSITE_REMOTE thì bỏ qua, không lỗi.
#
# Cách bật (làm một lần trên VPS, xem docs/BAN_GIAO.md):
#   1) curl https://rclone.org/install.sh | sudo bash
#   2) rclone config            (tạo một "remote", ví dụ tên: gdrive)
#   3) thêm vào file .env:      OFFSITE_REMOTE=gdrive:linh-nghi-backup
#                               OFFSITE_KEEP_DAYS=30     (tùy chọn, số ngày giữ bản cũ trên dịch vụ ngoài)
#   4) thử:                     bash deploy/offsite-backup.sh
# ==========================================================
set -uo pipefail
cd "$(dirname "$0")/.."

# Đọc biến từ .env nếu chưa có trong môi trường
if [[ -z "${OFFSITE_REMOTE:-}" && -f .env ]]; then
  OFFSITE_REMOTE="$(grep -E '^OFFSITE_REMOTE=' .env | tail -1 | cut -d= -f2- | tr -d '\r"' || true)"
  OFFSITE_KEEP_DAYS="${OFFSITE_KEEP_DAYS:-$(grep -E '^OFFSITE_KEEP_DAYS=' .env | tail -1 | cut -d= -f2- | tr -d '\r"' || true)}"
fi
KEEP_DAYS="${OFFSITE_KEEP_DAYS:-30}"

[[ -z "${OFFSITE_REMOTE:-}" ]] && { echo "[offsite] Chưa đặt OFFSITE_REMOTE trong .env, bỏ qua."; exit 0; }
command -v rclone >/dev/null 2>&1 || { echo "[offsite] Chưa cài rclone, bỏ qua."; exit 0; }

latest="$(ls -1 database/backups 2>/dev/null | grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}-' | tail -1 || true)"
[[ -z "$latest" ]] && { echo "[offsite] Chưa có bản sao lưu nào."; exit 1; }

echo "[offsite] $(date '+%F %T') Đẩy $latest lên $OFFSITE_REMOTE"
if rclone copy "database/backups/$latest" "$OFFSITE_REMOTE/$latest" --transfers 2 --retries 3; then
  touch database/backups/.last-offsite
  # Dọn bản cũ trên dịch vụ ngoài (giữ KEEP_DAYS ngày)
  rclone delete "$OFFSITE_REMOTE" --min-age "${KEEP_DAYS}d" --rmdirs >/dev/null 2>&1 || true
  echo "[offsite] Xong."
else
  echo "[offsite] THẤT BẠI. Kiểm tra: rclone lsd $OFFSITE_REMOTE" >&2
  exit 1
fi
