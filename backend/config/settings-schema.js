import { TAGS, TAG_BG_OPTIONS, TAG_PATTERNS } from '../lib/tags.js';
import { DEFAULT_POLICY_PAGES } from '../lib/policy-defaults.js';
import { GALLERY_LAYOUTS, GALLERY_ROWS, GALLERY_COLS, GALLERY_COLS_MOBILE, GALLERY_DIRECTIONS, GALLERY_RATIOS } from '../lib/gallery-view.js';

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

// Các khối của trang chủ (thứ tự mặc định). bg: false = khối tự có nền riêng (banner), không cho đổi nền.
export const HOME_SECTIONS = [
  { key: 'banner', label: 'Banner đầu trang', bg: false },
  { key: 'info', label: 'Thông tin nổi bật (4 ô)', bg: true },
  { key: 'featured', label: 'Sản phẩm nổi bật', bg: true },
  { key: 'certificates', label: 'Chứng chỉ kiểm định', bg: true, defaultLook: 'primary' },
  { key: 'categories', label: 'Phân loại theo dòng ngọc', bg: true },
  { key: 'fengshui', label: 'Ý nghĩa ngọc & phong thủy', bg: true },
  { key: 'size', label: 'Bảng số đo ni', bg: true },
  { key: 'custom', label: 'Thiết kế riêng', bg: true },
  { key: 'gallery', label: 'Gallery', bg: true },
  { key: 'testimonials', label: 'Feedback khách hàng', bg: true },
  { key: 'blog', label: 'Bài viết mới (Blog)', bg: true },
];

export const SECTION_PATTERNS = [
  { value: 'dots', label: 'Chấm bi' }, { value: 'grid', label: 'Lưới ô vuông' }, { value: 'diagonal', label: 'Sọc chéo' },
  { value: 'rings', label: 'Vòng tròn đồng tâm (vòng ngọc)' }, { value: 'waves', label: 'Sóng nhẹ' },
];

const sectionBgOn = "item.bg_mode == 'color' || item.bg_mode == 'pattern'";

// Nhãn trên sản phẩm (Best Seller, Mới, Sale...): kiểu chung + màu / họa tiết riêng từng nhãn
const TAG_FIELDS = [
  { name: 'tag_style', label: 'Kiểu nhãn', type: 'select', default: 'solid', options: [{ value: 'solid', label: 'Nền đặc' }, { value: 'outline', label: 'Viền màu, nền sáng' }, { value: 'glass', label: 'Kính mờ (trong, làm mờ ảnh phía sau)' }] },
  { name: 'tag_shape', label: 'Hình dạng nhãn', type: 'select', default: 'pill', options: [{ value: 'pill', label: 'Bo tròn hẳn (viên thuốc)' }, { value: 'round', label: 'Bo góc nhẹ' }, { value: 'square', label: 'Vuông góc' }] },
  { name: 'tag_opacity', label: 'Độ đặc của nền nhãn, 10–100 (100 = đặc hoàn toàn)', type: 'number', default: 100, help: 'Kiểu "Kính mờ" tối đa 70.' },
  { name: 'tag_pattern_strength', label: 'Độ đậm họa tiết, 5–60', type: 'number', default: 28 },
  ...TAGS.flatMap((t) => [
    { name: 'tag_' + t.key + '_bg', label: 'Nhãn "' + t.label + '": màu nền', type: 'select', default: t.bg, options: TAG_BG_OPTIONS },
    { name: 'tag_' + t.key + '_color', label: 'Nhãn "' + t.label + '": màu tùy chọn', type: 'color', default: '#2e6b94', help: 'Chỉ dùng khi ô màu nền ở trên chọn "Màu tùy chọn".' },
    {
      name: 'tag_' + t.key + '_tone', label: 'Nhãn "' + t.label + '": màu chữ', type: 'select', default: 'auto',
      options: [{ value: 'auto', label: 'Tự chọn theo nền' }, { value: 'light', label: 'Chữ sáng' }, { value: 'dark', label: 'Chữ tối' }],
    },
    { name: 'tag_' + t.key + '_pattern', label: 'Nhãn "' + t.label + '": họa tiết', type: 'select', default: 'none', options: TAG_PATTERNS },
  ]),
];

