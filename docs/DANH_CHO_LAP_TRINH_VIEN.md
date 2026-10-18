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
- **Phân quyền** theo vai trò: xem mục "Phân quyền, tác giả, truy cập". **SEO kỹ thuật**: xem mục "SEO kỹ thuật" (chính sách tham số, schema, robots, font, `npm run check:seo`).
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

- Địa chỉ sản phẩm / bài viết lấy từ `p.url` / `post.url`; đổi cách đặt đường dẫn phải đi qua `lib/urls.js` + `addAutoRedirect` (xem mục "Địa chỉ trang (URL) và chuyển hướng").
- Nội dung soạn thảo hiển thị qua filter `headings(n) | imgdims | safe` (không nhảy cấp tiêu đề, ảnh có kích thước). Trang khách mỗi trang đúng 1 H1.
- Lên đơn (custom / liên hệ → đơn hàng) là đổi `type` của chính bản ghi (`convertToOrder`), mã cũ giữ ở `origin_code`; không tạo bản ghi thứ hai.

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
| `authors` | Tác giả blog (`posts.writer_id`); `links` là JSON các địa chỉ |
| `roles` | Vai trò phân quyền (`permissions` JSON); `users.role_id` chọn vai trò cho nhân viên (`users.role` vẫn là owner / staff) |
| `redirects`, `not_found_log` | Chuyển hướng 301 / 302 / 410 (`auto = 1` do hệ thống tự tạo khi đổi slug) và nhật ký đường dẫn bị 404 |

## Luồng dữ liệu bán hàng (khách hàng, liên hệ, custom, đơn hàng)

```
KHÁCH TRÊN WEBSITE                       SHOP TỰ NHẬP (admin)
 ├ Đặt hàng       ┐                      ├ Thêm khách thủ công / nhập hàng loạt (dán Excel, CSV)
 ├ Thiết kế riêng ├─ mỗi lần gửi ─►      ├ Tạo đơn / custom / liên hệ cho khách (channel = admin)
 └ Liên hệ / tư vấn┘  tạo 1 "yêu cầu"    └ Bấm "Lên đơn" từ yêu cầu custom hoặc liên hệ

 inquiries (yêu cầu) ──thuộc về──► customers (khách; khóa duy nhất = SĐT chuẩn hóa)
   type: order | custom | contact        1 khách có nhiều yêu cầu; gửi lại cùng SĐT thì gộp vào khách cũ
   code: DH… / CT… / LH… (khách tra cứu bằng mã + SĐT)
   custom/contact ──parent_id──► order mới (1 yêu cầu gốc có thể lên nhiều đơn)
   thông tin liên hệ và dòng hàng được chụp lại (snapshot) trong yêu cầu, không đổi khi sửa khách sau này
```

- **Trạng thái theo từng loại** (`INQUIRY_FLOW` trong `services/inquiries.js`):
  đơn hàng: Mới → Đã liên hệ → Đã xác nhận → **Đang giao hàng** → Hoàn thành (hoặc Đã hủy);
  custom: Mới → Đã liên hệ → Đã xác nhận → Hoàn thành; liên hệ: Mới → Đã liên hệ → Đã xử lý. Đổi sang trạng thái ngoài chuỗi của loại bị từ chối (400).
- **Mốc thời gian:** `shipped_at` (lúc sang "Đang giao hàng"), `completed_at` (lúc sang "Hoàn thành"); lùi trạng thái thì mốc đã qua bị xóa. Doanh thu ở Tổng quan = tổng tiền các đơn hoàn thành tính theo `completed_at` (giờ Việt Nam).
- **Vận chuyển:** `carrier`, `tracking_code` hiện ở trang tra cứu của khách. Admin có thể tick gửi email báo khách khi đổi trạng thái (`notifyStatusChange`, mẫu `customerStatusUpdate` trong `mailer.js`).
- "Đã mua" của khách chỉ cộng các đơn Hoàn thành. Xóa khách thì yêu cầu cũ giữ lại (`customer_id` thành NULL).
- Tổng quan admin (`services/dashboard.js`): chọn kỳ (7 ngày … tùy chọn), thẻ số liệu so với kỳ liền trước bằng số ngày, biểu đồ theo ngày / tuần / tháng tùy độ dài kỳ.

