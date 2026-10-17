# Lịch sử thay đổi

Ghi lại các thay đổi đáng chú ý, mới nhất ở trên cùng.

## Chưa phát hành

- robots.txt và sitemap.xml quản lý được trong Admin › Cài đặt › Sitemap & robots.txt: chọn loại trang đưa vào sitemap (trang chính, trang lọc loại ngọc, sản phẩm, bài blog), bỏ từng đường dẫn hoặc cả nhóm (`/blog/*`), thêm đường dẫn riêng, kèm ảnh đại diện sản phẩm/bài viết (image sitemap), chặn đường dẫn trong robots.txt, chặn bot AI, quy tắc robots.txt nâng cao (lọc dòng sai cú pháp). Đường dẫn trang quản trị không bao giờ xuất hiện trong robots.txt. Logic nằm ở `backend/lib/robots-sitemap.js`
- Thư viện ảnh theo thư mục: tạo / đổi tên / xóa thư mục (xóa thì ảnh về "Chung"), tải ảnh vào thư mục đang chọn hoặc kéo thả vào thư mục, duyệt theo thư mục, chọn nhiều ảnh để chuyển thư mục, đổi thư mục từng ảnh. Hộp chọn ảnh (khi gắn ảnh cho sản phẩm, blog...) cũng duyệt và tải lên theo thư mục
- Chân trang: ô ảnh "Đã thông báo Bộ Công Thương" kèm link (Admin › Thông tin shop)
- Trang Chọn size: video hướng dẫn nhận link TikTok (dạng đầy đủ /@tên/video/số) hoặc YouTube; TikTok hiển thị khung dọc
- Sửa: thông báo (toast) admin ở chế độ tối; menu website không xuống dòng ở màn hình ~1100px (nút số điện thoại chỉ hiện từ màn hình rộng)
- Database: migration `004_media_folders.sql`
- Admin: thêm khách hàng thủ công (khách liên hệ qua Zalo, Facebook, cửa hàng...) với trường "Nguồn khách"; tạo đơn hàng hoặc ghi nhận yêu cầu custom ngay từ trang khách
- Admin: sửa dòng hàng, đơn giá, số lượng, thêm sản phẩm từ kho hoặc dòng tự nhập, giảm giá / phụ phí kèm lý do; tổng tiền tự tính lại. Khách thấy khoản điều chỉnh ở trang tra cứu
- Admin: nút "Lên đơn hàng từ yêu cầu này" (custom, liên hệ) tạo đơn mới có mã riêng, liên kết hai chiều với yêu cầu gốc
- Admin › Khách hàng: lọc theo một hoặc nhiều tháng (theo giờ Việt Nam), hai chế độ "có phát sinh đơn/yêu cầu" và "khách mới tạo", nút nhanh (tháng này, tháng trước, 3/6 tháng), tổng kết số khách / đơn / tiền đã mua; xuất CSV theo bộ lọc
- Admin: chế độ tối (nút ở thanh trên, nhớ lựa chọn, mặc định theo thiết bị)
- Trang giỏ hàng có link "Tra cứu đơn hàng"
- Database: migration `003_customers_orders_admin.sql` (customers.source; inquiries.parent_id, adjustment, adjustment_note, channel, created_by)
- Khách tra cứu tình trạng đơn tại `/tra-cuu-don` bằng mã đơn + số điện thoại (đơn hàng, custom, liên hệ): thanh tiến trình, sản phẩm, tổng tiền, lời nhắn theo trạng thái (sửa ở Admin › Biểu mẫu & đặt hàng). Giới hạn 12 lần / 10 phút, không lộ địa chỉ, email, ghi chú nội bộ. Link tra cứu có ở hộp "Gửi thành công", email xác nhận và chân trang
- Giao diện khách có chế độ tối (dark mode): nút mặt trăng/mặt trời ở header, nhớ lựa chọn của khách (localStorage `ln_theme`), mặc định theo thiết bị; không bị nháy sáng khi tải trang. Bảng màu tối và tùy chọn bật/tắt nằm ở Admin › Giao diện (nhóm `theme`, các trường `dark_*`). Logo tự đổi sang bản trắng. Khối nền chủ đạo lớn dùng lớp `.panel-primary`
- Admin › Sản phẩm: thêm nhanh loại ngọc / màu sắc / kiểu dáng / mệnh mới ngay trong form (lưu vào Danh mục, tự có trong bộ lọc)
- Thêm mạng xã hội Threads (cài đặt Thông tin shop, chân trang, JSON-LD)
- Trình soạn thảo (blog, mô tả sản phẩm): sửa lỗi nút chèn ảnh (Quill bị bọc Proxy của Alpine nên getSelection lỗi), cho chọn nhiều ảnh một lần, nhãn tiêu đề tiếng Việt (H2/H3/H4), nút toàn màn hình (Esc để thoát)
- Logo thương hiệu Linh Nghi (bản nền trong suốt + bản trắng cho chân trang + favicon), nạp qua Thư viện ảnh › thư mục "brand"
- Đổi theme mặc định sang tông xanh ngọc nhạt – vàng đồng theo logo (nhóm `theme` trong settings-schema.js, biến CSS dự phòng trong app.css); header cao 84px, logo 68px; nút email dùng màu chủ đạo của theme

