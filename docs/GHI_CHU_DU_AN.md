# Ghi chú dự án

Tài liệu "sổ tay" để tiếp tục phát triển: bối cảnh, các quyết định đã chốt, những gì đã xong, việc còn chờ. Cập nhật file này mỗi khi có quyết định hoặc thay đổi lớn.

_Cập nhật lần cuối: 19/10/2026 (sau đợt sửa Tổng quan, migration an toàn, chuyên mục blog index, Gallery nhiều kiểu)_

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
| Blog | Chia theo chuyên mục; trang chuyên mục (trang 1) **được index và có trong sitemap** (chủ dự án chốt 19/10/2026; chỉ chuyên mục hiện và có bài đã đăng). Tắt được ở Cài đặt › Nội dung các trang › Blog (`blog_category_index`) và Sitemap (`sitemap_blog_categories`); trang 2+ / có tham số luôn noindex | Trước đó noindex để tránh trùng nội dung; nếu thấy chuyên mục trùng với bài viết thì tắt lại. Cài đặt cũ `blog_category_noindex` không còn dùng |
| Gallery | Kiểu hiển thị chọn trong admin (19/10/2026): Tự động / Băng chuyền / Lưới tĩnh / Xếp gạch, 1–4 dòng, 2–6 cột (điện thoại 1–3), tỷ lệ ảnh, băng chuyền tự chạy hoặc đứng yên + hướng + tốc độ; trang Gallery giống trang chủ hoặc cấu hình riêng (`gallery_page_*`). Khách luôn kéo chuột / vuốt được. Mặc định giữ cách cũ: 2 × 4, hơn 8 ảnh thì băng chuyền tự chạy phải → trái. Tab "Tất cả" chỉ hiện ảnh bật "Hiện ở Gallery tổng", tab album hiện đủ ảnh | Chủ dự án muốn gallery tổng chọn lọc, album phụ chứa feedback / ảnh chưa chọn |
| Trạng thái đơn | Mỗi loại có chuỗi riêng: đơn hàng thêm **Đang giao hàng** (kèm đơn vị vận chuyển + mã vận đơn khách xem được, tùy chọn email báo khách); liên hệ kết thúc ở "Đã xử lý" | Ngày 17/10/2026 |
| Index / robots | **Đang TẮT index** cho tới khi chính thức vận hành (bật ở Cài đặt › SEO & mã theo dõi). Khi bật: robots chặn `/*?`; chỉ trang sạch được index; trang có tham số lọc / sắp xếp / tìm kiếm / phân trang là `noindex, follow` và không có canonical; tham số theo dõi (utm...) canonical về trang sạch | Ngày 18/10/2026. Trang 2 trở đi của danh sách không index, sản phẩm vào Google qua sitemap |
| Schema | Tự dựng từ cài đặt (nhóm Schema + Thông tin shop); đổi trả / giao hàng mặc định tắt, tác giả bài ghi là shop | Ngày 18/10/2026 |
| Font | Tự lưu trên máy chủ (database/data/fonts), tải một lần từ Google | Ngày 18/10/2026 |
| Phân quyền | Chủ shop toàn quyền; nhân viên theo **vai trò tùy chỉnh** (Admin › Vai trò & phân quyền): quyền chia nhóm Bán hàng / Sản phẩm / Nội dung / từng mục Cài đặt / Hệ thống. Vai trò "Nhân viên" có sẵn giữ quyền cũ. Quản lý tài khoản + vai trò không giao được. Đường dẫn / trang chưa khai báo quyền mặc định chỉ Chủ shop | Ngày 18/10/2026; `backend/config/permissions.js` |
| Tác giả blog | Bảng `authors` (tên, chức danh, giới thiệu, ảnh, liên kết); chọn khi viết bài; hiện đầu bài + khung "Về tác giả" + schema Person. **Không có trang tác giả riêng** (chủ dự án chốt). Bài chưa chọn tác giả ghi là shop | Ngày 18/10/2026 |
| Liên kết trong bài | Mặc định mở cùng tab, có ô tick "Mở trong tab mới"; mọi liên kết ra ngoài / tab mới có `rel="noopener"` | Ngày 18/10/2026 |
| Số dòng mỗi trang | Danh sách admin mặc định 20, chọn 20 / 30 / 50 / 100 (nhớ trên trình duyệt); Quay lại / Back luôn về đúng trang đang xem (bộ lọc + trang ghi vào địa chỉ) | Ngày 18/10/2026 |
| Tổng quan: so sánh | Nút "So sánh" mặc định tắt: kỳ liền trước / cùng kỳ năm trước / tùy chọn; biểu đồ không đổi; doanh thu chỉ tính đơn **Hoàn thành** | Ngày 18/10/2026 |
| Tổng quan: cách tính | Số "Đơn hàng" theo ngày đặt, **không gồm đơn đã hủy** (đếm riêng, bảng Tình trạng vẫn liệt kê); doanh thu theo ngày hoàn thành; "Doanh thu theo sản phẩm" lấy đơn hoàn thành, chia tổng tiền đơn (kể cả điều chỉnh) theo tỷ lệ thành tiền dòng hàng nên tổng khớp thẻ Doanh thu; biểu đồ cắt đúng theo kỳ (≤ 45 ngày theo ngày, ≤ 150 theo tuần, còn lại theo tháng); khung "Mới nhận" 20 dòng cuộn được | Ngày 19/10/2026 |
| Nhãn sản phẩm | Best Seller / Mới / Sale / Đã bán / Đặt trước / Có thể custom tùy chỉnh kiểu, hình dạng, màu, họa tiết, độ đặc (mặc định 100%) ở Cài đặt › Giao diện | Ngày 18/10/2026 |
| Bàn giao | Nội dung không nằm trong git; bàn giao bằng **gói nội dung sạch** `database/content-pack/` (`npm run export-content`) + `npm run bootstrap` ở máy nhận; trước khi mở bán: máy local là bản gốc, sau đó **server là bản gốc** (không ghi đè). Vercel không phù hợp (serverless, không ghi bền được SQLite / ảnh) | Ngày 18/10/2026; `docs/BAN_GIAO.md` |
| Cấu trúc URL | Phân cấp cha → con: `/san-pham/<loại>/<sản phẩm>`, `/blog/<chuyên mục>/<bài>`; địa chỉ cũ chuyển 301; shop chỉnh chuyển hướng ở Admin › Chuyển hướng & 404 | Ngày 17/10/2026, làm trước khi có tên miền nên chưa mất xếp hạng |
| Lên đơn | Custom / liên hệ "lên đơn" thì **chính bản ghi đó** chuyển thành đơn hàng (mã DH mới, mã cũ giữ ở `origin_code`, khách tra cứu được cả hai), không tạo bản ghi thứ hai | Ngày 17/10/2026; tránh đếm đôi. Bản ghi cũ tạo theo kiểu `parent_id` vẫn hiển thị bình thường |
| Doanh thu | Tính theo **ngày hoàn thành** của đơn (giờ Việt Nam), đơn hoàn thành cũ lấy ngày cập nhật cuối làm gần đúng | Chủ dự án chốt |
| Thứ tự sản phẩm | Admin kéo thả đổi vị trí; `sort_order` đứng đầu trong sắp xếp "Nổi bật" (khách) và khối nổi bật trang chủ, chưa sắp xếp thì Best Seller / nổi bật trước | `reorderProducts` trong `catalog.js`, ghi lại sort_order 1..n toàn cửa hàng |
| Tìm kiếm | Không phân biệt hoa/thường và dấu ("áo" = "Áo" = "ao") cho sản phẩm, bài viết, đơn, khách, ảnh | Hàm `vn()` trong SQLite |
| Menu | Mỗi mục có thể sổ dọc theo loại ngọc / màu / kiểu dáng / mệnh / loại sản phẩm / chuyên mục blog / bài mới / danh sách tự nhập. Mục Sản phẩm mặc định sổ theo loại ngọc, tự thêm các loại hàng khác đang hoạt động (Pháp phục) | |
| Giao diện admin | Menu bên trái: 4 nhóm chính (Bán hàng, Sản phẩm, Nội dung, Hệ thống) thu gọn, xổ ra khi đang dùng hoặc khi bấm tên nhóm; **trạng thái mở được nhớ** nên chuyển sang mục khác không tự đóng nhóm đang mở. Cài đặt: các nhóm gom thành 5 mục lớn có mô tả, mỗi mục cũng thu gọn và nhớ trạng thái. Trang nhiều thành phần chia phần thu gọn / mở ra; mỗi trang có khung "Mô tả cách hoạt động" ẩn / hiện | Ngày 18/10/2026 |
| Loại hàng khác ngọc (Pháp phục) | Hiện giống ngọc (thẻ sản phẩm, trang chi tiết) nhưng **không có bộ lọc** (bộ lọc chỉ cho ngọc), không hiện chung trong "Tất cả sản phẩm", chỉ xem qua menu / đường dẫn `?nhom=<slug>` / tìm kiếm | Chủ dự án chốt |
| Kích cỡ khi đặt hàng | Theo từng loại sản phẩm (nhãn, đơn vị, gợi ý, cho nhập riêng, ô thông tin thêm). Ngọc: ni số mm + "Ni khác"; loại khác: kích cỡ chữ, chỉ nhận trong danh sách, kèm ô thông tin thêm tùy loại (Pháp phục: chiều cao / cân nặng) | Ngày 18/10/2026; `product_types.size_*`, `info_label` |
| Quản lý kho | **Tùy chọn, mặc định tắt**; theo từng sản phẩm (tick "Theo dõi kho"), chưa theo từng kích cỡ. Trừ kho theo trạng thái đơn chọn được (mặc định Đã xác nhận), hoàn khi lùi / hủy / sửa / xóa; hết hàng tự hiện "Đã bán" | Ngày 18/10/2026; `services/stock.js`. Đơn chưa đến mốc trừ kho chưa giữ chỗ, nên khách đặt cùng lúc vẫn có thể vượt tồn (shop xử lý khi xác nhận) |
| Khách vs. người chỉ hỏi | **Không tách bảng**: một người một hồ sơ (SĐT là khóa); phân loại tự tính Người quan tâm / Đã đặt hàng / Đã mua / Mua lại. Liên hệ / custom kết thúc không mua dùng trạng thái Đã hủy, nhãn "Không phát sinh đơn" / "Không chốt đơn" | Ngày 18/10/2026; tránh trùng hồ sơ và gộp lại khi họ mua |
| Nhập lại dữ liệu cũ | Mọi form thêm thủ công / nhập hàng loạt có ô ngày (mặc định hôm nay, không cho tương lai); doanh thu tính theo ngày hoàn thành đã chọn | Ngày 18/10/2026; `vnDateToUtc` trong `lib/utils.js` (ngày khác hôm nay lưu 12:00 giờ Việt Nam) |
| Gợi ý tìm kiếm | Gõ từ 2 ký tự: sản phẩm + loại ngọc / loại sản phẩm khớp, bật / tắt ở Cài đặt | Ngày 18/10/2026 |
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

