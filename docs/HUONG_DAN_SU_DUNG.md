# Hướng dẫn sử dụng trang quản trị

Đăng nhập tại `https://tenmien.vn/<đường-dẫn-admin>` (đường dẫn được tạo lúc cài đặt).

## Phân quyền tùy chỉnh

Ngoài **Chủ shop** (toàn quyền), mỗi nhân viên được gán một **vai trò** quyết định họ làm được gì. Vào **Vai trò & phân quyền** (chỉ Chủ shop) để tạo vai trò mới (VD "Biên tập viên chỉ viết blog", "Quản lý bán hàng") và tick các quyền: đơn hàng, khách hàng, sản phẩm, danh mục, blog và tác giả, gallery, thư viện ảnh, từng mục cài đặt (thông tin chung, nội dung trang, giao diện, SEO), chuyển hướng, email, nhật ký, sao lưu, xóa / xuất dữ liệu khách. Rồi gán vai trò cho từng người ở **Tài khoản quản trị**. Đổi quyền có hiệu lực ngay, menu tự ẩn mục không có quyền. Quản lý tài khoản và vai trò luôn chỉ Chủ shop làm. Bảng dưới là quyền của vai trò "Nhân viên" có sẵn:

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

Chọn khoảng thời gian muốn xem ở hàng nút phía trên: **7 ngày, 30 ngày, tháng này, tháng trước, quý này, năm nay** hoặc **Tùy chọn** (chọn từ ngày – đến ngày). Lựa chọn được nhớ cho lần sau.

- **Thẻ số liệu:** đơn hàng mới, yêu cầu custom, lời nhắn liên hệ, khách mới, **doanh thu** và giá trị trung bình mỗi đơn trong kỳ. Doanh thu chỉ tính các đơn **Hoàn thành**, theo **ngày hoàn thành**. Bấm **So sánh** (mặc định tắt) để xem tăng giảm so với kỳ liền trước, cùng kỳ năm trước hoặc kỳ tự chọn.
- **Chuẩn bị mở website chính thức:** khung liệt kê việc còn thiếu (thông tin mẫu, ảnh chia sẻ, mã Search Console, index đang tắt...), tự mất khi đã xong.
- **Biểu đồ:** số hiện sẵn trên từng cột; chuyển giữa "Số yêu cầu" và "Doanh thu"; kỳ dài tự gom theo tuần hoặc tháng. Bấm "Xem số liệu chi tiết từng cột" để xem bảng.
- Bên phải: tình trạng đơn, **sản phẩm bán chạy** trong kỳ, khách mới theo nguồn. Phía dưới: các yêu cầu mới nhất.
- Nếu email chưa được cấu hình, trang hiện cảnh báo màu vàng.

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

Đơn hàng: `Mới` → `Đã liên hệ` → `Đã xác nhận` → `Đang giao hàng` → `Hoàn thành` (hoặc `Đã hủy`).
Yêu cầu custom bỏ bước "Đang giao hàng"; lời nhắn liên hệ chỉ có `Mới` → `Đã liên hệ` → `Đã xử lý`.

**Giao hàng:** khi chuyển đơn sang **Đang giao hàng**, nhập **đơn vị vận chuyển** và **mã vận đơn** ở khung "Vận chuyển" rồi bấm lưu. Khách tra cứu đơn (mã + số điện thoại) sẽ thấy tiến trình, đơn vị vận chuyển và mã vận đơn. Muốn báo khách ngay, tick **Gửi email báo khách khi đổi trạng thái** (tự bật nếu khách có email và email đã cấu hình; bỏ tick nếu không muốn gửi). Nội dung lời nhắn hiện cho khách ở từng trạng thái chỉnh tại Cài đặt › Biểu mẫu & đặt hàng.

**Lên đơn từ yêu cầu:** với yêu cầu custom hoặc liên hệ, bấm **Lên đơn hàng từ yêu cầu này** để tạo đơn có mã riêng cho khách, chốt giá và theo dõi giống đơn đặt qua website.

