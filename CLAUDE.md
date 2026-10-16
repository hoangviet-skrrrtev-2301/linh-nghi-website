# Hướng dẫn cho trợ lý AI (Claude Code)

Website bán vòng tay ngọc. Node 24 + Express 5 + SQLite (better-sqlite3) + Nunjucks (render tại server) + Tailwind CSS 4 + Alpine.js. Giao tiếp với chủ dự án bằng **tiếng Việt**.

Đọc trước khi làm việc: `docs/GHI_CHU_DU_AN.md` (quyết định đã chốt, trạng thái, việc tiếp theo, bản đồ code) và `docs/DANH_CHO_LAP_TRINH_VIEN.md` (kiến trúc, quy ước).

## Lệnh

```bash
npm install && cp .env.example .env && npm run setup   # cài lần đầu
npm run seed            # dữ liệu mẫu
npm run create-admin    # tạo / đặt lại tài khoản admin (có thể truyền tham số: email "Tên" matkhau owner)
npm run dev             # http://localhost:3000, admin: /admin
npm run build:css       # bắt buộc sau khi sửa class Tailwind trong template hoặc file CSS
npm run migrate | backup | restore -- <thư-mục>
```

## Nguyên tắc bắt buộc

- **Không fix cứng nội dung.** Mọi chữ, ảnh, lựa chọn hiển thị cho khách phải lấy từ cài đặt. Trường mới khai báo trong `backend/config/settings-schema.js`, admin tự sinh form.
- **Form custom không có upload file** (yêu cầu của chủ dự án).
- Thay đổi database: tạo file migration mới đánh số tiếp theo trong `database/migrations/`, không sửa file cũ.
- Bảo mật: prepared statement; HTML soạn thảo qua `cleanHtml()`; dữ liệu đưa vào thuộc tính Alpine dùng filter `attrjson`; JSON trong `<script>` dùng `jsonScript`; API admin ghi dữ liệu thì gọi `audit()`, thao tác nhạy cảm dùng `requireOwner`; form công khai dùng `formLimiter` + `publicFormGuard` + `antiSpam(formToken)`.
- Tailwind chỉ sinh class viết nguyên văn. Class ghép động phải khai báo trong `@source inline(...)`.
- Swiper đặt trong CSS grid phải có `min-w-0` / `minmax(0, …)` (nếu không trình duyệt bị treo).
- Không đặt `x-show` trực tiếp lên `<form>` có ô tên `style` (xung đột named access), bọc bằng `<div>`.
- Popup: khung nội dung đứng **sau** lớp nền (`.modal-backdrop`, không có z-index) trong DOM.
- Không xóa `.npmrc` (`ignore-scripts=true`): nhờ nó `npm install` dùng bản build sẵn của better-sqlite3/sharp, không cần Python/C++. Không thêm lại `allowScripts` vào package.json.
- Trên Windows: không sửa file JS/template có chuỗi `${...}` bằng PowerShell (bị nuốt biến); dùng công cụ Edit.

## Kiểm tra sau khi sửa

- `node --check` các file JS đã sửa; `npm run build:css` không lỗi
- Mở trang liên quan trên trình duyệt (desktop + mobile), Console không lỗi đỏ
- Nếu đụng tới form: gửi thử đơn hàng / custom / tư vấn, kiểm tra admin nhận đúng
- Cập nhật `CHANGELOG.md` và `docs/GHI_CHU_DU_AN.md` khi có thay đổi đáng kể
