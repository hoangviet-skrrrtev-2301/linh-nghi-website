# Cài đặt và chạy thử trên máy tính

Dùng khi: tải dự án từ GitHub về máy mới, chuyển sang máy khác để sửa tiếp, hoặc muốn xem thử website trước khi đưa lên VPS.

---

## Phần 1: Cài đặt lần đầu trên máy mới

> **Cách nhanh (khuyên dùng):** cài Node.js và Git (Bước 1), tải code (Bước 2), rồi **bấm đúp `chay-thu.bat`** (Windows) hoặc chạy `bash chay-thu.sh` (macOS, Linux). Hoặc gõ `npm install` rồi `npm run bootstrap` rồi `npm run dev`. Lệnh `bootstrap` tự làm Bước 3 đến Bước 6 bên dưới (tạo `.env`, database, nạp nội dung bàn giao, tạo tài khoản admin có mật khẩu ngẫu nhiên in ra một lần). Các bước dưới đây là cách làm từng bước bằng tay. Xem thêm [BAN_GIAO.md](BAN_GIAO.md).

### Bước 1: Cài phần mềm cần thiết (chỉ làm 1 lần mỗi máy)

| Phần mềm | Tải ở đâu | Ghi chú |
|---|---|---|
| **Node.js 24 LTS** | https://nodejs.org (chọn nút LTS) | Bắt buộc. Bản tối thiểu 22.12 |
| **Git** | https://git-scm.com | Để tải code từ GitHub |
| **VS Code** | https://code.visualstudio.com | Khuyên dùng để sửa code |

Windows có thể cài nhanh bằng PowerShell:

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
winget install Microsoft.VisualStudioCode
```

macOS dùng Homebrew: `brew install node git`

Cài xong, **mở cửa sổ dòng lệnh mới** rồi kiểm tra:

```bash
node -v    # phải hiện v24.x.x (hoặc từ v22.12 trở lên)
npm -v
git --version
```

### Bước 2: Tải code về

```bash
git clone https://github.com/TEN_TAI_KHOAN/website-linh-nghi.git
cd website-linh-nghi
```

> Repo riêng tư (private): GitHub sẽ hỏi đăng nhập. Nếu chưa đăng nhập, cài GitHub Desktop (https://desktop.github.com) rồi dùng "Clone repository" cho dễ.

Mở bằng VS Code: `code .` (hoặc File › Open Folder). VS Code sẽ gợi ý cài các tiện ích nên dùng, bấm **Install**.

### Bước 3: Cài thư viện và tạo cấu hình

```bash
npm install
```

Tạo file cấu hình `.env` từ file mẫu:

| Hệ điều hành | Lệnh |
|---|---|
| Windows (PowerShell) | `Copy-Item .env.example .env` |
| Windows (cmd) | `copy .env.example .env` |
| macOS / Linux / Git Bash | `cp .env.example .env` |

> Trên máy cá nhân **không cần** điền `SESSION_SECRET` và `APP_SECRET`: website tự dùng khóa tạm cho môi trường thử nghiệm. Chỉ bắt buộc điền khi chạy thật trên VPS (script cài VPS tự làm việc này).

### Bước 4: Tạo database

```bash
npm run setup
```

Lệnh này build giao diện (CSS) và tạo database trống.

### Bước 5: Chọn dữ liệu để chạy thử

**Cách A: Dữ liệu mẫu** (10 sản phẩm, ảnh minh họa, 2 bài blog, gallery):

```bash
npm run seed
```

**Cách B: Gói nội dung bàn giao** (có trong thư mục `database/content-pack/` nếu người giao đã xuất): `npm run import-content`. **Hoặc dữ liệu thật mang từ máy cũ / VPS:** xem [Phần 3](#phần-3-mang-dữ-liệu-thật-sang-máy-khác).

**Cách C: Website trống:** bỏ qua bước này, tự nhập dữ liệu trong admin.

### Bước 6: Tạo tài khoản quản trị

```bash
npm run create-admin
```

Nhập email, tên, mật khẩu (tối thiểu 10 ký tự, có chữ và số), chọn **1 – Chủ shop**.

Xong phần cài đặt.

---

## Phần 2: Các cách chạy thử website

### Cách 1: Chế độ phát triển (dùng khi sửa code), khuyên dùng

```bash
npm run dev
```

- Website: **http://localhost:3000**
- Trang quản trị: **http://localhost:3000/admin**
- Sửa file trong `backend/`: server tự khởi động lại.
- Sửa template trong `frontend/views/` hoặc `admin/views/`: chỉ cần tải lại trang (F5).
- Dừng: bấm **Ctrl + C** trong cửa sổ dòng lệnh.

**Khi sửa giao diện (class Tailwind, file CSS):** mở thêm cửa sổ dòng lệnh thứ hai và chạy

```bash
npm run watch:css
```

để CSS tự build lại mỗi khi lưu file. Sửa giao diện trang admin thì chạy `npm run build:css` sau khi sửa xong.

### Cách 2: Chạy giống bản thật

```bash
npm run build
npm start
```

Không tự khởi động lại khi sửa code. Dùng để kiểm tra lần cuối trước khi đưa lên VPS.

### Cách 3: Xem trên điện thoại (cùng mạng Wi-Fi)

1. Chạy `npm run dev` trên máy tính.
2. Xem địa chỉ IP của máy tính:
   - Windows: chạy `ipconfig`, tìm dòng **IPv4 Address** (ví dụ `192.168.1.15`)
   - macOS: System Settings › Wi-Fi › Details, hoặc chạy `ipconfig getifaddr en0`
3. Trên điện thoại (cùng Wi-Fi) mở: `http://192.168.1.15:3000`

