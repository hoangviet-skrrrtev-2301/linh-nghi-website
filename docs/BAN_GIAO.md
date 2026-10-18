# Bàn giao và vận hành: từ máy lập trình viên tới chủ shop và server thật

Tài liệu này trả lời các câu hỏi khi bàn giao: nội dung nằm ở đâu, máy khác cài thế nào, gì được / không được đưa lên GitHub, chạy lần đầu ra sao, chọn server nào, và vì sao **không dùng Vercel** cho website này. Chi tiết từng bước nằm ở các tài liệu được liên kết.

**Đọc nhanh:**

| Bạn là | Đọc phần |
|---|---|
| Người **giao** source code (lập trình viên) | 1, 2, 3, 8 |
| **Chủ shop** nhận source về máy để xem / sửa nội dung | 4, rồi [TONG_QUAN_TINH_NANG.md](TONG_QUAN_TINH_NANG.md) và [HUONG_DAN_SU_DUNG.md](HUONG_DAN_SU_DUNG.md) |
| Người đưa website lên **server chính thức** | 5, 6 |

---

## 1. Nội dung (ảnh, chữ...) nằm ở đâu và bàn giao thế nào?

**Nội dung KHÔNG nằm trong code.** Mọi thứ bạn nhập trong trang quản trị (sản phẩm, ảnh, bài viết, chữ trên website, màu sắc, menu...) được lưu ở 2 nơi **trên chính máy đang chạy website**:

| Nơi lưu | Chứa gì | Có trên GitHub? |
|---|---|---|
| `database/data/app.sqlite` | Sản phẩm, bài viết, cài đặt, khách hàng, đơn hàng, tài khoản | **Không** (bị `.gitignore` chặn) |
| `database/uploads/` | Ảnh đã tải lên (đã nén WebP) | **Không** |

Vì vậy:

- Sửa nội dung trên máy bạn thì **được lưu** (trong 2 nơi trên, ngay trên máy bạn), không mất khi tắt website.
- Nhưng `git push` **không** mang nội dung đi. Người nhận tải code về sẽ thấy website trống hoặc chỉ có dữ liệu mẫu.

### Cách để chủ shop nhìn thấy đúng nội dung bạn đã làm: "Gói nội dung"

Dự án có sẵn công cụ tạo **gói nội dung đã làm sạch** (`database/content-pack/`), được phép đưa lên GitHub:

```bash
npm run export-content
git add database/content-pack
git commit -m "Cập nhật gói nội dung"
git push
```

Gói này **có**: sản phẩm, loại sản phẩm, danh mục, gallery, bài viết, tác giả, ảnh đang dùng, cài đặt website, chuyển hướng, vai trò.
Gói này **không có** (công cụ tự xóa và tự kiểm tra, nếu còn sót sẽ hủy việc tạo gói): tài khoản quản trị và mật khẩu, khách hàng, đơn hàng / yêu cầu, nhật ký thao tác, phiên đăng nhập, cấu hình email (mật khẩu SMTP).

Chủ shop tải code về rồi chạy một lệnh (xem phần 4) là có đúng nội dung của bạn, và **tiếp tục sửa tại máy của họ**.

> Mỗi lần xuất gói, thư mục ảnh được ghi lại trong lịch sử git. Chỉ xuất ở các mốc bàn giao (không xuất mỗi ngày) để kho code không phình to.

### Chủ shop sửa tiếp trên máy, rồi đưa lên server chính thức: 3 cách

**Trước khi mở bán chính thức** (server chưa có đơn hàng thật), máy của bạn / chủ shop là "bản gốc":