## Loại sản phẩm (nhóm hàng)

- Mỗi sản phẩm có `products.product_type_id` (mặc định 1 = Vòng tay ngọc). Loại có `uses_jade_fields = 1` dùng bộ thuộc tính ngọc (loại ngọc, màu, kiểu dáng, mệnh, ni, chứng chỉ). Loại khác dùng thông số tự đặt: khai báo ở `product_types.spec_fields`, giá trị lưu ở `products.attrs` (mã thông số → giá trị).
- Thông số có 3 kiểu: `text`, `number`, `select`. Giá trị mới ở thông số `select` tự được thêm vào danh sách khi lưu sản phẩm (`sanitizeAttrs` trong `catalog.js`).
- **Loại `active = 0` (chưa hoạt động) bị ẩn hoàn toàn phía khách.** Mọi truy vấn phía khách phải có điều kiện `TYPE_ACTIVE` (xuất từ `catalog.js`): danh sách, tìm kiếm, chi tiết, gợi ý, giỏ hàng (`productsByIds`), sitemap, link sản phẩm trong Gallery. Truy vấn mới về sản phẩm phía khách nhớ thêm điều kiện này.
- Việc còn lại khi muốn mở bán một loại mới (ví dụ Pháp phục): trang danh sách riêng (có sẵn bộ lọc `?nhom=<slug>` trong `buildFilter`), mục menu, bộ lọc theo thông số tự đặt, chọn kích cỡ khi đặt hàng (giỏ hàng hiện chỉ hiểu "ni" dạng số), schema SEO cho loại không phải ngọc.

## Địa chỉ trang (URL) và chuyển hướng

- Đường dẫn luôn lấy từ `p.url` (sản phẩm) / `post.url` (bài viết) do `catalog.hydrate` và `content.hydratePosts` gắn sẵn (hàm `productPath`, `postPath` trong `lib/urls.js`), không tự ghép chuỗi trong template, JSON-LD hay sitemap.
- `/san-pham/:a`: trang loại ngọc, trang loại sản phẩm, hoặc sản phẩm chưa có loại; `/san-pham/:a/:slug`: sản phẩm (sai `:a` thì 301 về đúng). Tương tự `/blog/:a`, `/blog/:a/:slug`.
- Đổi slug / loại / chuyên mục trong `catalog.js` và `content.js` phải gọi `addAutoRedirect` (đã làm sẵn trong các hàm lưu). Thêm kiểu trang mới có đường dẫn đổi được thì làm tương tự.
- Thứ tự middleware trong `app.js`: file tĩnh → `applyRedirects` → `canonicalUrl` → route.

## Phân quyền, tác giả, truy cập

- **Phân quyền** (`backend/config/permissions.js`): quyền khai báo ở `PERMISSION_GROUPS` (hiện trong trang Vai trò). Vai trò lưu ở bảng `roles` (`permissions` là JSON danh sách mã quyền), `users.role = 'owner' | 'staff'`, nhân viên có `role_id` (không có thì vai trò 1 "Nhân viên" có sẵn). `getUser` trả thêm `permissions` và `role_label`; Chủ shop có mọi quyền. `apiPermission` (middleware đầu `routes/admin-api/index.js`) và `pagePermission` (`routes/admin.js`) chặn theo `API_RULES` / `PAGE_RULES`; template dùng `can('quyền')`. GET dùng nhóm quyền `read` (VD sản phẩm cần đọc danh mục), ghi dùng `write`. Đường dẫn chưa khai báo: chỉ Chủ shop. Quyền cài đặt theo nhóm: `SETTINGS_PERMISSION`.
- **Tác giả**: bảng `authors`, `posts.writer_id`; `content.hydratePosts` gắn `post.writer` (chỉ tác giả đang hiển thị) và `post.author` (tên). Schema ở `articleJsonLd`. Không có trang tác giả riêng.
- **Liên kết trong bài**: `SmartLink` (core.js) lưu `{ href, newTab }`; `cleanHtml` (sanitize.js) quyết định `target` / `rel` khi lưu.
- **Truy cập**: nút chỉ có biểu tượng cần `aria-label`; `core.js` có bộ tự gắn nhãn dự phòng cho phần tử Alpine sinh muộn (`label.label` → ô nhập kế tiếp, title / placeholder → tên) nhưng nên ghi nhãn ngay trong template.

