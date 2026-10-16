# Hướng dẫn sử dụng trang quản trị

Đăng nhập tại `https://tenmien.vn/<đường-dẫn-admin>` (đường dẫn được tạo lúc cài đặt).

## Hai loại tài khoản

| Quyền | Chủ shop | Nhân viên |
|---|:-:|:-:|
| Sản phẩm, danh mục, gallery, blog, thư viện ảnh | ✅ | ✅ |
| Xem và xử lý đơn hàng, yêu cầu custom, khách hàng | ✅ | ✅ |
| Cài đặt nội dung, giao diện, SEO | ✅ | ✅ |
| Cấu hình email SMTP | ✅ | ❌ |
| Thêm/khóa tài khoản, xem nhật ký hoạt động | ✅ | ❌ |
| Xóa đơn/khách hàng, xuất danh sách khách, tải bản sao lưu | ✅ | ❌ |

---

## 1. Tổng quan

Hiển thị số đơn hàng, yêu cầu custom, lời nhắn (kèm số **mới chưa xử lý**), doanh thu tháng (tính từ các đơn ở trạng thái **Hoàn thành**), biểu đồ 30 ngày và các yêu cầu mới nhất. Nếu email chưa được cấu hình, trang hiện cảnh báo màu vàng.

## 2. Đơn hàng / Yêu cầu custom / Liên hệ

Khách có thể gửi yêu cầu theo nhiều cách:

| Cách khách gửi | Xuất hiện ở mục |
|---|---|
| Giỏ hàng › Gửi đơn đặt hàng | Đơn hàng |
| Nút **Đặt nhanh** ở trang chi tiết sản phẩm (1 sản phẩm, không qua giỏ) | Đơn hàng |
| Nút **Yêu cầu tư vấn** ở trang chi tiết hoặc popup xem nhanh | Liên hệ (có ghi rõ **Sản phẩm quan tâm**) |
| Trang Thiết kế riêng | Yêu cầu custom |
| Form ở trang Liên hệ | Liên hệ |

Khi khách chọn **"Ni khác"** và tự nhập số đo, ni đó hiện trong đơn hàng như bình thường.

Khi khách gửi đơn, hệ thống sẽ:
1. Lưu đơn vào trang quản trị (luôn luôn, kể cả khi email lỗi).
2. Gửi email thông báo về cho shop.
3. Gửi email xác nhận cho khách (nếu khách có nhập email và đã bật tùy chọn này).
4. Tự tạo hoặc cập nhật hồ sơ **Khách hàng** theo số điện thoại.

**Xử lý một đơn:** bấm vào đơn để mở chi tiết, gọi điện hoặc bấm **Zalo** để liên hệ khách, rồi chuyển trạng thái:

`Mới` → `Đã liên hệ` → `Đã xác nhận` → `Hoàn thành` (hoặc `Đã hủy`)

Dùng ô **Ghi chú nội bộ** để ghi lại các lần trao đổi (khách không nhìn thấy). Nếu email gửi lỗi, bấm **Gửi lại email thông báo**.

> 💡 Giá trong đơn do hệ thống tự tính lại từ giá sản phẩm hiện tại, khách không thể sửa giá.

## 3. Khách hàng

Danh sách khách được gộp theo số điện thoại, kèm số lần đặt và tổng tiền đã mua. Bấm vào một khách để thêm **nhãn** (VIP, khách sỉ...), **ghi chú**, ni tay và xem lịch sử đơn. Chủ shop có thể **Xuất Excel (CSV)**: mở bằng Excel sẽ hiển thị đúng tiếng Việt.

## 4. Sản phẩm

**Thêm sản phẩm:** Sản phẩm › **Thêm sản phẩm**. Các tab:

| Tab | Nội dung |
|---|---|
| Thông tin | Tên, giá (để trống = hiển thị "Liên hệ"), giá khuyến mãi, mô tả ngắn, mô tả chi tiết |
| Hình ảnh | Ảnh đại diện + nhiều ảnh phụ (kéo thả để sắp xếp) |
| Thông số & phân loại | Loại ngọc, màu, kiểu dáng, **ý nghĩa phong thủy**, mệnh, **ni có sẵn** (VD: `52, 54, 56`), xuất xứ, thông số thêm |
| Chứng chỉ kiểm định | Ảnh chứng chỉ, nơi cấp, mã số, ngày cấp (thêm được nhiều chứng chỉ) |
| SEO | Tiêu đề và mô tả hiển thị trên Google, có khung xem trước |

