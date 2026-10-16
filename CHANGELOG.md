# Lịch sử thay đổi

Ghi lại các thay đổi đáng chú ý, mới nhất ở trên cùng.

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
