// Nội dung MẪU cho các trang chính sách (Admin › Cài đặt › Trang chính sách). Chủ shop phải đọc lại, sửa cho đúng với shop,
// rồi tick "Đã xác nhận" ở từng trang. Trang chưa xác nhận sẽ được nhắc ở Tổng quan.
// Đây là bản soạn sẵn thông dụng, không thay thế tư vấn pháp lý.

export const DEFAULT_POLICY_PAGES = [
  {
    key: 'doi-tra', enabled: true, reviewed: false, title: 'Chính sách đổi trả', slug: 'chinh-sach-doi-tra',
    content: `<h2>Thời gian và điều kiện đổi trả</h2>
<ul>
<li>Quý khách được đổi hoặc trả sản phẩm trong vòng <b>7 ngày</b> kể từ ngày nhận hàng.</li>
<li>Sản phẩm còn nguyên vẹn, không trầy xước, không biến dạng, còn đầy đủ hộp, giấy kiểm định và quà tặng kèm (nếu có).</li>
<li>Vui lòng quay video lúc mở hộp để việc đối chiếu được nhanh chóng.</li>
</ul>
<h2>Trường hợp không áp dụng đổi trả</h2>
<ul>
<li>Sản phẩm làm theo yêu cầu riêng (thiết kế riêng, đo ni riêng) trừ khi lỗi do shop.</li>
<li>Sản phẩm đã qua sử dụng, hư hỏng do va đập, đeo không đúng cách hoặc tiếp xúc hóa chất.</li>
<li>Sản phẩm giảm giá đặc biệt đã được thông báo là không đổi trả.</li>
</ul>
<h2>Sản phẩm lỗi hoặc giao sai</h2>
<p>Nếu sản phẩm bị lỗi hoặc giao sai mẫu, shop đổi sản phẩm khác hoặc hoàn tiền và chịu toàn bộ phí vận chuyển hai chiều.</p>
<h2>Cách yêu cầu đổi trả</h2>
<p>Liên hệ shop qua số điện thoại hoặc Zalo ở chân trang, cung cấp mã đơn hàng và hình ảnh sản phẩm. Shop sẽ phản hồi và hướng dẫn trong vòng 24 giờ làm việc. Tiền hoàn trả (nếu có) được chuyển khoản trong 3 đến 7 ngày làm việc.</p>`,
  },
  {
    key: 'bao-mat', enabled: true, reviewed: false, title: 'Chính sách bảo mật thông tin', slug: 'chinh-sach-bao-mat',
    content: `<h2>Thông tin chúng tôi thu thập</h2>
<p>Khi Quý khách đặt hàng, gửi yêu cầu thiết kế riêng hoặc liên hệ tư vấn, chúng tôi thu thập: họ tên, số điện thoại, địa chỉ nhận hàng, email (nếu có) và nội dung Quý khách cung cấp.</p>
<h2>Mục đích sử dụng</h2>
<ul>
<li>Xác nhận và xử lý đơn hàng, giao hàng, chăm sóc sau bán.</li>
<li>Liên hệ tư vấn theo yêu cầu của Quý khách.</li>
<li>Gửi thông báo về tình trạng đơn hàng qua điện thoại, Zalo hoặc email.</li>
</ul>
<h2>Cam kết bảo mật</h2>
<ul>
<li>Chúng tôi không bán, trao đổi hay cho thuê thông tin cá nhân của Quý khách cho bên thứ ba vì mục đích thương mại.</li>
<li>Thông tin chỉ được chia sẻ cho đơn vị vận chuyển trong phạm vi cần thiết để giao hàng, hoặc khi cơ quan nhà nước có thẩm quyền yêu cầu theo quy định pháp luật.</li>
<li>Dữ liệu được lưu trên hệ thống có giới hạn truy cập, chỉ nhân viên được phân quyền mới xem được.</li>
</ul>
<h2>Cookie và công cụ thống kê</h2>
<p>Website có thể sử dụng cookie và các công cụ phân tích (ví dụ Google Analytics) để hiểu cách khách truy cập sử dụng website và cải thiện trải nghiệm. Quý khách có thể tắt cookie trong cài đặt trình duyệt.</p>
<h2>Quyền của Quý khách</h2>
<p>Quý khách có quyền yêu cầu xem, chỉnh sửa hoặc xóa thông tin cá nhân của mình bằng cách liên hệ shop qua số điện thoại hoặc email ở chân trang. Chúng tôi xử lý yêu cầu trong thời gian sớm nhất theo quy định pháp luật Việt Nam về bảo vệ dữ liệu cá nhân.</p>`,
  },
  {
    key: 'dieu-khoan', enabled: true, reviewed: false, title: 'Điều khoản mua hàng', slug: 'dieu-khoan-mua-hang',
    content: `<h2>Đặt hàng</h2>
<p>Quý khách gửi đơn đặt hàng qua website. Đơn hàng chỉ được xem là xác nhận sau khi shop liên hệ lại bằng điện thoại hoặc Zalo và Quý khách đồng ý các thông tin về sản phẩm, giá và địa chỉ giao hàng. Website <b>không thu tiền trực tuyến</b> ở bước gửi đơn.</p>
<h2>Giá bán và thông tin sản phẩm</h2>
<ul>
<li>Giá hiển thị là giá niêm yết, đã bao gồm các loại thuế theo quy định (nếu có), chưa gồm phí vận chuyển trừ khi có ghi chú khác.</li>
<li>Ngọc là sản phẩm thiên nhiên nên màu sắc, vân ngọc có thể chênh lệch nhẹ giữa hình ảnh và thực tế do ánh sáng và màn hình hiển thị.</li>
<li>Shop có quyền điều chỉnh giá hoặc từ chối đơn hàng khi có sai sót rõ ràng về giá, và sẽ thông báo cho Quý khách.</li>
</ul>
<h2>Giấy kiểm định</h2>
<p>Sản phẩm có giấy kiểm định đi kèm được ghi rõ ở trang sản phẩm. Thông tin trên giấy kiểm định là cơ sở xác nhận chất liệu của sản phẩm.</p>
<h2>Thay đổi nội dung điều khoản</h2>
<p>Shop có thể cập nhật điều khoản khi cần thiết. Phiên bản mới có hiệu lực kể từ khi đăng trên website.</p>`,
  },
  {
    key: 'van-chuyen', enabled: true, reviewed: false, title: 'Chính sách vận chuyển và thanh toán', slug: 'chinh-sach-van-chuyen-thanh-toan',
    content: `<h2>Vận chuyển</h2>
<ul>
<li>Shop giao hàng toàn quốc qua các đơn vị vận chuyển uy tín. Hàng được đóng gói cẩn thận, kèm giấy kiểm định (nếu có).</li>
<li>Thời gian giao dự kiến: 1 đến 5 ngày làm việc tùy khu vực, kể từ khi đơn được xác nhận.</li>
<li>Quý khách nhận mã vận đơn để theo dõi hành trình, và có thể tra cứu tình trạng đơn tại trang Tra cứu đơn hàng bằng mã đơn và số điện thoại.</li>
</ul>
<h2>Kiểm tra hàng khi nhận</h2>
<p>Quý khách vui lòng kiểm tra bên ngoài kiện hàng và quay video khi mở hộp. Nếu có dấu hiệu móp méo, rách niêm phong hoặc sai sản phẩm, hãy liên hệ shop ngay trong ngày nhận hàng.</p>
<h2>Thanh toán</h2>
<ul>
<li>Sau khi xác nhận đơn, shop hướng dẫn Quý khách hình thức thanh toán phù hợp (chuyển khoản hoặc thanh toán khi nhận hàng).</li>
<li>Với đơn thiết kế riêng, shop có thể đề nghị đặt cọc trước khi bắt đầu chế tác.</li>
<li>Shop chỉ cung cấp thông tin tài khoản nhận tiền qua kênh chính thức (điện thoại, Zalo của shop). Quý khách hãy cẩn trọng với các tin nhắn giả mạo.</li>
</ul>`,
  },
];
