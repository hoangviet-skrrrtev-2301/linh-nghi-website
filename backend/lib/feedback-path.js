// Đường dẫn của trang Feedback (một đoạn, đổi được trong Cài đặt › Feedback & đánh giá khách hàng).
import { config } from '../config/index.js';
import { slugify } from './utils.js';

export const DEFAULT_FEEDBACK_SLUG = 'feedback';

// Tên trùng trang / thư mục hệ thống thì không dùng được
const RESERVED = new Set([
  'san-pham', 'blog', 'gallery', 'gio-hang', 'tra-cuu-don', 'thiet-ke-rieng', 'huong-dan-size', 'lien-he', 've-shop', 'chinh-sach',
  'api', 'assets', 'uploads', 'vendor', 'fonts', 'admin-assets', 'favicon-ico',
]);

export const feedbackPath = (slug) => '/' + (slug || DEFAULT_FEEDBACK_SLUG);

// Chuẩn hóa đường dẫn người dùng nhập; không hợp lệ / bị trùng thì giữ giá trị trước đó
export function cleanFeedbackSlug(input, fallback = DEFAULT_FEEDBACK_SLUG) {
  const s = slugify(input);
  if (!s || RESERVED.has(s) || '/' + s === config.adminPath) return fallback || DEFAULT_FEEDBACK_SLUG;
  return s;
}