**Đã làm thêm ngày 17/10/2026 (đã commit `de2eba2`, `11a3925`):** nút Quay lại theo lịch sử trang, chọn 20/30/50 dòng, thêm đơn thủ công, mô tả cách hoạt động (ẩn/hiện), dashboard tách đơn / custom / liên hệ, **lên đơn trên cùng một bản ghi**, trình soạn thảo đầy đủ (bảng, màu, ảnh alt / kích thước / căn lề), **URL phân cấp + chuyển hướng 301/302/410 + nhật ký 404**, trang 404 cấu hình được, tiêu đề không nhảy cấp, ảnh có width/height + fetchpriority, cache, Permissions-Policy, nhãn ảnh sản phẩm trong hơn, rà responsive 34 trang (xem CHANGELOG.md).

**Đã làm thêm ngày 18/10/2026** (xem CHANGELOG.md, các commit từ `c581284` trở đi): nhãn sản phẩm tùy chỉnh; **SEO kỹ thuật** (tắt index đến khi chính thức, chính sách địa chỉ có tham số, robots.txt, nhóm cài đặt Schema, og:image dự phòng, font tự lưu, Swiper / PhotoSwipe / Quill tải khi cần, `npm run check:seo`, khung "Chuẩn bị mở website chính thức" ở Tổng quan); **tác giả blog**; **phân quyền theo vai trò**; liên kết mở tab mới + noopener; **truy cập (a11y)** (nhãn nút / ô nhập, vùng bấm ≥ 24px, quét tự động còn 0 lỗi); menu Cài đặt + menu admin thu gọn nhớ trạng thái; **rà soát bảo mật** (73 kiểm tra tấn công, đã vá lỗi né quyền bằng dấu "/" cuối); so sánh kỳ ở Tổng quan; cảnh báo khi đổi trạng thái / sửa giá đơn hoàn thành; giỏ hàng báo sản phẩm không còn bán; số dòng 20 / 30 / 50 / 100.

