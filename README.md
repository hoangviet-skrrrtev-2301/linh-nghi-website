# Website vòng tay ngọc – Linh Nghi

Website bán vòng tay ngọc gồm giao diện khách, trang quản trị tiếng Việt, API và cơ sở dữ liệu. Mọi nội dung, hình ảnh, màu sắc đều chỉnh sửa được trong trang quản trị, không cần sửa code.

## Tài liệu hướng dẫn

| Tài liệu | Dành cho |
|---|---|
| [docs/BAN_GIAO.md](docs/BAN_GIAO.md) | **Bàn giao và vận hành**: nội dung lưu ở đâu, gì được / không được đưa lên GitHub, chạy lần đầu (máy local và server), chọn server, vì sao không dùng Vercel |
| [docs/TONG_QUAN_TINH_NANG.md](docs/TONG_QUAN_TINH_NANG.md) | Người dùng mới: tính năng website, bán hàng vận hành thế nào, việc hằng ngày |
| [docs/CAI_DAT_VA_CHAY_THU.md](docs/CAI_DAT_VA_CHAY_THU.md) | Cài đặt trên máy mới (tải từ GitHub), các cách chạy thử, mang dữ liệu sang máy khác |
| [docs/HUONG_DAN_UPLOAD.md](docs/HUONG_DAN_UPLOAD.md) | Mua VPS, tên miền, đưa code lên VPS (WinSCP hoặc GitHub), cập nhật, đưa dữ liệu lên |
| [docs/HUONG_DAN_SU_DUNG.md](docs/HUONG_DAN_SU_DUNG.md) | Chủ shop / nhân viên: dùng trang quản trị hằng ngày |
| [docs/CAU_HINH_EMAIL.md](docs/CAU_HINH_EMAIL.md) | Lấy Gmail App Password, cấu hình nhận email đơn hàng |
| [docs/BAO_MAT_SAO_LUU.md](docs/BAO_MAT_SAO_LUU.md) | Bảo mật, sao lưu, khôi phục, xử lý sự cố |
| [docs/DANH_CHO_LAP_TRINH_VIEN.md](docs/DANH_CHO_LAP_TRINH_VIEN.md) | Người sửa code: cấu trúc, tùy biến giao diện, thêm tính năng |

## Cấu trúc thư mục

```
website-linh-nghi/
├── frontend/     Giao diện khách hàng
│   ├── views/        Template HTML (Nunjucks): layouts, partials, pages
│   ├── src/css/      CSS gốc (Tailwind) – build ra public/css
│   └── public/       File tĩnh: js/app.js, css, images
├── admin/        Giao diện trang quản trị
│   ├── views/        Template các trang admin
│   ├── src/          CSS gốc admin
│   └── public/js/    core.js (dùng chung), pages.js (từng trang)
├── backend/      Máy chủ Node.js (Express)
│   ├── config/       Cấu hình .env + schema các trường cài đặt
│   ├── lib/          Database, bảo mật, SEO, template
│   ├── middleware/   Bảo mật, đăng nhập, phân quyền
│   ├── routes/       Đường dẫn trang khách, API, trang admin
│   ├── services/     Xử lý nghiệp vụ: sản phẩm, đơn hàng, email, ảnh...
│   └── scripts/      Lệnh: bootstrap, migrate, seed, create-admin, backup, restore, export-content, import-content, check-seo
├── database/     Dữ liệu
│   ├── migrations/   Cấu trúc bảng (SQL)
│   ├── data/         File database app.sqlite (KHÔNG xóa)
│   ├── uploads/      Ảnh đã tải lên (KHÔNG xóa)
│   ├── content-pack/ Gói nội dung đã làm sạch để bàn giao (có trên GitHub)
│   └── backups/      Bản sao lưu tự động
├── deploy/       Cài đặt VPS: setup-vps.sh, update.sh, nginx.conf, PM2
└── docs/         Tài liệu hướng dẫn
```

## Công nghệ