Dùng ô **Ghi chú nội bộ** để ghi lại các lần trao đổi (khách không nhìn thấy). Nếu email gửi lỗi, bấm **Gửi lại email thông báo**.

> 💡 Giá trong đơn do hệ thống tự tính lại từ giá sản phẩm hiện tại, khách không thể sửa giá.

## 3. Khách hàng

Danh sách khách được gộp theo số điện thoại, kèm số lần đặt và tổng tiền đã mua. Bấm vào một khách để thêm **nhãn** (VIP, khách sỉ...), **ghi chú**, ni tay và xem lịch sử đơn. Chủ shop có thể **Xuất Excel (CSV)**: mở bằng Excel sẽ hiển thị đúng tiếng Việt.

- **Bộ lọc:** bấm **Bộ lọc** để chọn thời gian (tháng này, tháng trước, 3 / 6 tháng, năm nay hoặc chọn tháng cụ thể), cách tính (có phát sinh đơn/yêu cầu hay khách mới tạo) và **nguồn khách**. Bộ lọc đang bật hiện thành các nhãn nhỏ phía trên danh sách, bấm ✕ để bỏ.
- **Thêm khách:** nút **Thêm khách** cho từng người (khách nhắn Zalo, Facebook, đến cửa hàng...). Số điện thoại là mã định danh, trùng số thì không tạo mới.
- **Nhập hàng loạt:** bấm **Nhập hàng loạt**, dán danh sách copy từ Excel / Google Sheets (hoặc chọn file CSV). Cột theo thứ tự: Họ tên, Số điện thoại, Email, Địa chỉ, Nguồn, Nhãn, Ni tay, Ghi chú (có dòng tiêu đề thì tự nhận cột; chỉ họ tên và số điện thoại là bắt buộc; tải **file mẫu** ngay trong khung). Bấm **Kiểm tra trước** để xem từng dòng là mới / trùng / lỗi rồi mới bấm **Nhập**. Có thể gán sẵn nguồn và nhãn cho cả lô, chọn bỏ qua hoặc cập nhật khi trùng số điện thoại. Mỗi lần tối đa 2.000 khách.

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

**Sửa nhanh giá:** ở danh sách sản phẩm, bấm vào giá (có biểu tượng bút chì) để nhập **giá bán** và **giá khuyến mãi** rồi bấm **Lưu** (hoặc nhấn Enter, nhấn Esc để hủy). Để trống giá bán thì website hiện "Liên hệ". Giá khuyến mãi phải nhỏ hơn giá bán. Giá mới áp dụng ngay cho khách.

**Kéo thả đổi vị trí:** ở danh sách sản phẩm (sắp xếp "Thứ tự hiển thị (kéo thả)", là mặc định), kéo biểu tượng ⠿ ở đầu dòng lên xuống để đổi vị trí; lưu ngay. Thứ tự này là thứ tự khách thấy ở mục "Nổi bật" của trang Sản phẩm và ở khối sản phẩm nổi bật trang chủ. Sản phẩm mới thêm xuất hiện ở đầu danh sách, kéo xuống chỗ mong muốn. Danh sách chia trang nên kéo trong từng trang (muốn chuyển sang trang khác, đặt vào "Thứ tự hiển thị" bằng ô số trong trang sửa sản phẩm).

**Ẩn / hiện / xóa ngay ở danh sách:** bấm biểu tượng con mắt gạch chéo để **ẩn** một sản phẩm (chuyển về bản nháp, khách không thấy, dữ liệu vẫn giữ), bấm lại để hiện. Tick chọn nhiều sản phẩm rồi dùng thanh **Ẩn / Hiện / Xóa** phía trên để làm hàng loạt (xóa luôn hỏi xác nhận).