**Trạng thái dữ liệu thật (database/data/app.sqlite) cần nhớ:** `allow_indexing` đang **TẮT**; nhóm Schema đã lưu (loại hình `LocalBusiness`, `author_type` = person, `search_action` = tắt); migration 009 → 012 đã chạy; còn dữ liệu mẫu (số điện thoại 0900 000 000, email hello@example.com, địa chỉ "Thành phố Hà Nội", mạng xã hội chưa trỏ về trang thật, 2 sản phẩm Pháp phục thử). Khung "Chuẩn bị mở website chính thức" ở Tổng quan liệt kê đúng những mục này.

**Đã làm 18/10/2026 (đợt cuối ngày, xem CHANGELOG.md):** kích cỡ theo loại sản phẩm (Pháp phục chọn S/M/L + thông tin thêm), quản lý kho tùy chọn, gợi ý khi gõ tìm kiếm, phân loại khách tự tính, ô chọn ngày khi nhập lại dữ liệu cũ, sửa sắp xếp "Bán chạy" quá chậm. **Migration 013 chưa chạy trên database thật** (chạy khi `npm run dev` khởi động lại; đã sao lưu `database/backups/2026-10-18-07-23`). Kho đang TẮT, gợi ý tìm kiếm đang BẬT.

**Đã làm 19/10/2026 (xem CHANGELOG.md):** (1) biểu đồ Tổng quan cắt đúng theo kỳ (tháng hiện theo ngày từ ngày 1, nhãn tháng "T10"); (2) đơn đã hủy không tính vào số đơn; "Bán chạy" thành **Doanh thu theo sản phẩm** (tổng khớp thẻ Doanh thu); khung "Mới nhận" 20 dòng cuộn được; cột phải đổi đúng theo kỳ; (3) **migration**: dev tự chạy, production không (`AUTO_MIGRATE`), tự chụp database vào `database/data/pre-migrate/` trước khi chạy, lỗi thì dừng rõ ràng; (4) **trang chuyên mục blog được index + vào sitemap** (tắt được); (5) **Gallery** nhiều kiểu hiển thị (băng chuyền kéo / vuốt được, lưới, xếp gạch, 1–4 dòng, chuyển động tùy chọn). Đã đẩy lên GitHub và deploy Vercel (bản xem thử). `npm test`: 62 kiểm tra. **Chưa kiểm tra:** Gallery và Tổng quan trên điện thoại thật (mới thử Chrome giả lập), vuốt cảm ứng.