- **Giao diện:** HTML render từ server (tốt cho SEO) + Tailwind CSS 4 + Alpine.js, Swiper (slider), PhotoSwipe (phóng to ảnh), Quill (soạn thảo)
- **Backend:** Node.js 24 + Express 5
- **Database:** SQLite (1 file, sao lưu bằng cách copy), ảnh tự nén WebP bằng Sharp
- **Email:** Nodemailer qua Gmail SMTP (App Password)
- **Vận hành:** PM2 + Nginx + SSL miễn phí Let's Encrypt

## Chạy thử nhanh (máy mới tải từ GitHub)

Yêu cầu: Node.js 22.12 trở lên (khuyên dùng 24 LTS, tải tại nodejs.org) và Git.

```bash
git clone https://github.com/TEN_TAI_KHOAN/website-linh-nghi.git
cd website-linh-nghi
npm install
npm run bootstrap      # tạo .env, database, nạp nội dung bàn giao, tạo tài khoản admin (mật khẩu hiện một lần)
npm run dev            # chạy website
```

Muốn website **trống hoàn toàn** thay vì nội dung của người giao: `npm run bootstrap -- --blank` (hoặc `--seed` để có dữ liệu mẫu).

Hoặc **bấm đúp `chay-thu.bat`** (Windows) / `bash chay-thu.sh` (macOS, Linux): làm tất cả các bước trên rồi mở website.

Mở http://localhost:3000 để xem website và http://localhost:3000/admin để vào trang quản trị (email và mật khẩu do `bootstrap` in ra). Chi tiết: [docs/BAN_GIAO.md](docs/BAN_GIAO.md).

### Những gì KHÔNG có trên GitHub (cố ý)

| Không đưa lên | Lý do | Ở máy mới |
|---|---|---|
| `node_modules/` | Nặng, cài lại được | `npm install` |
| `.env` | Chứa khóa bí mật | `npm run bootstrap` tự tạo từ `.env.example` |
| `database/data/`, `database/uploads/`, `database/backups/` | Dữ liệu khách hàng, ảnh, mật khẩu | **Gói nội dung đã làm sạch** `database/content-pack/` (sản phẩm, ảnh, bài viết, cài đặt; không có khách, đơn, tài khoản, mật khẩu email) được nạp tự động bởi `npm run bootstrap` |

Máy gốc tạo / cập nhật gói nội dung bằng `npm run export-content` rồi commit `database/content-pack/`.

## Tiếp tục phát triển

- [docs/GHI_CHU_DU_AN.md](docs/GHI_CHU_DU_AN.md): bối cảnh, quyết định đã chốt, trạng thái, việc tiếp theo, bản đồ code
- [CHANGELOG.md](CHANGELOG.md): lịch sử thay đổi
- [CLAUDE.md](CLAUDE.md): ghi chú cho trợ lý AI (Claude Code tự đọc khi mở dự án)

## Các lệnh

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Chạy ở chế độ phát triển, tự khởi động lại khi sửa code |
| `npm start` | Chạy chính thức |
| `npm run build` | Build CSS (chạy lại sau khi sửa template hoặc file CSS) |
| `npm run watch:css` | Tự build CSS giao diện khách khi đang sửa |
| `npm run migrate` | Cập nhật cấu trúc database |
| `npm run bootstrap` | Cài máy mới bằng một lệnh: `.env`, database, nạp gói nội dung, tạo admin |
| `npm run export-content` | Tạo gói nội dung sạch trong `database/content-pack/` để commit và bàn giao |
| `npm run import-content -- --force` | Nạp gói nội dung vào máy này (ghi đè, tự giữ bản sao lưu; tắt website trước) |
| `npm run check:seo` | Kiểm tra SEO kỹ thuật của website đang chạy |
| `npm run seed` | Thêm dữ liệu mẫu |
| `npm run create-admin` | Tạo tài khoản hoặc đặt lại mật khẩu quản trị |
| `npm run backup` | Sao lưu database + ảnh vào `database/backups/` |
| `npm run restore -- <thư-mục>` | Khôi phục database + ảnh từ bản sao lưu (tắt website trước) |
