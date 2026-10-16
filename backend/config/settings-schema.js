// ==========================================================
// SCHEMA CẤU HÌNH WEBSITE
// Mỗi nhóm (group) là một tab trong Admin > Cài đặt.
// Trang admin TỰ SINH form từ file này, muốn thêm trường mới chỉ cần thêm vào đây.
//
// Kiểu trường (type):
//   text, textarea, richtext, email, url, number, color, toggle,
//   select (cần options), image (lưu id ảnh), secret (được mã hóa, không hiện lại),
//   list (danh sách lặp, cần fields con)
// ownerOnly: chỉ tài khoản Chủ shop mới xem/sửa được nhóm này
// ==========================================================

const FONT_OPTIONS = [
  'Cormorant Garamond', 'Playfair Display', 'Lora', 'Noto Serif', 'Prata', 'Marcellus',
  'Be Vietnam Pro', 'Inter', 'Montserrat', 'Nunito Sans', 'Quicksand', 'Mulish',
].map((f) => ({ value: f, label: f }));

export const SETTINGS_SCHEMA = [
  {
    key: 'site',
    label: 'Thông tin shop',
    description: 'Tên, logo, thông tin liên hệ hiển thị trên toàn website.',
    fields: [
      { name: 'name', label: 'Tên shop', type: 'text', default: 'Linh Nghi Jade' },
      { name: 'slogan', label: 'Slogan', type: 'text', default: 'Ngọc sáng an yên, trao gửi tâm tình' },
      { name: 'logo', label: 'Logo', type: 'image', help: 'Ảnh PNG nền trong suốt, ngang khoảng 400px' },
      { name: 'logo_light', label: 'Logo phiên bản sáng (trên nền tối)', type: 'image' },
      { name: 'favicon', label: 'Favicon (biểu tượng tab trình duyệt)', type: 'image', help: 'Ảnh vuông, tối thiểu 512×512px' },
      { name: 'phone', label: 'Số điện thoại', type: 'text', default: '0900 000 000' },
      { name: 'zalo', label: 'Số Zalo', type: 'text', default: '0900000000' },
      { name: 'email', label: 'Email hiển thị', type: 'email', default: 'hello@example.com' },
      { name: 'address', label: 'Địa chỉ', type: 'textarea', default: 'TP. Hồ Chí Minh' },
      { name: 'working_hours', label: 'Giờ làm việc', type: 'text', default: '9:00 – 21:00, Thứ 2 – Chủ nhật' },
      { name: 'map_embed_url', label: 'Link nhúng Google Maps', type: 'url', help: 'Google Maps > Chia sẻ > Nhúng bản đồ > copy phần src="..."' },
      { name: 'facebook', label: 'Facebook', type: 'url' },
      { name: 'instagram', label: 'Instagram', type: 'url' },
      { name: 'threads', label: 'Threads', type: 'url' },
      { name: 'tiktok', label: 'TikTok', type: 'url' },
      { name: 'youtube', label: 'YouTube', type: 'url' },
      { name: 'shopee', label: 'Shopee', type: 'url' },
      { name: 'footer_text', label: 'Đoạn giới thiệu ở chân trang', type: 'textarea', default: 'Vòng tay ngọc tự nhiên, có chứng chỉ kiểm định, chế tác thủ công theo yêu cầu.' },
      { name: 'copyright', label: 'Dòng bản quyền', type: 'text', default: '© {year} Linh Nghi Jade. Bảo lưu mọi quyền.', help: '{year} sẽ được thay bằng năm hiện tại' },
    ],
  },
  {
    key: 'theme',
    label: 'Giao diện',
    description: 'Màu sắc, font chữ, bo góc. Thay đổi có hiệu lực ngay trên toàn website.',
    fields: [
      { name: 'color_primary', label: 'Màu chủ đạo', type: 'color', default: '#2e6b94' },
      { name: 'color_primary_contrast', label: 'Màu chữ trên nền chủ đạo', type: 'color', default: '#ffffff' },
      { name: 'color_accent', label: 'Màu nhấn (nút, điểm nhấn)', type: 'color', default: '#a98a50' },
      { name: 'color_bg', label: 'Màu nền trang', type: 'color', default: '#fbfcfa' },
      { name: 'color_surface', label: 'Màu nền thẻ/khối', type: 'color', default: '#ffffff' },
      { name: 'color_text', label: 'Màu chữ chính', type: 'color', default: '#1d2b36' },
      { name: 'color_muted', label: 'Màu chữ phụ', type: 'color', default: '#62737e' },
      { name: 'color_border', label: 'Màu viền', type: 'color', default: '#dfe7ea' },
      { name: 'color_footer_bg', label: 'Màu nền chân trang', type: 'color', default: '#1e3a4f' },
      {
        name: 'dark_mode', label: 'Chế độ tối (Dark mode)', type: 'select', default: 'auto',
        options: [
          { value: 'auto', label: 'Có nút chuyển sáng/tối, mặc định theo thiết bị của khách' },
          { value: 'light', label: 'Có nút chuyển, mặc định giao diện sáng' },
          { value: 'off', label: 'Tắt chế độ tối' },
        ],
      },
      { name: 'dark_color_primary', label: 'Chế độ tối: màu chủ đạo', type: 'color', default: '#6aa6d0' },
      { name: 'dark_color_primary_contrast', label: 'Chế độ tối: màu chữ trên nền chủ đạo', type: 'color', default: '#0e1a24' },
      { name: 'dark_color_accent', label: 'Chế độ tối: màu nhấn', type: 'color', default: '#c4a56a' },
      { name: 'dark_color_bg', label: 'Chế độ tối: màu nền trang', type: 'color', default: '#0f1a22' },
      { name: 'dark_color_surface', label: 'Chế độ tối: màu nền thẻ/khối', type: 'color', default: '#16252f' },
      { name: 'dark_color_text', label: 'Chế độ tối: màu chữ chính', type: 'color', default: '#e6edf1' },
      { name: 'dark_color_muted', label: 'Chế độ tối: màu chữ phụ', type: 'color', default: '#9db0bc' },
      { name: 'dark_color_border', label: 'Chế độ tối: màu viền', type: 'color', default: '#273945' },
      { name: 'dark_color_footer_bg', label: 'Chế độ tối: màu nền chân trang', type: 'color', default: '#0a1218' },
      { name: 'font_heading', label: 'Font tiêu đề', type: 'select', options: FONT_OPTIONS, default: 'Cormorant Garamond' },
      { name: 'font_body', label: 'Font nội dung', type: 'select', options: FONT_OPTIONS, default: 'Be Vietnam Pro' },
      {
        name: 'radius', label: 'Độ bo góc', type: 'select', default: 'md',
        options: [{ value: 'none', label: 'Vuông' }, { value: 'sm', label: 'Bo nhẹ' }, { value: 'md', label: 'Bo vừa' }, { value: 'lg', label: 'Bo nhiều' }],
      },
      {
        name: 'product_grid', label: 'Số cột sản phẩm (màn hình lớn)', type: 'select', default: '4',
        options: [{ value: '3', label: '3 cột' }, { value: '4', label: '4 cột' }],
      },
      { name: 'enable_animations', label: 'Bật hiệu ứng chuyển động khi cuộn trang', type: 'toggle', default: true },
      { name: 'custom_css', label: 'CSS tùy chỉnh (nâng cao)', type: 'textarea', help: 'Dành cho người biết CSS. Để trống nếu không dùng.' },
    ],
  },
  {
    key: 'features',
    label: 'Bật/tắt tính năng',
    description: 'Ẩn hoặc hiện các trang và chức năng trên website.',
    fields: [
      { name: 'checkout', label: 'Cho phép đặt hàng (giỏ hàng + gửi đơn)', type: 'toggle', default: true, help: 'Tắt: khách chỉ thấy nút liên hệ tư vấn' },
      { name: 'custom_request', label: 'Nhận yêu cầu thiết kế riêng (custom)', type: 'toggle', default: true },
      { name: 'blog', label: 'Trang Blog', type: 'toggle', default: true },
      { name: 'gallery', label: 'Trang Gallery', type: 'toggle', default: true },
      { name: 'size_guide', label: 'Trang Hướng dẫn size', type: 'toggle', default: true },
      { name: 'show_prices', label: 'Hiển thị giá sản phẩm', type: 'toggle', default: true },
      { name: 'floating_contact', label: 'Nút liên hệ nổi (Zalo/Gọi) góc màn hình', type: 'toggle', default: true },
      { name: 'welcome_popup', label: 'Popup chào mừng khi khách vào trang', type: 'toggle', default: false },
      { name: 'welcome_popup_title', label: 'Tiêu đề popup chào mừng', type: 'text', default: 'Ưu đãi cho khách mới' },
      { name: 'welcome_popup_content', label: 'Nội dung popup chào mừng', type: 'textarea', default: 'Giảm 5% cho đơn đầu tiên khi nhắn Zalo cho shop.' },
      { name: 'welcome_popup_image', label: 'Ảnh popup chào mừng', type: 'image' },
      { name: 'welcome_popup_delay', label: 'Hiện popup sau (giây)', type: 'number', default: 5 },
      { name: 'announcement', label: 'Thanh thông báo đầu trang', type: 'text', default: 'Miễn phí vận chuyển toàn quốc · Kiểm định 100% ngọc tự nhiên', help: 'Để trống để ẩn' },
    ],
  },
  {
    key: 'navigation',
    label: 'Menu',
    description: 'Các mục trên thanh menu. Trang bị tắt ở mục "Bật/tắt tính năng" sẽ tự ẩn.',
    fields: [
      {
        name: 'items', label: 'Mục menu', type: 'list',
        fields: [
          { name: 'label', label: 'Tên hiển thị', type: 'text' },
          { name: 'url', label: 'Đường dẫn', type: 'text' },
        ],
        default: [
          { label: 'Trang chủ', url: '/' },
          { label: 'Sản phẩm', url: '/san-pham' },
          { label: 'Gallery', url: '/gallery' },
          { label: 'Chọn size', url: '/huong-dan-size' },
          { label: 'Thiết kế riêng', url: '/thiet-ke-rieng' },
          { label: 'Blog', url: '/blog' },
          { label: 'Về shop', url: '/ve-shop' },
          { label: 'Liên hệ', url: '/lien-he' },
        ],
      },
    ],
  },
  {
    key: 'home',
    label: 'Trang chủ',
    description: 'Nội dung các khối trên trang chủ.',
    fields: [
      {
        name: 'hero_slides', label: 'Banner đầu trang (slide)', type: 'list',
        fields: [
          { name: 'image', label: 'Ảnh (ngang, tối thiểu 1920px)', type: 'image' },
          { name: 'eyebrow', label: 'Dòng chữ nhỏ phía trên', type: 'text' },
          { name: 'title', label: 'Tiêu đề', type: 'text' },
          { name: 'subtitle', label: 'Mô tả', type: 'textarea' },
          { name: 'cta_label', label: 'Chữ trên nút', type: 'text' },
          { name: 'cta_url', label: 'Link nút', type: 'text' },
        ],
        default: [
          { eyebrow: 'Ngọc tự nhiên · Có kiểm định', title: 'Vòng ngọc tinh tuyển cho người thương', subtitle: 'Mỗi chiếc vòng được tuyển chọn kỹ lưỡng, đo ni chuẩn tay và kèm chứng chỉ kiểm định.', cta_label: 'Khám phá bộ sưu tập', cta_url: '/san-pham' },
        ],
      },
      {
        name: 'info_blocks', label: 'Khối thông tin nổi bật (bấm vào để xem chi tiết)', type: 'list',
        fields: [
          { name: 'icon', label: 'Biểu tượng', type: 'select', options: ['gem', 'shield', 'ruler', 'truck', 'gift', 'sparkle', 'heart', 'leaf'].map((v) => ({ value: v, label: v })) },
          { name: 'title', label: 'Tiêu đề', type: 'text' },
          { name: 'summary', label: 'Mô tả ngắn', type: 'textarea' },
          { name: 'detail', label: 'Nội dung chi tiết (hiện trong popup)', type: 'richtext' },
        ],
        default: [
          { icon: 'gem', title: 'Ngọc tự nhiên 100%', summary: 'Tuyển chọn từ nguồn uy tín, không nhuộm, không tẩm.', detail: '<p>Toàn bộ ngọc tại shop là ngọc tự nhiên loại A, không qua xử lý hóa chất, nhuộm màu hay tẩm keo.</p>' },
          { icon: 'shield', title: 'Chứng chỉ kiểm định', summary: 'Mỗi vòng có giấy kiểm định từ trung tâm độc lập.', detail: '<p>Khách có thể tra cứu mã chứng chỉ trực tiếp với trung tâm kiểm định để xác thực.</p>' },
          { icon: 'ruler', title: 'Đo ni chuẩn tay', summary: 'Tư vấn chọn ni vừa vặn, hỗ trợ đổi size.', detail: '<p>Xem hướng dẫn đo tay tại trang Chọn size hoặc nhắn shop để được tư vấn 1:1.</p>' },
          { icon: 'gift', title: 'Đóng hộp quà tặng', summary: 'Hộp gỗ, túi nhung và thiệp viết tay miễn phí.', detail: '<p>Mỗi đơn hàng đều được đóng gói cẩn thận trong hộp quà cao cấp.</p>' },
        ],
      },
      { name: 'show_certificates', label: 'Hiện khối chứng chỉ kiểm định', type: 'toggle', default: true },
      { name: 'cert_title', label: 'Tiêu đề khối chứng chỉ', type: 'text', default: 'Kiểm định độc lập – Cam kết ngọc thật' },
      { name: 'cert_subtitle', label: 'Mô tả khối chứng chỉ', type: 'textarea', default: 'Mỗi chiếc vòng đều được kiểm định tại các trung tâm uy tín. Bấm vào giấy kiểm định để xem chi tiết.' },
      {
        name: 'cert_commitments', label: 'Lời cam kết', type: 'list',
        fields: [{ name: 'text', label: 'Nội dung cam kết', type: 'text' }],
        default: [
          { text: 'Ngọc thiên nhiên 100%, không xử lý hóa chất' },
          { text: 'Hoàn tiền gấp 10 lần nếu phát hiện ngọc giả' },
          { text: 'Sẵn sàng kiểm định lại tại trung tâm bất kỳ theo yêu cầu' },
        ],
      },
      {
        name: 'cert_items', label: 'Mẫu giấy kiểm định (trung tâm uy tín)', type: 'list',
        fields: [
          { name: 'image', label: 'Ảnh giấy kiểm định', type: 'image' },
          { name: 'title', label: 'Tên trung tâm', type: 'text' },
          { name: 'description', label: 'Ghi chú', type: 'text' },
        ],
        default: [
          { title: 'VGC – Trung tâm Kiểm định Đá quý Việt Nam', description: 'Giấy kiểm định mẫu' },
          { title: 'PNJ Lab', description: 'Giấy kiểm định mẫu' },
          { title: 'LIULAB', description: 'Giấy kiểm định mẫu' },
        ],
      },
      { name: 'show_size_calc', label: 'Hiện công cụ tính ni nhanh ở khối số đo ni', type: 'toggle', default: true },
      { name: 'show_fengshui', label: 'Hiện khối ý nghĩa ngọc & phong thủy', type: 'toggle', default: true },
      { name: 'fengshui_title', label: 'Tiêu đề khối phong thủy', type: 'text', default: 'Ý nghĩa ngọc & phong thủy' },
      { name: 'fengshui_subtitle', label: 'Mô tả khối phong thủy', type: 'textarea', default: 'Từ ngàn xưa, ngọc được xem là vật phẩm mang lại bình an, sức khỏe và may mắn cho người đeo.' },
      { name: 'fengshui_image', label: 'Ảnh khối phong thủy', type: 'image' },
      {
        name: 'fengshui_items', label: 'Các ý nghĩa', type: 'list',
        fields: [
          { name: 'title', label: 'Tiêu đề', type: 'text' },
          { name: 'content', label: 'Nội dung', type: 'textarea' },
        ],
        default: [
          { title: 'Bình an', content: 'Ngọc được tin là giúp xua đuổi năng lượng xấu, bảo hộ người đeo.' },
          { title: 'Sức khỏe', content: 'Đeo ngọc sát da giúp điều hòa khí huyết, tạo cảm giác thư thái.' },
          { title: 'Tài lộc', content: 'Ngọc xanh tượng trưng cho sự sinh sôi, thịnh vượng và may mắn.' },
          { title: 'Hợp mệnh', content: 'Chọn màu ngọc theo ngũ hành giúp tăng cường năng lượng tích cực.' },
        ],
      },
      { name: 'featured_title', label: 'Tiêu đề khối sản phẩm nổi bật', type: 'text', default: 'Tuyển chọn nổi bật' },
      { name: 'featured_subtitle', label: 'Mô tả khối sản phẩm nổi bật', type: 'text', default: 'Những thiết kế được yêu thích nhất tại shop' },
      { name: 'featured_limit', label: 'Số sản phẩm nổi bật hiển thị', type: 'number', default: 8 },
      { name: 'categories_title', label: 'Tiêu đề khối phân loại', type: 'text', default: 'Phân loại theo dòng ngọc' },
      { name: 'size_title', label: 'Tiêu đề khối số đo ni', type: 'text', default: 'Bảng số đo ni tham khảo' },
      { name: 'size_subtitle', label: 'Mô tả khối số đo ni', type: 'textarea', default: 'Đo chu vi khớp bàn tay khi khép các ngón lại để chọn ni phù hợp.' },
      { name: 'custom_title', label: 'Tiêu đề khối thiết kế riêng', type: 'text', default: 'Thiết kế chiếc vòng của riêng bạn' },
      { name: 'custom_subtitle', label: 'Mô tả khối thiết kế riêng', type: 'textarea', default: 'Chọn loại ngọc, màu sắc, kích thước theo ý thích. Shop sẽ tư vấn và báo giá trong 24 giờ.' },
      { name: 'custom_image', label: 'Ảnh khối thiết kế riêng', type: 'image' },
      { name: 'show_gallery', label: 'Hiện khối Gallery trên trang chủ', type: 'toggle', default: true },
      { name: 'show_blog', label: 'Hiện khối bài viết mới trên trang chủ', type: 'toggle', default: true },
      {
        name: 'testimonials', label: 'Cảm nhận khách hàng', type: 'list',
        fields: [
          { name: 'name', label: 'Tên khách', type: 'text' },
          { name: 'content', label: 'Nội dung', type: 'textarea' },
          { name: 'avatar', label: 'Ảnh đại diện', type: 'image' },
        ],
        default: [],
      },
    ],
  },
  {
    key: 'about',
    label: 'Trang Về shop',
    fields: [
      { name: 'title', label: 'Tiêu đề', type: 'text', default: 'Câu chuyện của chúng tôi' },
      { name: 'intro', label: 'Đoạn mở đầu', type: 'textarea', default: 'Linh Nghi Jade ra đời từ tình yêu với ngọc và mong muốn mang đến những chiếc vòng chân thật, bền đẹp cùng năm tháng.' },
      { name: 'image', label: 'Ảnh chính', type: 'image' },
      { name: 'content', label: 'Nội dung', type: 'richtext', default: '<p>Nội dung giới thiệu về shop. Bạn có thể chỉnh sửa trong Admin &gt; Cài đặt &gt; Trang Về shop.</p>' },
      {
        name: 'values', label: 'Giá trị cốt lõi', type: 'list',
        fields: [
          { name: 'title', label: 'Tiêu đề', type: 'text' },
          { name: 'content', label: 'Mô tả', type: 'textarea' },
        ],
        default: [
          { title: 'Chân thật', content: 'Nói đúng về từng viên ngọc, minh bạch nguồn gốc.' },
          { title: 'Tận tâm', content: 'Tư vấn kỹ lưỡng, đồng hành cả sau khi mua.' },
          { title: 'Tinh tế', content: 'Chọn lọc và chế tác với sự tỉ mỉ.' },
        ],
      },
    ],
  },
  {
    key: 'size_guide',
    label: 'Trang Hướng dẫn size',
    fields: [
      { name: 'title', label: 'Tiêu đề', type: 'text', default: 'Hướng dẫn chọn size vòng' },
      { name: 'intro', label: 'Mở đầu', type: 'textarea', default: 'Vòng ngọc không co giãn, vì vậy chọn đúng ni là yếu tố quan trọng nhất để đeo vừa và thoải mái.' },
      { name: 'image', label: 'Ảnh minh họa cách đo', type: 'image' },
      {
        name: 'steps', label: 'Các bước đo', type: 'list',
        fields: [
          { name: 'title', label: 'Tiêu đề bước', type: 'text' },
          { name: 'content', label: 'Mô tả', type: 'textarea' },
        ],
        default: [
          { title: 'Khép bàn tay', content: 'Khép các ngón tay lại, ngón cái áp sát vào lòng bàn tay như khi đeo vòng.' },
          { title: 'Đo chu vi', content: 'Dùng thước dây mềm (hoặc sợi chỉ) quấn quanh phần rộng nhất của bàn tay.' },
          { title: 'Tra bảng', content: 'So chu vi vừa đo với bảng bên dưới để chọn ni phù hợp.' },
        ],
      },
      {
        name: 'table', label: 'Bảng quy đổi', type: 'list',
        fields: [
          { name: 'size', label: 'Ni (mm)', type: 'text' },
          { name: 'hand', label: 'Chu vi bàn tay (cm)', type: 'text' },
          { name: 'wrist', label: 'Cổ tay tương ứng (cm)', type: 'text' },
          { name: 'note', label: 'Ghi chú', type: 'text' },
        ],
        default: [
          { size: '50', hand: '15.5 – 16.5', wrist: '13 – 14', note: 'Tay rất nhỏ' },
          { size: '52', hand: '16.5 – 17.5', wrist: '13.5 – 14.5', note: '' },
          { size: '54', hand: '17.5 – 18.5', wrist: '14 – 15', note: 'Phổ biến' },
          { size: '56', hand: '18.5 – 19.5', wrist: '15 – 16', note: 'Phổ biến' },
          { size: '58', hand: '19.5 – 20.5', wrist: '16 – 17', note: '' },
          { size: '60', hand: '20.5 – 21.5', wrist: '17 – 18', note: '' },
          { size: '62', hand: '21.5 – 22.5', wrist: '18 – 19', note: 'Tay lớn' },
        ],
      },
      { name: 'tips', label: 'Lưu ý thêm', type: 'richtext', default: '<ul><li>Nếu số đo nằm giữa hai ni, nên chọn ni lớn hơn.</li><li>Tay có khớp xương to nên đo kỹ phần khớp ngón cái.</li><li>Nhắn Zalo cho shop để được hỗ trợ đo qua video.</li></ul>' },
      { name: 'video_url', label: 'Video hướng dẫn đo (link YouTube)', type: 'url', help: 'Dán link dạng https://www.youtube.com/watch?v=... hoặc https://youtu.be/...' },
      { name: 'video_title', label: 'Tiêu đề video', type: 'text', default: 'Video hướng dẫn đo ni tay' },
    ],
  },
  {
    key: 'contact',
    label: 'Trang Liên hệ',
    fields: [
      { name: 'title', label: 'Tiêu đề', type: 'text', default: 'Liên hệ với shop' },
      { name: 'intro', label: 'Mô tả', type: 'textarea', default: 'Để lại lời nhắn hoặc liên hệ trực tiếp qua Zalo, điện thoại. Shop phản hồi trong giờ làm việc.' },
      { name: 'show_form', label: 'Hiện form gửi lời nhắn', type: 'toggle', default: true },
    ],
  },
  {
    key: 'forms',
    label: 'Biểu mẫu & đặt hàng',
    description: 'Nội dung các biểu mẫu khách gửi và thông báo sau khi gửi.',
    fields: [
      { name: 'order_title', label: 'Tiêu đề trang đặt hàng', type: 'text', default: 'Gửi đơn đặt hàng' },
      { name: 'order_note', label: 'Ghi chú trang đặt hàng', type: 'richtext', default: '<p>Sau khi nhận đơn, shop sẽ gọi điện hoặc nhắn Zalo để xác nhận và hướng dẫn thanh toán. Bạn chưa cần thanh toán ở bước này.</p>' },
      { name: 'order_success', label: 'Thông báo khi gửi đơn thành công', type: 'textarea', default: 'Cảm ơn bạn! Shop đã nhận đơn và sẽ liên hệ xác nhận trong thời gian sớm nhất.' },
      { name: 'track_title', label: 'Tiêu đề trang tra cứu đơn', type: 'text', default: 'Tra cứu đơn hàng' },
      { name: 'track_intro', label: 'Mô tả trang tra cứu đơn', type: 'textarea', default: 'Nhập mã đơn (nhận được sau khi đặt hàng) và số điện thoại đã dùng khi đặt để xem tình trạng.' },
      { name: 'track_msg_new', label: 'Tra cứu: lời nhắn khi trạng thái "Mới"', type: 'textarea', default: 'Shop đã nhận được yêu cầu của bạn và sẽ liên hệ sớm.' },
      { name: 'track_msg_contacted', label: 'Tra cứu: lời nhắn khi trạng thái "Đã liên hệ"', type: 'textarea', default: 'Shop đã liên hệ với bạn. Nếu chưa nhận được tin nhắn hoặc cuộc gọi, vui lòng liên hệ shop.' },
      { name: 'track_msg_confirmed', label: 'Tra cứu: lời nhắn khi trạng thái "Đã xác nhận"', type: 'textarea', default: 'Đơn đã được xác nhận. Shop đang chuẩn bị và sẽ báo bạn khi giao hàng.' },
      { name: 'track_msg_completed', label: 'Tra cứu: lời nhắn khi trạng thái "Hoàn thành"', type: 'textarea', default: 'Đơn đã hoàn thành. Cảm ơn bạn đã tin tưởng shop!' },
      { name: 'track_msg_cancelled', label: 'Tra cứu: lời nhắn khi trạng thái "Đã hủy"', type: 'textarea', default: 'Đơn đã được hủy. Nếu cần hỗ trợ, vui lòng liên hệ shop.' },
      { name: 'shipping_note', label: 'Ghi chú vận chuyển', type: 'text', default: 'Phí vận chuyển sẽ được shop báo khi xác nhận đơn.' },
      { name: 'custom_title', label: 'Tiêu đề trang thiết kế riêng', type: 'text', default: 'Thiết kế vòng theo yêu cầu' },
      { name: 'custom_intro', label: 'Mô tả trang thiết kế riêng', type: 'richtext', default: '<p>Hãy mô tả chiếc vòng bạn mong muốn. Shop sẽ tìm ngọc phù hợp, tư vấn và báo giá chi tiết.</p>' },
      { name: 'custom_success', label: 'Thông báo khi gửi yêu cầu custom thành công', type: 'textarea', default: 'Shop đã nhận yêu cầu của bạn và sẽ liên hệ tư vấn trong vòng 24 giờ.' },
      {
        name: 'budget_options', label: 'Lựa chọn ngân sách (form custom)', type: 'list',
        fields: [{ name: 'label', label: 'Mức ngân sách', type: 'text' }],
        default: [{ label: 'Dưới 3 triệu' }, { label: '3 – 7 triệu' }, { label: '7 – 15 triệu' }, { label: '15 – 30 triệu' }, { label: 'Trên 30 triệu' }],
      },
      {
        name: 'contact_via_options', label: 'Kênh liên hệ khách có thể chọn', type: 'list',
        fields: [{ name: 'label', label: 'Kênh', type: 'text' }],
        default: [{ label: 'Zalo' }, { label: 'Gọi điện' }, { label: 'Email' }, { label: 'Facebook Messenger' }],
      },
      { name: 'contact_success', label: 'Thông báo khi gửi lời nhắn liên hệ', type: 'textarea', default: 'Cảm ơn bạn đã liên hệ, shop sẽ phản hồi sớm.' },
      { name: 'consult_success', label: 'Thông báo khi gửi yêu cầu tư vấn sản phẩm', type: 'textarea', default: 'Shop đã nhận yêu cầu tư vấn và sẽ liên hệ với bạn trong thời gian sớm nhất.' },
      {
        name: 'accessory_options', label: 'Lựa chọn dây / mặt / phụ kiện đi kèm (form custom)', type: 'list',
        fields: [{ name: 'label', label: 'Tên lựa chọn', type: 'text' }],
        default: [{ label: 'Không cần phụ kiện' }, { label: 'Bọc vàng 18K' }, { label: 'Bọc bạc 925' }, { label: 'Thêm charm / mặt dây' }, { label: 'Dây rút điều chỉnh size' }],
      },
      { name: 'privacy_note', label: 'Ghi chú bảo mật dưới form', type: 'text', default: 'Thông tin của bạn chỉ dùng để shop liên hệ tư vấn, không chia sẻ cho bên thứ ba.' },
    ],
  },
  {
    key: 'pages',
    label: 'Tiêu đề các trang',
    description: 'Tiêu đề, mô tả và SEO cho trang Sản phẩm, Gallery, Blog.',
    fields: [
      { name: 'products_title', label: 'Tiêu đề trang Sản phẩm', type: 'text', default: 'Tất cả sản phẩm' },
      { name: 'products_intro', label: 'Mô tả trang Sản phẩm', type: 'textarea', default: 'Vòng ngọc tự nhiên được tuyển chọn, đầy đủ chứng chỉ kiểm định.' },
      { name: 'products_per_page', label: 'Số sản phẩm mỗi trang', type: 'number', default: 12 },
      {
        name: 'price_ranges', label: 'Khoảng giá trong bộ lọc', type: 'list',
        fields: [
          { name: 'label', label: 'Tên hiển thị', type: 'text' },
          { name: 'min', label: 'Từ (VNĐ, để trống = 0)', type: 'number' },
          { name: 'max', label: 'Đến (VNĐ, để trống = không giới hạn)', type: 'number' },
        ],
        default: [
          { label: 'Dưới 2 triệu', min: 0, max: 2000000 },
          { label: '2 – 5 triệu', min: 2000000, max: 5000000 },
          { label: '5 – 15 triệu', min: 5000000, max: 15000000 },
          { label: 'Trên 15 triệu', min: 15000000, max: 0 },
        ],
      },
      { name: 'new_days', label: 'Tự gắn nhãn "Mới" cho sản phẩm đăng trong vòng (ngày)', type: 'number', default: 30, help: 'Đặt 0 để chỉ dùng ô "Sản phẩm mới" trong từng sản phẩm' },
      { name: 'product_care', label: 'Hướng dẫn bảo quản (hiện ở mọi trang chi tiết sản phẩm)', type: 'richtext', default: '<ul><li>Tránh va đập mạnh, tháo vòng khi chơi thể thao hoặc làm việc nặng.</li><li>Không để vòng tiếp xúc với hóa chất, nước hoa, chất tẩy rửa.</li><li>Lau bằng khăn mềm và nước sạch, để khô tự nhiên.</li><li>Cất riêng trong túi nhung khi không đeo.</li></ul>' },
      { name: 'gallery_title', label: 'Tiêu đề trang Gallery', type: 'text', default: 'Gallery' },
      { name: 'gallery_intro', label: 'Mô tả trang Gallery', type: 'textarea', default: 'Những mẫu vòng đã đồng hành cùng khách hàng của shop.' },
      { name: 'blog_title', label: 'Tiêu đề trang Blog', type: 'text', default: 'Góc chia sẻ' },
      { name: 'blog_intro', label: 'Mô tả trang Blog', type: 'textarea', default: 'Kiến thức về ngọc, cách chọn và bảo quản vòng.' },
    ],
  },
  {
    key: 'seo',
    label: 'SEO & mã theo dõi',
    fields: [
      { name: 'title_suffix', label: 'Hậu tố tiêu đề trang', type: 'text', default: ' | Linh Nghi Jade', help: 'Thêm vào cuối tiêu đề mỗi trang' },
      { name: 'home_title', label: 'Tiêu đề trang chủ', type: 'text', default: 'Linh Nghi Jade – Vòng tay ngọc tự nhiên có kiểm định' },
      { name: 'default_description', label: 'Mô tả mặc định', type: 'textarea', default: 'Vòng tay ngọc phỉ thúy, bích ngọc tự nhiên có chứng chỉ kiểm định. Tư vấn chọn ni, thiết kế theo yêu cầu, giao hàng toàn quốc.' },
      { name: 'keywords', label: 'Từ khóa', type: 'text', default: 'vòng ngọc, vòng phỉ thúy, vòng tay ngọc tự nhiên, vòng ngọc kiểm định' },
      { name: 'og_image', label: 'Ảnh chia sẻ mạng xã hội mặc định', type: 'image', help: 'Tỉ lệ 1200×630px' },
      { name: 'allow_indexing', label: 'Cho phép Google lập chỉ mục', type: 'toggle', default: true, help: 'Tắt khi website đang thử nghiệm' },
      { name: 'google_site_verification', label: 'Mã xác minh Google Search Console', type: 'text', help: 'Chỉ dán phần content="..."' },
      { name: 'ga_measurement_id', label: 'Google Analytics 4 (G-XXXXXXX)', type: 'text' },
      { name: 'facebook_pixel_id', label: 'Facebook Pixel ID', type: 'text' },
    ],
  },
  {
    key: 'mail',
    label: 'Email (SMTP)',
    ownerOnly: true,
    description: 'Cấu hình gửi email thông báo đơn hàng. Với Gmail: bật xác minh 2 bước, tạo "Mật khẩu ứng dụng" rồi dán vào ô Mật khẩu.',
    fields: [
      { name: 'enabled', label: 'Bật gửi email', type: 'toggle', default: false },
      { name: 'host', label: 'Máy chủ SMTP', type: 'text', default: 'smtp.gmail.com' },
      { name: 'port', label: 'Cổng', type: 'number', default: 465 },
      { name: 'secure', label: 'Dùng SSL (cổng 465)', type: 'toggle', default: true },
      { name: 'user', label: 'Tài khoản (email Gmail)', type: 'email' },
      { name: 'password', label: 'Mật khẩu ứng dụng', type: 'secret', help: 'Được mã hóa khi lưu. Để trống nếu không muốn đổi.' },
      { name: 'from_name', label: 'Tên người gửi', type: 'text', default: 'Linh Nghi Jade' },
      { name: 'notify_to', label: 'Email nhận thông báo đơn hàng', type: 'text', help: 'Nhiều email cách nhau bằng dấu phẩy' },
      { name: 'send_customer_copy', label: 'Gửi email xác nhận cho khách (nếu khách có nhập email)', type: 'toggle', default: true },
    ],
  },
];

