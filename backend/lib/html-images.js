// Bổ sung width / height cho ảnh nằm trong nội dung soạn thảo (bài viết, mô tả sản phẩm...) khi hiển thị,
// để trình duyệt giữ chỗ đúng tỉ lệ trước khi ảnh tải xong (chống nhảy bố cục - CLS).
// Ảnh do trình soạn thảo chèn từ Thư viện ảnh có đường dẫn /uploads/AAAA/MM/<mã>-<kích cỡ>.webp; tra kích thước gốc theo mã đó.
import { db } from './db.js';

const IMG_TAG = /<img\b[^>]*>/gi;
const SRC = /\ssrc="\/uploads\/\d{4}\/\d{2}\/([0-9a-f]{16})-(?:sm|md|lg)\.webp"/i;
const cache = new Map();

function dims(hash) {
  if (cache.has(hash)) return cache.get(hash);
  const row = db.prepare('SELECT width, height FROM media WHERE variants LIKE ? LIMIT 1').get(`%${hash}%`);
  const v = row && row.width && row.height ? row : null;
  if (cache.size > 2000) cache.clear();
  cache.set(hash, v);
  return v;
}

export function addImageDims(html) {
  if (!html || !html.includes('<img')) return html || '';
  return html.replace(IMG_TAG, (tag) => {
    if (/\swidth\s*=/i.test(tag)) return tag;
    const m = tag.match(SRC);
    const d = m && dims(m[1]);
    return d ? tag.replace(/\s*\/?>$/, (end) => ` width="${d.width}" height="${d.height}"${end}`) : tag;
  });
}
