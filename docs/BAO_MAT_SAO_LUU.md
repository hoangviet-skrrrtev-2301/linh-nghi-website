# Bảo mật, sao lưu và vận hành

## Các lớp bảo mật đã có sẵn

| Lớp bảo vệ | Mô tả |
|---|---|
| Mật khẩu | Băm bằng scrypt, không ai đọc được, kể cả người quản trị server |
| Chống dò mật khẩu | Khóa tài khoản 15 phút sau 5 lần sai, giới hạn 10 lần thử/15 phút mỗi IP |
| Xác thực 2 bước | Mã 6 số từ Google Authenticator (tùy chọn, khuyên bật) |
| Đường dẫn admin bí mật | Ngẫu nhiên, không xuất hiện trên website và sitemap |
| Phiên đăng nhập | Cookie httpOnly, chỉ gửi qua https, tạo lại sau khi đăng nhập, tự hết hạn sau 8 giờ |
| CSRF | Mọi thao tác thay đổi dữ liệu trong admin đều cần mã xác thực |
| Phân quyền | Chủ shop / Nhân viên, kiểm tra ở phía server |
| Dữ liệu nhạy cảm | Mật khẩu email SMTP và mã 2FA được mã hóa AES-256 trong database |
| Chống chèn mã độc (XSS) | Nội dung soạn thảo được lọc, toàn bộ dữ liệu hiển thị được escape, có Content Security Policy |
| Chống SQL injection | 100% câu lệnh database dùng tham số |
| Upload ảnh | Chỉ nhận ảnh thật (được giải mã và nén lại), không nhận SVG/file khác, xóa EXIF/GPS |
| Form công khai | Chống spam: giới hạn 6 lần/10 phút mỗi IP, ô bẫy bot, mã thời gian ký số, kiểm tra nguồn gửi |
| Giá đơn hàng | Server tự tính lại từ database, không tin dữ liệu trình duyệt gửi lên |
| Header bảo mật | HSTS, chống nhúng iframe, chống đoán kiểu file, ẩn thông tin server |
| VPS | Tường lửa chỉ mở cổng 22, 80, 443; ứng dụng chỉ lắng nghe nội bộ sau Nginx |
| Nhật ký | Ghi lại mọi thao tác quản trị |

## Việc cần làm định kỳ

**Ngay sau khi cài đặt:**
- [ ] Bật xác thực 2 bước cho tài khoản Chủ shop
- [ ] Đổi mật khẩu root VPS thành mật khẩu mạnh (lệnh `passwd`), hoặc tốt hơn là dùng SSH key
- [ ] Lưu file `.env` ở nơi an toàn (USB, trình quản lý mật khẩu). Mất `APP_SECRET` sẽ phải nhập lại mật khẩu email và cài lại 2FA

**Mỗi tháng:**
- [ ] Tải 1 bản sao lưu về máy (Cài đặt › Tải bản sao lưu, hoặc copy thư mục `database/backups` bằng WinSCP)
- [ ] Cập nhật bảo mật cho VPS: `sudo apt update && sudo apt upgrade -y`
- [ ] Xem Nhật ký hoạt động xem có đăng nhập lạ không

**Khi nhân viên nghỉ việc:** khóa tài khoản ngay trong Tài khoản quản trị.

## Sao lưu

**Tự động:** mỗi đêm lúc 3 giờ, hệ thống sao lưu database và toàn bộ ảnh vào `/var/www/linh-nghi/database/backups/<ngày-giờ>/`, giữ 14 bản gần nhất.

**Thủ công:**
- Trong admin: Cài đặt website › **Tải bản sao lưu** (chỉ database, file `.sqlite`)
- Trên VPS: `cd /var/www/linh-nghi && npm run backup`

> ⚠ Bản sao lưu nằm cùng VPS sẽ mất nếu VPS hỏng. Hãy định kỳ tải về máy hoặc lưu lên Google Drive.

## Khôi phục dữ liệu