export const SETTINGS_SCHEMA = [
  {
    key: 'site',
    label: 'Thông tin shop',
    description: 'Tên, logo, thông tin liên hệ hiển thị trên toàn website.',
    fields: [
      { name: 'name', label: 'Tên shop', type: 'text', default: 'Linh Nghi' },
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
      { name: 'bct_image', label: 'Ảnh đã đăng ký Bộ Công Thương (chân trang)', type: 'image', help: 'Logo "Đã thông báo Bộ Công Thương" do cổng online.gov.vn cấp. Để trống thì không hiển thị.' },
      { name: 'bct_url', label: 'Link khi bấm vào ảnh Bộ Công Thương', type: 'url', help: 'Thường là link xác nhận trên online.gov.vn do Bộ Công Thương cấp' },
      { name: 'footer_text', label: 'Đoạn giới thiệu ở chân trang', type: 'textarea', default: 'Vòng tay ngọc tự nhiên, có chứng chỉ kiểm định, chế tác thủ công theo yêu cầu.' },
      { name: 'copyright', label: 'Dòng bản quyền', type: 'text', default: '© {year} Linh Nghi. Bảo lưu mọi quyền.', help: '{year} sẽ được thay bằng năm hiện tại' },
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
      {
        name: 'product_frame', label: 'Khung viền thẻ sản phẩm', type: 'select', default: 'inset',
        options: [{ value: 'none', label: 'Không có khung' }, { value: 'thin', label: 'Viền siêu mảnh quanh thẻ' }, { value: 'inset', label: 'Viền siêu mảnh + khung lồng trong ảnh' }],
      },
      { name: 'enable_animations', label: 'Bật hiệu ứng chuyển động khi cuộn trang', type: 'toggle', default: true },
      ...TAG_FIELDS,
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
      { name: 'search_suggest', label: 'Gợi ý khi gõ ô tìm kiếm', type: 'toggle', default: true, help: 'Hiện danh sách sản phẩm (kèm ảnh, giá) phù hợp ngay khi khách đang gõ' },
      { name: 'search_suggest_limit', label: 'Số gợi ý tối đa', type: 'number', default: 6, help: 'Từ 3 đến 10' },
      { name: 'inventory_enabled', label: 'Bật quản lý kho', type: 'toggle', default: false, help: 'Không bắt buộc. Bật thì trong từng sản phẩm có ô “Theo dõi kho”; chỉ sản phẩm được tick mới bị trừ kho, các sản phẩm khác hoạt động như cũ. Hết hàng thì sản phẩm tự hiện “Đã bán”.' },
      { name: 'inventory_deduct_at', label: 'Trừ kho khi đơn chuyển sang', type: 'select', default: 'confirmed', options: [
        { value: 'new', label: 'Ngay khi có đơn (Mới)' }, { value: 'confirmed', label: 'Đã xác nhận (khuyên dùng)' },
        { value: 'shipping', label: 'Đang giao hàng' }, { value: 'completed', label: 'Hoàn thành' },
      ], help: 'Đơn lùi về trạng thái trước mốc này, bị hủy hoặc bị xóa thì kho được hoàn lại tự động.' },
      { name: 'inventory_block_over', label: 'Không cho khách đặt quá số lượng còn', type: 'toggle', default: true },
      { name: 'inventory_display', label: 'Hiện số lượng còn cho khách', type: 'select', default: 'low', options: [
        { value: 'none', label: 'Không hiện số lượng' }, { value: 'low', label: 'Chỉ hiện khi sắp hết' }, { value: 'always', label: 'Luôn hiện' },
      ] },
      { name: 'inventory_low', label: 'Coi là “sắp hết” khi còn từ', type: 'number', default: 3, help: 'Cũng dùng để cảnh báo trong trang Sản phẩm của admin' },
      { name: 'inventory_text_in', label: 'Chữ khi còn hàng', type: 'text', default: 'Còn {n} sản phẩm', help: '{n} sẽ được thay bằng số lượng' },
      { name: 'inventory_text_low', label: 'Chữ khi sắp hết', type: 'text', default: 'Sắp hết hàng, chỉ còn {n}', help: '{n} sẽ được thay bằng số lượng' },
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
          {
            name: 'dropdown', label: 'Menu sổ dọc', type: 'select', default: 'none',
            help: 'Danh sách hiện ra khi rê chuột vào mục menu (điện thoại: bấm mũi tên). Mục "Sản phẩm" mặc định sổ theo loại ngọc.',
            options: [
              { value: 'none', label: 'Không có' }, { value: 'jade_type', label: 'Theo loại ngọc' }, { value: 'color', label: 'Theo màu sắc' },
              { value: 'style', label: 'Theo kiểu dáng' }, { value: 'element', label: 'Theo mệnh phong thủy' },
              { value: 'product_type', label: 'Theo loại sản phẩm (Vòng ngọc, Pháp phục...)' }, { value: 'blog_category', label: 'Chuyên mục blog' }, { value: 'policies', label: 'Các trang chính sách' }, { value: 'posts', label: 'Bài viết blog mới nhất' }, { value: 'custom', label: 'Tự nhập danh sách' },
            ],
          },
          { name: 'dropdown_custom', label: 'Danh sách tự nhập (mỗi dòng: Tên | /đường-dẫn)', type: 'textarea', showIf: "item.dropdown == 'custom'" },
        ],
        default: [
          { label: 'Trang chủ', url: '/', dropdown: 'none', dropdown_custom: '' },
          { label: 'Sản phẩm', url: '/san-pham', dropdown: 'jade_type', dropdown_custom: '' },
          { label: 'Gallery', url: '/gallery', dropdown: 'none', dropdown_custom: '' },
          { label: 'Chọn size', url: '/huong-dan-size', dropdown: 'none', dropdown_custom: '' },
          { label: 'Thiết kế riêng', url: '/thiet-ke-rieng', dropdown: 'none', dropdown_custom: '' },
          { label: 'Blog', url: '/blog', dropdown: 'none', dropdown_custom: '' },
          { label: 'Về shop', url: '/ve-shop', dropdown: 'none', dropdown_custom: '' },
          { label: 'Liên hệ', url: '/lien-he', dropdown: 'none', dropdown_custom: '' },
        ],
      },
    ],
  },
  {
    key: 'home',
    label: 'Trang chủ',
    description: 'Nội dung các khối trên trang chủ.',
    sections: [
      { key: 'banner', label: 'Banner đầu trang', hint: 'Nhiều banner trong một khối (tự chuyển hoặc kéo để chuyển) hoặc xếp thành nhiều khối nối tiếp' },
      { key: 'info', label: 'Thông tin nổi bật', hint: 'Dải 4 ô bấm vào xem chi tiết, nằm dưới banner' },
      { key: 'featured', label: 'Sản phẩm nổi bật', hint: 'Tiêu đề, mô tả và số sản phẩm hiển thị' },
      { key: 'categories', label: 'Phân loại theo dòng ngọc', hint: 'Tiêu đề khối phân loại' },
      { key: 'certs', label: 'Chứng chỉ kiểm định', hint: 'Lời cam kết và mẫu giấy kiểm định', toggle: 'show_certificates' },
      { key: 'fengshui', label: 'Ý nghĩa ngọc & phong thủy', hint: 'Tiêu đề, ảnh và các ý nghĩa', toggle: 'show_fengshui' },
      { key: 'size', label: 'Bảng số đo ni', hint: 'Tiêu đề và công cụ tính ni nhanh' },
      { key: 'custom', label: 'Thiết kế riêng (custom)', hint: 'Tiêu đề, mô tả và ảnh khối custom' },
      { key: 'gallery', label: 'Gallery', hint: 'Số ảnh, kiểu hiển thị (băng chuyền, lưới, xếp gạch), số dòng / cột, chuyển động', toggle: 'show_gallery' },
      { key: 'blog', label: 'Bài viết mới (Blog)', hint: 'Bật/tắt khối bài viết ở trang chủ', toggle: 'show_blog' },
    ],
    fields: [
      {
        name: 'hero_mode', section: 'banner', label: 'Cách hiển thị nhiều banner', type: 'select', default: 'slider',
        options: [{ value: 'slider', label: 'Một khối, các banner chuyển nhau (slider)' }, { value: 'stack', label: 'Mỗi banner là một khối riêng, xếp nối tiếp xuống dưới' }],
        help: 'Chỉ có một banner thì hai cách giống nhau. Các tùy chọn chuyển banner bên dưới chỉ dùng cho kiểu slider.',
      },
      { name: 'hero_autoplay', section: 'banner', label: 'Tự động chuyển banner', type: 'toggle', default: true },
      { name: 'hero_delay', section: 'banner', label: 'Thời gian giữa hai banner (giây, 2–20)', type: 'number', default: 6 },
      {
        name: 'hero_effect', section: 'banner', label: 'Hiệu ứng chuyển', type: 'select', default: 'fade',
        options: [{ value: 'fade', label: 'Mờ dần' }, { value: 'slide', label: 'Trượt ngang' }],
      },
      { name: 'hero_drag', section: 'banner', label: 'Cho kéo chuột / vuốt tay để chuyển banner', type: 'toggle', default: true },
      { name: 'hero_arrows', section: 'banner', label: 'Hiện nút mũi tên trái / phải', type: 'toggle', default: false },
      { name: 'hero_pause_hover', section: 'banner', label: 'Tạm dừng tự chuyển khi rê chuột vào banner', type: 'toggle', default: true },
      {
        name: 'hero_slides', section: 'banner', collapsible: true, itemTitle: 'title', bulkImage: 'image', label: 'Banner đầu trang', type: 'list',
        help: 'Bấm "Thêm nhiều ảnh" để chọn cùng lúc nhiều ảnh banner (mỗi ảnh thành một banner, thêm chữ sau nếu muốn). Banner đầu tiên được tải ưu tiên (LCP), nên đặt banner quan trọng nhất lên đầu. Banner không có chữ và nút thì chỉ hiện ảnh.',
        fields: [
          { name: 'image', label: 'Ảnh (ngang, tối thiểu 1920px)', type: 'image' },
          { name: 'alt', label: 'Mô tả ảnh (alt) cho người khiếm thị và Google', type: 'text', help: 'Để trống thì lấy tiêu đề, rồi đến mô tả trong Thư viện ảnh.' },
          { name: 'eyebrow', label: 'Dòng chữ nhỏ phía trên', type: 'text' },
          { name: 'title', label: 'Tiêu đề', type: 'text' },
          { name: 'subtitle', label: 'Mô tả', type: 'textarea' },
          { name: 'cta_label', label: 'Chữ trên nút', type: 'text' },
          { name: 'cta_url', label: 'Link nút', type: 'text' },
          { name: 'link_url', label: 'Liên kết khi bấm vào cả banner (tùy chọn)', type: 'text', help: 'Dùng cho banner chỉ có ảnh (khuyến mãi...). VD: /san-pham hoặc /blog/ten-bai.' },
        ],
        default: [
          { eyebrow: 'Ngọc tự nhiên · Có kiểm định', title: 'Vòng ngọc tinh tuyển cho người thương', subtitle: 'Mỗi chiếc vòng được tuyển chọn kỹ lưỡng, đo ni chuẩn tay và kèm chứng chỉ kiểm định.', cta_label: 'Khám phá bộ sưu tập', cta_url: '/san-pham' },
        ],
      },
      {
        name: 'info_blocks', section: 'info', collapsible: true, itemTitle: 'title', label: 'Khối thông tin nổi bật (bấm vào để xem chi tiết)', type: 'list',
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
      { name: 'show_certificates', section: 'certs', label: 'Hiện khối chứng chỉ kiểm định', type: 'toggle', default: true },
      { name: 'cert_title', section: 'certs', label: 'Tiêu đề khối chứng chỉ', type: 'text', default: 'Kiểm định độc lập – Cam kết ngọc thật' },
      { name: 'cert_subtitle', section: 'certs', label: 'Mô tả khối chứng chỉ', type: 'textarea', default: 'Mỗi chiếc vòng đều được kiểm định tại các trung tâm uy tín. Bấm vào giấy kiểm định để xem chi tiết.' },
      {
        name: 'cert_commitments', section: 'certs', label: 'Lời cam kết', type: 'list',
        fields: [{ name: 'text', label: 'Nội dung cam kết', type: 'text' }],
        default: [
          { text: 'Ngọc thiên nhiên 100%, không xử lý hóa chất' },
          { text: 'Hoàn tiền gấp 10 lần nếu phát hiện ngọc giả' },
          { text: 'Sẵn sàng kiểm định lại tại trung tâm bất kỳ theo yêu cầu' },
        ],
      },
      {
        name: 'cert_items', section: 'certs', collapsible: true, itemTitle: 'title', label: 'Mẫu giấy kiểm định (trung tâm uy tín)', type: 'list',
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
      { name: 'show_size_calc', section: 'size', label: 'Hiện công cụ tính ni nhanh ở khối số đo ni', type: 'toggle', default: true },
      { name: 'show_fengshui', section: 'fengshui', label: 'Hiện khối ý nghĩa ngọc & phong thủy', type: 'toggle', default: true },
      { name: 'fengshui_title', section: 'fengshui', label: 'Tiêu đề khối phong thủy', type: 'text', default: 'Ý nghĩa ngọc & phong thủy' },
      { name: 'fengshui_subtitle', section: 'fengshui', label: 'Mô tả khối phong thủy', type: 'textarea', default: 'Từ ngàn xưa, ngọc được xem là vật phẩm mang lại bình an, sức khỏe và may mắn cho người đeo.' },
      { name: 'fengshui_image', section: 'fengshui', label: 'Ảnh khối phong thủy', type: 'image' },
      {
        name: 'fengshui_items', section: 'fengshui', collapsible: true, itemTitle: 'title', label: 'Các ý nghĩa', type: 'list',
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
      { name: 'featured_title', section: 'featured', label: 'Tiêu đề khối sản phẩm nổi bật', type: 'text', default: 'Tuyển chọn nổi bật' },
      { name: 'featured_subtitle', section: 'featured', label: 'Mô tả khối sản phẩm nổi bật', type: 'text', default: 'Những thiết kế được yêu thích nhất tại shop' },
      { name: 'featured_limit', section: 'featured', label: 'Số sản phẩm nổi bật hiển thị', type: 'number', default: 8 },
      { name: 'categories_title', section: 'categories', label: 'Tiêu đề khối phân loại', type: 'text', default: 'Phân loại theo dòng ngọc' },
      { name: 'size_title', section: 'size', label: 'Tiêu đề khối số đo ni', type: 'text', default: 'Bảng số đo ni tham khảo' },
      { name: 'size_subtitle', section: 'size', label: 'Mô tả khối số đo ni', type: 'textarea', default: 'Đo chu vi khớp bàn tay khi khép các ngón lại để chọn ni phù hợp.' },
      { name: 'custom_title', section: 'custom', label: 'Tiêu đề khối thiết kế riêng', type: 'text', default: 'Thiết kế chiếc vòng của riêng bạn' },
      { name: 'custom_subtitle', section: 'custom', label: 'Mô tả khối thiết kế riêng', type: 'textarea', default: 'Chọn loại ngọc, màu sắc, kích thước theo ý thích. Shop sẽ tư vấn và báo giá trong 24 giờ.' },
      { name: 'custom_image', section: 'custom', label: 'Ảnh khối thiết kế riêng', type: 'image' },
      { name: 'show_gallery', section: 'gallery', label: 'Hiện khối Gallery trên trang chủ', type: 'toggle', default: true },
      { name: 'gallery_limit', section: 'gallery', label: 'Số ảnh tối đa ở khối Gallery trang chủ', type: 'number', default: 24, help: 'Lấy từ các ảnh đang bật "Hiện ở Gallery tổng" trong Admin › Gallery.' },
      { name: 'gallery_layout', section: 'gallery', label: 'Kiểu hiển thị Gallery', type: 'select', default: 'auto', options: GALLERY_LAYOUTS, help: 'Áp dụng cho khối Gallery ở trang chủ; trang Gallery dùng cùng kiểu này trừ khi bạn chọn riêng ở Cài đặt › Trang Sản phẩm / Gallery / Blog. "Tự động" giữ cách cũ: tối đa số ô nhìn thấy (số dòng × số cột) thì hiện lưới, nhiều hơn thì thành băng chuyền.' },
      { name: 'gallery_rows', section: 'gallery', label: 'Số dòng', type: 'select', default: '2', options: GALLERY_ROWS, help: 'Dùng cho băng chuyền (số dòng ảnh trượt cùng nhau) và để "Tự động" tính số ô nhìn thấy.' },
      { name: 'gallery_cols', section: 'gallery', label: 'Số cột trên máy tính', type: 'select', default: '4', options: GALLERY_COLS },
      { name: 'gallery_cols_mobile', section: 'gallery', label: 'Số cột trên điện thoại', type: 'select', default: '2', options: GALLERY_COLS_MOBILE },
      { name: 'gallery_ratio', section: 'gallery', label: 'Tỷ lệ ảnh', type: 'select', default: 'square', options: GALLERY_RATIOS, help: 'Không áp dụng cho kiểu xếp gạch (giữ tỷ lệ gốc của ảnh).' },
      { name: 'gallery_autoscroll', section: 'gallery', label: 'Băng chuyền tự chuyển động', type: 'toggle', default: true, help: 'Chỉ áp dụng cho kiểu băng chuyền. Bật: ảnh tự trượt liên tục, rê chuột hoặc chạm vào thì dừng, khách vẫn kéo / vuốt để xem tùy ý. Tắt: ảnh đứng yên, khách kéo / vuốt tay. Khách bật chế độ giảm chuyển động trên thiết bị thì luôn đứng yên.' },
      { name: 'gallery_scroll_seconds', section: 'gallery', label: 'Thời gian chạy hết một vòng (giây)', type: 'number', default: 45, help: 'Số càng lớn thì trượt càng chậm (5–600).' },
      { name: 'gallery_direction', section: 'gallery', label: 'Hướng chuyển động', type: 'select', default: 'rtl', options: GALLERY_DIRECTIONS },
      { name: 'show_blog', section: 'blog', label: 'Hiện khối bài viết mới trên trang chủ', type: 'toggle', default: true },
    ],
  },
  {
    key: 'home_layout',
    label: 'Bố cục trang chủ',
    description: 'Bật/tắt, đổi thứ tự (↑ ↓) và đổi nền cho từng khối của trang chủ. Nội dung chữ, ảnh của mỗi khối sửa ở nhóm "Trang chủ".',
    fields: [
      {
        name: 'sections', label: 'Các khối trang chủ (từ trên xuống dưới)', type: 'list', fixed: true, collapsible: true,
        default: HOME_SECTIONS.map((x) => ({
          key: x.key, label: x.label, enabled: true, bg_mode: 'none', bg_color: '#f1ece1', bg_pattern: 'dots', bg_pattern_color: '#2e6b94',
          bg_pattern_strength: 18, bg_image: null, bg_overlay: 35, bg_overlay_color: '#000000', text_tone: 'auto',
        })),
        fields: [
          { name: 'key', label: 'Mã khối', type: 'text', hidden: true },
          { name: 'label', label: 'Tên khối', type: 'text', hidden: true },
          { name: 'enabled', label: 'Hiện khối này trên trang chủ', type: 'toggle', default: true },
          {
            name: 'bg_mode', label: 'Nền của khối', type: 'select', default: 'none', noBgFor: ['banner'],
            options: [
              { value: 'none', label: 'Mặc định của giao diện' }, { value: 'color', label: 'Một màu nền' },
              { value: 'pattern', label: 'Họa tiết trên nền màu' }, { value: 'image', label: 'Ảnh nền tải lên' },
            ],
          },
          { name: 'bg_color', label: 'Màu nền', type: 'color', default: '#f1ece1', showIf: sectionBgOn },
          { name: 'bg_pattern', label: 'Họa tiết', type: 'select', default: 'dots', options: SECTION_PATTERNS, showIf: "item.bg_mode == 'pattern'" },
          { name: 'bg_pattern_color', label: 'Màu họa tiết', type: 'color', default: '#2e6b94', showIf: "item.bg_mode == 'pattern'" },
          { name: 'bg_pattern_strength', label: 'Độ đậm họa tiết (5–60)', type: 'number', default: 18, showIf: "item.bg_mode == 'pattern'" },
          { name: 'bg_image', label: 'Ảnh nền', type: 'image', showIf: "item.bg_mode == 'image'", help: 'Nên dùng ảnh ngang, rộng từ 1600px.' },
          { name: 'bg_overlay', label: 'Độ phủ màu lên ảnh, 0–90 (để chữ dễ đọc)', type: 'number', default: 35, showIf: "item.bg_mode == 'image'" },
          { name: 'bg_overlay_color', label: 'Màu phủ lên ảnh', type: 'color', default: '#000000', showIf: "item.bg_mode == 'image'" },
          {
            name: 'text_tone', label: 'Màu chữ trong khối', type: 'select', default: 'auto', showIf: "item.bg_mode != 'none'",
            options: [{ value: 'auto', label: 'Tự chọn theo nền' }, { value: 'light', label: 'Chữ sáng (cho nền tối)' }, { value: 'dark', label: 'Chữ tối (cho nền sáng)' }],
          },
        ],
      },
    ],
  },
  {
    key: 'footer',
    label: 'Chân trang',
    description: 'Chọn cột nào hiện ở chân trang, đổi thứ tự cột (↑ ↓) và bật/tắt từng thông tin. Địa chỉ, số điện thoại, mạng xã hội, mô tả ngắn sửa ở nhóm "Thông tin shop".',
    fields: [
      {
        name: 'columns', label: 'Các cột chân trang (từ trái sang phải)', type: 'list', fixed: true,
        default: [
          { key: 'brand', label: 'Giới thiệu shop (logo, slogan, mạng xã hội)', enabled: true, title: '' },
          { key: 'nav', label: 'Liên kết menu', enabled: true, title: 'Khám phá' },
          { key: 'jade', label: 'Danh sách dòng ngọc', enabled: true, title: 'Dòng ngọc' },
          { key: 'links', label: 'Liên kết tự thêm', enabled: false, title: 'Liên kết hữu ích' },
          { key: 'contact', label: 'Thông tin liên hệ', enabled: true, title: 'Liên hệ' },
          { key: 'policies', label: 'Trang chính sách (đổi trả, bảo mật, điều khoản...)', enabled: true, title: 'Chính sách' },
        ],
        fields: [
          { name: 'key', label: 'Mã cột', type: 'text', hidden: true },
          { name: 'label', label: 'Tên cột', type: 'text', hidden: true },
          { name: 'enabled', label: 'Hiện cột này', type: 'toggle', default: true },
          { name: 'title', label: 'Tiêu đề cột', type: 'text', showIf: "item.key != 'brand'" },
        ],
      },
      { name: 'show_logo', label: 'Cột giới thiệu: hiện logo (hoặc tên shop)', type: 'toggle', default: true },
      { name: 'show_slogan', label: 'Cột giới thiệu: hiện slogan', type: 'toggle', default: true },
      { name: 'show_text', label: 'Cột giới thiệu: hiện đoạn mô tả ngắn', type: 'toggle', default: true },
      { name: 'show_social', label: 'Cột giới thiệu: hiện biểu tượng mạng xã hội', type: 'toggle', default: true },
      { name: 'show_track', label: 'Cột menu: hiện link tra cứu đơn hàng', type: 'toggle', default: true },
      {
        name: 'extra_links', label: 'Liên kết tự thêm (hiện ở cột "Liên kết tự thêm" khi bật)', type: 'list',
        fields: [{ name: 'label', label: 'Chữ hiển thị', type: 'text' }, { name: 'url', label: 'Đường dẫn (/chinh-sach hoặc https://...)', type: 'text' }],
        default: [],
      },
      { name: 'show_address', label: 'Liên hệ: hiện địa chỉ', type: 'toggle', default: true },
      { name: 'show_phone', label: 'Liên hệ: hiện số điện thoại', type: 'toggle', default: true },
      { name: 'show_email', label: 'Liên hệ: hiện email', type: 'toggle', default: true },
      { name: 'show_hours', label: 'Liên hệ: hiện giờ làm việc', type: 'toggle', default: true },
      { name: 'show_bottom', label: 'Hiện thanh dưới cùng của chân trang', type: 'toggle', default: true },
      { name: 'show_copyright', label: 'Thanh dưới: hiện bản quyền', type: 'toggle', default: true },
      { name: 'show_bct', label: 'Thanh dưới: hiện ảnh "Đã thông báo Bộ Công Thương"', type: 'toggle', default: true },
      { name: 'show_bottom_slogan', label: 'Thanh dưới: hiện slogan', type: 'toggle', default: true },
    ],
  },
  {
    key: 'about',
    label: 'Trang Về shop',
    fields: [
      { name: 'title', label: 'Tiêu đề', type: 'text', default: 'Câu chuyện của chúng tôi' },
      { name: 'intro', label: 'Đoạn mở đầu', type: 'textarea', default: 'Linh Nghi ra đời từ tình yêu với ngọc và mong muốn mang đến những chiếc vòng chân thật, bền đẹp cùng năm tháng.' },
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
      { name: 'video_url', label: 'Video hướng dẫn đo (link TikTok hoặc YouTube)', type: 'url', help: 'TikTok: dán link đầy đủ dạng https://www.tiktok.com/@tên-kênh/video/1234567890 (mở video trên máy tính rồi sao chép link; link rút gọn vm.tiktok.com không dùng được). YouTube: https://www.youtube.com/watch?v=... hoặc https://youtu.be/...' },
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
      { name: 'cart_unavailable', label: 'Cảnh báo sản phẩm trong giỏ không còn bán', type: 'text', default: 'Sản phẩm này đã bị thay đổi, vui lòng xóa khỏi giỏ và chọn sản phẩm khác.', help: 'Hiện ở trang giỏ hàng khi sản phẩm khách đã thêm bị xóa, ẩn hoặc hết hàng. Khách không gửi được đơn cho đến khi xóa sản phẩm đó.' },
      { name: 'order_success', label: 'Thông báo khi gửi đơn thành công', type: 'textarea', default: 'Cảm ơn bạn! Shop đã nhận đơn và sẽ liên hệ xác nhận trong thời gian sớm nhất.' },
      { name: 'order_image_enabled', label: 'Cho khách tải ảnh thông tin đơn hàng sau khi đặt', type: 'toggle', default: true, help: 'Ảnh PNG gồm mã đơn, thông tin nhận hàng, sản phẩm, tổng tiền. Khách lưu để gửi shop và tra cứu về sau. Ảnh được vẽ trên máy khách, không lưu trên máy chủ.' },
      { name: 'order_image_title', label: 'Tiêu đề trên ảnh đơn hàng', type: 'text', default: 'Thông tin đơn hàng' },
      { name: 'order_image_note', label: 'Lời nhắn trên ảnh đơn hàng', type: 'textarea', default: 'Hãy gửi ảnh này cho shop qua Zalo để được xác nhận đơn nhanh hơn. Shop sẽ hướng dẫn thanh toán sau khi xác nhận.' },
      { name: 'order_image_track', label: 'Dòng hướng dẫn tra cứu trên ảnh', type: 'text', default: 'Tra cứu tình trạng đơn tại {link} bằng mã đơn và số điện thoại đã đặt.', help: 'Chữ {link} sẽ tự thành địa chỉ trang tra cứu đơn.' },
      { name: 'order_image_button', label: 'Chữ nút tải ảnh', type: 'text', default: 'Tải ảnh đơn hàng' },
      { name: 'order_image_share', label: 'Chữ nút chia sẻ ảnh (điện thoại)', type: 'text', default: 'Gửi ảnh cho shop' },
      { name: 'track_title', label: 'Tiêu đề trang tra cứu đơn', type: 'text', default: 'Tra cứu đơn hàng' },
      { name: 'track_intro', label: 'Mô tả trang tra cứu đơn', type: 'textarea', default: 'Nhập mã đơn (nhận được sau khi đặt hàng) và số điện thoại đã dùng khi đặt để xem tình trạng.' },
      { name: 'track_msg_new', label: 'Tra cứu: lời nhắn khi trạng thái "Mới"', type: 'textarea', default: 'Shop đã nhận được yêu cầu của bạn và sẽ liên hệ sớm.' },
      { name: 'track_msg_contacted', label: 'Tra cứu: lời nhắn khi trạng thái "Đã liên hệ"', type: 'textarea', default: 'Shop đã liên hệ với bạn. Nếu chưa nhận được tin nhắn hoặc cuộc gọi, vui lòng liên hệ shop.' },
      { name: 'track_msg_confirmed', label: 'Tra cứu: lời nhắn khi trạng thái "Đã xác nhận"', type: 'textarea', default: 'Đơn đã được xác nhận. Shop đang chuẩn bị và sẽ báo bạn khi giao hàng.' },
      { name: 'track_msg_shipping', label: 'Tra cứu: lời nhắn khi trạng thái "Đang giao hàng"', type: 'textarea', default: 'Đơn hàng của bạn đang được giao. Vui lòng để ý điện thoại để nhận hàng; cần hỗ trợ cứ liên hệ shop nhé.' },
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
    label: 'Trang Sản phẩm / Gallery / Blog',
    description: 'Nội dung hiển thị và cách hoạt động của 3 trang danh sách. Tiêu đề và mô tả ở đây hiện ngay đầu trang. Cách trang hiện trên Google / Facebook chỉnh riêng ở nhóm "SEO Google & chia sẻ".',
    sections: [
      { key: 'products', label: 'Trang Sản phẩm', hint: 'Tiêu đề, số sản phẩm mỗi trang, khoảng giá, nhãn Mới, hướng dẫn bảo quản' },
      { key: 'gallery', label: 'Trang Gallery', hint: 'Tiêu đề, mô tả và kiểu hiển thị riêng (nếu muốn khác trang chủ)' },
      { key: 'blog', label: 'Trang Blog', hint: 'Tiêu đề, phân trang, mục lục, gợi ý bài viết, banner dọc' },
      { key: 'errors', label: 'Trang lỗi 404', hint: 'Nội dung hiện khi khách vào địa chỉ không tồn tại hoặc trang bị lỗi' },
    ],
    fields: [
      { name: 'blog_author_label', section: 'blog', label: 'Nhãn khung tác giả cuối bài', type: 'text', default: 'Về tác giả', help: 'Chỉ hiện khi bài có chọn tác giả (Admin › Tác giả blog).' },
      { name: 'products_title', section: 'products', label: 'Tiêu đề trang Sản phẩm', type: 'text', default: 'Tất cả sản phẩm', help: 'Hiện ở đầu trang và cũng là tiêu đề trên Google, trừ khi bạn nhập tiêu đề riêng ở "SEO Google & chia sẻ".' },
      { name: 'products_intro', section: 'products', label: 'Mô tả ngắn trang Sản phẩm', type: 'textarea', default: 'Vòng ngọc tự nhiên được tuyển chọn, đầy đủ chứng chỉ kiểm định.' },
      { name: 'products_per_page', section: 'products', label: 'Số sản phẩm mỗi trang', type: 'number', default: 12 },
      {
        name: 'price_ranges', section: 'products', label: 'Khoảng giá trong bộ lọc', type: 'list', help: 'Các nút chọn nhanh ở ô “Khoảng giá” của bộ lọc. Thêm, xóa, đổi tên và đổi mức giá tùy ý khi bảng giá sản phẩm thay đổi. Để trống “Từ” = từ 0, để trống “Đến” = không giới hạn.',
        fields: [
          { name: 'label', label: 'Tên hiển thị', type: 'text' },
          { name: 'min', label: 'Từ (VNĐ, để trống = 0)', type: 'number' },
          { name: 'max', label: 'Đến (VNĐ, để trống = không giới hạn)', type: 'number' },
        ],
        default: [
          { label: 'Dưới 1 triệu', min: 0, max: 1000000 },
          { label: '1 – 3 triệu', min: 1000000, max: 3000000 },
          { label: '3 – 5 triệu', min: 3000000, max: 5000000 },
          { label: 'Trên 5 triệu', min: 5000000, max: 0 },
        ],
      },
      { name: 'new_days', section: 'products', label: 'Tự gắn nhãn "Mới" cho sản phẩm đăng trong vòng (ngày)', type: 'number', default: 30, help: 'Đặt 0 để chỉ dùng ô "Sản phẩm mới" trong từng sản phẩm' },
      { name: 'product_care', section: 'products', label: 'Hướng dẫn bảo quản (hiện ở mọi trang chi tiết sản phẩm)', type: 'richtext', default: '<ul><li>Tránh va đập mạnh, tháo vòng khi chơi thể thao hoặc làm việc nặng.</li><li>Không để vòng tiếp xúc với hóa chất, nước hoa, chất tẩy rửa.</li><li>Lau bằng khăn mềm và nước sạch, để khô tự nhiên.</li><li>Cất riêng trong túi nhung khi không đeo.</li></ul>' },
      { name: 'gallery_title', section: 'gallery', label: 'Tiêu đề trang Gallery', type: 'text', default: 'Gallery', help: 'Hiện ở đầu trang và cũng là tiêu đề trên Google, trừ khi bạn nhập tiêu đề riêng ở "SEO Google & chia sẻ".' },
      { name: 'gallery_intro', section: 'gallery', label: 'Mô tả ngắn trang Gallery', type: 'textarea', default: 'Những mẫu vòng đã đồng hành cùng khách hàng của shop.' },
      { name: 'gallery_page_layout', section: 'gallery', label: 'Kiểu hiển thị ở trang Gallery', type: 'select', default: 'same', options: [{ value: 'same', label: 'Giống khối Gallery ở trang chủ (Cài đặt › Trang chủ › Gallery)' }, ...GALLERY_LAYOUTS], help: 'Chọn kiểu khác "Giống trang chủ" thì các mục bên dưới mới có tác dụng.' },
      { name: 'gallery_page_rows', section: 'gallery', label: 'Số dòng (trang Gallery)', type: 'select', default: '2', options: GALLERY_ROWS },
      { name: 'gallery_page_cols', section: 'gallery', label: 'Số cột trên máy tính (trang Gallery)', type: 'select', default: '4', options: GALLERY_COLS },
      { name: 'gallery_page_cols_mobile', section: 'gallery', label: 'Số cột trên điện thoại (trang Gallery)', type: 'select', default: '2', options: GALLERY_COLS_MOBILE },
      { name: 'gallery_page_ratio', section: 'gallery', label: 'Tỷ lệ ảnh (trang Gallery)', type: 'select', default: 'square', options: GALLERY_RATIOS },
      { name: 'gallery_page_autoscroll', section: 'gallery', label: 'Băng chuyền tự chuyển động (trang Gallery)', type: 'toggle', default: true },
      { name: 'gallery_page_scroll_seconds', section: 'gallery', label: 'Thời gian chạy hết một vòng, giây (trang Gallery)', type: 'number', default: 45 },
      { name: 'gallery_page_direction', section: 'gallery', label: 'Hướng chuyển động (trang Gallery)', type: 'select', default: 'rtl', options: GALLERY_DIRECTIONS },
      { name: 'blog_title', section: 'blog', label: 'Tiêu đề trang Blog', type: 'text', default: 'Góc chia sẻ', help: 'Hiện ở đầu trang và cũng là tiêu đề trên Google, trừ khi bạn nhập tiêu đề riêng ở "SEO Google & chia sẻ".' },
      { name: 'blog_intro', section: 'blog', label: 'Mô tả ngắn trang Blog', type: 'textarea', default: 'Kiến thức về ngọc, cách chọn và bảo quản vòng.' },
      { name: 'blog_per_page', section: 'blog', label: 'Số bài viết mỗi trang Blog', type: 'number', default: 9 },
      { name: 'blog_categories_title', section: 'blog', label: 'Tiêu đề khối chuyên mục ở cột phải', type: 'text', default: 'Chuyên mục' },
      { name: 'blog_category_index', section: 'blog', label: 'Cho Google lập chỉ mục các trang chuyên mục blog', type: 'toggle', default: true, help: 'Bật: trang chuyên mục (trang 1) được lập chỉ mục và có trong sitemap (nếu bật mục "Đưa trang chuyên mục blog vào sitemap" ở nhóm Sitemap). Trang 2 trở đi và trang có tham số vẫn noindex. Tắt nếu viết bài SEO nhiều chủ đề và thấy chuyên mục trùng nội dung với bài viết. Chỉ có tác dụng khi website đã bật "Cho phép Google lập chỉ mục".' },
      { name: 'blog_show_toc', section: 'blog', label: 'Hiện mục lục trong bài viết', type: 'toggle', default: true, help: 'Mục lục tự tạo từ các tiêu đề H2, H3 trong bài.' },
      { name: 'blog_toc_title', section: 'blog', label: 'Tiêu đề khối mục lục', type: 'text', default: 'Mục lục' },
      { name: 'blog_related_title', section: 'blog', label: 'Tiêu đề khối gợi ý bài viết', type: 'text', default: 'Bài viết gợi ý' },
      { name: 'blog_related_count', section: 'blog', label: 'Số bài viết gợi ý ở cột phải', type: 'number', default: 4 },
      { name: 'error_404_title', section: 'errors', label: 'Tiêu đề trang 404 (không tìm thấy)', type: 'text', default: 'Không tìm thấy trang' },
      { name: 'error_404_text', section: 'errors', label: 'Lời nhắn trang 404', type: 'textarea', default: 'Địa chỉ bạn truy cập không tồn tại hoặc đã được chuyển đi. Bạn có thể tìm sản phẩm bên dưới hoặc quay lại trang chủ.' },
      { name: 'error_410_title', section: 'errors', label: 'Tiêu đề khi nội dung đã được gỡ (410)', type: 'text', default: 'Nội dung này đã được gỡ' },
      { name: 'error_500_title', section: 'errors', label: 'Tiêu đề khi trang bị lỗi', type: 'text', default: 'Đã có lỗi xảy ra' },
      { name: 'error_500_text', section: 'errors', label: 'Lời nhắn khi trang bị lỗi', type: 'textarea', default: 'Hệ thống đang gặp sự cố tạm thời, vui lòng thử lại sau ít phút.' },
      { name: 'error_home_label', section: 'errors', label: 'Chữ nút về trang chủ', type: 'text', default: 'Về trang chủ' },
      { name: 'error_products_label', section: 'errors', label: 'Chữ nút xem sản phẩm', type: 'text', default: 'Xem sản phẩm' },
      { name: 'error_search_show', section: 'errors', label: 'Hiện ô tìm sản phẩm và gợi ý loại ngọc ở trang 404', type: 'toggle', default: true },
      { name: 'error_search_placeholder', section: 'errors', label: 'Gợi ý trong ô tìm kiếm', type: 'text', default: 'Tên, mã, loại ngọc...' },
      { name: 'blog_banner_show', section: 'blog', label: 'Hiện banner dọc ở cột phải blog', type: 'toggle', default: true, help: 'Chỉ hiện khi đã tải ảnh banner bên dưới.' },
      { name: 'blog_banner', section: 'blog', label: 'Ảnh banner dọc', type: 'image', help: 'Ảnh dọc, tỉ lệ khoảng 3:5 (ví dụ 600×1000px).' },
      { name: 'blog_banner_url', section: 'blog', label: 'Link khi bấm vào banner', type: 'url', help: 'Để trống nếu banner chỉ để xem.' },
      { name: 'blog_banner_alt', section: 'blog', label: 'Mô tả ảnh banner (cho người khiếm thị và SEO)', type: 'text' },
    ],
  },
  {
    key: 'seo',
    label: 'SEO & mã theo dõi',
    fields: [
      { name: 'title_suffix', label: 'Hậu tố tiêu đề trang', type: 'text', default: ' | Linh Nghi', help: 'Thêm vào cuối tiêu đề mỗi trang' },
      { name: 'home_title', label: 'Tiêu đề trang chủ', type: 'text', default: 'Linh Nghi – Vòng tay ngọc tự nhiên có kiểm định' },
      { name: 'default_description', label: 'Mô tả mặc định', type: 'textarea', default: 'Vòng tay ngọc phỉ thúy, bích ngọc tự nhiên có chứng chỉ kiểm định. Tư vấn chọn ni, thiết kế theo yêu cầu, giao hàng toàn quốc.' },
      { name: 'keywords', label: 'Từ khóa', type: 'text', default: 'vòng ngọc, vòng phỉ thúy, vòng tay ngọc tự nhiên, vòng ngọc kiểm định' },
      { name: 'og_image', label: 'Ảnh chia sẻ mạng xã hội mặc định', type: 'image', help: 'Tỉ lệ 1200×630px. Dùng cho mọi trang không có ảnh riêng; để trống thì tự dùng logo shop.' },
      { name: 'allow_indexing', label: 'Cho phép Google lập chỉ mục', type: 'toggle', default: false, help: 'ĐANG TẮT cho tới khi website vận hành chính thức: robots.txt chặn toàn bộ và mọi trang gắn noindex. Chỉ bật khi đã có tên miền chính thức, nội dung thật và đã kiểm tra xong.' },
      { name: 'google_site_verification', label: 'Mã xác minh Google Search Console', type: 'text', help: 'Chỉ dán phần content="..."' },
      { name: 'ga_measurement_id', label: 'Google Analytics 4 (G-XXXXXXX)', type: 'text' },
      { name: 'facebook_pixel_id', label: 'Facebook Pixel ID', type: 'text' },
    ],
  },
  {
    key: 'schema',
    label: 'Schema (dữ liệu có cấu trúc)',
    description: 'Dữ liệu giúp Google hiểu cửa hàng, sản phẩm và bài viết (hiện giá, tình trạng hàng, thông tin shop ngoài kết quả tìm kiếm). Mọi trang, sản phẩm, bài viết mới đều tự có schema theo các lựa chọn ở đây; thông tin shop lấy từ nhóm Thông tin shop và tự cập nhật khi bạn sửa. Chỉ khai báo những gì shop thật sự áp dụng.',
    fields: [
      { name: 'enabled', label: 'Bật schema trên website', type: 'toggle', default: true, help: 'Tắt thì mọi trang không xuất dữ liệu có cấu trúc. Nên để bật.' },
      {
        name: 'business_type', label: 'Loại hình doanh nghiệp', type: 'select', default: 'JewelryStore',
        options: [{ value: 'JewelryStore', label: 'Cửa hàng trang sức (JewelryStore)' }, { value: 'Store', label: 'Cửa hàng (Store)' }, { value: 'LocalBusiness', label: 'Doanh nghiệp địa phương (LocalBusiness)' }, { value: 'Organization', label: 'Tổ chức, chỉ bán online (Organization)' }],
      },
      { name: 'address_street', label: 'Địa chỉ (số nhà, đường)', type: 'text', help: 'Để trống thì lấy từ Thông tin shop › Địa chỉ.' },
      { name: 'address_locality', label: 'Quận / huyện, thành phố', type: 'text', help: 'VD: Quận 1, TP. Hồ Chí Minh' },
      { name: 'address_region', label: 'Tỉnh / thành', type: 'text' },
      { name: 'address_postal', label: 'Mã bưu chính', type: 'text' },
      { name: 'geo_lat', label: 'Vĩ độ (lat)', type: 'text', help: 'Chỉ khi có cửa hàng thật để khách tới. Lấy từ Google Maps (chuột phải vào địa điểm).' },
      { name: 'geo_lng', label: 'Kinh độ (lng)', type: 'text' },
      { name: 'price_range', label: 'Mức giá (priceRange)', type: 'text', help: 'VD: ₫₫₫ hoặc 1.000.000₫ - 50.000.000₫. Để trống nếu không muốn khai báo.' },
      { name: 'opening_hours', label: 'Giờ mở cửa (mỗi dòng một khoảng)', type: 'textarea', help: 'Định dạng Google hiểu, VD: Mo-Su 09:00-21:00 hoặc Mo-Fr 09:00-18:00. Để trống nếu không có cửa hàng mở cửa.' },
      { name: 'product_valid_days', label: 'Giá có hiệu lực (số ngày)', type: 'number', default: 365, help: 'Khai báo priceValidUntil cho giá sản phẩm: hôm nay + số ngày này (tự cập nhật mỗi ngày). Đặt 0 để không khai báo.' },
      { name: 'return_enabled', label: 'Khai báo chính sách đổi trả', type: 'toggle', default: false, help: 'Chỉ bật nếu shop thật sự có đổi trả; thông tin phải khớp với chính sách đăng trên website.' },
      { name: 'return_days', label: 'Số ngày được đổi trả', type: 'number', default: 7 },
      {
        name: 'return_fees', label: 'Phí đổi trả', type: 'select', default: 'customer',
        options: [{ value: 'free', label: 'Miễn phí đổi trả' }, { value: 'customer', label: 'Khách chịu phí vận chuyển' }],
      },
      {
        name: 'return_method', label: 'Hình thức trả hàng', type: 'select', default: 'mail',
        options: [{ value: 'mail', label: 'Gửi qua bưu điện' }, { value: 'store', label: 'Trả tại cửa hàng' }],
      },
      { name: 'shipping_enabled', label: 'Khai báo phí và thời gian giao hàng', type: 'toggle', default: false, help: 'Giúp sản phẩm đủ điều kiện hiển thị mua sắm trên Google. Chỉ bật khi thông tin đúng với thực tế.' },
      { name: 'shipping_cost', label: 'Phí giao hàng (VNĐ, 0 = miễn phí)', type: 'number', default: 0 },
      { name: 'handling_min', label: 'Chuẩn bị hàng: tối thiểu (ngày)', type: 'number', default: 0 },
      { name: 'handling_max', label: 'Chuẩn bị hàng: tối đa (ngày)', type: 'number', default: 2 },
      { name: 'transit_min', label: 'Vận chuyển: tối thiểu (ngày)', type: 'number', default: 1 },
      { name: 'transit_max', label: 'Vận chuyển: tối đa (ngày)', type: 'number', default: 5 },
      {
        name: 'author_type', label: 'Tác giả bài viết', type: 'select', default: 'person',
        options: [{ value: 'person', label: 'Ghi tên tác giả đã chọn cho bài (chưa chọn thì ghi là shop)' }, { value: 'organization', label: 'Luôn ghi là shop' }],
      },
      { name: 'search_action', label: 'Khai báo ô tìm kiếm của website (SearchAction)', type: 'toggle', default: false, help: 'Google đã bỏ hộp tìm kiếm trong kết quả và trang tìm kiếm của shop bị chặn thu thập, nên mặc định tắt.' },
    ],
  },
  {
    key: 'feedback',
    label: 'Feedback & đánh giá khách hàng',
    description: 'Khối "Feedback khách hàng" ở trang chủ (bật / tắt và đổi vị trí ở nhóm "Bố cục trang chủ"), trang Feedback riêng, và đánh giá sản phẩm của khách đã mua. Thêm / sửa feedback ở Admin › Feedback & đánh giá. Cách trang Feedback hiện trên Google chỉnh ở nhóm "SEO Google & chia sẻ".',
    sections: [
      { key: 'home', label: 'Khối trên trang chủ', hint: 'Tiêu đề, khung giới thiệu bên trái, số feedback, số cột' },
      { key: 'page', label: 'Trang Feedback', hint: 'Bật / tắt, đường dẫn, tiêu đề, số feedback mỗi trang, tên các tab', toggle: 'page_enabled' },
      { key: 'footer', label: 'Liên kết ở chân trang', hint: 'Hiện lối vào trang Feedback ở chân trang', toggle: 'footer_show' },
      { key: 'popup', label: 'Cửa sổ xem chi tiết', hint: 'Bấm vào một feedback để xem đầy đủ và các ảnh', toggle: 'popup_enabled' },
      { key: 'reviews', label: 'Đánh giá sản phẩm: cách hoạt động', hint: 'Bật / tắt, tự duyệt, nơi hiển thị, sao trên Google', toggle: 'reviews_enabled' },
      { key: 'reviews_text', label: 'Đánh giá sản phẩm: chữ hiển thị', hint: 'Tiêu đề, nút, thông báo cho khách' },
    ],
    fields: [
      { name: 'home_title', section: 'home', label: 'Tiêu đề khối', type: 'text', default: 'Khách hàng nói gì về chúng tôi' },
      { name: 'home_subtitle', section: 'home', label: 'Mô tả ngắn (hiện dưới tiêu đề)', type: 'textarea', default: 'Những chia sẻ thật từ khách hàng đã đồng hành cùng shop.' },
      { name: 'home_show_panel', section: 'home', label: 'Hiện khung giới thiệu (tiêu đề + ảnh) bên trái', type: 'toggle', default: true, help: 'Tắt: tiêu đề nằm giữa phía trên, các feedback trải rộng hết bề ngang.' },
      { name: 'home_image', section: 'home', label: 'Ảnh trong khung giới thiệu', type: 'image', help: 'Không bắt buộc. Nên dùng ảnh nền trong suốt hoặc sáng, tỷ lệ gần vuông (ví dụ ảnh vòng ngọc, logo).' },
      { name: 'home_limit', section: 'home', label: 'Số feedback hiện ở trang chủ (1–12)', type: 'number', default: 4, help: 'Lấy các feedback đang bật "Hiện ở trang chủ", theo thứ tự đã sắp trong Admin › Feedback.' },
      { name: 'home_cols', section: 'home', label: 'Số cột feedback (máy tính)', type: 'select', default: '2', options: [{ value: '1', label: '1 cột' }, { value: '2', label: '2 cột' }, { value: '3', label: '3 cột' }] },
      { name: 'show_stars', section: 'home', label: 'Hiện số sao trên thẻ feedback', type: 'toggle', default: true, help: 'Áp dụng cho khối trang chủ và trang Feedback. Feedback không chọn số sao thì không hiện sao.' },
      { name: 'home_show_button', section: 'home', label: 'Hiện nút "Xem tất cả" dẫn tới trang Feedback', type: 'toggle', default: true, help: 'Chỉ hiện khi trang Feedback đang bật.' },
      { name: 'home_button_label', section: 'home', label: 'Chữ trên nút', type: 'text', default: 'Xem tất cả feedback' },

      { name: 'page_enabled', section: 'page', label: 'Bật trang Feedback', type: 'toggle', default: true, help: 'Tắt: trang trả 404, ẩn khỏi chân trang và sitemap. Khối trang chủ không bị ảnh hưởng.' },
      { name: 'page_slug', section: 'page', label: 'Đường dẫn trang', type: 'text', default: 'feedback', help: 'Địa chỉ trang: /<đường dẫn>. Đổi đường dẫn thì địa chỉ cũ tự chuyển hướng (301). Không dùng tên trùng trang khác (san-pham, blog, gallery...).' },
      { name: 'page_title', section: 'page', label: 'Tiêu đề trang', type: 'text', default: 'Feedback khách hàng', help: 'Hiện đầu trang, và là tiêu đề trên Google trừ khi nhập riêng ở "SEO Google & chia sẻ".' },
      { name: 'page_intro', section: 'page', label: 'Mô tả ngắn', type: 'textarea', default: 'Lời cảm ơn và hình ảnh thật từ những khách hàng đã tin chọn shop.' },
      { name: 'page_image', section: 'page', label: 'Ảnh trong khung giới thiệu', type: 'image', help: 'Để trống: dùng ảnh của khối trang chủ.' },
      { name: 'page_per_page', section: 'page', label: 'Số feedback mỗi trang (4–48)', type: 'number', default: 12 },
      { name: 'page_cols', section: 'page', label: 'Số cột feedback (máy tính)', type: 'select', default: '2', options: [{ value: '1', label: '1 cột' }, { value: '2', label: '2 cột' }, { value: '3', label: '3 cột' }] },
      { name: 'page_tab_feedback', section: 'page', label: 'Tên tab feedback', type: 'text', default: 'Feedback khách hàng' },
      { name: 'page_tab_reviews', section: 'page', label: 'Tên tab đánh giá sản phẩm', type: 'text', default: 'Đánh giá sản phẩm', help: 'Tab này chỉ hiện khi tính năng đánh giá sản phẩm bật và đã có đánh giá được duyệt.' },
      { name: 'page_empty', section: 'page', label: 'Chữ khi chưa có feedback', type: 'text', default: 'Chưa có feedback nào, mời bạn quay lại sau.' },
      { name: 'page_reviews_limit', section: 'page', label: 'Số đánh giá hiện mỗi lần ở tab đánh giá (4–30)', type: 'number', default: 12 },

      { name: 'footer_show', section: 'footer', label: 'Hiện liên kết tới trang Feedback ở chân trang', type: 'toggle', default: true, help: 'Nằm trong cột menu của chân trang (cột "Khám phá"). Cột đó đang tắt thì liên kết không hiện.' },
      { name: 'footer_label', section: 'footer', label: 'Chữ của liên kết', type: 'text', default: 'Feedback khách hàng' },

      { name: 'popup_enabled', section: 'popup', label: 'Bấm vào feedback thì mở cửa sổ chi tiết', type: 'toggle', default: true, help: 'Cửa sổ hiện đầy đủ nội dung và các ảnh feedback (kéo / bấm để chuyển ảnh). Tắt: thẻ chỉ để đọc.' },
      { name: 'popup_show_date', section: 'popup', label: 'Hiện ngày feedback trong cửa sổ', type: 'toggle', default: true },

      { name: 'reviews_enabled', section: 'reviews', label: 'Cho phép khách đánh giá sản phẩm', type: 'toggle', default: true, help: 'Tắt: ẩn khung đánh giá, số sao và nút gửi. Ai được gửi (theo số điện thoại) chọn ở mục "Ai được gửi đánh giá" bên dưới. Shop tự thêm đánh giá ở Admin › Feedback & đánh giá.' },
      { name: 'reviews_require', section: 'reviews', label: 'Ai được gửi đánh giá', type: 'select', default: 'customer', options: [{ value: 'customer', label: 'Số điện thoại có trong hệ thống (đã từng đặt hàng / gửi yêu cầu)' }, { value: 'any_order', label: 'Có đơn hàng đã Hoàn thành (bất kỳ sản phẩm nào)' }, { value: 'product_order', label: 'Có đơn Hoàn thành chứa đúng sản phẩm này (chặt nhất)' }], help: 'Số điện thoại khách nhập phải trùng khách trong Admin › Khách hàng. Mỗi số điện thoại chỉ đánh giá một lần cho mỗi sản phẩm, không tải ảnh lên. Nhãn “Đã mua hàng” chỉ hiện ở đánh giá của khách có đơn Hoàn thành chứa đúng sản phẩm.' },
      { name: 'reviews_auto_approve', section: 'reviews', label: 'Tự động hiện đánh giá, không cần duyệt', type: 'toggle', default: false, help: 'Mặc định tắt: đánh giá mới ở trạng thái "Chờ duyệt", shop duyệt ở Admin › Feedback & đánh giá thì mới hiện.' },
      { name: 'reviews_show_on_product', section: 'reviews', label: 'Hiện số sao và danh sách đánh giá ở trang sản phẩm', type: 'toggle', default: true, help: 'Sản phẩm chưa có đánh giá nào được duyệt thì không hiện số sao; khung đánh giá chỉ hiện nút gửi.' },
      { name: 'reviews_show_on_card', section: 'reviews', label: 'Hiện số sao nhỏ trên thẻ sản phẩm (danh sách, trang chủ)', type: 'toggle', default: true, help: 'Chỉ hiện ở sản phẩm đã có đánh giá được duyệt.' },
      { name: 'reviews_per_product', section: 'reviews', label: 'Số đánh giá hiện mỗi lần ở trang sản phẩm (3–30)', type: 'number', default: 6 },
      { name: 'reviews_min_length', section: 'reviews', label: 'Số ký tự tối thiểu của nhận xét (0–500)', type: 'number', default: 10, help: '0 = cho phép chỉ chấm sao, không viết nhận xét.' },
      { name: 'reviews_name_display', section: 'reviews', label: 'Cách hiện tên người đánh giá', type: 'select', default: 'short', options: [{ value: 'short', label: 'Rút gọn (Nguyễn Văn Hoa → N. Hoa)' }, { value: 'full', label: 'Đầy đủ như khách nhập' }], help: 'Số điện thoại không bao giờ hiện công khai.' },
      { name: 'reviews_schema', section: 'reviews', label: 'Khai báo số sao cho Google (aggregateRating)', type: 'toggle', default: true, help: 'Chỉ khai báo khi sản phẩm có ít nhất một đánh giá đã duyệt. Số liệu lấy đúng từ các đánh giá hiển thị trên trang.' },

      { name: 'reviews_title', section: 'reviews_text', label: 'Tiêu đề khung đánh giá ở trang sản phẩm', type: 'text', default: 'Đánh giá từ khách đã mua' },
      { name: 'reviews_button', section: 'reviews_text', label: 'Chữ nút mở form đánh giá', type: 'text', default: 'Viết đánh giá' },
      { name: 'reviews_form_title', section: 'reviews_text', label: 'Tiêu đề form đánh giá', type: 'text', default: 'Đánh giá sản phẩm' },
      { name: 'reviews_form_intro', section: 'reviews_text', label: 'Dòng hướng dẫn trong form', type: 'textarea', default: 'Nhập số điện thoại đã dùng khi đặt hàng để xác nhận bạn đã mua sản phẩm này.' },
      { name: 'reviews_verified_label', section: 'reviews_text', label: 'Nhãn "đã mua hàng" cạnh tên người đánh giá', type: 'text', default: 'Đã mua hàng', help: 'Chỉ hiện ở đánh giá của khách có đơn Hoàn thành chứa đúng sản phẩm.' },
      { name: 'reviews_empty', section: 'reviews_text', label: 'Chữ khi chưa có đánh giá', type: 'text', default: 'Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ cảm nhận của bạn.' },
      { name: 'reviews_more_label', section: 'reviews_text', label: 'Chữ nút xem thêm đánh giá', type: 'text', default: 'Xem thêm đánh giá' },
      { name: 'reviews_success_pending', section: 'reviews_text', label: 'Thông báo gửi thành công (cần duyệt)', type: 'text', default: 'Cảm ơn bạn đã đánh giá! Đánh giá sẽ hiện sau khi shop duyệt.' },
      { name: 'reviews_success_approved', section: 'reviews_text', label: 'Thông báo gửi thành công (tự hiện)', type: 'text', default: 'Cảm ơn bạn đã đánh giá! Đánh giá của bạn đã được hiển thị.' },
      { name: 'reviews_not_eligible', section: 'reviews_text', label: 'Thông báo khi số điện thoại không đủ điều kiện', type: 'text', default: 'Số điện thoại này chưa có trong hệ thống của shop nên chưa thể đánh giá. Vui lòng nhập số đã dùng khi đặt hàng.' },
      { name: 'reviews_duplicate', section: 'reviews_text', label: 'Thông báo khi đã đánh giá rồi', type: 'text', default: 'Bạn đã đánh giá sản phẩm này rồi, cảm ơn bạn.' },
    ],
  },
  {
    key: 'policies',
    label: 'Trang chính sách',
    description: 'Các trang chính sách (đổi trả, bảo mật, điều khoản mua hàng, vận chuyển và thanh toán) hiện thành đường dẫn /chinh-sach/<tên> và liên kết ở chân trang. Nội dung là BẢN MẪU: hãy đọc kỹ, sửa cho đúng với shop rồi tick "Đã xác nhận". Thêm, xóa, đổi tên, đổi thứ tự trang tùy ý. Nội dung chỉ mang tính tham khảo, không thay thế tư vấn pháp lý.',
    fields: [
      { name: 'show_in_footer', label: 'Hiện thêm một dòng liên kết chính sách nhỏ ở thanh dưới cùng của chân trang', type: 'toggle', default: false, help: 'Các trang chính sách đã có một CỘT riêng ở chân trang: bật / tắt, đổi tiêu đề và thứ tự ở Cài đặt › Chân trang › Các cột chân trang. Ô này chỉ thêm dòng liên kết nhỏ phía trên thanh bản quyền.' },
      {
        name: 'policy_pages', collapsible: true, itemTitle: 'title', label: 'Các trang chính sách', type: 'list',
        help: 'Đổi đường dẫn của một trang đã có thì địa chỉ cũ tự chuyển hướng (301) sang địa chỉ mới.',
        fields: [
          { name: 'key', label: 'Mã trang', type: 'text', hidden: true },
          { name: 'enabled', label: 'Hiển thị trang này trên website', type: 'toggle' },
          { name: 'reviewed', label: 'Đã xác nhận nội dung đúng với shop', type: 'toggle', help: 'Chưa tick thì Tổng quan còn nhắc.' },
          { name: 'title', label: 'Tiêu đề trang', type: 'text' },
          { name: 'slug', label: 'Đường dẫn (để trống = tự tạo từ tiêu đề)', type: 'text', help: 'Địa chỉ trang: /chinh-sach/<đường dẫn>' },
          { name: 'content', label: 'Nội dung', type: 'richtext' },
        ],
        default: DEFAULT_POLICY_PAGES,
      },
    ],
  },
  {
    key: 'sitemap',
    label: 'Sitemap & robots.txt',
    description: 'Quản lý những gì Google được thu thập. Xem kết quả tại /robots.txt và /sitemap.xml của website. Sau khi có tên miền, gửi địa chỉ sitemap.xml vào Google Search Console. Việc bật/tắt cho Google lập chỉ mục toàn website nằm ở nhóm "SEO & mã theo dõi".',
    fields: [
      { name: 'robots_block_params', label: 'Chặn thu thập các địa chỉ có tham số (lọc, sắp xếp, tìm kiếm, phân trang)', type: 'toggle', default: true, help: 'Thêm Disallow: /*? vào robots.txt để Google chỉ thu thập trang quan trọng (trang chủ, loại sản phẩm, sản phẩm, bài viết). Các trang này cũng tự gắn noindex. Nên để bật.' },
      { name: 'sitemap_enabled', label: 'Bật sitemap.xml', type: 'toggle', default: true },
      { name: 'sitemap_pages', label: 'Đưa các trang chính vào sitemap', type: 'toggle', default: true, help: 'Trang chủ, Sản phẩm, Về shop, Liên hệ, Gallery, Chọn size, Thiết kế riêng, Blog (trang nào đang tắt tính năng sẽ tự bỏ)' },
      { name: 'sitemap_categories', label: 'Đưa trang lọc theo loại ngọc vào sitemap', type: 'toggle', default: true },
      { name: 'sitemap_products', label: 'Đưa sản phẩm đang hiển thị vào sitemap', type: 'toggle', default: true, help: 'Sản phẩm bản nháp không bao giờ được đưa vào' },
      { name: 'sitemap_posts', label: 'Đưa bài blog đã đăng vào sitemap', type: 'toggle', default: true },
      { name: 'sitemap_blog_categories', label: 'Đưa trang chuyên mục blog vào sitemap', type: 'toggle', default: true, help: 'Chỉ chuyên mục đang hiện và có ít nhất một bài đã đăng; tự bỏ khi tắt "Cho Google lập chỉ mục các trang chuyên mục blog" (Cài đặt › Trang & nội dung › Blog)' },
      { name: 'sitemap_images', label: 'Kèm ảnh đại diện sản phẩm / bài viết', type: 'toggle', default: true, help: 'Giúp ảnh ngọc dễ xuất hiện trên Google Hình ảnh' },
      { name: 'sitemap_exclude', label: 'Bỏ các đường dẫn khỏi sitemap', type: 'textarea', help: 'Mỗi dòng một đường dẫn, ví dụ /san-pham/vong-cu hoặc /blog/* (dấu * ở cuối: bỏ tất cả đường dẫn bắt đầu như vậy)' },
      {
        name: 'sitemap_extra', label: 'Thêm đường dẫn vào sitemap', type: 'list',
        help: 'Chỉ nhận đường dẫn của chính website này, ví dụ /chinh-sach-doi-tra',
        fields: [
          { name: 'url', label: 'Đường dẫn', type: 'text' },
          {
            name: 'priority', label: 'Mức ưu tiên', type: 'select', default: '0.5',
            options: ['1.0', '0.9', '0.8', '0.7', '0.6', '0.5', '0.4', '0.3', '0.2', '0.1'].map((v) => ({ value: v, label: v })),
          },
          {
            name: 'changefreq', label: 'Tần suất đổi', type: 'select', default: 'monthly',
            options: [{ value: 'daily', label: 'Hằng ngày' }, { value: 'weekly', label: 'Hằng tuần' }, { value: 'monthly', label: 'Hằng tháng' }, { value: 'yearly', label: 'Hằng năm' }],
          },
        ],
        default: [],
      },
      { name: 'robots_disallow', label: 'Không cho Google thu thập các đường dẫn (robots.txt)', type: 'textarea', default: '/gio-hang\n/tra-cuu-don\n/api/', help: 'Mỗi dòng một đường dẫn bắt đầu bằng /. Trang quản trị đã được ẩn riêng và không bao giờ bị liệt kê ở đây. Lưu ý: chặn thu thập không đảm bảo trang biến mất khỏi Google.' },
      { name: 'robots_block_ai', label: 'Chặn các bot AI thu thập nội dung (GPTBot, ClaudeBot, CCBot...)', type: 'toggle', default: false, help: 'Không ảnh hưởng đến Google Search' },
      { name: 'robots_extra', label: 'Quy tắc robots.txt nâng cao (tùy chọn)', type: 'textarea', help: 'Dán nguyên văn theo cú pháp robots.txt (User-agent, Allow, Disallow, Crawl-delay, Sitemap). Dòng sai cú pháp sẽ bị bỏ qua.' },
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
      { name: 'from_name', label: 'Tên người gửi', type: 'text', default: 'Linh Nghi' },
      { name: 'notify_to', label: 'Email nhận thông báo đơn hàng', type: 'text', help: 'Nhiều email cách nhau bằng dấu phẩy' },
      { name: 'send_customer_copy', label: 'Gửi email xác nhận cho khách (nếu khách có nhập email)', type: 'toggle', default: true },
    ],
  },
];

// SEO riêng cho từng trang: mỗi trang có tiêu đề, mô tả, từ khóa, ảnh chia sẻ.
// Để trống thì dùng giá trị mặc định ở nhóm "SEO & mã theo dõi".
export const SEO_PAGES = [
  ['home', 'Trang chủ'], ['products', 'Sản phẩm'], ['gallery', 'Gallery'], ['size_guide', 'Hướng dẫn size'],
  ['custom', 'Thiết kế riêng'], ['blog', 'Blog'], ['about', 'Về shop'], ['contact', 'Liên hệ'], ['feedback', 'Feedback khách hàng'],
];
// Ô tiêu đề SEO để trống thì trang lấy tiêu đề hiển thị ở nhóm nào (ghi để chủ shop biết)
const SEO_FALLBACK = {
  home: 'tiêu đề trang chủ ở nhóm "SEO & mã theo dõi"',
  products: 'tiêu đề ở nhóm "Trang Sản phẩm / Gallery / Blog"',
  gallery: 'tiêu đề ở nhóm "Trang Sản phẩm / Gallery / Blog"',
  blog: 'tiêu đề ở nhóm "Trang Sản phẩm / Gallery / Blog"',
  size_guide: 'tiêu đề ở nhóm "Trang Hướng dẫn size"',
  custom: 'tiêu đề trang thiết kế riêng ở nhóm "Biểu mẫu & đặt hàng"',
  about: 'tiêu đề ở nhóm "Trang Về shop"',
  contact: 'tiêu đề ở nhóm "Trang Liên hệ"',
  feedback: 'tiêu đề ở nhóm "Feedback & đánh giá khách hàng"',
};
SETTINGS_SCHEMA.splice(SETTINGS_SCHEMA.findIndex((g) => g.key === 'mail'), 0, {
  key: 'seo_pages',
  label: 'SEO Google & chia sẻ',
  description: 'Chỉ dùng khi muốn trang hiện KHÁC trên Google và khi chia sẻ Facebook/Zalo so với nội dung hiển thị trên website. Ô nào để trống thì tự lấy tiêu đề và mô tả của chính trang đó (ghi ở từng phần bên dưới). Sản phẩm và bài viết có SEO riêng trong trang sửa của chúng.',
  sections: SEO_PAGES.map(([k, label]) => ({ key: k, label, hint: `Để trống: dùng ${SEO_FALLBACK[k]}` })),
  fields: SEO_PAGES.flatMap(([k, label]) => [
    { name: `${k}_title`, section: k, label: 'Tiêu đề trên Google (meta title)', type: 'text', help: `Để trống: dùng ${SEO_FALLBACK[k]}. Nên dưới 60 ký tự.` },
    { name: `${k}_description`, section: k, label: 'Mô tả trên Google (meta description)', type: 'textarea', help: 'Để trống: dùng mô tả ngắn của trang. Nên dưới 160 ký tự.' },
    { name: `${k}_og_image`, section: k, label: 'Ảnh khi chia sẻ Facebook/Zalo (1200×630)', type: 'image', help: 'Để trống: dùng ảnh chia sẻ mặc định ở nhóm "SEO & mã theo dõi".' },
    { name: `${k}_keywords`, section: k, label: 'Từ khóa (meta keywords, không bắt buộc)', type: 'text', help: 'Google không dùng mục này nữa, chỉ để tham khảo.' },
  ]),
});
// Chia các nhóm cài đặt dài thành phần thu gọn / mở ra trong trang admin.
// Mỗi phần: { key, label, hint, toggle (tên trường bật/tắt để hiện nhãn Đang hiện/Đang ẩn), fields: [tên trường] }.
// Trường chưa được xếp vào phần nào sẽ báo lỗi ngay khi khởi động, để không bị lọt mất khỏi form.
function sectionize(groupKey, defs) {
  const group = SETTINGS_SCHEMA.find((g) => g.key === groupKey);
  const owner = new Map(defs.flatMap((d) => d.fields.map((n) => [n, d.key])));
  const missing = group.fields.map((f) => f.name).filter((n) => !owner.has(n));
  if (missing.length) throw new Error('sectionize(' + groupKey + '): chưa xếp trường ' + missing.join(', ') + ' vào phần nào');
  group.sections = defs.map(({ fields, ...rest }) => rest);
  for (const f of group.fields) f.section = owner.get(f.name);
}

sectionize('site', [
  { key: 'basic', label: 'Thông tin cơ bản', hint: 'Tên shop, slogan, logo, favicon', fields: ['name', 'slogan', 'logo', 'logo_light', 'favicon'] },
  { key: 'contact', label: 'Liên hệ & địa chỉ', hint: 'Điện thoại, Zalo, email, địa chỉ, giờ làm việc, bản đồ', fields: ['phone', 'zalo', 'email', 'address', 'working_hours', 'map_embed_url'] },
  { key: 'social', label: 'Mạng xã hội & sàn', hint: 'Facebook, Instagram, Threads, TikTok, YouTube, Shopee', fields: ['facebook', 'instagram', 'threads', 'tiktok', 'youtube', 'shopee'] },
  { key: 'footer', label: 'Chân trang', hint: 'Ảnh Bộ Công Thương, đoạn giới thiệu, bản quyền', fields: ['bct_image', 'bct_url', 'footer_text', 'copyright'] },
]);

sectionize('schema', [
  { key: 'business', label: 'Thông tin doanh nghiệp', hint: 'Loại hình, địa chỉ có cấu trúc, tọa độ, giờ mở cửa, mức giá', fields: ['enabled', 'business_type', 'address_street', 'address_locality', 'address_region', 'address_postal', 'geo_lat', 'geo_lng', 'price_range', 'opening_hours'] },
  { key: 'product', label: 'Sản phẩm: giá, đổi trả, giao hàng', hint: 'Hiệu lực giá, chính sách đổi trả, phí và thời gian giao hàng', fields: ['product_valid_days', 'return_enabled', 'return_days', 'return_fees', 'return_method', 'shipping_enabled', 'shipping_cost', 'handling_min', 'handling_max', 'transit_min', 'transit_max'] },
  { key: 'article', label: 'Bài viết & website', hint: 'Cách ghi tác giả, ô tìm kiếm', fields: ['author_type', 'search_action'] },
]);

sectionize('theme', [
  { key: 'colors', label: 'Màu sắc (giao diện sáng)', hint: 'Màu chủ đạo, màu nhấn, nền, chữ, viền', fields: ['color_primary', 'color_primary_contrast', 'color_accent', 'color_bg', 'color_surface', 'color_text', 'color_muted', 'color_border', 'color_footer_bg'] },
  { key: 'dark', label: 'Chế độ tối', hint: 'Bật/tắt và bộ màu riêng cho giao diện tối', fields: ['dark_mode', 'dark_color_primary', 'dark_color_primary_contrast', 'dark_color_accent', 'dark_color_bg', 'dark_color_surface', 'dark_color_text', 'dark_color_muted', 'dark_color_border', 'dark_color_footer_bg'] },
  { key: 'fonts', label: 'Font chữ & bo góc', hint: 'Font tiêu đề, font nội dung, độ bo góc', fields: ['font_heading', 'font_body', 'radius'] },
  { key: 'products', label: 'Thẻ sản phẩm & hiệu ứng', hint: 'Số cột, khung viền, hiệu ứng khi cuộn', fields: ['product_grid', 'product_frame', 'enable_animations'] },
  { key: 'tags', label: 'Nhãn trên sản phẩm', hint: 'Best Seller, Mới, Sale, Đã bán, Đặt trước, Có thể custom: kiểu dáng, màu sắc, họa tiết, độ đặc', fields: TAG_FIELDS.map((f) => f.name) },
  { key: 'css', label: 'CSS tùy chỉnh (nâng cao)', hint: 'Dành cho người biết CSS', fields: ['custom_css'] },
]);

sectionize('features', [
  { key: 'pages', label: 'Bật/tắt trang và tính năng', hint: 'Đặt hàng, custom, Blog, Gallery, Hướng dẫn size, hiện giá, nút liên hệ nổi', fields: ['checkout', 'custom_request', 'blog', 'gallery', 'size_guide', 'show_prices', 'floating_contact'] },
  { key: 'popup', label: 'Popup chào mừng', hint: 'Nội dung và thời điểm hiện popup khi khách vào trang', toggle: 'welcome_popup', fields: ['welcome_popup', 'welcome_popup_title', 'welcome_popup_content', 'welcome_popup_image', 'welcome_popup_delay'] },
  { key: 'announce', label: 'Thanh thông báo đầu trang', hint: 'Dòng chữ hiện trên cùng website', fields: ['announcement'] },
  { key: 'search', label: 'Gợi ý tìm kiếm', hint: 'Danh sách gợi ý khi khách gõ vào ô tìm kiếm', toggle: 'search_suggest', fields: ['search_suggest', 'search_suggest_limit'] },
  { key: 'inventory', label: 'Quản lý kho (tùy chọn)', hint: 'Theo dõi số lượng tồn từng sản phẩm, tự trừ kho theo đơn, hiện “còn N” cho khách', toggle: 'inventory_enabled', fields: ['inventory_enabled', 'inventory_deduct_at', 'inventory_block_over', 'inventory_display', 'inventory_low', 'inventory_text_in', 'inventory_text_low'] },
]);

sectionize('about', [
  { key: 'intro', label: 'Mở đầu & ảnh chính', hint: 'Tiêu đề, đoạn mở đầu, ảnh', fields: ['title', 'intro', 'image'] },
  { key: 'content', label: 'Nội dung chi tiết', hint: 'Bài giới thiệu về shop', fields: ['content'] },
  { key: 'values', label: 'Giá trị cốt lõi', hint: 'Các khối giá trị của shop', fields: ['values'] },
]);

sectionize('size_guide', [
  { key: 'intro', label: 'Mở đầu & ảnh minh họa', hint: 'Tiêu đề, mô tả, ảnh cách đo', fields: ['title', 'intro', 'image'] },
  { key: 'how', label: 'Các bước đo & bảng quy đổi', hint: 'Hướng dẫn từng bước và bảng ni', fields: ['steps', 'table'] },
  { key: 'extra', label: 'Lưu ý & video', hint: 'Lưu ý thêm, video TikTok / YouTube', fields: ['tips', 'video_url', 'video_title'] },
]);

sectionize('forms', [
  { key: 'order', label: 'Đặt hàng', hint: 'Tiêu đề, ghi chú, thông báo thành công, vận chuyển', fields: ['order_title', 'order_note', 'cart_unavailable', 'order_success', 'shipping_note'] },
  { key: 'orderimage', label: 'Ảnh đơn hàng cho khách tải', hint: 'Chữ trên ảnh và nút tải ảnh', toggle: 'order_image_enabled', fields: ['order_image_enabled', 'order_image_title', 'order_image_note', 'order_image_track', 'order_image_button', 'order_image_share'] },
  { key: 'track', label: 'Tra cứu đơn hàng', hint: 'Tiêu đề và lời nhắn theo từng trạng thái đơn', fields: ['track_title', 'track_intro', 'track_msg_new', 'track_msg_contacted', 'track_msg_confirmed', 'track_msg_shipping', 'track_msg_completed', 'track_msg_cancelled'] },
  { key: 'custom', label: 'Thiết kế riêng (custom)', hint: 'Tiêu đề, thông báo và các lựa chọn trong form custom', fields: ['custom_title', 'custom_intro', 'custom_success', 'budget_options', 'contact_via_options', 'accessory_options'] },
  { key: 'other', label: 'Liên hệ, tư vấn & bảo mật', hint: 'Thông báo gửi lời nhắn, yêu cầu tư vấn, ghi chú dưới form', fields: ['contact_success', 'consult_success', 'privacy_note'] },
]);

sectionize('footer', [
  { key: 'cols', label: 'Các cột chân trang', hint: 'Bật/tắt và đổi thứ tự các cột', fields: ['columns'] },
  { key: 'brand', label: 'Cột giới thiệu & menu', hint: 'Logo, slogan, mô tả, mạng xã hội, link tra cứu đơn', fields: ['show_logo', 'show_slogan', 'show_text', 'show_social', 'show_track'] },
  { key: 'links', label: 'Liên kết tự thêm', hint: 'Các đường dẫn riêng ở cột "Liên kết tự thêm"', fields: ['extra_links'] },
  { key: 'contact', label: 'Cột liên hệ', hint: 'Địa chỉ, điện thoại, email, giờ làm việc', fields: ['show_address', 'show_phone', 'show_email', 'show_hours'] },
  { key: 'bottom', label: 'Thanh dưới cùng', hint: 'Bản quyền, ảnh Bộ Công Thương, slogan', toggle: 'show_bottom', fields: ['show_bottom', 'show_copyright', 'show_bct', 'show_bottom_slogan'] },
]);

export const SCHEMA_BY_KEY = Object.fromEntries(SETTINGS_SCHEMA.map((g) => [g.key, g]));

// Gom các nhóm cài đặt thành vài mục lớn kèm mô tả, để menu cài đặt không dài và rối.
// Mỗi nhóm phải thuộc đúng một mục (thiếu sẽ báo lỗi khi khởi động).
export const SETTINGS_CATEGORIES = [
  { key: 'general', label: 'Thông tin chung & menu', description: 'Tên shop, liên hệ, logo, menu, chân trang và các công tắc bật / tắt tính năng.', groups: ['site', 'navigation', 'footer', 'features'] },
  { key: 'pages', label: 'Nội dung từng trang', description: 'Chữ và ảnh của trang chủ, Về shop, Hướng dẫn size, Liên hệ, biểu mẫu đặt hàng, các trang Sản phẩm / Gallery / Blog, Feedback & đánh giá khách hàng và các trang chính sách.', groups: ['home', 'feedback', 'about', 'size_guide', 'contact', 'forms', 'pages', 'policies'] },
  { key: 'design', label: 'Giao diện', description: 'Màu sắc, font chữ, nhãn sản phẩm, chế độ tối và bố cục các khối trang chủ.', groups: ['theme', 'home_layout'] },
  { key: 'seo', label: 'Tối ưu SEO', description: 'Mã theo dõi, SEO từng trang, schema cho Google, sitemap, robots.txt và công tắc cho phép Google lập chỉ mục.', groups: ['seo', 'seo_pages', 'schema', 'sitemap'] },
  { key: 'system', label: 'Email & hệ thống', description: 'Gửi thông báo đơn hàng qua email (chỉ người được cấp quyền).', groups: ['mail'] },
];
{
  const listed = SETTINGS_CATEGORIES.flatMap((c) => c.groups);
  const missing = SETTINGS_SCHEMA.map((g) => g.key).filter((k) => !listed.includes(k));
  const unknown = listed.filter((k) => !SCHEMA_BY_KEY[k]);
  if (missing.length || unknown.length) throw new Error('SETTINGS_CATEGORIES: nhóm chưa xếp mục ' + missing.join(', ') + ' / không tồn tại ' + unknown.join(', '));
}