**Mở web chính thức (làm cuối cùng):** bật "Cho phép Google lập chỉ mục", điền thông tin thật (khung "Chuẩn bị mở website chính thức" ở Tổng quan liệt kê các mục còn mẫu), đặt BASE_URL đúng tên miền, chạy `npm run check:seo -- https://tenmien.vn`, rồi gửi sitemap lên Search Console.

**Việc đầu tiên của phiên sau:** nhắc chủ dự án **khởi động lại `npm run dev`** (Ctrl+C rồi chạy lại) để nạp code mới. Migration 013 (kích cỡ / kho) có thể vẫn chưa chạy trên database thật: lần khởi động này sẽ chạy, tự chụp bản sao vào `database/data/pre-migrate/` (và đã có sao lưu đầy đủ ở `database/backups/`). Nếu server báo lỗi migration thì dừng lại, đọc tên file trong thông báo.

## 4. Việc tiếp theo

- [ ] Thử Gallery (kéo / vuốt, các kiểu hiển thị) và Tổng quan trên điện thoại thật; chọn kiểu Gallery ưng ý
- [ ] Xem lại trang chuyên mục blog sau khi mở index: nếu thấy trùng nội dung với bài viết thì tắt "Cho Google lập chỉ mục các trang chuyên mục blog"
- [ ] Đặt `SESSION_SECRET` / `APP_SECRET` (≥ 32 ký tự) trong `.env` của server: production từ chối chạy nếu thiếu (`setup-vps.sh` tự sinh). Máy dev dùng khóa suy ra từ đường dẫn thư mục (cố định, không ngẫu nhiên) nên mật khẩu Gmail lưu trên máy dev chỉ giải mã được khi dự án vẫn ở đúng thư mục đó; chuyển máy / đổi thư mục thì nhập lại mật khẩu email, và `APP_SECRET` trên server không được đổi sau khi đã lưu mật khẩu email
- [ ] Thử kích cỡ Pháp phục + kho trên điện thoại thật và trên bản chạy thật (đã kiểm tra bằng Chrome trên bản sao); chọn có bật Quản lý kho không
- [ ] Nhập lại đơn / khách đã có bên ngoài bằng ô chọn ngày; kiểm tra Tổng quan khớp doanh thu cũ
- [ ] Nhận mẫu giao diện + tông màu từ chủ dự án → chỉnh `frontend/src/css/app.css`, các template trong `frontend/views/`, và giá trị mặc định nhóm `theme` trong `settings-schema.js` (bố cục chưa chốt)
- [ ] Mua VPS + tên miền, chạy `deploy/setup-vps.sh`
- [ ] Cấu hình Gmail App Password, thử gửi đơn thật và email báo giao hàng
- [ ] Thử trên điện thoại thật (iPhone Safari, Android): menu, ảnh đơn hàng + nút chia sẻ, admin responsive
- [ ] Thay dữ liệu mẫu bằng sản phẩm, ảnh, giấy kiểm định thật; xóa ảnh mẫu (Thư viện ảnh, thư mục "sample") và 2 mẫu Pháp phục thử
- [ ] Nhập nội dung thật: Về shop, chính sách, SEO từng trang, chuyên mục + banner blog
- [ ] Gửi sitemap lên Google Search Console, kiểm tra Rich Results
- [ ] Sau khi có tên miền: kiểm tra www → tên miền chính (301 trong `deploy/nginx.conf`), HTTPS, tốc độ bằng PageSpeed Insights (LCP / CLS thật), xem tab "Trang bị lỗi 404" để tạo chuyển hướng
- [ ] Thử trình soạn thảo bằng bài thật (bảng dài, nhiều ảnh) và xem bài trên điện thoại thật
- [ ] **Mở web chính thức:** bật "Cho phép Google lập chỉ mục" (Cài đặt › SEO & mã theo dõi) CHỈ khi đã có tên miền + nội dung thật; đặt `BASE_URL` đúng trong `.env`; `npm run check:seo -- https://tenmien.vn` không lỗi; gửi sitemap lên Search Console
- [ ] Điền thông tin thật cho khung "Chuẩn bị mở website chính thức" (điện thoại, email, địa chỉ, mạng xã hội, ảnh chia sẻ 1200×630, mã Search Console, địa chỉ có cấu trúc trong Cài đặt › Schema)
- [ ] Tạo tác giả thật (Admin › Tác giả blog) và chọn cho các bài; tạo vai trò + tài khoản nhân viên thật nếu cần (Vai trò & phân quyền)
- [ ] Chỉ bật đổi trả / giao hàng trong Cài đặt › Schema khi shop thật sự áp dụng
- [ ] **Đọc lại và sửa 4 trang chính sách mẫu** (Cài đặt › Trang chính sách) rồi tick "Đã xác nhận"
- [ ] **Đặt lịch sao lưu chép ra ngoài server** (`npm run pull-backup` + `deploy/dat-lich-tai-sao-luu.ps1`, hoặc rclone `deploy/offsite-backup.sh`), chưa thử trên server thật
- [ ] Nên bật 2FA cho Chủ shop (Tài khoản & bảo mật); cân nhắc giao quyền sao lưu / email / xóa dữ liệu cho ai