```bash
cd /var/www/linh-nghi
pm2 stop linh-nghi
ls database/backups/                                  # xem các bản sao lưu
cp database/backups/2026-10-16-03-00/app.sqlite database/data/app.sqlite
rm -f database/data/app.sqlite-wal database/data/app.sqlite-shm
tar -xzf database/backups/2026-10-16-03-00/uploads.tar.gz -C database/   # khôi phục ảnh (nếu cần)
pm2 start linh-nghi
```

## Chuyển sang VPS mới

1. Trên VPS mới làm Bước 1 đến Bước 5 trong [HUONG_DAN_UPLOAD.md](HUONG_DAN_UPLOAD.md).
2. `pm2 stop linh-nghi` trên VPS mới.
3. Copy từ VPS cũ sang VPS mới: file `.env`, thư mục `database/data`, `database/uploads`.
4. `pm2 start linh-nghi`. Trỏ tên miền về IP mới.

## Quên mật khẩu

**Nhân viên quên:** Chủ shop vào Tài khoản quản trị › sửa › đặt mật khẩu mới.

**Chủ shop quên (hoặc bị khóa, mất 2FA):** SSH vào VPS và chạy:

```bash
cd /var/www/linh-nghi && npm run create-admin
```

Nhập **đúng email cũ** để đặt lại mật khẩu và mở khóa. Nếu cần tắt 2FA:

```bash
cd /var/www/linh-nghi && node -e "require('better-sqlite3')('database/data/app.sqlite').prepare(\"UPDATE users SET totp_enabled=0, totp_secret=NULL WHERE email=?\").run('email@cua-ban.com')"
```

## Xử lý sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| Website không vào được (lỗi 502) | `pm2 status`, nếu không "online" thì xem lỗi bằng `pm2 logs linh-nghi --lines 50`, rồi `pm2 restart linh-nghi` |
| Báo "Thiếu SESSION_SECRET" | File `.env` bị mất hoặc sai. Khôi phục từ bản lưu |
| Không cài được SSL | Kiểm tra tên miền trỏ đúng IP (`ping tenmien.vn`) rồi chạy `sudo certbot --nginx -d tenmien.vn -d www.tenmien.vn` |
| Upload ảnh báo lỗi | Ảnh lớn hơn 10MB, hoặc ổ cứng đầy (`df -h` để kiểm tra) |
| Email không gửi được | Kiểm tra Mật khẩu ứng dụng Gmail, Gmail đã bật xác minh 2 bước. Một số VPS chặn cổng 465, khi đó thử cổng 587 và tắt SSL |
| "Phiên làm việc đã hết hạn" | Tải lại trang (F5) |
| Hết dung lượng | Xóa ảnh không dùng trong Thư viện ảnh, giảm số bản sao lưu: thêm `BACKUP_KEEP=7` vào `.env` |


## Phân quyền theo vai trò (18/10/2026)

- Chủ shop toàn quyền; nhân viên theo vai trò (Admin › Vai trò & phân quyền). Chặn ở cả trang lẫn API; đường dẫn chưa khai báo quyền mặc định chỉ Chủ shop. Đường dẫn được chuẩn hóa (chữ thường, bỏ "//" và "/" cuối) trước khi so quyền; quy tắc nằm ở `backend/config/permissions.js`. Thêm API / trang mới phải khai báo quyền ở đó.
- Quyền nhạy cảm, chỉ giao cho người thật tin tưởng: **tải bản sao lưu** (chứa toàn bộ dữ liệu, mật khẩu băm của mọi tài khoản), **cấu hình email** (đổi máy chủ gửi thư có thể chuyển hướng thông báo chứa thông tin khách), **xóa đơn / khách và xuất danh sách khách**, **cài đặt giao diện** (CSS tùy chỉnh), **chuyển hướng**. Quản lý tài khoản và vai trò không giao được.
- Chưa có: bắt buộc 2FA cho nhân viên, mã khôi phục 2FA, giới hạn thời gian không hoạt động của phiên (phiên hết hạn theo thời gian cấu hình `SESSION_HOURS`).