Cột bên phải:
- **Lưu & hiển thị**: sản phẩm xuất hiện trên website. **Lưu nháp**: lưu nhưng ẩn.
- **Tình trạng:** Có sẵn / Đặt trước / Đã bán (sản phẩm đã bán vẫn hiển thị nhưng không thêm vào giỏ được).
- **★ Best Seller:** gắn nhãn Best Seller, ưu tiên đứng đầu ở trang chủ và khi sắp xếp "Bán chạy nhất".
- **Sản phẩm mới:** gắn nhãn "Mới". Ngoài ra sản phẩm tự có nhãn "Mới" trong 30 ngày đầu sau khi đăng (đổi số ngày ở Cài đặt › Tiêu đề các trang, đặt 0 để tắt).
- **Sản phẩm nổi bật:** hiện ở trang chủ.
- **Giá cũ / giá khuyến mãi:** nhập cả hai thì website tự hiện giá cũ gạch ngang và nhãn "Sale -x%".
- **Ảnh góc khác:** ảnh phụ đầu tiên (tab Hình ảnh) sẽ hiện khi khách di chuột vào thẻ sản phẩm.
- **Cho phép custom:** hiện nút "Gửi yêu cầu custom mẫu này".
- **Thứ tự hiển thị:** số nhỏ hiển thị trước.

**Nhân bản** (biểu tượng 2 tờ giấy ở danh sách): tạo nhanh sản phẩm tương tự.

## 5. Danh mục & bộ lọc

Có 4 nhóm: **Loại ngọc, Màu sắc, Kiểu dáng, Mệnh phong thủy**. Các mục này tự trở thành bộ lọc trên trang Sản phẩm. Loại ngọc có thể gắn ảnh để hiện ở khối "Phân loại" trên trang chủ; Màu sắc có mã màu để hiện chấm màu.

## 6. Gallery

Bấm **Thêm ảnh** để chọn nhiều ảnh cùng lúc. Với mỗi ảnh có thể nhập tiêu đề, mô tả, **album** (để chia nhóm, VD "Khách hàng"), gắn link tới sản phẩm, ẩn/hiện. Kéo biểu tượng ⠿ để sắp xếp thứ tự. Thay đổi được lưu ngay khi rời khỏi ô nhập.

- Ảnh **có gắn sản phẩm**: khách bấm vào sẽ mở **popup xem nhanh** sản phẩm (ảnh, giá, ni, nút xem chi tiết, nút tư vấn).
- Ảnh **không gắn sản phẩm**: khách bấm vào sẽ phóng to ảnh.

## 7. Blog

Viết bài với trình soạn thảo (tiêu đề, in đậm, danh sách, chèn ảnh từ thư viện, chèn link). Có thể **hẹn giờ đăng** bằng cách chọn ngày đăng trong tương lai. Bật/tắt toàn bộ trang Blog tại Cài đặt › Bật/tắt tính năng.

## 8. Thư viện ảnh

Nơi chứa mọi ảnh đã tải lên. Ảnh được **tự động**:
- xoay đúng chiều (ảnh chụp điện thoại),
- xóa thông tin vị trí GPS trong ảnh (bảo vệ riêng tư),
- nén sang WebP với 3 kích thước, giúp web tải nhanh.

Hỗ trợ JPG, PNG, WebP, AVIF, tối đa 10MB/ảnh. Ảnh **HEIC** của iPhone chưa được hỗ trợ: trên iPhone vào Cài đặt › Camera › Định dạng › chọn **Tương thích nhất** để chụp JPG, hoặc gửi ảnh qua Zalo/Messenger rồi tải về (ảnh sẽ tự thành JPG). Hãy nhập **mô tả ảnh (alt)** để tốt cho SEO.

> ⚠ Xóa ảnh trong thư viện sẽ làm trống ảnh ở mọi nơi đang dùng ảnh đó.

## 9. Cài đặt website

Mọi nội dung trên website đều chỉnh được ở đây, chia thành các tab:

| Tab | Chỉnh gì |
|---|---|
| Thông tin shop | Tên, slogan, logo, favicon, SĐT, Zalo, email, địa chỉ, bản đồ, mạng xã hội, chân trang |
| Giao diện | Màu chủ đạo, màu nhấn, màu nền, font chữ, độ bo góc, số cột sản phẩm, hiệu ứng, CSS tùy chỉnh |
| Bật/tắt tính năng | Đặt hàng, custom, blog, gallery, trang size, hiện giá, nút liên hệ nổi, **popup chào mừng**, thanh thông báo |
| Menu | Thêm, xóa, đổi tên, sắp xếp mục menu |
| Trang chủ | Banner (nhiều slide), khối thông tin nổi bật (kèm nội dung popup), **khối chứng chỉ kiểm định** (ảnh giấy VGC / PNJ Lab..., lời cam kết), **khối ý nghĩa phong thủy**, công cụ tính ni nhanh, tiêu đề các khối, cảm nhận khách hàng |
| Trang Về shop / Hướng dẫn size / Liên hệ | Nội dung từng trang, bảng quy đổi size, **video hướng dẫn đo** (dán link YouTube) |
| Biểu mẫu & đặt hàng | Nội dung trang đặt hàng, các thông báo sau khi gửi, lựa chọn ngân sách, **lựa chọn dây / mặt / phụ kiện** cho form custom, kênh liên hệ |
| Tiêu đề các trang | Tiêu đề, mô tả trang Sản phẩm, Gallery, Blog; **các khoảng giá trong bộ lọc**; số ngày gắn nhãn "Mới"; **hướng dẫn bảo quản** chung cho mọi sản phẩm |
| SEO & mã theo dõi | Tiêu đề, mô tả, từ khóa, ảnh chia sẻ mặc định, Google Search Console, Google Analytics, Facebook Pixel |
| SEO từng trang | Tiêu đề, mô tả, từ khóa, ảnh chia sẻ riêng cho từng trang |
| Email (SMTP) | (Chủ shop) cấu hình gửi email, xem [CAU_HINH_EMAIL.md](CAU_HINH_EMAIL.md) |

