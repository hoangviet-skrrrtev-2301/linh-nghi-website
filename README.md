# Website vòng tay ngọc – Linh Nghi

Website bán vòng tay ngọc gồm giao diện khách, trang quản trị tiếng Việt, API và cơ sở dữ liệu. Mọi nội dung, hình ảnh, màu sắc đều chỉnh sửa được trong trang quản trị, không cần sửa code.

## Tài liệu hướng dẫn

| Tài liệu | Dành cho |
|---|---|
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
│   └── scripts/      Lệnh: migrate, seed, create-admin, backup, restore
├── database/     Dữ liệu
│   ├── migrations/   Cấu trúc bảng (SQL)
│   ├── data/         File database app.sqlite (KHÔNG xóa)
│   ├── uploads/      Ảnh đã tải lên (KHÔNG xóa)
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

Yêu cầu: Node.js 22.12 trở lên (khuyên dùng 24 LTS, tải tại nodejs.org). Hướng dẫn chi tiết từng bước, các cách chạy thử khác (xem trên điện thoại, gửi link tạm) và cách mang dữ liệu thật sang: [docs/CAI_DAT_VA_CHAY_THU.md](docs/CAI_DAT_VA_CHAY_THU.md).

```bash
git clone https://github.com/TEN_TAI_KHOAN/website-linh-nghi.git
cd website-linh-nghi
npm install            # cài thư viện
cp .env.example .env   # tạo file cấu hình (Windows PowerShell: Copy-Item .env.example .env)
npm run setup          # build giao diện + tạo database
npm run seed           # (tùy chọn) dữ liệu mẫu để xem thử
npm run create-admin   # tạo tài khoản quản trị
npm run dev            # chạy website
```

Mở http://localhost:3000 để xem website và http://localhost:3000/admin để vào trang quản trị.

### Những gì KHÔNG có trên GitHub (cố ý)

| Không đưa lên | Lý do | Ở máy mới |
|---|---|---|
| `node_modules/` | Nặng, cài lại được | `npm install` |
| `.env` | Chứa khóa bí mật | Copy từ `.env.example` |
| `database/data/`, `database/uploads/`, `database/backups/` | Dữ liệu khách hàng, ảnh thật | Dữ liệu mẫu (`npm run seed`) hoặc khôi phục bản sao lưu (`npm run restore`) |

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
| `npm run seed` | Thêm dữ liệu mẫu |
| `npm run create-admin` | Tạo tài khoản hoặc đặt lại mật khẩu quản trị |
| `npm run backup` | Sao lưu database + ảnh vào `database/backups/` |
| `npm run restore -- <thư-mục>` | Khôi phục database + ảnh từ bản sao lưu (tắt website trước) |