// SEO riêng cho từng trang: mỗi trang có tiêu đề, mô tả, từ khóa, ảnh chia sẻ.
// Để trống thì dùng giá trị mặc định ở nhóm "SEO & mã theo dõi".
export const SEO_PAGES = [
  ['home', 'Trang chủ'], ['products', 'Sản phẩm'], ['gallery', 'Gallery'], ['size_guide', 'Hướng dẫn size'],
  ['custom', 'Thiết kế riêng'], ['blog', 'Blog'], ['about', 'Về shop'], ['contact', 'Liên hệ'],
];
SETTINGS_SCHEMA.splice(SETTINGS_SCHEMA.findIndex((g) => g.key === 'mail'), 0, {
  key: 'seo_pages',
  label: 'SEO từng trang',
  description: 'Tiêu đề, mô tả, từ khóa và ảnh chia sẻ Facebook/Zalo cho từng trang. Để trống sẽ dùng giá trị mặc định. Sản phẩm và bài viết có SEO riêng trong trang sửa của chúng.',
  fields: SEO_PAGES.flatMap(([k, label]) => [
    { name: `${k}_title`, label: `[${label}] Tiêu đề (meta title)`, type: 'text' },
    { name: `${k}_keywords`, label: `[${label}] Từ khóa (meta keywords)`, type: 'text' },
    { name: `${k}_description`, label: `[${label}] Mô tả (meta description)`, type: 'textarea' },
    { name: `${k}_og_image`, label: `[${label}] Ảnh chia sẻ (Open Graph, 1200×630)`, type: 'image' },
  ]),
});
export const SCHEMA_BY_KEY = Object.fromEntries(SETTINGS_SCHEMA.map((g) => [g.key, g]));