| Cách | Khi nào dùng | Thao tác |
|---|---|---|
| **A. Sao lưu và khôi phục** (khuyên dùng) | Đưa toàn bộ nội dung đã sửa lên server | Máy local: `npm run backup`, copy thư mục `database/backups/<ngày-giờ>` lên server, trên server `npm run restore -- <thư-mục>` (xem [HUONG_DAN_UPLOAD.md](HUONG_DAN_UPLOAD.md) mục "Đưa dữ liệu từ máy tính lên VPS") |
| **B. Gói nội dung qua GitHub** | Muốn đưa nội dung qua git thay vì copy file | Máy local: `npm run export-content`, commit, push. Server: `git pull`, `pm2 stop linh-nghi`, `npm run import-content -- --force`, `chmod -R o+rX database/uploads`, `npm run create-admin`, `pm2 start linh-nghi` |
| **C. Nhập lại trực tiếp trên server** | Chỉ vài thay đổi nhỏ | Vào trang quản trị của server và sửa |

**Sau khi mở bán chính thức**, server có đơn hàng và khách hàng thật, **server mới là bản gốc**:

- **Không** ghi đè dữ liệu server bằng bản từ máy local (sẽ mất đơn hàng thật).
- Mọi thay đổi nội dung làm trực tiếp trên trang quản trị của server.
- Máy local chỉ dùng để **sửa code**; đưa code lên bằng `git pull` + `bash deploy/update.sh` (giữ nguyên dữ liệu).
- Muốn có dữ liệu thật về máy local để thử: `npm run backup` trên server, tải về, `npm run restore` ở máy local. **Bản sao lưu có thông tin khách hàng: giữ riêng tư, không đưa lên GitHub.**

---

## 2. Cài trên máy khác: cần những gì, có tự động hóa được không?

**Có, chỉ cần 1 lệnh.** Máy mới cần cài 2 phần mềm một lần (Node.js 24 LTS và Git, xem [CAI_DAT_VA_CHAY_THU.md](CAI_DAT_VA_CHAY_THU.md) Bước 1), sau đó:

```bash
git clone https://github.com/TEN_TAI_KHOAN/website-linh-nghi.git
cd website-linh-nghi
npm install
npm run bootstrap
npm run dev
```

Hoặc **bấm đúp** `chay-thu.bat` (Windows) / chạy `bash chay-thu.sh` (macOS, Linux): file này tự cài thư viện, chạy `bootstrap`, mở trình duyệt và khởi động website.

`npm run bootstrap` tự làm (và chạy lại nhiều lần vẫn an toàn, không ghi đè dữ liệu đã có):

1. Kiểm tra phiên bản Node.js.
2. Tạo file `.env` từ `.env.example` (máy cá nhân không cần điền khóa bí mật).
3. Tạo database và chạy cập nhật cấu trúc (migration).
4. **Nạp gói nội dung** từ GitHub nếu database còn trống (không có gói thì tạo dữ liệu mẫu).
5. Tạo tài khoản **Chủ shop** với mật khẩu ngẫu nhiên, **in ra màn hình một lần**.

Nhờ vậy mọi máy chạy giống máy của bạn mà không cần copy thư mục nào bằng tay.

---

## 3. Đưa lên GitHub: file nào nhạy cảm?

| Không bao giờ đưa lên | Vì sao | Đã được chặn? | Ảnh hưởng tới người nhận |
|---|---|---|---|
| `.env` | Chứa khóa bí mật (`SESSION_SECRET`, `APP_SECRET`) | Có (`.gitignore`) | Không. `npm run bootstrap` tự tạo từ `.env.example` |
| `database/data/` (`app.sqlite`) | Khách hàng, đơn hàng, mật khẩu băm, mật khẩu email mã hóa | Có | Không. Họ nhận gói nội dung và tài khoản mới |
| `database/backups/` | Bản sao lưu đầy đủ, **chứa thông tin khách** | Có | Không. Họ tự sao lưu máy họ |
| `database/uploads/` | Ảnh đang dùng (đã có trong gói nội dung) | Có | Không |
| `node_modules/`, `logs/` | Nặng, cài lại được | Có | `npm install` |
| Mọi file `*.sqlite`, `.env.*`, `*.pem`, `*.key`, `id_rsa*` | Phòng commit nhầm | Có (thêm ngày 18/10/2026) | Không |