> Windows có thể hiện hộp thoại tường lửa hỏi cho phép Node.js: chọn **Allow** cho mạng **Private**.

### Cách 4: Gửi link tạm cho người khác xem (không cần VPS)

Dùng Cloudflare Tunnel miễn phí để tạo một link public tạm thời:

```bash
# Cài 1 lần
winget install Cloudflare.cloudflared       # Windows
brew install cloudflared                    # macOS

# Mỗi lần muốn chia sẻ (đang chạy npm run dev ở cửa sổ khác)
cloudflared tunnel --url http://localhost:3000
```

Màn hình hiện link dạng `https://xxxx.trycloudflare.com`, gửi link này cho người cần xem. Tắt bằng Ctrl + C thì link hết hiệu lực.

> Link này ai có cũng vào được. Đừng dùng dữ liệu khách hàng thật khi chia sẻ, và đổi mật khẩu admin nếu đã gửi link trang quản trị.

### Cách 5: Chạy thử trên VPS

Xem [HUONG_DAN_UPLOAD.md](HUONG_DAN_UPLOAD.md). Có thể dùng một tên miền phụ (ví dụ `thu.tenmien.vn`) để thử nghiệm trước khi chạy chính thức.

### Đổi cổng (khi cổng 3000 đã bị chiếm)

Sửa `PORT=3001` và `BASE_URL=http://localhost:3001` trong file `.env`, rồi chạy lại.

---

## Phần 3: Mang dữ liệu thật sang máy khác

Dữ liệu (sản phẩm, đơn hàng, cài đặt) và ảnh **không có trên GitHub** để bảo vệ thông tin khách hàng. Có 2 cách mang theo:

**Cách 1: Gói nội dung đã làm sạch (qua GitHub, không có khách hàng / đơn hàng / mật khẩu).** Máy gốc: `npm run export-content`, commit và push thư mục `database/content-pack/`. Máy mới: `git pull`, rồi `npm run bootstrap` (database còn trống) hoặc `npm run import-content -- --force` (ghi đè, tự giữ bản sao lưu; tắt website trước; xong chạy `npm run create-admin`).

**Cách 2: Sao lưu đầy đủ (có khách hàng, đơn hàng, tài khoản).** Chỉ chuyển qua kênh riêng tư, **không đưa lên GitHub**:

**Trên máy cũ (hoặc VPS):**

```bash
npm run backup
```

Lệnh tạo thư mục `database/backups/<ngày-giờ>/` chứa `app.sqlite` (dữ liệu) và `uploads.tar.gz` (ảnh). Copy cả thư mục này sang máy mới (USB, Google Drive, hoặc tải bằng WinSCP từ VPS).

> Cách nhanh hơn: trong admin chọn Cài đặt website › **Tải bản sao lưu**. Cách này chỉ có database, không có ảnh.

**Trên máy mới** (đã làm xong Phần 1, Bước 1–4):

```bash
npm run restore -- duong/dan/toi/thu-muc-sao-luu
npm run migrate
npm run dev
```

