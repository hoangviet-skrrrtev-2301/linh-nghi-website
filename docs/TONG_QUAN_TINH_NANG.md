# Tổng quan tính năng và cách vận hành (dành cho người dùng mới)

Website bán vòng tay ngọc của shop **Linh Nghi**. Khách xem sản phẩm và gửi đơn qua website; shop xử lý và liên hệ khách qua điện thoại / Zalo. **Không có thanh toán online**: shop xác nhận đơn rồi hướng dẫn khách thanh toán.

Hướng dẫn thao tác từng trang admin: [HUONG_DAN_SU_DUNG.md](HUONG_DAN_SU_DUNG.md). Cài đặt và bàn giao: [BAN_GIAO.md](BAN_GIAO.md).

## 1. Khách hàng thấy gì (website)

| Trang | Nội dung chính |
|---|---|
| **Trang chủ** | Banner, thông tin nổi bật, sản phẩm nổi bật, mẫu giấy kiểm định, phân loại theo dòng ngọc, ý nghĩa phong thủy, bảng số đo ni, thiết kế riêng, gallery, cảm nhận khách, bài viết. Mỗi khối bật / tắt, đổi thứ tự, đổi nền trong admin |
| **Sản phẩm** | Danh sách có tìm kiếm (không cần gõ dấu) và bộ lọc: loại ngọc, giá, ni tay, màu, kiểu dáng, mệnh. Trang riêng cho từng loại ngọc |
| **Chi tiết sản phẩm** | Ảnh phóng to, giá và khuyến mãi, chọn ni tay, **chứng chỉ kiểm định** (ảnh, nơi cấp, mã số), ý nghĩa phong thủy, nút Đặt nhanh / Thêm giỏ / Tư vấn / Gửi yêu cầu custom mẫu này |
| **Giỏ hàng và đặt hàng** | Khách nhập tên, số điện thoại, địa chỉ rồi gửi đơn. Giỏ lưu trong trình duyệt (không cần đăng nhập). Sau khi gửi, khách tải được **ảnh "Thông tin đơn hàng"** để gửi cho shop |
| **Tra cứu đơn** | Khách nhập mã đơn + số điện thoại để xem tiến trình, đơn vị vận chuyển, mã vận đơn |
| **Thiết kế riêng (custom)** | Khách mô tả vòng muốn làm (loại ngọc, màu, ni, ngân sách, mục đích). Khách **không** tải ảnh lên, gửi ảnh mẫu qua Zalo |
| **Liên hệ / tư vấn** | Form lời nhắn, yêu cầu tư vấn về một sản phẩm |
| **Gallery, Blog, Về shop, Hướng dẫn size** | Ảnh khách và sản phẩm; bài viết kiến thức (có chuyên mục, mục lục, tác giả); giới thiệu shop; cách đo ni tay |
| **Feedback khách hàng** | Khối ở trang chủ (khung giới thiệu + lưới thẻ có ảnh đại diện, số sao) và trang Feedback riêng ở chân trang; bấm vào để xem đầy đủ và lướt nhiều ảnh chụp tin nhắn; tab con "Đánh giá sản phẩm" |
| **Đánh giá sản phẩm** | Khách đã mua (số điện thoại trùng đơn hoàn thành chứa sản phẩm) chấm sao và viết nhận xét, shop duyệt trước khi hiện; số sao hiện ở sản phẩm khi có |
| **Trang chính sách** | Đổi trả, bảo mật thông tin, điều khoản mua hàng, vận chuyển và thanh toán: liên kết ở chân trang, nội dung sửa trong admin |
| **Tiện ích** | Chế độ tối / sáng, popup chào mừng, nút Zalo và gọi nổi, dùng tốt trên điện thoại |

## 2. Bán hàng vận hành thế nào

Mỗi lần khách gửi form, hệ thống **luôn lưu** vào admin, **gửi email** báo shop (và xác nhận cho khách nếu có email), và tạo / cập nhật **hồ sơ khách** theo số điện thoại.