**Khi muốn mở bán Pháp phục** (loại đã có sẵn, đang thử nghiệm): nhập sản phẩm thật, kiểm tra bằng "Xem thử như khách", rồi Admin › Sản phẩm › Loại sản phẩm › Bật hoạt động. Còn thiếu trước khi mở bán thật: thanh toán/chuyển khoản nếu cần, kho theo từng kích cỡ nếu cần (hiện kho theo sản phẩm), schema SEO riêng cho loại không phải ngọc. Kích cỡ khi đặt hàng đã có (Sản phẩm › Loại sản phẩm › Lựa chọn khi khách đặt hàng).

**Ý tưởng có thể làm sau (chưa ai yêu cầu):**
- Menu máy tính mở submenu bằng chạm cho iPad nằm ngang (hiện chỉ rê chuột / bàn phím)
- Tự lưu font Google trên máy chủ, thêm AVIF và Brotli (tối ưu tốc độ thêm)
- Bảng trong trình soạn thảo: gộp ô, dòng tiêu đề (cần thư viện bảng riêng, Quill 2 chỉ có bảng cơ bản)
- Nút Quay lại giữ riêng loại đơn khi mở thẳng danh sách (hiện về /inquiries tất cả loại); trang Khách hàng chưa ghi bộ lọc vào URL
- Trạng thái thanh toán (trừ kho tự động đã có, tùy chọn); kho theo từng kích cỡ; giữ chỗ tồn kho cho đơn chưa xác nhận
- Gộp "SEO Google & chia sẻ" vào cùng trang với nội dung từng trang (hiện tách 2 nhóm, đã ghi rõ ô nào lấy từ đâu)
- Hỗ trợ ảnh HEIC của iPhone (cần sharp build kèm libheif)
- Tra cứu mã chứng chỉ kiểm định trên website
- Đăng nhập Zalo/Google cho khách, lịch sử đơn của khách
- Thông báo đơn mới qua Telegram/Zalo OA
- Song ngữ Việt – Anh
- Bắt buộc 2FA cho nhân viên, mã khôi phục 2FA, hết phiên khi không hoạt động
- Admin tự lưu font (hiện admin còn tải Google Fonts); nén (minify) `app.js` và JS admin nếu cần
- Trang lọc có thể được index riêng (hiện mọi địa chỉ có tham số `noindex`, `Disallow: /*?`) nếu sau này muốn làm landing theo màu / kiểu dáng

## 5. Hạn chế đã biết

