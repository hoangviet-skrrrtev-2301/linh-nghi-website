# Ghi chú dự án

Tài liệu "sổ tay" để tiếp tục phát triển: bối cảnh, các quyết định đã chốt, những gì đã xong, việc còn chờ. Cập nhật file này mỗi khi có quyết định hoặc thay đổi lớn.

_Cập nhật lần cuối: 16/10/2026_

---

## 1. Bối cảnh

- **Sản phẩm:** website bán vòng tay ngọc (phỉ thúy, bích ngọc, hòa điền, thạch anh...) cho shop **Linh Nghi Jade** (tên tạm, đổi được trong admin).
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

**Đã hoàn thành và đã kiểm tra trên trình duyệt thật (Edge headless, desktop + mobile):**

- Trang khách: trang chủ (banner nhiều slide, khối thông tin có popup, sản phẩm nổi bật, chứng chỉ kiểm định, phân loại, phong thủy, bảng ni + tính ni nhanh, custom, gallery, cảm nhận khách, blog), sản phẩm (tìm kiếm, bộ lọc, sắp xếp, phân trang), chi tiết sản phẩm, gallery, hướng dẫn size (có video YouTube), blog, giỏ hàng, thiết kế riêng, liên hệ, về shop, trang 404.
- Popup: xem nhanh sản phẩm, nội dung khối thông tin, yêu cầu tư vấn / đặt nhanh, chào mừng (bật/tắt), toast.
- Nhãn sản phẩm: Best Seller, Mới (tự động theo số ngày), Sale %, Đặt trước, Đã bán, Có thể custom; ảnh góc khác khi di chuột.
- Gửi email: thông báo cho shop + xác nhận cho khách. **Mới kiểm tra nội dung email, chưa gửi thật bằng Gmail.**
- Admin: tổng quan, đơn hàng / custom / liên hệ (trạng thái, ghi chú, gửi lại email), khách hàng (gộp theo SĐT, nhãn, xuất CSV), sản phẩm, danh mục, gallery (kéo thả sắp xếp), blog (hẹn giờ đăng), thư viện ảnh, 13 nhóm cài đặt, tài khoản, 2FA, nhật ký.
- SEO: meta, Open Graph, canonical, JSON-LD, sitemap, robots, SEO riêng từng trang / sản phẩm / bài viết.
- Bảo mật: xem `BAO_MAT_SAO_LUU.md`.
- Vận hành: script cài VPS, cập nhật, sao lưu tự động hằng đêm, khôi phục (`npm run restore`).

**Chưa kiểm tra được (cần môi trường thật):**
- Gửi email thật qua Gmail (cần Gmail + App Password của shop).
- `deploy/setup-vps.sh` trên VPS Ubuntu thật (mới kiểm tra cú pháp).

## 4. Việc tiếp theo

- [ ] Nhận mẫu giao diện + tông màu từ chủ dự án → chỉnh `frontend/src/css/app.css`, các template trong `frontend/views/`, và giá trị mặc định nhóm `theme` trong `settings-schema.js`
- [ ] Mua VPS + tên miền, chạy `deploy/setup-vps.sh`
- [ ] Cấu hình Gmail App Password, thử gửi đơn thật
- [ ] Thay dữ liệu mẫu bằng sản phẩm, ảnh, giấy kiểm định thật; xóa ảnh mẫu (Thư viện ảnh, thư mục "sample")
- [ ] Nhập nội dung thật: Về shop, chính sách, SEO từng trang
- [ ] Gửi sitemap lên Google Search Console

**Ý tưởng có thể làm sau (chưa ai yêu cầu):**
- Hỗ trợ ảnh HEIC của iPhone (cần sharp build kèm libheif)
- Tra cứu mã chứng chỉ kiểm định trên website (đã từng đề xuất, chủ dự án chọn phương án "Ảnh + thông tin mã số")
- Đăng nhập Zalo/Google cho khách, lịch sử đơn của khách
- Thông báo đơn mới qua Telegram/Zalo OA
- Song ngữ Việt – Anh

## 5. Hạn chế đã biết

| Vấn đề | Ghi chú |
|---|---|
| Ảnh HEIC (iPhone) không upload được | Hướng dẫn người dùng chụp JPG, đã ghi trong HUONG_DAN_SU_DUNG.md |
| SQLite chạy 1 tiến trình | Đủ cho hàng nghìn sản phẩm / đơn. Nếu sau này cần nhiều server thì chuyển sang PostgreSQL |
| Alpine.js cần `'unsafe-eval'` trong CSP | Toàn bộ nội dung người dùng nhập đều escape/sanitize; ghi chú tại `backend/middleware/security.js` |
| Trên Windows, `node --watch` in dòng "Completed running..." sau mỗi lần tự khởi động lại | Chỉ là thông báo, server vẫn chạy bình thường |
| `.npmrc` đặt `ignore-scripts=true` | Thư viện native (better-sqlite3, sharp, tailwind) dùng bản build sẵn, máy mới không cần Python / trình biên dịch. Nếu sau này thêm thư viện **bắt buộc** chạy script cài đặt thì cần xem lại |

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
| Trang admin | `admin/views/pages/*.njk` + component tương ứng trong `admin/public/js/pages.js` |
| API admin | `backend/routes/admin-api/index.js` |
| Cấu trúc database | thêm file mới trong `database/migrations/` |
| Dữ liệu mẫu | `backend/scripts/seed.js` |

## 7. Lịch sử thay đổi

Xem [../CHANGELOG.md](../CHANGELOG.md).
