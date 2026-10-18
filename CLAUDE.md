# Hướng dẫn cho trợ lý AI (Claude Code)

Website bán vòng tay ngọc. Node 24 + Express 5 + SQLite (better-sqlite3) + Nunjucks (render tại server) + Tailwind CSS 4 + Alpine.js. Giao tiếp với chủ dự án bằng **tiếng Việt**.

Đọc trước khi làm việc: `docs/GHI_CHU_DU_AN.md` (quyết định đã chốt, trạng thái, việc tiếp theo, bản đồ code, **cách làm việc và kiểm tra**) và `docs/DANH_CHO_LAP_TRINH_VIEN.md` (kiến trúc, luồng dữ liệu bán hàng, loại sản phẩm, quy ước).

## Lệnh

```bash
npm install && cp .env.example .env && npm run setup   # cài lần đầu
npm run seed            # dữ liệu mẫu
npm run create-admin    # tạo / đặt lại tài khoản admin (có thể truyền tham số: email "Tên" matkhau owner)
npm run dev             # http://localhost:3000, admin: /admin
npm run build:css       # bắt buộc sau khi sửa class Tailwind trong template hoặc file CSS
npm run migrate | backup | restore -- <thư-mục>
npm run check:seo       # kiểm tra SEO kỹ thuật của website đang chạy (nhận thêm địa chỉ: -- http://localhost:3100)
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
- Trên Windows: không sửa file JS/template có chuỗi `${...}` bằng PowerShell (bị nuốt biến); dùng công cụ Edit. Với script sửa file nhiều chỗ: ghi bằng công cụ Write rồi `node script.mjs`, đừng nhét code có backtick / `${}` vào `node -e "..."` hay heredoc.
- **Không bao giờ `taskkill /IM node.exe`** (tắt cả `npm run dev` của chủ dự án). Máy chủ thử chạy cổng 3100 từ bản sao dự án và chỉ dừng theo PID. Git Bash: đặt `MSYS_NO_PATHCONV=1` khi truyền đường dẫn bắt đầu bằng `/`.
- Migration **chạy tự động mỗi lần server khởi động** (kể cả `npm run dev` tự khởi động lại): `npm run backup` trước khi thêm migration. SQLite không sửa được CHECK / REFERENCES cột sẵn có: phải xây lại bảng (mẫu: `008_shipping_status.sql`).
- Truy vấn sản phẩm phía khách phải có `TYPE_ACTIVE` (loại sản phẩm chưa hoạt động bị ẩn hoàn toàn) và trang "Tất cả sản phẩm" dùng `IN_MAIN_LIST` (xem `services/catalog.js`).
- Tìm kiếm chữ dùng `vn(cột) LIKE likeVn(từ khóa)` (không phân biệt hoa/thường và dấu), không dùng `cột LIKE ?` trực tiếp.
- Trạng thái yêu cầu theo từng loại ở `INQUIRY_FLOW` (`services/inquiries.js`); doanh thu tính theo `completed_at`. Nhóm cài đặt dài thì chia phần bằng `sectionize()` cuối `settings-schema.js` (trường chưa xếp phần sẽ báo lỗi khi khởi động).
- Menu bên trái admin: các nhóm chính (Bán hàng, Sản phẩm, Nội dung, Hệ thống) **thu gọn**, chỉ xổ ra khi đang dùng một trang của nhóm hoặc khi bấm tên nhóm (chủ dự án yêu cầu 18/10/2026, `navGroup` trong `core.js`). Danh sách nhóm cài đặt gom theo mục lớn kèm mô tả, không gập.

- **Phân quyền:** mọi API / trang admin mới phải khai báo quyền ở `backend/config/permissions.js` (`API_RULES` / `PAGE_RULES`; chưa khai báo = chỉ Chủ shop); nhóm cài đặt mới phải có trong `SETTINGS_PERMISSION` và `SETTINGS_CATEGORIES`. Mục menu / nút admin ẩn theo `can('<quyền>')`, không so sánh `currentUser.role == 'owner'` (trừ quản lý tài khoản / vai trò). Liên kết `target="_blank"` phải có `rel="noopener"`. Nút chỉ có biểu tượng phải có `aria-label`; ô nhập có `<label for>` hoặc `aria-label`.
- **Index / robots:** `allow_indexing` đang TẮT cho tới khi shop mở chính thức (đừng tự bật). Địa chỉ có tham số lọc / sắp xếp / tìm kiếm / phân trang luôn `noindex, follow` và không có canonical (logic ở `buildSeo`, `lib/seo.js`); chỉ tham số theo dõi (utm_*, fbclid...) giữ index với canonical sạch. Trang mới / loại URL mới / tham số mới thì chạy `npm run check:seo` (server đang chạy) và sửa tới khi không còn lỗi. Schema dựng trong `lib/seo.js` theo nhóm cài đặt `schema` (không viết cứng thông tin shop, đổi trả, giao hàng). Font Google tự lưu qua `services/fonts.js`; Swiper / PhotoSwipe chỉ tải khi trang cần (`app.js`), không thêm lại thẻ script tĩnh.
- **URL và SEO:** đường dẫn sản phẩm / bài viết chỉ lấy từ `p.url` / `post.url` (`backend/lib/urls.js`), không tự ghép chuỗi `/san-pham/<slug>` ở nơi khác. Đổi đường dẫn của trang phải tự tạo 301 (`addAutoRedirect` trong `services/redirects.js`). Mỗi trang khách đúng 1 H1, không nhảy cấp tiêu đề; ảnh có width / height, ảnh LCP có `fetchpriority=high`. Chữ trên trang 404 / lỗi lấy từ cài đặt, không viết cứng.
- Lên đơn = đổi `type` của chính bản ghi (`convertToOrder`), không tạo bản ghi thứ hai.
- `npm run dev` có thể không tự khởi động lại; tính năng mới không chạy thì nhờ chủ dự án khởi động lại (đừng tắt node của họ).

## An toàn: sao lưu trước mỗi thay đổi

Trước khi bắt đầu **mỗi** thay đổi (sửa code, template, schema, migration, dữ liệu mẫu, hay thao tác ghi vào database/uploads):

1. **Dữ liệu:** chạy `npm run backup` (database + ảnh, lưu ở `database/backups/`, không đưa lên git). Bắt buộc trước migration, seed, thay đổi hàng loạt, xóa dữ liệu hoặc ảnh, và mọi script ghi trực tiếp vào database.
2. **Code:** chạy `git status`. Nếu còn thay đổi chưa commit từ lần trước thì báo chủ dự án và đề nghị commit trước khi làm tiếp. Chỉ commit khi chủ dự án đồng ý.
3. Ghi rõ trong câu trả lời đã sao lưu ở đâu, và cách quay lại (`npm run restore -- <thư-mục>` cho dữ liệu, `git` cho code).
4. Không chạy lệnh phá hủy (xóa file, `git reset --hard`, xóa `app.sqlite`, `restore` đè dữ liệu) khi chưa có bản sao lưu và chưa được chủ dự án đồng ý.
5. Dữ liệu thử do kiểm thử tạo ra thì dọn lại sau khi xong; không dọn dữ liệu thật của chủ shop.

## Kiểm tra sau khi sửa

- `node --check` các file JS đã sửa; `npm run build:css` không lỗi
- Mở trang liên quan trên trình duyệt (desktop + mobile), Console không lỗi đỏ
- Nếu đụng tới form: gửi thử đơn hàng / custom / tư vấn, kiểm tra admin nhận đúng
- Cập nhật `CHANGELOG.md` và `docs/GHI_CHU_DU_AN.md` khi có thay đổi đáng kể