| Vấn đề | Ghi chú |
|---|---|
| Ảnh HEIC (iPhone) không upload được | Hướng dẫn người dùng chụp JPG, đã ghi trong HUONG_DAN_SU_DUNG.md |
| SQLite chạy 1 tiến trình | Đủ cho hàng nghìn sản phẩm / đơn. Nếu sau này cần nhiều server thì chuyển sang PostgreSQL. Số đo 18/10/2026 (máy dev): 20.000 sản phẩm + 50.000 khách + 100.000 yêu cầu: trang sản phẩm 23 ms, tìm chữ 270 ms, danh sách khách admin 0,8 s, tìm khách 2 s. Với vài nghìn dòng mọi thao tác dưới 0,2 s. Xem mục "Khi nào cần nâng cấp" trong DANH_CHO_LAP_TRINH_VIEN.md |
| Alpine.js cần `'unsafe-eval'` trong CSP | Toàn bộ nội dung người dùng nhập đều escape/sanitize; ghi chú tại `backend/middleware/security.js` |
| Trên Windows, `node --watch` in dòng "Completed running..." sau mỗi lần tự khởi động lại | Chỉ là thông báo, server vẫn chạy bình thường. `npm run dev` chỉ theo dõi thư mục `backend` (sửa `frontend` / `admin` chỉ cần tải lại trang) |
| **Migration**: dev tự chạy khi server khởi động, production không | `AUTO_MIGRATE` (mặc định bật khi dev, tắt khi production; `deploy/update.sh` đã chạy `npm run migrate`). Production còn migration chưa chạy thì server từ chối lên và báo rõ. Mỗi lần có migration mới, database đã có dữ liệu tự được chụp vào `database/data/pre-migrate/` (5 bản gần nhất); lỗi thì file đó hoàn tác, server dừng và nêu rõ file nào. Vẫn nên `npm run backup` (có cả ảnh) trước khi thêm migration |
| `.npmrc` đặt `ignore-scripts=true` | Thư viện native (better-sqlite3, sharp, tailwind) dùng bản build sẵn, máy mới không cần Python / trình biên dịch. Nếu sau này thêm thư viện **bắt buộc** chạy script cài đặt thì cần xem lại |
| Kho theo sản phẩm, chưa theo kích cỡ; đơn chưa xác nhận chưa giữ chỗ | Hai khách đặt cùng lúc món chỉ còn 1 đều gửi được đơn (chặn khi đặt chỉ dựa vào số còn tại lúc gửi); shop xử lý khi xác nhận, kho có thể về âm (hiện "Kho: 0", admin thấy số âm trong lịch sử) |
| `npm run dev` có thể không tự khởi động lại khi sửa file `backend` (đã gặp 17/10/2026) | Nếu thấy tính năng mới không chạy, kiểm tra thời gian khởi động tiến trình (`Get-Process -Id <PID>`) rồi khởi động lại thủ công. Không dùng `taskkill /IM node.exe` |
| CSP cần `'unsafe-eval'` (Alpine), font Google tải ngoài, `npm audit` mức thấp của Quill 2.0.3 | Xem mục 5b |
| Ảnh đơn hàng cho khách vẽ trên trình duyệt | Cần font đã tải; nếu trình duyệt khách quá cũ có thể không tạo được ảnh (khách vẫn đặt hàng bình thường) |
| Tìm kiếm tiếng Việt quét toàn bảng (`vn()`) | Không dùng chỉ mục; nhanh với vài nghìn dòng, cần xem lại nếu lên hàng chục nghìn |
| Danh sách admin ghi bộ lọc vào URL | `listPage` trong `pages.js` dùng `history.replaceState` để nút Quay lại giữ bộ lọc / trang; trang khách hàng có hàm tải riêng nên chưa giữ |
| robots.txt chặn mọi địa chỉ có tham số (`Disallow: /*?`) | Có `Allow` riêng cho /assets, /theme.css, /vendor, /fonts, /uploads (CSS / JS dùng ?v=). Trang 2+ của danh sách không được index, sản phẩm vào Google qua sitemap |
| Font Google tải về máy chủ ở lần chạy đầu | Cần máy chủ ra được internet; chưa tải được thì tạm dùng link Google. Thư mục `database/data/fonts` không đưa lên git, tự tải lại |
| Phân quyền theo đường dẫn | Thêm API / trang admin mới PHẢI khai báo ở `permissions.js`, nếu không chỉ Chủ shop dùng được. Quyền sao lưu / email / xóa dữ liệu là nhạy cảm |
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
| Tổng quan admin theo kỳ (đơn hủy không tính vào số đơn; doanh thu theo sản phẩm chia từ tổng đơn hoàn thành) | `backend/services/dashboard.js` (`revenueByProduct`, `bucketer`), `admin/views/pages/dashboard.njk`, component `dashboard` trong `pages.js` |
| Trạng thái đơn, vận chuyển, email báo khách | `INQUIRY_FLOW` + `updateInquiry` trong `services/inquiries.js`, `customerStatusUpdate` trong `mailer.js`, trang tra cứu `frontend/views/pages/track.njk` |
| Nhập khách hàng hàng loạt | `backend/services/customer-import.js` + panel trong `admin/views/pages/customers.njk` |
| Loại sản phẩm, thông số tự đặt, xem thử | `product_types` trong `services/catalog.js` (`TYPE_ACTIVE`, `IN_MAIN_LIST`), `/admin/preview/san-pham/:id` trong `routes/admin.js` |
| Kích cỡ khi đặt hàng, ô thông tin thêm | `size_cfg` trong `hydrate` (`catalog.js`), kiểm tra ở `createInquiry` (`inquiries.js`), `productBuy` / giỏ hàng trong `app.js`, form loại ở `admin/views/pages/products.njk` |
| Quản lý kho | `services/stock.js` (`syncInquiryStock`, `setStockQty`), trường `track_stock` / `stock_qty` trong `saveProduct`, nhóm cài đặt `features` (mục Quản lý kho) |
| Gợi ý tìm kiếm | `suggestProducts` (`catalog.js`), `/api/search-suggest` (`api-public.js`), `searchSuggest` trong `app.js`, `partials/header.njk` |
| Phân loại khách, ngày nhập lại | `CUSTOMER_SEGMENTS` / `customerQuery` (`inquiries.js`), `vnDateToUtc` / `vnDayOf` (`lib/utils.js`), cột ngày trong `customer-import.js` |
| Địa chỉ phân cấp, chuyển hướng, trang 404 | `backend/lib/urls.js` (đường dẫn chuẩn), `backend/middleware/urls.js` (chuẩn hóa + áp dụng chuyển hướng), `backend/services/redirects.js`, `admin/views/pages/redirects.njk`; trang lỗi `frontend/views/pages/error.njk` + nhóm `pages` (phần errors) trong `settings-schema.js` |
| Gallery (kiểu hiển thị, băng chuyền) | `backend/lib/gallery-view.js` (`galleryView`), `frontend/views/partials/gallery-grid.njk`, `initCarousels` trong `frontend/public/js/app.js`, CSS `.gallery-*` trong `frontend/src/css/app.css`, trường `gallery_*` (nhóm `home`) và `gallery_page_*` (nhóm `pages`) |
| Chuyên mục blog | `services/content.js` (`listPostCategories`...), `routes/public.js` (`renderBlogList`) |
| Ảnh đơn hàng khách tải về | `frontend/public/js/order-image.js`, `buildReceipt` trong `app.js` |
| Tìm kiếm không dấu | `foldVn`, `likeVn`, hàm SQL `vn()` trong `backend/lib/db.js` |
| Chia phần thu gọn trong Cài đặt | `sectionize()` cuối `settings-schema.js`, `settingsPage` trong `pages.js`, `admin/views/pages/settings.njk` |
| Trang admin | `admin/views/pages/*.njk` + component tương ứng trong `admin/public/js/pages.js` |
| API admin | `backend/routes/admin-api/index.js` |
| Phân quyền, vai trò | `backend/config/permissions.js` (nhóm quyền, `API_RULES`, `PAGE_RULES`, `SETTINGS_PERMISSION`), `backend/services/roles.js`, `users.js` (`withPermissions`), trang `admin/views/pages/roles.njk` + `rolesPage` trong `pages.js` |
| Tác giả blog | `services/content.js` (`listAuthors`, `saveAuthor`), `admin/views/pages/authors.njk`, khung cuối bài trong `frontend/views/pages/post.njk`, schema ở `articleJsonLd` (`lib/seo.js`) |
| Liên kết trong bài (tab mới, noopener) | `SmartLink` + hộp liên kết trong `admin/public/js/core.js`, `cleanHtml` trong `backend/lib/sanitize.js` |
| SEO: canonical, noindex, tham số, schema, og:image | `buildSeo` và các hàm JSON-LD trong `backend/lib/seo.js`; robots.txt / sitemap trong `lib/robots-sitemap.js`; nhóm cài đặt `schema`, `seo`, `sitemap` |
| Kiểm tra SEO tự động | `backend/scripts/check-seo.js` (`npm run check:seo`) |
| Chuẩn bị mở web | `backend/services/launch-check.js` (khung ở Tổng quan) |
| Font tự lưu | `backend/services/fonts.js`, `base.njk` (`fonts.local` / `fonts.google`) |
| Nhãn sản phẩm | `backend/lib/tags.js` (CSS sinh vào `/theme.css`), lớp `.tag .tag-<tên>`, nhóm cài đặt theme › Nhãn |
| Menu admin / menu Cài đặt thu gọn | `navGroup` trong `admin/public/js/core.js`, `admin/views/layout.njk`; `SETTINGS_CATEGORIES` trong `settings-schema.js`, `admin/views/pages/settings.njk` |
| Mô tả cách hoạt động từng trang admin | `admin/views/partials/page-help.njk` (thêm nhánh `helpKey`) |
| Bàn giao, cài máy mới | `backend/lib/content-pack.js`, `backend/scripts/bootstrap.js` / `export-content.js` / `import-content.js`, `chay-thu.bat` / `chay-thu.sh`, tài liệu `docs/BAN_GIAO.md` |
| Trang chính sách | `services/policies.js`, `lib/policy-defaults.js` (nội dung mẫu), nhóm cài đặt `policies`, `pages/policy.njk`, chân trang trong `partials/footer.njk` |
| Sao lưu ra ngoài server | `scripts/pull-backup.js` (máy riêng), `deploy/offsite-backup.sh` (rclone), `deploy/dat-lich-tai-sao-luu.ps1`, `services/backup-status.js` (nhắc ở Tổng quan) |
| Cấu trúc database | thêm file mới trong `database/migrations/` |
| Dữ liệu mẫu | `backend/scripts/seed.js` |