**Được phép và cần có:** toàn bộ code, CSS đã build, `.env.example`, tài liệu, `deploy/`, và `database/content-pack/` (gói nội dung đã làm sạch).

**Đã kiểm tra:** lịch sử git không có `.env`, file database hay khóa bí mật; file trong git không chứa email / đường dẫn cá nhân. Gói nội dung quét không thấy mật khẩu băm, tên khách, email nhân viên.

**Khuyến nghị an toàn:**

- Để kho GitHub ở chế độ **Private** (riêng tư) cho tới khi bàn giao xong. Lịch sử commit có hiển thị email của người commit.
- Bật **xác thực 2 bước** cho tài khoản GitHub.
- Không dán mật khẩu, mã Gmail App Password vào issue, tin nhắn commit hay tài liệu.
- Sao lưu (`npm run backup`) chứa dữ liệu khách: chỉ chuyển qua kênh riêng (USB, Drive riêng tư), không đưa lên GitHub.

---

## 4. Người nhận tải code từ GitHub: chạy lần đầu và vào admin

1. Cài **Node.js 24 LTS** (https://nodejs.org) và **Git** (https://git-scm.com), mở cửa sổ dòng lệnh mới.
2. Tải code: `git clone <địa-chỉ-repo>` rồi `cd website-linh-nghi` (hoặc tải ZIP từ GitHub và giải nén).
3. **Cách dễ nhất:** Windows bấm đúp `chay-thu.bat`. Hoặc gõ: `npm install`, `npm run bootstrap`, `npm run dev`.
4. Màn hình `bootstrap` hiện khung có **email và mật khẩu** của tài khoản quản trị, ví dụ:

   ```
   Trang admin: http://localhost:3000/admin
   Email:       admin@linhnghi.local
   Mật khẩu:    ........   <-- ghi lại ngay, chỉ hiện một lần
   ```

5. Mở **http://localhost:3000** xem website, **http://localhost:3000/admin** đăng nhập quản trị.
6. Việc đầu tiên: góc trên bên phải › **Tài khoản & bảo mật** → đổi mật khẩu của bạn (và đổi email nếu muốn bằng `npm run create-admin`).
7. Sửa nội dung trong admin (xem [HUONG_DAN_SU_DUNG.md](HUONG_DAN_SU_DUNG.md)). Dữ liệu lưu ngay trên máy này.

**Quên mật khẩu admin (máy local):** `npm run create-admin` rồi nhập lại email và mật khẩu mới (cùng email thì đặt lại mật khẩu).

**Muốn lấy lại đúng nội dung của người giao:** `git pull`, tắt website (Ctrl + C), `npm run import-content -- --force` (tự giữ bản sao lưu), `npm run create-admin`, `npm run dev`.

**Tắt website:** Ctrl + C trong cửa sổ đang chạy. **Mở lại:** `npm run dev` (hoặc bấm đúp `chay-thu.bat`).

**Lỗi thường gặp:** xem cuối [CAI_DAT_VA_CHAY_THU.md](CAI_DAT_VA_CHAY_THU.md) (cổng 3000 bị chiếm, `node` không nhận lệnh...).

---

## 5. Đưa lên server chính thức: lần đầu vận hành

Làm theo [HUONG_DAN_UPLOAD.md](HUONG_DAN_UPLOAD.md) (mua VPS, tên miền, SSH, upload code, chạy script cài đặt). Tóm tắt thứ tự:

1. **Mua VPS Ubuntu 24.04** (1–2 core, 1–2 GB RAM, 20–40 GB SSD) và **tên miền**; trỏ bản ghi **A** của tên miền (và `www`) về IP của VPS.
2. SSH vào VPS, tải code về `/var/www/linh-nghi` (`git clone`).
3. Chạy **một lệnh cài đặt**: `sudo bash deploy/setup-vps.sh tenmien.vn email@gmail.com`. Script cài Node, Nginx, PM2, tường lửa, SSL miễn phí, tạo `.env` với khóa ngẫu nhiên và **đường dẫn admin bí mật**, hẹn giờ sao lưu mỗi đêm. Cuối script in ra địa chỉ trang admin, ví dụ `https://tenmien.vn/quan-tri-a1b2c3d4`: **ghi lại**.
4. **Đưa nội dung lên** (nếu đã làm xong nội dung ở local), chọn cách A hoặc B ở phần 1. Nếu server bắt đầu trống: bỏ qua bước này và nhập trong admin.
5. **Tạo tài khoản Chủ shop trên server:** `cd /var/www/linh-nghi && npm run create-admin` (chọn 1 – Chủ shop). **Không có mật khẩu mặc định**; mật khẩu do bạn tự đặt (tối thiểu 10 ký tự, có chữ và số). Quên mật khẩu: SSH vào VPS chạy lại `npm run create-admin` với cùng email để đặt lại.
6. Vào địa chỉ admin bí mật, đăng nhập, làm theo thứ tự:
   - **Tài khoản & bảo mật:** bật **xác thực 2 bước**.
   - **Cài đặt › Email (SMTP):** nhập Gmail của shop + **Mật khẩu ứng dụng** (Gmail App Password) theo [CAU_HINH_EMAIL.md](CAU_HINH_EMAIL.md), bấm gửi thử. Mật khẩu email được mã hóa bằng `APP_SECRET` của chính server này, vì vậy **phải nhập lại trên server** (không mang theo từ máy local).
   - **Tổng quan:** làm theo khung **"Chuẩn bị mở website chính thức"** (số điện thoại, email, địa chỉ, mạng xã hội còn là dữ liệu mẫu; ảnh chia sẻ; mã Search Console).
   - **Cài đặt › Schema:** địa chỉ có cấu trúc, giờ mở cửa; chỉ bật đổi trả / giao hàng nếu đúng thực tế.
   - **Tài khoản quản trị / Vai trò & phân quyền:** tạo tài khoản nhân viên (nếu có) và giao quyền vừa đủ.
7. **Cuối cùng, khi đã sẵn sàng bán:** Cài đặt › SEO & mã theo dõi › bật **"Cho phép Google lập chỉ mục"** (mặc định đang **TẮT** để Google chưa thu thập website khi còn thử nghiệm). Rồi trên VPS chạy `npm run check:seo -- https://tenmien.vn` (phải không có lỗi), và gửi `https://tenmien.vn/sitemap.xml` lên Google Search Console.
8. Đặt lịch kiểm tra: bản sao lưu tự động chạy lúc 3 giờ sáng (giữ 14 bản); thỉnh thoảng tải một bản về máy riêng (Cài đặt › Tải bản sao lưu, hoặc `npm run backup` rồi tải thư mục).

---

## 6. Nền tảng của website và server phù hợp

**Công nghệ:** Node.js 24 + Express 5 (một tiến trình chạy liên tục), cơ sở dữ liệu **SQLite** (một file trên ổ đĩa), giao diện render tại server (Nunjucks) + Tailwind CSS + Alpine.js. Ảnh nén bằng Sharp. Email qua Gmail SMTP.

**Điều đó có nghĩa website cần:**

- Một **máy chủ chạy Node.js liên tục** (không phải hosting tĩnh).
- Một **ổ đĩa lưu bền** (file database và thư mục ảnh phải còn nguyên khi khởi động lại).
- **Chỉ một tiến trình** ghi vào database (đã cấu hình 1 instance).

**Phù hợp:**

| Hình thức | Đánh giá |
|---|---|
| **VPS Ubuntu 24.04** (Vietnix, AZDIGI, BizFly, DigitalOcean, Vultr...) | **Khuyên dùng, đã có script cài đặt tự động.** Rẻ, đủ cho shop vừa và nhỏ, dữ liệu nằm trong tay bạn |
| Nền tảng PaaS có **ổ đĩa lưu bền** (Railway, Render có Disk, Fly.io có Volume) | Chạy được nếu gắn ổ đĩa vào đúng thư mục `database/`. Tự cấu hình hơn VPS, thường tính phí theo tháng |
| Máy tính cá nhân + Cloudflare Tunnel | Chỉ để **cho người khác xem tạm** (tắt máy là mất), xem [CAI_DAT_VA_CHAY_THU.md](CAI_DAT_VA_CHAY_THU.md) Cách 4 |

**Không phù hợp:** Vercel, Netlify, GitHub Pages, hosting PHP / cPanel không có Node.js, các dịch vụ "serverless" khác (xem phần 8).

**Cấu hình server (script `setup-vps.sh` tự làm hết):**

| Thành phần | Vai trò |
|---|---|
| Node.js 24 | Chạy ứng dụng |
| **PM2** (`deploy/ecosystem.config.cjs`) | Giữ website luôn chạy, tự khởi động lại khi lỗi hoặc VPS khởi động lại; 1 tiến trình |
| **Nginx** (`deploy/nginx.conf`) | Cổng vào: HTTPS, nén gzip, phục vụ ảnh trực tiếp, chuyển `www` về tên miền chính, chặn file ẩn |
| **Certbot** | Chứng chỉ SSL Let's Encrypt miễn phí, tự gia hạn |
| **ufw** | Tường lửa chỉ mở SSH và web |
| **cron** | Sao lưu mỗi đêm 3 giờ sáng, giữ 14 bản |

**Các biến trong file `.env` trên server** (script tạo sẵn, bạn chỉ cần biết):

| Biến | Ý nghĩa |
|---|---|
| `NODE_ENV=production` | Bật chế độ chạy thật (cookie bảo mật, HSTS, cache) |
| `BASE_URL=https://tenmien.vn` | Địa chỉ chính thức; **phải đúng** để canonical, sitemap, email đúng |
| `ADMIN_PATH=/quan-tri-xxxx` | Đường dẫn trang quản trị (ngẫu nhiên, khó dò) |
| `SESSION_SECRET`, `APP_SECRET` | Khóa bí mật (≥ 32 ký tự, ngẫu nhiên). **Không đổi sau khi đã dùng**: đổi `APP_SECRET` làm mật khẩu email và 2FA đã lưu không còn dùng được |
| `SESSION_HOURS`, `UPLOAD_MAX_MB` | Thời gian đăng nhập (giờ) và dung lượng ảnh tối đa |

**Cập nhật code về sau:** `cd /var/www/linh-nghi && git pull && bash deploy/update.sh` (tự sao lưu trước, cài thư viện, build, chạy migration, khởi động lại, **giữ nguyên dữ liệu và `.env`**).

---

## 7. Hướng dẫn tính năng cho người dùng mới

Xem [TONG_QUAN_TINH_NANG.md](TONG_QUAN_TINH_NANG.md): giới thiệu website khách hàng, cách bán hàng vận hành (đơn hàng, custom, liên hệ), quản lý sản phẩm, nội dung, quản trị và phân quyền, kèm lịch việc hằng ngày. Hướng dẫn thao tác chi tiết từng trang admin: [HUONG_DAN_SU_DUNG.md](HUONG_DAN_SU_DUNG.md) (mỗi trang admin cũng có khung "Mô tả cách hoạt động" ngay đầu trang).

---

## 8. Có đưa lên Vercel cho chủ shop xem được không?

**Về giao diện thì xem được một phần, nhưng không nên, và trang quản trị không dùng được thật.** Lý do kỹ thuật:

- Vercel chạy code dạng **serverless**: mỗi yêu cầu có thể chạy trên một bản sao riêng, **ổ đĩa chỉ đọc hoặc tạm thời** và bị xóa sau một lúc.
- Website này lưu mọi thứ vào **file SQLite và thư mục ảnh**. Trên Vercel:
  - Đăng nhập admin được nhưng **phiên đăng nhập hay mất** (phiên lưu trong database của từng bản sao).
  - Sửa sản phẩm, tải ảnh, nhận đơn hàng: **không được lưu lâu dài** (mất khi bản sao bị thu hồi, các lần truy cập sau không thấy).
  - Thư viện SQLite và Sharp là thư viện native, khó đóng gói cho serverless.
- Có thể dựng một **bản chỉ xem** (dữ liệu có sẵn, không ghi được), nhưng mất công cấu hình lại và cho kết quả khác với website thật.

**Nếu cần chủ shop xem giao diện VÀ vào được admin, dùng một trong các cách này (đã phù hợp với website):**

| Cách | Admin dùng được? | Chi phí / công sức |
|---|---|---|
| **VPS với tên miền phụ** `thu.tenmien.vn` (cùng cách cài như bản chính thức, [HUONG_DAN_UPLOAD.md](HUONG_DAN_UPLOAD.md)) | Có, đầy đủ, dữ liệu lưu thật | Thấp (VPS vài chục nghìn đến vài trăm nghìn đồng mỗi tháng); sau này dùng luôn làm server chính thức |
| **Cloudflare Tunnel** từ máy của bạn ([CAI_DAT_VA_CHAY_THU.md](CAI_DAT_VA_CHAY_THU.md) Cách 4) | Có, đầy đủ | Miễn phí, nhưng **chỉ chạy khi máy bạn bật**, link đổi mỗi lần |
| Railway / Render / Fly.io có ổ đĩa lưu bền | Có | Vài USD mỗi tháng, tự cấu hình |
| Chủ shop tự chạy trên máy họ (phần 4) | Có | Miễn phí, họ thấy và sửa ngay trên máy của họ |

**Nếu vẫn muốn thử Vercel**, các câu hỏi bạn đặt ra:

- *Xóa được không?* **Được.** Vercel Dashboard › chọn dự án › Settings › Delete Project. Xóa dự án là xóa luôn địa chỉ và dữ liệu trên Vercel; mã nguồn trên GitHub không bị ảnh hưởng. Nhớ cả việc **xóa biến môi trường** và ngắt kết nối GitHub trong Vercel.
- *Có dễ lộ mật khẩu không?* Rủi ro nằm ở các điểm sau, và cách phòng:
  - Địa chỉ `*.vercel.app` là **công khai**; trang admin dùng đường dẫn mặc định `/admin` dễ bị dò. Đổi `ADMIN_PATH` thành chuỗi ngẫu nhiên và bật xác thực 2 bước.
  - **Không đưa `.env`, `app.sqlite`, bản sao lưu lên.** Chỉ dùng **gói nội dung đã làm sạch** (không có khách hàng, đơn hàng, mật khẩu).
  - Tạo tài khoản admin **riêng cho bản xem thử** với mật khẩu ngẫu nhiên dài; đổi / xóa ngay khi xem xong. **Không dùng lại mật khẩu của server thật.**
  - Khóa bí mật (`SESSION_SECRET`, `APP_SECRET`) đặt trong mục Environment Variables của Vercel, **không** commit vào code, và đặt **khác** hoàn toàn khóa của server thật.
  - Không nhập đơn hàng thật hay thông tin khách thật vào bản xem thử.

**Khuyến nghị:** cho chủ shop chạy trên máy họ bằng `chay-thu.bat` (xem và sửa ngay, không cần server) hoặc dựng một VPS với tên miền phụ để họ vào admin từ xa. Đây là cách duy nhất vừa xem giao diện, vừa dùng được admin, vừa lưu thật.