**Loại sản phẩm (Vòng tay ngọc, Pháp phục...):** bấm nút **Loại sản phẩm** ở trang danh sách để thêm / sửa loại, tự đặt các **thông số** cho từng loại (ô chữ, số, hoặc danh sách chọn; gõ giá trị mới khi nhập sản phẩm thì tự được thêm vào danh sách), và **bật / tắt hoạt động**. Nút **Thêm sản phẩm** cho chọn loại trước; form tự đổi theo loại (loại không phải ngọc không có ô loại ngọc, màu, ni, chứng chỉ).
- Loại **Chưa hoạt động (thử nghiệm)**: sản phẩm vẫn nhập và lưu được, nhưng khách không thấy ở bất kỳ đâu. Dùng nút mắt **Xem thử như khách** để xem trang sản phẩm đúng như khách sẽ thấy.
- Khi bật hoạt động: sản phẩm hiện qua menu Sản phẩm (mục tên loại), đường dẫn riêng của loại và tìm kiếm; **không** hiện chung trong "Tất cả sản phẩm" (trừ khi tick "Hiện chung") và **không có bộ lọc** (bộ lọc chỉ dành cho ngọc).
- Bật hoạt động xong, đơn đặt Pháp phục chưa chọn được kích cỡ S/M/L (xem GHI_CHU_DU_AN.md).

## 5. Danh mục & bộ lọc

Có 4 nhóm: **Loại ngọc, Màu sắc, Kiểu dáng, Mệnh phong thủy**. Các mục này tự trở thành bộ lọc trên trang Sản phẩm. Loại ngọc có thể gắn ảnh để hiện ở khối "Phân loại" trên trang chủ; Màu sắc có mã màu để hiện chấm màu.

## 6. Gallery

Trang Gallery và khối Gallery ở trang chủ hiện **tối đa 8 ảnh dạng 2 hàng × 4 cột**; nhiều hơn 8 ảnh thì thành slider tự lướt từ phải sang trái (bật/tắt tự lướt và tốc độ ở Cài đặt › Trang chủ). Ô **Hiện ở Gallery tổng** quyết định ảnh có xuất hiện ở tab "Tất cả" và trang chủ hay không; tab album luôn hiện đủ ảnh của album đó (dùng cho ảnh feedback khách hoặc ảnh chưa muốn đưa lên Gallery tổng).

Bấm **Thêm ảnh** để chọn nhiều ảnh cùng lúc. Với mỗi ảnh có thể nhập tiêu đề, mô tả, **album** (để chia nhóm, VD "Khách hàng"), gắn link tới sản phẩm, ẩn/hiện. Kéo biểu tượng ⠿ để sắp xếp thứ tự. Thay đổi được lưu ngay khi rời khỏi ô nhập.

- Ảnh **có gắn sản phẩm**: khách bấm vào sẽ mở **popup xem nhanh** sản phẩm (ảnh, giá, ni, nút xem chi tiết, nút tư vấn).
- Ảnh **không gắn sản phẩm**: khách bấm vào sẽ phóng to ảnh.

## 7. Blog

**Tác giả:** vào **Tác giả blog** (menu Nội dung) để thêm người viết: tên, chức danh, giới thiệu, ảnh đại diện, liên kết (Facebook, website...). Chọn tác giả ở cột phải khi viết bài; thông tin hiện ở đầu bài, khung "Về tác giả" cuối bài và trong dữ liệu schema cho Google. Bài chưa chọn tác giả ghi là của shop. Không có trang tác giả riêng.

**Liên kết trong bài:** chọn chữ, bấm nút liên kết (Ctrl+K), dán địa chỉ; tick **Mở trong tab mới** nếu muốn khách đọc tiếp bài này ở tab cũ (nên dùng cho liên kết ra website khác). Mặc định liên kết mở cùng tab. Mọi liên kết ra ngoài đều tự gắn rel="noopener" để an toàn.


Viết bài với trình soạn thảo (tiêu đề, in đậm, danh sách, chèn ảnh từ thư viện, chèn link). Có thể **hẹn giờ đăng** bằng cách chọn ngày đăng trong tương lai. Bật/tắt toàn bộ trang Blog tại Cài đặt › Bật/tắt tính năng.

