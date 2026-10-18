// Danh sách việc cần làm trước khi mở website chính thức (hiện ở Admin › Tổng quan, tự mất khi đã xong).
// Mọi thông tin đều lấy từ cài đặt, nên sửa xong là danh sách tự cập nhật.
import { config } from '../config/index.js';
import { getPublicSettings } from './settings.js';

export function launchChecks() {
  const s = getPublicSettings();
  const out = [];
  const add = (level, group, text) => out.push({ level, group, text });

  if (!s.seo.allow_indexing) add('info', 'seo', 'Website đang TẮT index (Google không thu thập). Khi chính thức vận hành, bật “Cho phép Google lập chỉ mục” ở nhóm SEO & mã theo dõi.');
  const phone = String(s.site.phone || '').replace(/\D/g, '');
  if (!phone || /^0?900000000$/.test(phone)) add('warn', 'site', 'Số điện thoại shop còn là số mẫu (hiện trên website và trong schema Google).');
  if (!s.site.email || /@example\.(com|org|net)$/i.test(s.site.email)) add('warn', 'site', 'Email shop còn là email mẫu hoặc chưa nhập.');
  const addr = String(s.site.address || '').trim();
  if (!addr || /^thành phố hà nội$/i.test(addr)) add('warn', 'site', 'Địa chỉ shop còn là địa chỉ mẫu hoặc chưa nhập.');
  const bare = [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['threads', 'Threads'], ['tiktok', 'TikTok']]
    .filter(([k]) => /^https?:\/\/(www\.)?[a-z]+\.com\/?$/i.test(String(s.site[k] || '').trim())).map(([, n]) => n);
  if (bare.length) add('warn', 'site', `Liên kết mạng xã hội chưa trỏ về trang của shop (${bare.join(', ')}).`);
  if (!s.seo.og_image) add('info', 'seo', 'Chưa chọn ảnh chia sẻ mặc định (1200×630px), hiện đang dùng logo khi chia sẻ link.');
  if (!s.seo.google_site_verification) add('info', 'seo', 'Chưa nhập mã xác minh Google Search Console.');
  if (!s.schema?.address_locality) add('info', 'schema', 'Schema: chưa nhập quận / huyện, thành phố của cửa hàng.');
  if (config.isProd && /localhost|127\.0\.0\.1/.test(config.baseUrl)) add('warn', 'seo', 'BASE_URL trong file .env còn là localhost, canonical và sitemap sẽ sai địa chỉ.');
  return out;
}