| Khách gửi | Vào mục | Chuỗi trạng thái |
|---|---|---|
| Đơn đặt hàng | **Đơn hàng** | Mới → Đã liên hệ → Đã xác nhận → Đang giao hàng → Hoàn thành (hoặc Đã hủy) |
| Thiết kế riêng | **Yêu cầu custom** | Mới → Đã liên hệ → Đã xác nhận → Hoàn thành |
| Liên hệ / tư vấn | **Liên hệ** | Mới → Đã liên hệ → Đã xử lý |

Quy trình xử lý một đơn:

1. Mở đơn mới (email báo hoặc menu **Bán hàng**), xem sản phẩm, ni tay, thông tin khách.
2. Gọi hoặc nhắn Zalo để xác nhận; ghi chú nội bộ; sửa giá, giảm giá, phụ phí nếu cần. Đổi trạng thái (hệ thống hỏi lại ở những bước dễ nhầm như Hoàn thành, Hủy, nhảy cách bước).
3. Khi giao hàng: nhập đơn vị vận chuyển và mã vận đơn (khách xem được), tick gửi email báo khách.
4. Khi xong: chuyển **Hoàn thành**. Doanh thu chỉ tính đơn Hoàn thành, theo ngày hoàn thành.
5. Khách custom / liên hệ chốt mua: bấm **Lên đơn hàng**, chính yêu cầu đó thành đơn (không tạo bản ghi thứ hai).
6. Khách nhắn ngoài website (Zalo, Facebook, tại cửa hàng): bấm **Thêm đơn hàng / Thêm yêu cầu** để nhập tay. Chọn được **ngày phát sinh** (mặc định hôm nay), trạng thái và ngày hoàn thành để nhập lại đơn cũ đúng ngày.

**Tổng quan** hiển thị đơn mới, yêu cầu custom, liên hệ, khách mới, doanh thu, giá trị trung bình mỗi đơn theo kỳ (7 ngày, 30 ngày, tháng, quý, năm hoặc tự chọn), kèm biểu đồ (đơn đã hủy không tính vào số đơn; doanh thu chia theo sản phẩm khớp tổng); nút **So sánh** cho thấy tăng trưởng so với kỳ trước.

## 3. Sản phẩm

- **Loại sản phẩm:** Vòng tay ngọc (chính, có đủ bộ lọc, chứng chỉ, ni tay) và loại khác như Pháp phục (có sẵn, đang tắt; mỗi loại tự khai báo thông số riêng). Mỗi loại tự khai báo lựa chọn khi đặt hàng (kích cỡ S/M/L..., ô thông tin thêm như chiều cao / cân nặng).
- **Quản lý kho (tùy chọn, mặc định tắt):** tick "Theo dõi kho" ở sản phẩm cần; kho tự trừ / hoàn theo trạng thái đơn, hết hàng tự hiện "Đã bán", khách thấy "Còn N" nếu bật.
- **Gợi ý tìm kiếm:** khách gõ ô tìm kiếm là thấy sản phẩm phù hợp kèm ảnh, giá; gõ không dấu vẫn ra.
- **Phân loại khách tự tính:** Người quan tâm → Đã đặt hàng → Đã mua → Mua lại; lọc ở trang Khách hàng.
- **Mỗi sản phẩm:** tên, mã, giá, giá khuyến mãi (tự hiện nhãn Sale), ảnh, loại ngọc / màu / kiểu dáng / mệnh, ni có sẵn, chứng chỉ kiểm định, mô tả, SEO. Tình trạng: Có sẵn / Đặt trước / Đã bán. Nhãn: Best Seller, Mới, Nổi bật, Có thể custom (kiểu nhãn tùy chỉnh trong Cài đặt › Giao diện).
- **Quản lý nhanh:** sửa giá ngay ở danh sách, ẩn / hiện / xóa hàng loạt, kéo thả đổi vị trí, nhân bản, xem thử như khách (cả bản nháp).
- **Danh mục & bộ lọc:** tạo loại ngọc, màu, kiểu dáng, mệnh; tự thành bộ lọc trên website.
- Xóa hoặc ẩn sản phẩm **không** làm đổi đơn cũ và doanh thu (mỗi đơn lưu sẵn tên và giá lúc đặt). Khách đang để sản phẩm đó trong giỏ sẽ được báo chọn sản phẩm khác.