**Chuyên mục:** bấm **Quản lý chuyên mục** ở trang Blog để thêm / sửa / xóa chuyên mục (xóa chuyên mục thì bài chuyển về "Chưa phân loại", không mất bài). Chọn chuyên mục cho bài ở cột phải của trang sửa bài, hoặc gõ tên để tạo nhanh. Khách thấy thanh chọn chuyên mục ở đầu trang Blog và trang riêng từng chuyên mục. Trang chuyên mục mặc định **không được Google lập chỉ mục** (noindex) và không có trong sitemap để tránh trùng nội dung, bài viết vẫn được lập chỉ mục bình thường (tắt trong Cài đặt › Trang Sản phẩm / Gallery / Blog).

**Banner dọc, mục lục, bài gợi ý** ở cột phải: chỉnh trong Cài đặt › Trang Sản phẩm / Gallery / Blog. Mục lục tự tạo từ các tiêu đề H2, H3 trong bài.

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
| Menu | Thêm, xóa, đổi tên, sắp xếp mục menu; mỗi mục chọn được **menu sổ dọc** (theo loại ngọc, màu, kiểu dáng, mệnh, loại sản phẩm, chuyên mục blog, bài mới nhất hoặc tự nhập "Tên \| /đường-dẫn"). Mục Sản phẩm mặc định sổ theo loại ngọc |
| Bố cục trang chủ | **Bật/tắt và đổi thứ tự (↑ ↓)** từng khối trang chủ; mỗi khối đổi được **nền** (một màu, họa tiết, hoặc ảnh tải lên kèm lớp phủ) và màu chữ |
| Chân trang | Bật/tắt và đổi thứ tự các cột (giới thiệu, menu, dòng ngọc, liên kết tự thêm, liên hệ) và từng thông tin trong chân trang |
| Trang chủ | Banner (nhiều banner trong một khối hoặc xếp nối tiếp; bấm "Thêm nhiều ảnh" để chọn cùng lúc; đặt thời gian tự chuyển, cho kéo / vuốt, mũi tên), khối thông tin nổi bật (kèm nội dung popup), **khối chứng chỉ kiểm định** (ảnh giấy VGC / PNJ Lab..., lời cam kết), **khối ý nghĩa phong thủy**, công cụ tính ni nhanh, tiêu đề các khối, cảm nhận khách hàng |
| Trang Về shop / Hướng dẫn size / Liên hệ | Nội dung từng trang, bảng quy đổi size, **video hướng dẫn đo** (dán link YouTube) |
| Biểu mẫu & đặt hàng | Nội dung trang đặt hàng, các thông báo sau khi gửi, lựa chọn ngân sách, **lựa chọn dây / mặt / phụ kiện** cho form custom, kênh liên hệ |
| Trang Sản phẩm / Gallery / Blog | Tiêu đề, mô tả hiện đầu trang; **các khoảng giá trong bộ lọc**; số ngày gắn nhãn "Mới"; **hướng dẫn bảo quản** chung; số sản phẩm / bài mỗi trang; mục lục, bài gợi ý, **banner dọc** của Blog |
| SEO & mã theo dõi | Tiêu đề, mô tả, từ khóa, ảnh chia sẻ mặc định, Google Search Console, Google Analytics, Facebook Pixel |
| SEO Google & chia sẻ | Chỉ nhập khi muốn trang hiện **khác** trên Google / Facebook so với nội dung hiển thị; ô để trống thì tự lấy tiêu đề và mô tả của trang (mỗi ô ghi rõ lấy từ đâu) |
| Schema (dữ liệu có cấu trúc) | Loại hình doanh nghiệp, địa chỉ có cấu trúc, tọa độ, giờ mở cửa, mức giá, hiệu lực giá, chính sách đổi trả, phí và thời gian giao hàng (chỉ bật khi đúng thực tế), cách ghi tác giả. Thông tin shop trong schema tự lấy từ Thông tin shop và tự cập nhật |
| Email (SMTP) | (Chủ shop) cấu hình gửi email, xem [CAU_HINH_EMAIL.md](CAU_HINH_EMAIL.md) |