Bấm **Lưu** để áp dụng ngay. Bấm **Xem website** để kiểm tra.

**Tắt đặt hàng (thanh toán):** vào Bật/tắt tính năng, tắt "Cho phép đặt hàng". Khi đó giỏ hàng biến mất, các nút chuyển thành "Nhắn Zalo tư vấn".

## 10. Tối ưu SEO (đưa website lên Google)

Website đã tự động có: thẻ meta title/description/keywords, Open Graph (ảnh đẹp khi chia sẻ Facebook/Zalo), canonical, sitemap (`/sitemap.xml`), robots.txt, dữ liệu cấu trúc Google (cửa hàng, sản phẩm có giá, bài viết, breadcrumb), thẻ alt cho ảnh (lấy theo tên sản phẩm nếu chưa nhập mô tả ảnh).

**Việc bạn nên làm:**

| Ở đâu | Làm gì |
|---|---|
| Cài đặt › SEO & mã theo dõi | Nhập tiêu đề trang chủ, mô tả, từ khóa chung, ảnh chia sẻ mặc định (1200×630px) |
| Cài đặt › SEO từng trang | Tiêu đề, mô tả, từ khóa, ảnh chia sẻ riêng cho trang Sản phẩm, Gallery, Hướng dẫn size, Blog... Để trống thì dùng giá trị chung |
| Sửa sản phẩm › tab SEO | Tiêu đề và mô tả riêng cho từng sản phẩm, có khung **xem trước trên Google** |
| Sửa bài viết › SEO | Tương tự cho từng bài blog |
| Thư viện ảnh | Nhập mô tả ảnh (alt) có từ khóa, ví dụ "vòng phỉ thúy xanh lục băng ni 54" |
| Danh mục › Loại ngọc | Viết mô tả cho từng loại ngọc: trang lọc theo loại (VD `/san-pham?loai=phi-thuy`) được Google lập chỉ mục riêng |

**Mẹo viết:** tiêu đề khoảng 50–60 ký tự, có từ khóa chính ở đầu (VD "Vòng phỉ thúy tự nhiên có kiểm định | Linh Nghi Jade"); mô tả 140–160 ký tự, có lời kêu gọi ("Giao toàn quốc, tư vấn ni miễn phí"). Viết blog đều đặn về kiến thức ngọc để có thêm lượt tìm kiếm.

**Gửi website cho Google:**
1. Vào https://search.google.com/search-console, thêm tên miền, chọn cách xác minh "Thẻ HTML", copy phần `content="..."`.
2. Dán vào Cài đặt › SEO & mã theo dõi › Mã xác minh Google Search Console, bấm Lưu, rồi bấm Xác minh trên Search Console.
3. Mục Sơ đồ trang web: gửi `https://tenmien.vn/sitemap.xml`.

> Khi website đang thử nghiệm, có thể tắt "Cho phép Google lập chỉ mục" để Google chưa lưu trang.

## 11. Tài khoản quản trị (Chủ shop)

Thêm tài khoản cho nhân viên, chọn vai trò. Tắt "Cho phép đăng nhập" để **khóa ngay** một tài khoản (ví dụ khi nhân viên nghỉ việc). Nếu nhân viên mất điện thoại có cài 2FA, bấm biểu tượng khiên để tắt 2FA cho họ.

## 12. Tài khoản & bảo mật (mỗi người)

Đổi mật khẩu (các thiết bị khác sẽ tự đăng xuất) và **bật xác thực 2 bước**: cài ứng dụng Google Authenticator trên điện thoại, quét mã QR, nhập mã 6 số.

## 13. Nhật ký hoạt động (Chủ shop)

Ghi lại ai đã đăng nhập, thêm/sửa/xóa gì, lúc nào, từ IP nào.

---

## Câu hỏi thường gặp

**Khách đặt hàng nhưng tôi không nhận được email?**
Kiểm tra Cài đặt › Email đã bật chưa, bấm "Lưu & gửi email thử". Kiểm tra cả thư mục Spam. Đơn hàng vẫn luôn có trong trang admin.

**Sửa nội dung xong nhưng web chưa thay đổi?**
Nhấn Ctrl + F5 để tải lại trang không dùng bộ nhớ đệm.

**Muốn ẩn giá toàn bộ sản phẩm?**
Bật/tắt tính năng › tắt "Hiển thị giá sản phẩm".

**Quên mật khẩu?**
Nhờ Chủ shop đặt lại trong Tài khoản quản trị. Nếu Chủ shop quên, xem [BAO_MAT_SAO_LUU.md](BAO_MAT_SAO_LUU.md) › "Quên mật khẩu".