Ví dụ: `npm run restore -- D:\saoluu\2026-10-16-03-00`

- Lệnh tự giữ một bản dữ liệu hiện tại của máy mới trước khi ghi đè.
- Tài khoản admin đi theo dữ liệu, nên đăng nhập bằng tài khoản cũ.
- **Mật khẩu email SMTP và 2FA** được mã hóa bằng `APP_SECRET` trong file `.env`. Muốn chúng tiếp tục dùng được, hãy copy cả file `.env` từ máy cũ (sửa lại `BASE_URL`, `NODE_ENV` cho phù hợp). Nếu không, chỉ cần nhập lại mật khẩu email trong admin và bật lại 2FA.

---

## Phần 4: Sửa tiếp và đưa thay đổi lên GitHub

Quy trình mỗi lần làm việc:

```bash
git pull                     # 1. Lấy code mới nhất (khi làm trên nhiều máy)
npm install                  # 2. Chỉ cần khi package.json thay đổi
npm run migrate              # 3. Chỉ cần khi có file mới trong database/migrations (npm run dev cũng tự chạy; production thì không, xem AUTO_MIGRATE trong .env.example)
npm run dev                  # 4. Sửa code và kiểm tra

npm run build                # 5. Build CSS + JS (minify) trước khi lưu lên GitHub
git add .
git commit -m "Mô tả ngắn thay đổi"
git push                     # 6. Đưa lên GitHub
```

> File CSS đã build (`frontend/public/css/app.css`, `admin/public/css/admin.css`) **có** được lưu trên GitHub để máy khác hoặc VPS chạy được ngay. Nhớ chạy `npm run build:css` trước khi commit nếu có sửa giao diện.

Ghi chú về dự án, các quyết định đã chốt và việc còn dang dở: xem [GHI_CHU_DU_AN.md](GHI_CHU_DU_AN.md).

---

## Lỗi thường gặp

| Lỗi | Cách xử lý |
|---|---|
| `'node' is not recognized` / `command not found: node` | Chưa cài Node.js, hoặc chưa mở cửa sổ dòng lệnh mới sau khi cài |
| `ERR_CONNECTION_REFUSED` khi mở localhost | Server chưa chạy hoặc đã tắt. Chạy lại `npm run dev` và giữ cửa sổ đó mở |
| `EADDRINUSE: address already in use :::3000` | Đang có website khác chạy ở cổng 3000. Tắt cửa sổ cũ, hoặc đổi `PORT` trong `.env` |
| `npm install` báo lỗi `gyp` / `Python` / `better-sqlite3` | Kiểm tra file `.npmrc` (có dòng `ignore-scripts=true`) còn trong thư mục dự án; kiểm tra Node.js từ v22.12 trở lên (`node -v`). Xóa thư mục `node_modules` rồi chạy lại `npm install`. **Không cần** cài Python hay Visual Studio |
| Giao diện vỡ, mất màu | Chưa build CSS: chạy `npm run build:css` |
| `Chưa có tài khoản quản trị` | Chạy `npm run create-admin` |
| Quên mật khẩu admin trên máy thử nghiệm | Chạy `npm run create-admin`, nhập lại **email cũ** để đặt mật khẩu mới |
| Muốn xóa sạch để làm lại từ đầu | Tắt server, xóa các file trong `database/data/` và thư mục `database/uploads/20xx`, rồi chạy lại từ Bước 4 |


## Lưu ý khi chạy lần đầu (cập nhật 18/10/2026)

- **Index đang tắt mặc định**: robots.txt chặn toàn bộ và mọi trang `noindex` cho tới khi bạn bật "Cho phép Google lập chỉ mục" ở Admin › Cài đặt › SEO & mã theo dõi (chỉ làm khi mở web chính thức). Xem khung "Chuẩn bị mở website chính thức" ở trang Tổng quan.
- **Font**: lần khởi động đầu server tải font đã chọn từ Google về `database/data/fonts` (cần internet; chưa tải được thì trang tạm dùng link Google).
- **Kiểm tra SEO**: khi server đang chạy, mở cửa sổ lệnh khác chạy `npm run check:seo` (hoặc `npm run check:seo -- http://localhost:3100`).
- **Tài khoản nhân viên thử**: `npm run create-admin -- staff@local.test "Tên" "MatKhau12345" staff`, rồi gán vai trò ở Admin › Tài khoản quản trị.