## 4. Nội dung

- **Blog:** viết bài bằng trình soạn thảo (bảng, ảnh, liên kết có tùy chọn mở tab mới), chuyên mục, hẹn giờ đăng, **tác giả** (Admin › Tác giả blog), SEO riêng từng bài.
- **Feedback & đánh giá:** đăng feedback kèm nhiều ảnh tin nhắn, kéo thả thứ tự, ẩn / hiện ở trang chủ và trang Feedback; duyệt / ẩn / xóa đánh giá sản phẩm của khách đã mua; toàn bộ chữ và lựa chọn chỉnh ở Cài đặt.
- **Gallery:** chọn kiểu băng chuyền (tự chạy hoặc đứng yên, khách kéo / vuốt được), lưới tĩnh hoặc xếp gạch, 1–4 dòng, 2–6 cột; chia album; ảnh gắn sản phẩm thì bấm vào mở xem nhanh.
- **Thư viện ảnh:** nơi chứa mọi ảnh, chia thư mục; ảnh tự xoay, xóa thông tin vị trí, nén WebP. Nhớ nhập mô tả ảnh (alt).
- **Cài đặt website** (chia 5 mục có mô tả): Thông tin chung & menu · Nội dung từng trang · Giao diện · Tối ưu SEO · Email & hệ thống. **Mọi chữ, ảnh, lựa chọn hiển thị cho khách đều sửa được ở đây**, không cần sửa code.

## 5. Quản trị, bảo mật, SEO

- **Tài khoản và phân quyền:** Chủ shop toàn quyền; nhân viên được gán **vai trò** (Admin › Vai trò & phân quyền) quyết định làm được việc gì (đơn hàng, sản phẩm, blog, từng mục cài đặt, sao lưu...). Menu tự ẩn mục không có quyền. Mỗi người nên bật **xác thực 2 bước**.
- **Bảo vệ:** giới hạn đăng nhập sai, chống spam form, mã hóa mật khẩu email, nhật ký thao tác (ai làm gì, lúc nào), sao lưu tự động mỗi đêm trên server.
- **SEO:** website có sẵn tiêu đề / mô tả riêng từng trang, sitemap, robots.txt, dữ liệu có cấu trúc (schema) cho cửa hàng, sản phẩm, bài viết, tự chuyển hướng 301 khi đổi đường dẫn. **Google chưa được thu thập website cho tới khi bạn bật "Cho phép Google lập chỉ mục"** (Cài đặt › SEO & mã theo dõi) khi chính thức vận hành. Khung "Chuẩn bị mở website chính thức" ở Tổng quan nhắc từng việc còn thiếu.
- **Email:** thông báo đơn hàng, xác nhận cho khách, báo giao hàng qua Gmail ([CAU_HINH_EMAIL.md](CAU_HINH_EMAIL.md)).

## 6. Việc hằng ngày của chủ shop

| Khi nào | Việc |
|---|---|
| Mỗi ngày | Mở **Tổng quan** và mục **Đơn hàng / Custom / Liên hệ**; xử lý đơn mới (liên hệ, xác nhận, giao); cập nhật trạng thái và mã vận đơn |
| Khi có hàng mới | Thêm sản phẩm (ảnh, giá, ni, chứng chỉ); đặt tình trạng Có sẵn; đánh dấu Mới / Nổi bật |
| Khi bán xong một chiếc | Đổi tình trạng **Đã bán** (vẫn hiện, không thêm giỏ được) hoặc ẩn |
| Mỗi tuần | Đăng một bài blog hoặc ảnh gallery mới; xem **Tổng quan** so sánh với tuần trước |
| Mỗi tháng | Tải một bản **sao lưu** về máy riêng; xem nhật ký hoạt động; kiểm tra tài khoản nhân viên còn cần không |
| Khi đổi thông tin shop | Cài đặt › Thông tin shop (điện thoại, địa chỉ, giờ mở cửa...); schema và website tự cập nhật |