## 1.1.0 – 16/10/2026

Bổ sung theo bản kế hoạch chi tiết của chủ dự án:

- Trang chủ: khối chứng chỉ kiểm định (mẫu giấy VGC / PNJ Lab / LIULAB, lời cam kết, phóng to ảnh), khối ý nghĩa ngọc & phong thủy, công cụ tính ni nhanh
- Sản phẩm: nhãn Best Seller / Mới / Sale %, sắp xếp "Bán chạy nhất", ảnh góc khác khi di chuột, khoảng giá lọc cấu hình trong admin, trường "Ý nghĩa phong thủy"
- Trang chi tiết: tự nhập "Ni khác", nút Đặt nhanh, nút Yêu cầu tư vấn, hướng dẫn bảo quản chung
- Popup xem nhanh: ý nghĩa phong thủy, nút gửi yêu cầu tư vấn
- Gallery: ảnh gắn sản phẩm mở popup xem nhanh
- Hướng dẫn size: video YouTube
- Form custom: chọn dây / mặt / phụ kiện đi kèm
- SEO: nhóm cài đặt "SEO từng trang" (title, description, keywords, ảnh Open Graph)
- Lệnh `npm run restore` khôi phục dữ liệu từ bản sao lưu; sửa lỗi nén ảnh khi sao lưu trên Windows
- `npm run dev` chỉ theo dõi thư mục `backend` (tránh tự khởi động lại liên tục trên Windows)
- Tài liệu: đổi tên theo bản kế hoạch, thêm CAU_HINH_EMAIL.md, CAI_DAT_VA_CHAY_THU.md, GHI_CHU_DU_AN.md
- Database: migration `002_product_badges.sql`
- Làm việc trên nhiều máy: `.npmrc` (cài đặt không cần Python/C++), `.gitattributes` (LF mọi nơi), `.nvmrc`, `.editorconfig`, cấu hình VS Code; thêm CLAUDE.md, CHANGELOG.md; đã kiểm tra quy trình clone → cài → chạy trên thư mục sạch

## 1.0.0 – 16/10/2026

Phiên bản đầu tiên:

- Trang khách: trang chủ, sản phẩm (tìm kiếm + bộ lọc), chi tiết, gallery, hướng dẫn size, blog, giỏ hàng / đặt hàng, thiết kế riêng, liên hệ, về shop
- Trang quản trị tiếng Việt: sản phẩm, danh mục, gallery, blog, thư viện ảnh, đơn hàng, khách hàng, cài đặt (tự sinh form từ schema), tài khoản 2 vai trò, 2FA, nhật ký
- Email thông báo qua SMTP (Gmail App Password, mã hóa khi lưu)
- Bảo mật: CSP, CSRF, giới hạn tần suất, chống spam form, khóa đăng nhập sai, scrypt, phân quyền
- SEO: meta, Open Graph, JSON-LD, sitemap, robots
- Triển khai: script cài VPS (Node 24, Nginx, PM2, SSL, tường lửa, sao lưu tự động)