## 6b. Cách làm việc và kiểm tra (đọc trước khi làm tiếp)

- **Kiểm tra trên bản sao, không thử trên database thật:** sao chép dự án sang thư mục tạm (bỏ `node_modules`, dùng junction), tạo admin thử, chạy `PORT=3100 BASE_URL=http://localhost:3100 node backend/server.js` từ bản sao rồi điều khiển Chrome headless bằng CDP (WebSocket, Node 24) để đăng nhập, đặt đơn, chụp màn hình, đo tràn ngang. Sửa file thật xong thì `cp -r` sang bản sao và khởi động lại máy chủ thử (template bị cache).
- **Không bao giờ `taskkill /IM node.exe`:** lệnh này tắt cả `npm run dev` của chủ dự án. Chỉ dừng máy chủ thử theo PID cổng 3100 (`netstat -ano | grep :3100` → `taskkill /F /PID <số>`).
- **Git Bash trên Windows:** đặt `MSYS_NO_PATHCONV=1` khi truyền đường dẫn bắt đầu bằng `/` (nếu không bị đổi thành `C:/Program Files/Git/...`; lúc đó `taskkill` dùng một dấu `/F`). Dùng `cp -r`, không dùng `robocopy`.
- **Ghi script sửa file bằng công cụ Write rồi chạy `node script.mjs`:** đừng nhét code có dấu backtick hoặc `${...}` vào `node -e "..."` hoặc heredoc (shell nuốt mất, đã gây lỗi nhiều lần).
- **Kiểm tra giao diện bằng Chrome CDP:** Chrome ở `C:/Program Files/Google/Chrome/Application/chrome.exe`, bật `--headless=new --remote-debugging-port=9333`, nói chuyện qua WebSocket (Node 24 có sẵn `WebSocket`, `fetch`, `node:sqlite` để đọc database bản sao). Mẫu kịch bản: đăng nhập admin thử, `Emulation.setDeviceMetricsOverride` đổi độ rộng, đo `scrollWidth > clientWidth`, chụp màn hình, kiểm tra thứ tự H1–H6. Kịch bản dài (hơn 7 phút) thì chạy nền.
- **Sửa file có `${...}` hoặc backtick:** dùng công cụ Edit; script sửa nhiều chỗ thì ghi bằng Write rồi `node script.mjs` (heredoc làm mất dấu `\` và `$`, đã gây lỗi nhiều lần).
- **Kiểm thử tự động:** `npm test` (thư mục `tests/`, mỗi file chạy trong tiến trình riêng với `LN_DATA_DIR` thư mục tạm, `LN_PACK_DIR`, `LN_NO_FONTS`; `tests/helpers.js` có `boot()` dựng website + phiên đăng nhập admin). Sửa logic đơn hàng / quyền / SEO / làm sạch HTML / gói nội dung thì chạy và bổ sung kiểm thử cho trường hợp mới. Tính năng mới đụng tới các mảng trên nên có thêm ít nhất một kiểm tra.
- **Kiểm tra SEO / URL:** chạy server (bản sao) rồi `npm run check:seo -- http://localhost:3100`; phải không có lỗi trước khi bàn giao thay đổi liên quan trang khách.
- **Kiểm tra bảo mật / phân quyền:** tạo thêm tài khoản nhân viên thử (`npm run create-admin -- staff@local.test "Tên" "MatKhau123" staff`) trên bản sao, tạo vai trò thử rồi gọi API bằng nhiều biến thể đường dẫn (dấu "/" cuối, chữ hoa, "//"). Giới hạn đăng nhập nằm trong bộ nhớ: gặp 429 thì khởi động lại máy chủ thử.
- **Tránh lỗi quen:** không chạy `node backend/server.js` từ bản sao mà quên đặt `PORT=3100` (sẽ chiếm cổng 3000 của chủ dự án); script sửa file nhiều dòng ghi bằng công cụ Write (heredoc trong bash hay làm mất `\`); máy chủ thử cần 5–10 giây để khởi động (migration + tải font).
- Luôn `npm run backup` trước khi sửa; chỉ commit khi chủ dự án đồng ý; ghi `CHANGELOG.md` và file này khi xong việc lớn.

## 7. Lịch sử thay đổi

Xem [../CHANGELOG.md](../CHANGELOG.md).
