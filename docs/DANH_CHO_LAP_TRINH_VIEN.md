# Dành cho lập trình viên

## Kiến trúc

```
Trình duyệt ──https──► Nginx (SSL, /uploads tĩnh) ──► Node.js Express :3000 (127.0.0.1)
                                                        ├─ routes/public.js      HTML trang khách (Nunjucks, render tại server)
                                                        ├─ routes/api-public.js  /api/... popup sản phẩm, giỏ hàng, gửi form
                                                        ├─ routes/seo.js         robots.txt, sitemap.xml, theme.css
                                                        ├─ routes/admin.js       ADMIN_PATH: đăng nhập + trang admin
                                                        └─ routes/admin-api/     ADMIN_PATH/api/... JSON cho admin
                                                              │
                                                       services/ (nghiệp vụ) ──► SQLite (database/data/app.sqlite)
```

- **Trang khách** render HTML tại server để tốt cho SEO. Alpine.js chỉ lo phần tương tác (popup, giỏ hàng, bộ lọc, form).
- **Trang admin** là các trang Nunjucks khung, dữ liệu lấy qua JSON API bằng component Alpine trong `admin/public/js/pages.js`.
- **Cài đặt website** được mô tả trong `backend/config/settings-schema.js`. Admin tự sinh form từ schema, dữ liệu lưu dạng JSON trong bảng `settings`.

## Đổi giao diện theo mẫu thiết kế

1. **Màu & font:** ưu tiên chỉnh trong Admin › Giao diện. Biến CSS sinh tại `/theme.css` (`backend/routes/seo.js`) gồm `--c-primary`, `--c-accent`, `--c-bg`, `--c-surface`, `--c-text`, `--c-muted`, `--c-border`, `--c-footer`, `--ff-heading`, `--ff-body`, `--r-sm/md/lg`.
2. Trong template dùng lớp Tailwind tương ứng: `bg-primary`, `text-on-primary`, `text-accent`, `bg-bg`, `bg-surface`, `text-ink`, `text-muted`, `border-line`, `bg-footer`, `font-heading`, `rounded-md`...
3. **Bố cục:** sửa template trong `frontend/views/`:
   - `layouts/base.njk`: khung trang, thẻ meta SEO
   - `partials/`: header, footer, thẻ sản phẩm, popup, form
   - `pages/`: từng trang
4. **Component CSS** (nút, ô nhập, thẻ...) trong `frontend/src/css/app.css`, phần `@layer components`.
5. Sau khi sửa template/CSS: `npm run build:css` (hoặc `npm run watch:css` khi đang làm).

> Tailwind chỉ sinh các lớp xuất hiện nguyên văn trong file. Đừng ghép tên lớp kiểu `grid-cols-{{ n }}`; nếu bắt buộc, khai báo trong `@source inline(...)` ở đầu `app.css`.

## Thêm một trường cài đặt mới

Ví dụ thêm "Link Messenger" vào Thông tin shop:

1. `backend/config/settings-schema.js` › nhóm `site` › thêm `{ name: 'messenger', label: 'Link Messenger', type: 'url' }`
2. Dùng trong template: `{{ s.site.messenger }}`

Nhóm có nhiều trường có thể chia thành các phần thu gọn / mở ra: khai báo `sections: [{ key, label, hint, toggle }]` ở cấp nhóm (như nhóm `home`), rồi thêm `section: '<key>'` vào từng trường. `toggle` (tùy chọn) là tên trường bật/tắt để hiện nhãn "Đang hiện / Đang ẩn". Trường không có `section` rơi vào phần đầu tiên.

Không cần sửa database hay trang admin. Kiểu trường hỗ trợ: `text, textarea, richtext, email, url, number, color, toggle, select, image, secret, list`.

## Thay đổi cấu trúc database

Tạo file mới với số thứ tự tiếp theo, ví dụ `database/migrations/003_ten_thay_doi.sql` (không sửa file cũ), ví dụ:

```sql
ALTER TABLE products ADD COLUMN video_url TEXT NOT NULL DEFAULT '';
```

