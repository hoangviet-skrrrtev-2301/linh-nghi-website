# Hướng dẫn đưa website lên VPS

Làm lần lượt từ bước 1 đến bước 7. Thời gian khoảng 30 – 60 phút. Mỗi lệnh chỉ cần copy và dán vào cửa sổ dòng lệnh.

---

## Bước 1: Mua VPS

Cấu hình khuyến nghị:

| Thông số | Tối thiểu | Khuyên dùng |
|---|---|---|
| CPU | 1 core | 2 core |
| RAM | 1 GB | 2 GB |
| Ổ cứng | 20 GB SSD | 40 GB SSD |
| Hệ điều hành | **Ubuntu 24.04** (hoặc 22.04) | |

Nhà cung cấp gợi ý: Vietnix, AZDIGI, BizFly Cloud, Viettel IDC (máy chủ đặt tại VN, truy cập nhanh trong nước); DigitalOcean, Vultr (quốc tế).

Sau khi mua xong, nhà cung cấp gửi cho bạn **địa chỉ IP** (ví dụ `103.12.34.56`), tài khoản **root** và **mật khẩu**. Hãy lưu lại.

## Bước 2: Mua tên miền và trỏ về VPS

1. Mua tên miền tại: Mắt Bão, PA Vietnam, iNET, Tenten (đuôi `.vn`, `.com.vn`) hoặc Namecheap, Cloudflare (đuôi `.com`).
2. Vào trang **Quản lý DNS** của tên miền, tạo 2 bản ghi:

| Loại | Tên (Host) | Giá trị | TTL |
|---|---|---|---|
| A | `@` | IP của VPS | 3600 |
| A | `www` | IP của VPS | 3600 |

3. Chờ 5 – 60 phút để DNS cập nhật. Kiểm tra bằng cách mở cmd trên máy tính, gõ `ping tenmien.vn`. Nếu thấy hiện đúng IP của VPS là xong.

> ⚠ Tên miền **phải trỏ xong** trước bước 5, nếu không sẽ không cài được SSL (https).

## Bước 3: Kết nối vào VPS

**Windows 10/11:** mở **PowerShell** rồi gõ:

```bash
ssh root@103.12.34.56
```

Lần đầu kết nối, gõ `yes` để xác nhận, sau đó nhập mật khẩu root (khi gõ mật khẩu, màn hình sẽ không hiện ký tự nào, đó là bình thường).

## Bước 4: Upload source code lên VPS

Chọn **một** trong hai cách.

### Cách A: dùng WinSCP (dễ nhất, kéo thả)

1. Tải WinSCP tại winscp.net và cài đặt.
2. Mở WinSCP: File protocol chọn **SFTP**, Host name nhập IP VPS, User name nhập `root`, Password nhập mật khẩu root, rồi bấm **Login**.
3. Ở khung bên phải (VPS), vào thư mục `/var/www` (chưa có thì chuột phải › New › Directory để tạo), rồi tạo thư mục `linh-nghi`.
4. Ở khung bên trái (máy bạn), mở `D:\website-linh-nghi`. Chọn tất cả file và thư mục **TRỪ** các mục sau:
   - `node_modules` (rất nặng, VPS sẽ tự cài)
   - `.env` (VPS sẽ tự tạo file mới với khóa bảo mật riêng)
   - `database/data`, `database/uploads`, `database/backups` (dữ liệu thử trên máy)
5. Kéo thả các mục đã chọn sang `/var/www/linh-nghi`.

### Cách B: tải từ GitHub (khuyên dùng nếu code đã có trên GitHub)

**Repo công khai (public):**

```bash
apt-get update && apt-get install -y git
git clone https://github.com/TEN_TAI_KHOAN/website-linh-nghi.git /var/www/linh-nghi
```

**Repo riêng tư (private)**, khuyên dùng vì an toàn hơn. VPS cần một "chìa khóa chỉ đọc" (Deploy key):

```bash
apt-get update && apt-get install -y git
ssh-keygen -t ed25519 -C "vps-linh-nghi" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub          # copy toàn bộ dòng hiện ra
```

1. Trên GitHub: vào repo › **Settings › Deploy keys › Add deploy key**, dán dòng vừa copy, **không** tích "Allow write access", bấm Add key.
2. Quay lại VPS:

```bash
printf "Host github.com\n  IdentityFile ~/.ssh/github_deploy\n  IdentitiesOnly yes\n" >> ~/.ssh/config
git clone git@github.com:TEN_TAI_KHOAN/website-linh-nghi.git /var/www/linh-nghi
```

(Lần đầu hỏi "Are you sure you want to continue connecting", gõ `yes`.)

> Dữ liệu thật và file `.env` không có trên GitHub. Website trên VPS sẽ bắt đầu trống, hoặc làm theo mục "Đưa dữ liệu từ máy tính lên VPS" bên dưới.

## Bước 5: Chạy script cài đặt tự động

Trong cửa sổ SSH (bước 3), chạy lệnh sau, **thay tên miền và email của bạn**:

```bash
cd /var/www/linh-nghi
sudo bash deploy/setup-vps.sh tenmien.vn email-cua-ban@gmail.com
```