## SEO kỹ thuật: index, canonical, schema, tốc độ

- **Chính sách địa chỉ có tham số** (`hasRealParams`, `buildSeo` trong `backend/lib/seo.js`): trang sạch → `index, follow` + canonical tự trỏ; chỉ có tham số theo dõi (utm_*, fbclid, gclid...) → như trang sạch, canonical về địa chỉ không tham số; có bất kỳ tham số nào khác (lọc, sắp xếp, tìm kiếm, `?trang=N`, album...) → `noindex, follow` và **không in canonical** (`seo.canonical = null`, template bỏ thẻ). `seo.url` luôn là địa chỉ sạch (dùng cho og:url). Tham số mới thêm sau này tự rơi vào nhóm thứ ba, không cần sửa gì.
- **robots.txt** (`lib/robots-sitemap.js`): index tắt → `Disallow: /`; index bật → `Disallow: /*?` (tắt được ở cài đặt `robots_block_params`) cùng các đường dẫn chặn khác và dòng Sitemap. Sitemap chỉ liệt kê địa chỉ sạch.
- **Công tắc index** `seo.allow_indexing` (mặc định tắt): tắt → robots `Disallow: /` + mọi trang `noindex, nofollow`. Bật khi chính thức mở web. Khung "Chuẩn bị mở website chính thức" ở Tổng quan (`services/launch-check.js`) nhắc các việc còn lại; thêm kiểm tra mới bằng một dòng `add(...)`.
- **Schema**: dựng trong `buildSeo` từ nhóm cài đặt `schema` (`organizationJsonLd`, `productJsonLd`, `articleJsonLd`...). Mỗi lần dựng lại từ cài đặt nên sửa trong admin là có hiệu lực ngay. Trang không tự truyền JSON-LD loại trang thì `buildSeo` tự thêm WebPage + BreadcrumbList (chỉ trang cho index). Trang mới nên truyền loại schema đúng (CollectionPage, Product, BlogPosting...) qua tham số `jsonLd`. Chính sách đổi trả và giao hàng chỉ xuất khi shop bật trong cài đặt.
- **og:image**: ảnh riêng → `seo.og_image` → logo.
- **Font** (`services/fonts.js`): font chọn ở Giao diện tải về `database/data/fonts` lúc khởi động và khi lưu cài đặt giao diện, phục vụ ở `/fonts`; template `base.njk` dùng `fonts.local` (CSS local + preload) hoặc `fonts.google` khi chưa có. Thêm font mới vào `FONT_OPTIONS` trong schema là đủ.
- **JavaScript nặng tải khi cần**: Swiper (`loadSwiper` trong `app.js`) chỉ khi có slider cần chạy; PhotoSwipe chỉ khi có `[data-pswp]`.
- **Kiểm tra tự động**: `npm run check:seo [-- <địa chỉ>]` (mặc định http://localhost:3000, cần server đang chạy). Báo lỗi canonical, noindex, robots, sitemap, 301 chuẩn hóa, 404, H1, ảnh, og:image, JSON-LD, liên kết hỏng. Chạy sau khi sửa template / route / cài đặt SEO hoặc thêm loại trang / tham số.

## Kiểm tra trước khi bàn giao bản sửa

- [ ] `npm run build:css` không lỗi
- [ ] `node --check` các file JS đã sửa
- [ ] Xem trang trên điện thoại (DevTools › chế độ thiết bị) và máy tính
- [ ] Mở DevTools › Console: không có lỗi đỏ
- [ ] Thử gửi 1 đơn hàng, 1 yêu cầu custom
- [ ] `npm run check:seo` (server đang chạy) không báo lỗi, nếu có sửa liên quan trang khách
