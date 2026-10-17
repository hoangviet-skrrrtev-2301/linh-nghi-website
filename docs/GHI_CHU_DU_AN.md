# Ghi chú dự án

Tài liệu "sổ tay" để tiếp tục phát triển: bối cảnh, các quyết định đã chốt, những gì đã xong, việc còn chờ. Cập nhật file này mỗi khi có quyết định hoặc thay đổi lớn.

_Cập nhật lần cuối: 17/10/2026_

---

## 1. Bối cảnh

- **Sản phẩm:** website bán vòng tay ngọc (phỉ thúy, bích ngọc, hòa điền, thạch anh...) cho shop **Linh Nghi** (tên chính thức; đổi được trong admin).
- **Mục tiêu:** trưng bày sản phẩm đẹp, tăng uy tín (chứng chỉ kiểm định), nhận đơn / yêu cầu custom / yêu cầu tư vấn qua email; chủ shop tự quản lý mọi nội dung, không cần lập trình viên.
- **Người dùng admin:** chủ shop và nhân viên, không rành kỹ thuật, nên giao diện admin phải tiếng Việt và dễ dùng.
- **Không có thanh toán online.** Khách gửi đơn, shop gọi/nhắn Zalo xác nhận và hướng dẫn thanh toán.

## 2. Các quyết định đã chốt với chủ dự án

