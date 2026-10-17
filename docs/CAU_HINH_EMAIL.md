# Hướng dẫn cấu hình email nhận đơn hàng (Gmail)

Website gửi email qua Gmail của shop bằng **Mật khẩu ứng dụng** (App Password). Đây là mật khẩu riêng chỉ dùng cho website: không phải mật khẩu Gmail chính, và có thể thu hồi bất cứ lúc nào mà không ảnh hưởng tài khoản.

## Website sẽ gửi những email nào?

| Khi nào | Gửi cho ai |
|---|---|
| Khách gửi đơn đặt hàng (giỏ hàng hoặc "Đặt nhanh") | Shop + email xác nhận cho khách (nếu khách nhập email) |
| Khách gửi yêu cầu thiết kế riêng (custom) | Shop + khách |
| Khách gửi yêu cầu tư vấn sản phẩm / lời nhắn liên hệ | Shop + khách |

Email gửi cho shop có đầy đủ thông tin khách, sản phẩm, ni tay, và nút mở thẳng đơn đó trong trang quản trị.

> Dù email có lỗi, mọi đơn hàng **vẫn luôn được lưu** trong trang quản trị.

## Bước 1: Bật xác minh 2 bước cho Gmail

1. Đăng nhập Gmail của shop, mở **https://myaccount.google.com/security**
2. Mục "Cách bạn đăng nhập vào Google", bấm **Xác minh 2 bước** rồi làm theo hướng dẫn (dùng số điện thoại).

## Bước 2: Tạo Mật khẩu ứng dụng

1. Mở **https://myaccount.google.com/apppasswords** (đăng nhập lại nếu được hỏi).
2. Ô "Tên ứng dụng" nhập: `Website`, bấm **Tạo**.
3. Google hiện một mã gồm **16 ký tự**, ví dụ `abcd efgh ijkl mnop`. **Copy mã này.**

> Google chỉ hiện mã này một lần. Nếu lỡ đóng, chỉ cần xóa mã cũ và tạo mã mới.

## Bước 3: Nhập vào trang quản trị

Vào **Admin › Cài đặt website › Email (SMTP)** (chỉ tài khoản Chủ shop thấy mục này):

| Ô | Nhập |
|---|---|
| Bật gửi email | Bật |
| Máy chủ SMTP | `smtp.gmail.com` |
| Cổng | `465` |
| Dùng SSL | Bật |
| Tài khoản | Địa chỉ Gmail của shop, ví dụ `shoplinhnghi@gmail.com` |
| Mật khẩu ứng dụng | Dán mã 16 ký tự ở Bước 2 (có hoặc không có dấu cách đều được) |
| Tên người gửi | Tên shop, ví dụ `Linh Nghi` |
| Email nhận thông báo đơn hàng | Email muốn nhận đơn (có thể là Gmail trên hoặc email khác). Nhiều email thì cách nhau bằng dấu phẩy |
| Gửi email xác nhận cho khách | Bật nếu muốn khách nhận email xác nhận |

Bấm **Lưu & gửi email thử**. Nếu hiện "Đã gửi email thử tới ...", hãy kiểm tra hộp thư (cả thư mục **Spam**).

## Bảo mật

- Mật khẩu ứng dụng được **mã hóa AES-256** khi lưu vào database. Sau khi lưu, ô mật khẩu chỉ hiện `••••••••`, không ai xem lại được, kể cả người quản trị.
- Khóa giải mã nằm trong file `.env` trên VPS (`APP_SECRET`), tách riêng khỏi database. Lộ file database cũng không lộ mật khẩu email.
- Chỉ tài khoản **Chủ shop** mới xem và sửa được mục Email.
- Muốn thu hồi: vào https://myaccount.google.com/apppasswords và xóa mã "Website". Website sẽ ngừng gửi email ngay.

## Gặp lỗi?

| Thông báo | Cách xử lý |
|---|---|
| `Invalid login` / `Username and Password not accepted` | Sai mật khẩu ứng dụng hoặc chưa bật xác minh 2 bước. Tạo mã mới và dán lại |
| `Email chưa được bật hoặc thiếu...` | Chưa bật "Bật gửi email" hoặc còn trống ô tài khoản / mật khẩu |
| `Connection timeout` | Nhà cung cấp VPS chặn cổng 465. Đổi **Cổng** thành `587`, **tắt** "Dùng SSL", lưu và thử lại. Nếu vẫn lỗi, liên hệ nhà cung cấp VPS để mở cổng SMTP |
| Email vào Spam | Bấm "Không phải thư rác" vài lần. Lâu dài nên dùng email theo tên miền (ví dụ qua Zoho Mail): nhập máy chủ, cổng, tài khoản SMTP của dịch vụ đó vào cùng các ô trên |
| Gmail báo đạt giới hạn gửi | Gmail cá nhân gửi tối đa khoảng 500 email/ngày, đủ cho shop vừa và nhỏ |

Gửi lại email cho một đơn cũ: mở đơn trong admin và bấm **Gửi lại email thông báo**.