Bấm **Lưu** để áp dụng ngay. Bấm **Xem website** để kiểm tra.

**Các nhóm dài** (Trang chủ, Thông tin shop, Giao diện...) được chia thành nhiều phần: bấm tên từng phần để mở hoặc thu gọn (có nút **Mở tất cả / Thu gọn tất cả**, trạng thái được nhớ). Các danh sách nhiều mục (slide banner, khối thông tin, các khối trang chủ...) bấm tên từng mục để mở / thu gọn.

**Ảnh đơn hàng cho khách tải:** sau khi đặt hàng, khách tải được ảnh gồm mã đơn, thông tin nhận hàng, sản phẩm, tổng tiền để gửi shop và tra cứu về sau. Chữ trên ảnh và nút chỉnh ở Cài đặt › Biểu mẫu & đặt hàng; có công tắc tắt.

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

**Mẹo viết:** tiêu đề khoảng 50–60 ký tự, có từ khóa chính ở đầu (VD "Vòng phỉ thúy tự nhiên có kiểm định | Linh Nghi"); mô tả 140–160 ký tự, có lời kêu gọi ("Giao toàn quốc, tư vấn ni miễn phí"). Viết blog đều đặn về kiến thức ngọc để có thêm lượt tìm kiếm.

**Gửi website cho Google:**
1. Vào https://search.google.com/search-console, thêm tên miền, chọn cách xác minh "Thẻ HTML", copy phần `content="..."`.
2. Dán vào Cài đặt › SEO & mã theo dõi › Mã xác minh Google Search Console, bấm Lưu, rồi bấm Xác minh trên Search Console.
3. Mục Sơ đồ trang web: gửi `https://tenmien.vn/sitemap.xml`.

> Khi website đang thử nghiệm, có thể tắt "Cho phép Google lập chỉ mục" để Google chưa lưu trang.

## 10a. Trang chính sách (chân trang)

Admin › Cài đặt › **Trang chính sách**: các trang đổi trả, bảo mật thông tin, điều khoản mua hàng, vận chuyển và thanh toán, hiện ở chân trang (dòng liên kết phía trên thanh bản quyền) và có trong sitemap. **Nội dung có sẵn chỉ là bản mẫu thông dụng**: hãy đọc từng trang, sửa cho đúng chính sách thật của shop (số ngày đổi trả, phí vận chuyển, hình thức thanh toán...), rồi tick **"Đã xác nhận nội dung đúng với shop"**. Chưa xác nhận thì Tổng quan còn nhắc. Có thể thêm trang mới, tắt hoặc xóa trang, đổi thứ tự (↑ ↓) và đổi đường dẫn (địa chỉ cũ tự chuyển sang địa chỉ mới). Nội dung không thay thế tư vấn pháp lý.

## 10b. Menu quản trị

Menu bên trái gồm 4 nhóm chính (Bán hàng, Sản phẩm, Nội dung, Hệ thống) **thu gọn**: nhóm xổ ra khi bạn đang ở một trang của nhóm, hoặc khi bấm vào tên nhóm. Nhóm bạn đã mở được nhớ nên chuyển sang mục khác không tự đóng, chỉ đóng khi bạn bấm đóng. Menu Cài đặt cũng gom thành 5 mục lớn có mô tả và hoạt động tương tự. Mỗi trang admin có khung **Mô tả cách hoạt động** ở đầu trang, ẩn / hiện được.

**Danh sách dài** (đơn hàng, khách hàng, sản phẩm, blog): mặc định 20 dòng mỗi trang, chọn 20 / 30 / 50 / 100 ở chân danh sách. Bấm vào một dòng rồi Quay lại sẽ về đúng trang đang xem.

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