| Chủ đề | Quyết định | Lý do / ghi chú |
|---|---|---|
| Hạ tầng | **VPS** + Node.js, chạy bằng **PM2 + Nginx + Certbot** | Chủ dự án muốn dùng Node.js, không dùng WordPress |
| Backend | Express 5 + **SQLite** (better-sqlite3) | 1 file dữ liệu, sao lưu bằng cách copy, đủ cho shop vừa và nhỏ |
| Frontend | HTML render tại server (Nunjucks) + **Tailwind CSS 4 + Alpine.js**; Swiper, PhotoSwipe, Quill | Tốt cho SEO, dễ bảo trì, không dùng framework SPA |
| Email | **Gmail SMTP + App Password**, nhập trong admin, mã hóa AES-256-GCM | Chủ shop tự đổi được; không để mật khẩu trong code |
| Ngôn ngữ | **Chỉ tiếng Việt** | |
| Form custom | **Không cho khách upload file/ảnh** | Yêu cầu của chủ dự án; khách gửi ảnh mẫu qua Zalo |
| Tài khoản | Nhiều tài khoản, 2 vai trò **Chủ shop / Nhân viên**, 2FA tùy chọn | |
| Chứng chỉ | Theo từng sản phẩm (ảnh + nơi cấp + mã số + ngày cấp) **và** khối mẫu giấy kiểm định ở trang chủ | |
| Loại sản phẩm | Có bảng `product_types`: Vòng tay ngọc (chính) và **Pháp phục** (tạo sẵn, **chưa hoạt động**: nhập được trong admin nhưng khách chưa thấy). Mỗi loại tự khai báo thông số (ô chữ / số / danh sách chọn) | Ngày 17/10/2026. Bật hoạt động sẽ hiện chung trong trang Sản phẩm cho đến khi có trang riêng, xem DANH_CHO_LAP_TRINH_VIEN.md |
| Blog | Chia theo chuyên mục; trang chuyên mục `noindex, follow`, không có trong sitemap (tắt được) | Để tránh nội dung trùng khi viết bài SEO nhiều chủ đề |
| Gallery | Hiện tối đa 8 ảnh dạng 2 hàng × 4 cột (trang chủ và trang Gallery); hơn 8 ảnh thành slider tự lướt phải → trái. Tab "Tất cả" chỉ hiện ảnh bật "Hiện ở Gallery tổng", tab album hiện đủ ảnh | Chủ dự án muốn gallery tổng chọn lọc, album phụ chứa feedback / ảnh chưa chọn |
| Trạng thái đơn | Mỗi loại có chuỗi riêng: đơn hàng thêm **Đang giao hàng** (kèm đơn vị vận chuyển + mã vận đơn khách xem được, tùy chọn email báo khách); liên hệ kết thúc ở "Đã xử lý" | Ngày 17/10/2026 |
| Cấu trúc URL | Phân cấp cha → con: `/san-pham/<loại>/<sản phẩm>`, `/blog/<chuyên mục>/<bài>`; địa chỉ cũ chuyển 301; shop chỉnh chuyển hướng ở Admin › Chuyển hướng & 404 | Ngày 17/10/2026, làm trước khi có tên miền nên chưa mất xếp hạng |
| Lên đơn | Custom / liên hệ "lên đơn" thì **chính bản ghi đó** chuyển thành đơn hàng (mã DH mới, mã cũ giữ ở `origin_code`, khách tra cứu được cả hai), không tạo bản ghi thứ hai | Ngày 17/10/2026; tránh đếm đôi. Bản ghi cũ tạo theo kiểu `parent_id` vẫn hiển thị bình thường |
| Doanh thu | Tính theo **ngày hoàn thành** của đơn (giờ Việt Nam), đơn hoàn thành cũ lấy ngày cập nhật cuối làm gần đúng | Chủ dự án chốt |
| Thứ tự sản phẩm | Admin kéo thả đổi vị trí; `sort_order` đứng đầu trong sắp xếp "Nổi bật" (khách) và khối nổi bật trang chủ, chưa sắp xếp thì Best Seller / nổi bật trước | `reorderProducts` trong `catalog.js`, ghi lại sort_order 1..n toàn cửa hàng |
| Tìm kiếm | Không phân biệt hoa/thường và dấu ("áo" = "Áo" = "ao") cho sản phẩm, bài viết, đơn, khách, ảnh | Hàm `vn()` trong SQLite |
| Menu | Mỗi mục có thể sổ dọc theo loại ngọc / màu / kiểu dáng / mệnh / loại sản phẩm / chuyên mục blog / bài mới / danh sách tự nhập. Mục Sản phẩm mặc định sổ theo loại ngọc, tự thêm các loại hàng khác đang hoạt động (Pháp phục) | |
| Giao diện admin | Giữ nguyên menu bên trái và danh sách nhóm cài đặt; các trang nhiều thành phần (Cài đặt các nhóm dài, danh sách slide / khối) chia phần thu gọn / mở ra | Chủ dự án không muốn gập menu |
| Loại hàng khác ngọc (Pháp phục) | Hiện giống ngọc (thẻ sản phẩm, trang chi tiết) nhưng **không có bộ lọc** (bộ lọc chỉ cho ngọc), không hiện chung trong "Tất cả sản phẩm", chỉ xem qua menu / đường dẫn `?nhom=<slug>` / tìm kiếm | Chủ dự án chốt |
| Bộ lọc | Loại ngọc, giá (khoảng giá cấu hình được), ni tay, màu, kiểu dáng, mệnh | Danh mục quản lý trong admin |
| Chế độ tối | Có, khách tự chuyển; mặc định theo thiết bị; chủ shop chỉnh màu tối / tắt trong Admin › Giao diện | Biến CSS `:root[data-theme="dark"]` sinh tại `/theme.css` |
| Đơn của shop tự tạo | Admin tạo khách / đơn / custom thủ công; đơn lên từ custom có mã DH riêng (parent_id); giá đơn sửa được sau khi liên hệ, tổng = dòng hàng + điều chỉnh | Khách tra cứu bằng mã + SĐT |
| Tên miền | Chưa có | Hướng dẫn mua và trỏ tên miền có trong HUONG_DAN_UPLOAD.md |
| Giao diện | **Theme theo logo** (nền trắng ngà, xanh dương #2e6b94, nhấn vàng đồng #a98a50) | ⏳ Chưa chốt bố cục, chờ mẫu tham khảo |
| Nguyên tắc | **Không fix cứng thông tin**: mọi nội dung đều có trường sửa trong admin | Trường cài đặt khai báo trong `backend/config/settings-schema.js` |

Khác biệt có chủ đích so với bản kế hoạch ban đầu (do chủ dự án cung cấp):
- Không có các file `index.html`, `products.html` tĩnh. Trang render tại server để SEO tốt hơn, nhưng vẫn tách thư mục frontend / admin / backend / database.
- Không có ô upload ảnh trong form custom (xem trên).
- Mật khẩu email lưu mã hóa trong database (không phải trong `.env`) để chủ shop tự thay được.
- Giới hạn ảnh upload 10MB/ảnh (bản kế hoạch ghi 5MB), đổi bằng `UPLOAD_MAX_MB`. Ảnh luôn được nén lại sang WebP.

## 3. Trạng thái hiện tại

**Đã hoàn thành và đã kiểm tra trên trình duyệt thật (Chrome headless, desktop + mobile 390px):**

- **Trang khách:** trang chủ (các khối bật/tắt, đổi thứ tự, nền riêng từng khối), sản phẩm (tìm kiếm không dấu, bộ lọc cho ngọc, phân trang bằng liên kết thật, canonical + prev/next), trang theo loại sản phẩm, chi tiết sản phẩm, gallery 2×4 + slider, hướng dẫn size, blog 2 cột (mục lục, gợi ý bài, banner dọc, chuyên mục), giỏ hàng, thiết kế riêng, liên hệ, về shop, tra cứu đơn (5 bước theo loại, vận đơn), 404. Menu sổ dọc, chân trang tùy chỉnh, chế độ tối.
- **Đặt hàng:** sau khi gửi đơn khách tải được ảnh PNG "Thông tin đơn hàng" (vẽ trên trình duyệt, `frontend/public/js/order-image.js`).
- **Admin:** Tổng quan theo kỳ (so sánh kỳ trước, biểu đồ có số), đơn hàng / custom / liên hệ (chuỗi trạng thái theo loại, vận chuyển, email báo khách tùy chọn), khách hàng (bộ lọc thu gọn, nhập hàng loạt, thêm thủ công, xuất CSV), sản phẩm (ẩn / hiện / xóa hàng loạt, loại sản phẩm + thông số tự đặt, xem thử như khách), danh mục, gallery, blog (chuyên mục), thư viện ảnh theo thư mục, cài đặt (các nhóm dài chia phần thu gọn), tài khoản, 2FA, nhật ký. Admin dùng được trên điện thoại (bảng thành thẻ).
- **SEO:** meta, Open Graph, canonical riêng từng trang phân trang, JSON-LD (Organization, WebSite, CollectionPage / Blog + ItemList, Product, BlogPosting, BreadcrumbList, AboutPage / ContactPage), sitemap, robots, SEO riêng từng trang / sản phẩm / bài viết.
- **Email:** thông báo cho shop, xác nhận cho khách, báo trạng thái đơn. **Mới kiểm tra nội dung email, chưa gửi thật bằng Gmail.**
- Bảo mật: xem `BAO_MAT_SAO_LUU.md`. Vận hành: script cài VPS, cập nhật, sao lưu tự động, khôi phục (`npm run restore`).

**Chưa kiểm tra được:**
- Gửi email thật qua Gmail (cần Gmail + App Password của shop), gồm cả email báo giao hàng.
- Ảnh đơn hàng, menu điện thoại, nút chia sẻ trên iPhone / Safari và Android thật (mới thử bằng Chrome giả lập).
- Công cụ Rich Results của Google với dữ liệu JSON-LD mới.
- `deploy/setup-vps.sh` trên VPS Ubuntu thật (mới kiểm tra cú pháp).

**Dữ liệu thử đang nằm trong database thật (xóa khi không cần):**
- 2 sản phẩm Pháp phục mẫu (mã `PP-TEST-01`, `PP-TEST-02`, tên có "(mẫu thử)", ảnh tạm lấy từ ảnh mẫu). Loại Pháp phục đang **chưa hoạt động** nên khách không thấy; xóa bằng tick chọn rồi Xóa ở Admin › Sản phẩm.
- Vài đơn / khách thử do chủ dự án tự tạo khi thử tính năng (có thể xóa trong admin).

## 4. Việc tiếp theo

- [ ] Nhận mẫu giao diện + tông màu từ chủ dự án → chỉnh `frontend/src/css/app.css`, các template trong `frontend/views/`, và giá trị mặc định nhóm `theme` trong `settings-schema.js` (bố cục chưa chốt)
- [ ] Mua VPS + tên miền, chạy `deploy/setup-vps.sh`
- [ ] Cấu hình Gmail App Password, thử gửi đơn thật và email báo giao hàng
- [ ] Thử trên điện thoại thật (iPhone Safari, Android): menu, ảnh đơn hàng + nút chia sẻ, admin responsive
- [ ] Thay dữ liệu mẫu bằng sản phẩm, ảnh, giấy kiểm định thật; xóa ảnh mẫu (Thư viện ảnh, thư mục "sample") và 2 mẫu Pháp phục thử
- [ ] Nhập nội dung thật: Về shop, chính sách, SEO từng trang, chuyên mục + banner blog
- [ ] Gửi sitemap lên Google Search Console, kiểm tra Rich Results

**Khi muốn mở bán Pháp phục** (loại đã có sẵn, đang thử nghiệm): nhập sản phẩm thật, kiểm tra bằng "Xem thử như khách", rồi Admin › Sản phẩm › Loại sản phẩm › Bật hoạt động. Còn thiếu trước khi mở bán thật: chọn **kích cỡ** (S/M/L...) khi đặt hàng (giỏ hàng hiện chỉ hiểu "ni" dạng số), thanh toán/chuyển khoản nếu cần, schema SEO riêng cho loại không phải ngọc.

**Ý tưởng có thể làm sau (chưa ai yêu cầu):**
- Trạng thái thanh toán và trừ kho tự động khi có đơn (hiện chưa có)
- Tách "khách hàng" khỏi "người chỉ nhắn hỏi" (mọi lời nhắn liên hệ hiện đều tạo hồ sơ khách)
- Gộp "SEO Google & chia sẻ" vào cùng trang với nội dung từng trang (hiện tách 2 nhóm, đã ghi rõ ô nào lấy từ đâu)
- Hỗ trợ ảnh HEIC của iPhone (cần sharp build kèm libheif)
- Tra cứu mã chứng chỉ kiểm định trên website
- Đăng nhập Zalo/Google cho khách, lịch sử đơn của khách
- Thông báo đơn mới qua Telegram/Zalo OA
- Song ngữ Việt – Anh

## 5. Hạn chế đã biết

| Vấn đề | Ghi chú |
|---|---|
| Ảnh HEIC (iPhone) không upload được | Hướng dẫn người dùng chụp JPG, đã ghi trong HUONG_DAN_SU_DUNG.md |
| SQLite chạy 1 tiến trình | Đủ cho hàng nghìn sản phẩm / đơn. Nếu sau này cần nhiều server thì chuyển sang PostgreSQL |
| Alpine.js cần `'unsafe-eval'` trong CSP | Toàn bộ nội dung người dùng nhập đều escape/sanitize; ghi chú tại `backend/middleware/security.js` |
| Trên Windows, `node --watch` in dòng "Completed running..." sau mỗi lần tự khởi động lại | Chỉ là thông báo, server vẫn chạy bình thường. `npm run dev` chỉ theo dõi thư mục `backend` (sửa `frontend` / `admin` chỉ cần tải lại trang) |
| **Migration chạy tự động mỗi lần server khởi động** | Kể cả `npm run dev` tự khởi động lại khi sửa file `backend`. Luôn `npm run backup` trước khi thêm migration |
| `.npmrc` đặt `ignore-scripts=true` | Thư viện native (better-sqlite3, sharp, tailwind) dùng bản build sẵn, máy mới không cần Python / trình biên dịch. Nếu sau này thêm thư viện **bắt buộc** chạy script cài đặt thì cần xem lại |
| Giỏ hàng chỉ hiểu "ni" dạng số | Loại hàng khác ngọc (Pháp phục) chưa chọn được kích cỡ khi đặt hàng |
| Ảnh đơn hàng cho khách vẽ trên trình duyệt | Cần font đã tải; nếu trình duyệt khách quá cũ có thể không tạo được ảnh (khách vẫn đặt hàng bình thường) |
| Tìm kiếm tiếng Việt quét toàn bảng (`vn()`) | Không dùng chỉ mục; nhanh với vài nghìn dòng, cần xem lại nếu lên hàng chục nghìn |
| Danh sách admin ghi bộ lọc vào URL | `listPage` trong `pages.js` dùng `history.replaceState` để nút Quay lại giữ bộ lọc / trang; trang khách hàng có hàm tải riêng nên chưa giữ |
| Trạng thái đơn đã chốt trong DB bằng ràng buộc CHECK | Thêm trạng thái mới phải xây lại bảng `inquiries` (xem migration 008 làm mẫu) |

## 5b. Danh sách đã rà soát SEO / bảo mật (17/10/2026)

- **Đã có và đạt:** CSP + HSTS + nosniff + X-Frame-Options + Referrer-Policy + Permissions-Policy; CSRF cho admin; cookie đăng nhập httpOnly / sameSite / secure (production) giới hạn theo đường dẫn admin; mật khẩu băm scrypt, khóa tài khoản khi sai nhiều lần, 2FA; giới hạn tần suất (đăng nhập, form, tra cứu, API, admin); chống spam form (token + honeypot + kiểm tra nguồn); prepared statement; `cleanHtml` cho HTML soạn thảo; JSON-LD escape `<`; upload kiểm tra nội dung thật bằng sharp, không nhận SVG, tên file ngẫu nhiên, EXIF bị xóa; trang lỗi không lộ chi tiết; `query parser = simple`; admin `no-store` + `noindex`.
- **Còn lại (đã biết):** CSP cần `'unsafe-eval'` vì Alpine.js (dùng bản CSP của Alpine sẽ phải viết lại các biểu thức trong template); font Google tải từ bên ngoài (tự lưu font trên máy chủ sẽ nhanh hơn một chút); cảnh báo `npm audit` mức thấp của Quill 2.0.3 (tính năng xuất HTML, không dùng); chưa có Brotli ở Nginx; ảnh chưa có định dạng AVIF.

## 6. Bản đồ code: muốn sửa X thì mở file nào

| Muốn sửa | File |
|---|---|
| Thêm / bớt trường cài đặt trong admin | `backend/config/settings-schema.js` |
| Màu, font mặc định | nhóm `theme` trong `settings-schema.js`; biến CSS sinh tại `backend/routes/seo.js` (`/theme.css`) |
| Bố cục trang khách | `frontend/views/pages/*.njk`, header/footer/popup ở `frontend/views/partials/` |
| Thẻ sản phẩm | `frontend/views/partials/product-card.njk` |
| Kiểu nút, ô nhập, thẻ... | `frontend/src/css/app.css` (phần `@layer components`) |
| Tương tác: giỏ hàng, popup, form, bộ lọc | `frontend/public/js/app.js` |
| Đường dẫn trang khách | `backend/routes/public.js` |
| Logic sản phẩm, bộ lọc, sắp xếp | `backend/services/catalog.js` |
| Đơn hàng, khách hàng, kiểm tra dữ liệu form | `backend/services/inquiries.js` |
| Nội dung email | `backend/services/mailer.js` |
| robots.txt, sitemap.xml | `backend/lib/robots-sitemap.js` (cài đặt nhóm `sitemap` trong `settings-schema.js`) |
| Thẻ meta SEO, JSON-LD | `backend/lib/seo.js`, `frontend/views/layouts/base.njk` |
| Thứ tự / nền các khối trang chủ | `backend/lib/home-layout.js`, `frontend/views/partials/home/*.njk`, nhóm `home_layout` trong `settings-schema.js` |
| Chân trang, blog 2 cột | `partials/footer.njk`, `backend/lib/footer-layout.js`; `pages/post.njk`, `partials/blog-sidebar.njk`, `backend/lib/toc.js` |
| Menu sổ dọc, phân trang, schema | `backend/lib/nav-menu.js`, `backend/lib/pagination.js`, `backend/lib/seo.js` |
| Tổng quan admin theo kỳ | `backend/services/dashboard.js`, `admin/views/pages/dashboard.njk`, component `dashboard` trong `pages.js` |
| Trạng thái đơn, vận chuyển, email báo khách | `INQUIRY_FLOW` + `updateInquiry` trong `services/inquiries.js`, `customerStatusUpdate` trong `mailer.js`, trang tra cứu `frontend/views/pages/track.njk` |
| Nhập khách hàng hàng loạt | `backend/services/customer-import.js` + panel trong `admin/views/pages/customers.njk` |
| Loại sản phẩm, thông số tự đặt, xem thử | `product_types` trong `services/catalog.js` (`TYPE_ACTIVE`, `IN_MAIN_LIST`), `/admin/preview/san-pham/:id` trong `routes/admin.js` |
| Địa chỉ phân cấp, chuyển hướng, trang 404 | `backend/lib/urls.js` (đường dẫn chuẩn), `backend/middleware/urls.js` (chuẩn hóa + áp dụng chuyển hướng), `backend/services/redirects.js`, `admin/views/pages/redirects.njk`; trang lỗi `frontend/views/pages/error.njk` + nhóm `pages` (phần errors) trong `settings-schema.js` |
| Chuyên mục blog | `services/content.js` (`listPostCategories`...), `routes/public.js` (`renderBlogList`) |
| Ảnh đơn hàng khách tải về | `frontend/public/js/order-image.js`, `buildReceipt` trong `app.js` |
| Tìm kiếm không dấu | `foldVn`, `likeVn`, hàm SQL `vn()` trong `backend/lib/db.js` |
| Chia phần thu gọn trong Cài đặt | `sectionize()` cuối `settings-schema.js`, `settingsPage` trong `pages.js`, `admin/views/pages/settings.njk` |
| Trang admin | `admin/views/pages/*.njk` + component tương ứng trong `admin/public/js/pages.js` |
| API admin | `backend/routes/admin-api/index.js` |
| Cấu trúc database | thêm file mới trong `database/migrations/` |
| Dữ liệu mẫu | `backend/scripts/seed.js` |

## 6b. Cách làm việc và kiểm tra (đọc trước khi làm tiếp)

- **Kiểm tra trên bản sao, không thử trên database thật:** sao chép dự án sang thư mục tạm (bỏ `node_modules`, dùng junction), tạo admin thử, chạy `PORT=3100 BASE_URL=http://localhost:3100 node backend/server.js` từ bản sao rồi điều khiển Chrome headless bằng CDP (WebSocket, Node 24) để đăng nhập, đặt đơn, chụp màn hình, đo tràn ngang. Sửa file thật xong thì `cp -r` sang bản sao và khởi động lại máy chủ thử (template bị cache).
- **Không bao giờ `taskkill /IM node.exe`:** lệnh này tắt cả `npm run dev` của chủ dự án. Chỉ dừng máy chủ thử theo PID cổng 3100 (`netstat -ano | grep :3100` → `taskkill /F /PID <số>`).
- **Git Bash trên Windows:** đặt `MSYS_NO_PATHCONV=1` khi truyền đường dẫn bắt đầu bằng `/` (nếu không bị đổi thành `C:/Program Files/Git/...`; lúc đó `taskkill` dùng một dấu `/F`). Dùng `cp -r`, không dùng `robocopy`.
- **Ghi script sửa file bằng công cụ Write rồi chạy `node script.mjs`:** đừng nhét code có dấu backtick hoặc `${...}` vào `node -e "..."` hoặc heredoc (shell nuốt mất, đã gây lỗi nhiều lần).
- Luôn `npm run backup` trước khi sửa; chỉ commit khi chủ dự án đồng ý; ghi `CHANGELOG.md` và file này khi xong việc lớn.

## 7. Lịch sử thay đổi

Xem [../CHANGELOG.md](../CHANGELOG.md).
