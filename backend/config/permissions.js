// Phân quyền trang quản trị. Chủ shop luôn toàn quyền; nhân viên có các quyền của vai trò được gán (Admin › Vai trò & phân quyền).
// Muốn thêm một quyền mới: khai báo ở PERMISSION_GROUPS, rồi gắn đường dẫn API / trang vào quyền đó ở API_RULES và PAGE_RULES.
// Việc quản lý tài khoản và vai trò chỉ Chủ shop làm được (không giao được) để không ai tự nâng quyền cho mình.

export const PERMISSION_GROUPS = [
  {
    key: 'sales', label: 'Bán hàng', description: 'Đơn hàng, yêu cầu của khách và hồ sơ khách hàng.',
    items: [
      { key: 'orders', label: 'Đơn hàng, yêu cầu custom, liên hệ', help: 'Xem, xử lý, đổi trạng thái, sửa giá, thêm đơn thủ công.' },
      { key: 'customers', label: 'Khách hàng', help: 'Xem, thêm, sửa, nhập hàng loạt hồ sơ khách.' },
      { key: 'sensitive', label: 'Xóa đơn / khách và xuất danh sách khách', help: 'Thao tác nhạy cảm, không hoàn tác được. Chỉ giao cho người thật tin tưởng.' },
    ],
  },
  {
    key: 'catalog', label: 'Sản phẩm', description: 'Hàng hóa và cách phân loại trên website.',
    items: [
      { key: 'products', label: 'Sản phẩm', help: 'Thêm, sửa, ẩn / hiện, xóa sản phẩm và quản lý loại sản phẩm.' },
      { key: 'terms', label: 'Danh mục & bộ lọc', help: 'Loại ngọc, màu sắc, kiểu dáng, mệnh phong thủy.' },
    ],
  },
  {
    key: 'content', label: 'Nội dung', description: 'Bài viết, ảnh và thư viện hình.',
    items: [
      { key: 'posts', label: 'Blog và tác giả', help: 'Viết, sửa, xóa bài; quản lý chuyên mục và tác giả.' },
      { key: 'gallery', label: 'Gallery', help: 'Thêm, sửa, sắp xếp ảnh Gallery.' },
      { key: 'media', label: 'Thư viện ảnh (xóa, đổi tên, chuyển thư mục)', help: 'Ai có quyền chỉnh sửa nội dung đều tải ảnh lên và chọn ảnh được; quyền này thêm việc xóa và sắp xếp lại thư viện.' },
    ],
  },
  {
    key: 'site', label: 'Cài đặt website', description: 'Chữ, ảnh và cách website hiển thị, chia theo mục để giao việc từng phần.',
    items: [
      { key: 'settings_site', label: 'Thông tin chung, menu, chân trang, bật / tắt tính năng', help: 'Tên shop, liên hệ, logo, menu, chân trang, các công tắc tính năng.' },
      { key: 'settings_pages', label: 'Nội dung từng trang và biểu mẫu', help: 'Trang chủ, Về shop, Hướng dẫn size, Liên hệ, Biểu mẫu đặt hàng, trang Sản phẩm / Gallery / Blog.' },
      { key: 'settings_design', label: 'Giao diện', help: 'Màu sắc, font, nhãn sản phẩm, bố cục trang chủ.' },
      { key: 'settings_seo', label: 'Tối ưu SEO và schema', help: 'Mã theo dõi, SEO từng trang, schema, sitemap và robots.txt, bật / tắt index.' },
      { key: 'redirects', label: 'Chuyển hướng & trang 404', help: 'Tạo, sửa, xóa chuyển hướng 301 / 302 / 410. Sai cấu hình có thể làm mất xếp hạng.' },
    ],
  },
  {
    key: 'system', label: 'Hệ thống', description: 'Những thao tác ảnh hưởng tới an toàn của cả website.',
    items: [
      { key: 'mail', label: 'Cấu hình email (SMTP)', help: 'Xem và đổi mật khẩu email gửi thông báo đơn hàng.' },
      { key: 'audit', label: 'Xem nhật ký hoạt động', help: 'Ai đã làm gì, lúc nào, từ địa chỉ IP nào.' },
      { key: 'backup', label: 'Tải bản sao lưu', help: 'Tải toàn bộ dữ liệu website về máy.' },
    ],
  },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));
export const DEFAULT_ROLE_ID = 1;

// Mỗi nhóm cài đặt thuộc một quyền
export const SETTINGS_PERMISSION = {
  site: 'settings_site', navigation: 'settings_site', footer: 'settings_site', features: 'settings_site',
  home: 'settings_pages', about: 'settings_pages', size_guide: 'settings_pages', contact: 'settings_pages', forms: 'settings_pages', pages: 'settings_pages',
  theme: 'settings_design', home_layout: 'settings_design',
  seo: 'settings_seo', seo_pages: 'settings_seo', schema: 'settings_seo', sitemap: 'settings_seo',
  mail: 'mail',
};