Chạy `npm run migrate` (trên VPS, `deploy/update.sh` tự chạy). Mỗi file chỉ chạy một lần.

## Quy ước

- ES Modules, Node ≥ 22.12, Express 5 (lỗi trong handler async tự chuyển tới error handler).
- Mọi truy vấn dùng prepared statement của better-sqlite3.
- HTML từ trình soạn thảo luôn đi qua `cleanHtml()` (`backend/lib/sanitize.js`) trước khi lưu; template mặc định escape, chỉ dùng `| safe` cho nội dung đã làm sạch.
- Dữ liệu đưa vào thuộc tính Alpine dùng filter `attrjson`; JSON trong thẻ `<script>` dùng `jsonScript`.
- Thêm API admin mới: đặt trong `routes/admin-api/index.js`, bọc bằng `h()`, gọi `audit()` với thao tác ghi, dùng `requireOwner` nếu chỉ Chủ shop được làm.
- Form công khai mới: dùng `formLimiter` + `publicFormGuard`, thêm `{{ antiSpam(formToken) }}` vào form.

## Bảng dữ liệu

| Bảng | Nội dung |
|---|---|
| `users` | Tài khoản quản trị |
| `sessions` | Phiên đăng nhập |
| `settings` | Cài đặt website (key › JSON) |
| `media` | Ảnh (3 kích thước WebP: sm 480, md 960, lg 1800) |
| `terms` | Loại ngọc / màu / kiểu dáng / mệnh |
| `products`, `product_images`, `product_elements`, `certificates` | Sản phẩm và dữ liệu liên quan |
| `gallery_items`, `posts` | Gallery, blog |
| `customers`, `inquiries` | Khách hàng, đơn hàng / custom / liên hệ |
| `audit_logs` | Nhật ký thao tác |
| `product_types` | Loại sản phẩm (Vòng tay ngọc, Pháp phục...): tên, thông số tự đặt `spec_fields` (JSON), `active`, `uses_jade_fields` |
| `post_categories` | Chuyên mục blog (`posts.category_id`) |

## Loại sản phẩm (nhóm hàng)

- Mỗi sản phẩm có `products.product_type_id` (mặc định 1 = Vòng tay ngọc). Loại có `uses_jade_fields = 1` dùng bộ thuộc tính ngọc (loại ngọc, màu, kiểu dáng, mệnh, ni, chứng chỉ). Loại khác dùng thông số tự đặt: khai báo ở `product_types.spec_fields`, giá trị lưu ở `products.attrs` (mã thông số → giá trị).
- Thông số có 3 kiểu: `text`, `number`, `select`. Giá trị mới ở thông số `select` tự được thêm vào danh sách khi lưu sản phẩm (`sanitizeAttrs` trong `catalog.js`).
- **Loại `active = 0` (chưa hoạt động) bị ẩn hoàn toàn phía khách.** Mọi truy vấn phía khách phải có điều kiện `TYPE_ACTIVE` (xuất từ `catalog.js`): danh sách, tìm kiếm, chi tiết, gợi ý, giỏ hàng (`productsByIds`), sitemap, link sản phẩm trong Gallery. Truy vấn mới về sản phẩm phía khách nhớ thêm điều kiện này.
- Việc còn lại khi muốn mở bán một loại mới (ví dụ Pháp phục): trang danh sách riêng (có sẵn bộ lọc `?nhom=<slug>` trong `buildFilter`), mục menu, bộ lọc theo thông số tự đặt, chọn kích cỡ khi đặt hàng (giỏ hàng hiện chỉ hiểu "ni" dạng số), schema SEO cho loại không phải ngọc.

## Kiểm tra trước khi bàn giao bản sửa

- [ ] `npm run build:css` không lỗi
- [ ] `node --check` các file JS đã sửa
- [ ] Xem trang trên điện thoại (DevTools › chế độ thiết bị) và máy tính
- [ ] Mở DevTools › Console: không có lỗi đỏ
- [ ] Thử gửi 1 đơn hàng, 1 yêu cầu custom