Script tự động làm các việc sau:
- Cài Node.js 24, Nginx, PM2, tường lửa
- Tạo file `.env` với khóa bảo mật ngẫu nhiên và **đường dẫn admin bí mật**
- Build giao diện, tạo database
- Cài chứng chỉ SSL miễn phí (https), tự gia hạn
- Hẹn giờ sao lưu tự động lúc 3 giờ sáng mỗi ngày

Khi chạy xong, màn hình hiện:

```
✔ HOÀN TẤT!
Website:      https://tenmien.vn
Trang admin:  https://tenmien.vn/quan-tri-a1b2c3d4
```

> 📌 **Ghi lại đường dẫn trang admin.** Đường dẫn này là ngẫu nhiên để kẻ xấu khó dò ra. Nếu quên, xem lại bằng lệnh: `grep ADMIN_PATH /var/www/linh-nghi/.env`

## Bước 6: Tạo tài khoản quản trị

```bash
cd /var/www/linh-nghi
npm run create-admin
```

Nhập email, tên, mật khẩu (tối thiểu 10 ký tự, có chữ và số), chọn vai trò **1 – Chủ shop**.

Mở đường dẫn trang admin trên trình duyệt và đăng nhập.

## Bước 7: Thiết lập ban đầu trong trang quản trị

Làm theo thứ tự:

1. **Cài đặt website › Email (SMTP):** cấu hình Gmail để nhận đơn hàng theo [CAU_HINH_EMAIL.md](CAU_HINH_EMAIL.md), bấm **Lưu & gửi email thử**.
2. **Cài đặt website › Thông tin shop:** tên, logo, số điện thoại, Zalo, địa chỉ, mạng xã hội.
3. **Cài đặt website › Giao diện:** màu sắc, font chữ.
4. **Tài khoản & bảo mật** (góc trên bên phải): bật **xác thực 2 bước**.
5. **Danh mục & bộ lọc:** tạo loại ngọc, màu sắc, kiểu dáng, mệnh.
6. **Sản phẩm:** thêm sản phẩm.
7. **Cài đặt › SEO & mã theo dõi:** thêm mã Google Search Console, Google Analytics nếu có.

✅ Xong! Website đã hoạt động.

---

## Cập nhật code mới (sau khi chỉnh sửa)

**Nếu cài bằng GitHub (Cách B):** đẩy code lên GitHub từ máy tính (`git push`), rồi trên VPS chạy:

```bash
cd /var/www/linh-nghi && git pull && bash deploy/update.sh
```

**Nếu cài bằng WinSCP (Cách A):** upload các file đã sửa đè lên `/var/www/linh-nghi`. **Không** upload đè `.env`, `database/data`, `database/uploads`. Sau đó chạy:

```bash
cd /var/www/linh-nghi && bash deploy/update.sh
```

Script tự sao lưu dữ liệu trước, cài thư viện, build lại giao diện, cập nhật database và khởi động lại website (không bị gián đoạn).

## Đưa dữ liệu từ máy tính lên VPS (không bắt buộc)

> **Cách nhanh qua GitHub (không có khách hàng / đơn hàng):** máy tính `npm run export-content`, commit và push; trên VPS `git pull`, `pm2 stop linh-nghi`, `npm run import-content -- --force`, `chmod -R o+rX database/uploads`, `npm run create-admin`, `pm2 start linh-nghi`. Xem [BAN_GIAO.md](BAN_GIAO.md) mục 1. **Chỉ làm trước khi mở bán**: sau khi có đơn thật, không ghi đè dữ liệu trên VPS.

Cách sao lưu / khôi phục đầy đủ (giữ cả tài khoản):

Dùng khi đã nhập sản phẩm, ảnh, cài đặt trên máy tính và muốn đưa nguyên lên VPS.

1. Trên máy tính: `npm run backup`, sẽ có thư mục `database/backups/<ngày-giờ>/`.
2. Dùng WinSCP copy thư mục đó lên VPS, ví dụ vào `/root/saoluu/`.
3. Trên VPS:

```bash
cd /var/www/linh-nghi
pm2 stop linh-nghi
npm run restore -- /root/saoluu/2026-10-16-10-00
npm run migrate
chmod -R o+rX database/uploads
pm2 start linh-nghi
```

Tài khoản admin đi theo dữ liệu, nên đăng nhập bằng tài khoản đã tạo trên máy tính. Vào Cài đặt › Email nhập lại **mật khẩu ứng dụng Gmail** và bật lại 2FA (vì khóa mã hóa trên VPS khác máy tính).

## Các lệnh thường dùng trên VPS

| Việc cần làm | Lệnh |
|---|---|
| Xem website có đang chạy không | `pm2 status` |
| Xem nhật ký lỗi | `pm2 logs linh-nghi --lines 100` |
| Khởi động lại website | `pm2 restart linh-nghi` |
| Sao lưu ngay | `cd /var/www/linh-nghi && npm run backup` |
| Đặt lại mật khẩu admin | `cd /var/www/linh-nghi && npm run create-admin` |
| Xem đường dẫn admin | `grep ADMIN_PATH /var/www/linh-nghi/.env` |
| Đổi đường dẫn admin | Sửa `ADMIN_PATH` trong `.env` rồi chạy `pm2 restart linh-nghi` |

## Chạy thử trên máy trước khi đưa lên (không bắt buộc)

Xem [CAI_DAT_VA_CHAY_THU.md](CAI_DAT_VA_CHAY_THU.md).