export const can = (user, perm) => !!user && (user.role === 'owner' || (Array.isArray(user.permissions) && user.permissions.includes(perm)));
export const canAny = (user, perms) => perms.some((p) => can(user, p));
const EDITORS = ['products', 'posts', 'gallery', 'media', 'terms', 'settings_site', 'settings_pages', 'settings_design', 'settings_seo'];

// Đường dẫn API (sau /admin/api). Quy tắc đầu tiên khớp được dùng. read = một trong các quyền (GET), write = quyền để ghi.
// null = ai đã đăng nhập cũng dùng được; 'owner' = chỉ Chủ shop.
export const API_RULES = [
  { re: /^\/(me|account)(\/|$)/, any: null },
  { re: /^\/dashboard/, any: ['orders'] },
  { re: /^\/(users|roles)(\/|$)/, any: 'owner' },
  { re: /^\/media\/(folders|move)(\/|$)/, read: EDITORS, write: ['media'] },
  { re: /^\/media$/, read: EDITORS, write: EDITORS },         // tải ảnh lên: mọi người chỉnh sửa nội dung đều cần
  { re: /^\/media\//, read: EDITORS, write: ['media'] },
  { re: /^\/terms/, read: ['terms', 'products'], write: ['terms'] },
  { re: /^\/product-types/, read: ['products', 'terms'], write: ['products'] },
  { re: /^\/products/, read: ['products'], write: ['products'] },
  { re: /^\/gallery/, read: ['gallery'], write: ['gallery'] },
  { re: /^\/(posts|post-categories|authors)/, read: ['posts'], write: ['posts'] },
  { re: /^\/inquiries\/[^/]+$/, method: 'DELETE', any: ['sensitive'] },
  { re: /^\/inquiries/, read: ['orders'], write: ['orders'] },
  { re: /^\/customers\/export\.csv$/, any: ['sensitive'] },
  { re: /^\/customers\/[^/]+$/, method: 'DELETE', any: ['sensitive'] },
  { re: /^\/customers/, read: ['customers', 'orders'], write: ['customers'] },
  { re: /^\/redirects/, read: ['redirects'], write: ['redirects'] },
  { re: /^\/settings\/mail\/test$/, any: ['mail'] },
  { re: /^\/backup$/, any: ['backup'] },
  { re: /^\/audit$/, any: ['audit'] },
  // /settings và /settings/:key do route tự kiểm tra theo nhóm cài đặt
  { re: /^\/settings(\/|$)/, any: null },
];

export function apiPermission(user, method, path) {
  const rule = API_RULES.find((r) => r.re.test(path) && (!r.method || r.method === method));
  if (!rule) return user?.role === 'owner'; // đường dẫn chưa khai báo: chỉ Chủ shop (an toàn mặc định)
  if ('any' in rule) return rule.any === null ? !!user : rule.any === 'owner' ? user?.role === 'owner' : canAny(user, rule.any);
  return canAny(user, method === 'GET' || method === 'HEAD' ? rule.read : rule.write);
}

// Trang admin (sau /admin)
export const PAGE_RULES = [
  { re: /^\/(products)(\/|$)|^\/preview\//, any: ['products'] },
  { re: /^\/terms/, any: ['terms'] },
  { re: /^\/gallery/, any: ['gallery'] },
  { re: /^\/(posts|authors)(\/|$)/, any: ['posts'] },
  { re: /^\/media/, any: EDITORS },
  { re: /^\/inquiries/, any: ['orders'] },
  { re: /^\/customers/, any: ['customers', 'orders'] },
  { re: /^\/redirects/, any: ['redirects'] },
  { re: /^\/audit/, any: ['audit'] },
  { re: /^\/(users|roles)/, any: 'owner' },
];

// Trang đầu tiên tài khoản được vào (khi không có quyền xem Tổng quan)
export function firstAllowedPage(user) {
  const order = [['orders', '/inquiries?type=order'], ['customers', '/customers'], ['products', '/products'], ['posts', '/posts'], ['gallery', '/gallery'], ['terms', '/terms'], ['media', '/media'],
    ['settings_site', '/settings'], ['settings_pages', '/settings'], ['settings_design', '/settings'], ['settings_seo', '/settings'], ['redirects', '/redirects'], ['audit', '/audit']];
  return order.find(([perm]) => can(user, perm))?.[1] || '/account';
}

export function pagePermission(user, path) {
  const rule = PAGE_RULES.find((r) => r.re.test(path));
  if (!rule) return true;
  return rule.any === 'owner' ? user?.role === 'owner' : canAny(user, rule.any);
}
