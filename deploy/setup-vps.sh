#!/usr/bin/env bash
# ==========================================================
# CÀI ĐẶT WEBSITE LÊN VPS UBUNTU 22.04 / 24.04 (chạy 1 lần duy nhất)
#
# Cách dùng (trên VPS, với quyền root):
#   cd /var/www/linh-nghi
#   sudo bash deploy/setup-vps.sh tenmien.vn email-cua-ban@gmail.com
#
# Script sẽ: cài Node.js 24, Nginx, PM2, tường lửa, SSL miễn phí (Let's Encrypt),
# tạo file .env với khóa bí mật ngẫu nhiên, build giao diện, tạo database,
# hẹn giờ sao lưu tự động mỗi đêm.
# ==========================================================
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_USER="${SUDO_USER:-root}"

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
  echo "Cách dùng: sudo bash deploy/setup-vps.sh tenmien.vn email@gmail.com"
  exit 1
fi
if [[ $EUID -ne 0 ]]; then echo "Vui lòng chạy bằng sudo"; exit 1; fi

step() { echo -e "\n\033[1;32m==> $1\033[0m"; }

step "Cập nhật hệ thống"
apt-get update -y
apt-get upgrade -y
apt-get install -y curl ca-certificates gnupg build-essential python3 ufw nginx certbot python3-certbot-nginx

step "Cài Node.js 24 LTS"
if ! command -v node >/dev/null || [[ "$(node -v | cut -d. -f1)" != "v24" ]]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
node -v
npm install -g pm2

step "Tường lửa: chỉ mở SSH, HTTP, HTTPS"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

step "Tạo file .env"
cd "$APP_DIR"
if [[ ! -f .env ]]; then
  cp .env.example .env
  RAND_ADMIN="/quan-tri-$(openssl rand -hex 4)"
  sed -i "s|^NODE_ENV=.*|NODE_ENV=production|" .env
  sed -i "s|^BASE_URL=.*|BASE_URL=https://$DOMAIN|" .env
  sed -i "s|^ADMIN_PATH=.*|ADMIN_PATH=$RAND_ADMIN|" .env
  sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=$(openssl rand -hex 32)|" .env
  sed -i "s|^APP_SECRET=.*|APP_SECRET=$(openssl rand -hex 32)|" .env
  chmod 600 .env
  echo "Đã tạo .env. Đường dẫn trang quản trị: https://$DOMAIN$RAND_ADMIN"
else
  echo ".env đã tồn tại, giữ nguyên."
fi

step "Cài thư viện và build giao diện"
mkdir -p logs database/data database/uploads database/backups
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
sudo -u "$APP_USER" npm ci
sudo -u "$APP_USER" npm run build
sudo -u "$APP_USER" npm run migrate

step "Cấu hình Nginx"
sed -e "s|TEN_MIEN|$DOMAIN|g" -e "s|APP_DIR|$APP_DIR|g" deploy/nginx.conf > /etc/nginx/sites-available/linh-nghi
ln -sf /etc/nginx/sites-available/linh-nghi /etc/nginx/sites-enabled/linh-nghi
rm -f /etc/nginx/sites-enabled/default
# Cho Nginx đọc thư mục ảnh
chmod o+x "$APP_DIR" "$APP_DIR/database"
chmod -R o+rX "$APP_DIR/database/uploads"
nginx -t
systemctl reload nginx

step "Chạy website bằng PM2 (tự khởi động khi VPS reboot)"
sudo -u "$APP_USER" pm2 start deploy/ecosystem.config.cjs
sudo -u "$APP_USER" pm2 save
env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$APP_USER" --hp "$(eval echo ~"$APP_USER")"

step "Cài SSL miễn phí (https)"
if certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect; then
  echo "SSL OK"
else
  echo "⚠ Chưa cài được SSL. Kiểm tra tên miền đã trỏ về IP VPS chưa, rồi chạy lại:"
  echo "   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

step "Sao lưu tự động lúc 3 giờ sáng mỗi ngày"
CRON="0 3 * * * cd $APP_DIR && /usr/bin/node backend/scripts/backup.js >> logs/backup.log 2>&1; bash deploy/offsite-backup.sh >> logs/backup.log 2>&1"
( crontab -u "$APP_USER" -l 2>/dev/null | grep -v 'backup.js' ; echo "$CRON" ) | crontab -u "$APP_USER" -

echo -e "\n\033[1;32m✔ HOÀN TẤT!\033[0m"
echo "Website:      https://$DOMAIN"
echo "Trang admin:  https://$DOMAIN$(grep ^ADMIN_PATH .env | cut -d= -f2)"
echo ""
echo "BƯỚC CUỐI: tạo tài khoản quản trị bằng lệnh:"
echo "   cd $APP_DIR && npm run create-admin"
