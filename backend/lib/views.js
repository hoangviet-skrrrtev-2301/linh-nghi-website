// Cấu hình template Nunjucks cho giao diện khách (frontend/views) và trang quản trị (admin/views).
import nunjucks from 'nunjucks';
import { config } from '../config/index.js';
import { formatVnd, formatDate, escapeHtml } from './utils.js';
import { pageWindow } from './pagination.js';
import { addImageDims } from './html-images.js';
import { fixHeadingLevels } from './toc.js';

// Đổi giá trị này mỗi lần khởi động để trình duyệt tải lại CSS/JS mới
export const ASSET_VERSION = Date.now().toString(36);

function makeEnv(dir) {
  const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(dir, { noCache: !config.isProd }), {
    autoescape: true,
    throwOnUndefined: false,
  });
  env.addFilter('vnd', formatVnd);
  env.addFilter('date', (v) => formatDate(v));
  env.addFilter('datetime', (v) => formatDate(v, true));
  // Dữ liệu JSON an toàn để đặt trong thuộc tính HTML (x-data, data-*)
  env.addFilter('attrjson', (v) => new nunjucks.runtime.SafeString(escapeHtml(JSON.stringify(v ?? null))));
  // JSON đặt trong thẻ <script>: escape "<" để không thể đóng thẻ script
  env.addFilter('jsonScript', (v) => new nunjucks.runtime.SafeString(JSON.stringify(v ?? null).replace(/</g, '\\u003c')));
  env.addFilter('img', (media, size = 'md') => media?.[size] || media?.lg || '');
  env.addFilter('srcset', (m) => (m ? [m.sm && `${m.sm} 480w`, m.md && `${m.md} 960w`, m.lg && `${m.lg} 1800w`].filter(Boolean).join(', ') : ''));
  // Nội dung soạn thảo: thêm width/height cho ảnh (chống CLS); headings: không nhảy cấp (start = cấp tiêu đề ngay trước nội dung)
  env.addFilter('imgdims', (html) => addImageDims(String(html || '')));
  env.addFilter('headings', (html, start = 1) => fixHeadingLevels(String(html || ''), start));
  env.addFilter('year', (s) => String(s || '').replace('{year}', new Date().getFullYear()));
  env.addFilter('nl2br', (s) => new nunjucks.runtime.SafeString(escapeHtml(s).replace(/\n/g, '<br>')));
  env.addFilter('phoneHref', (s) => String(s || '').replace(/[^\d+]/g, ''));
  // Dùng ở trang Cài đặt: tạo mục trống cho danh sách lặp, kiểm tra các trường đều là ô chữ
  env.addFilter('blankItem', (fields) => Object.fromEntries((fields || []).map((f) => [f.name, f.type === 'toggle' ? false : f.type === 'image' ? null : ''])));
  env.addFilter('allText', (fields) => (fields || []).every((f) => f.type === 'text'));
  env.addGlobal('assetVersion', ASSET_VERSION);
  env.addGlobal('pageWindow', pageWindow);
  env.addGlobal('adminPath', config.adminPath);
  env.addGlobal('baseUrl', config.baseUrl);
  return env;
}

export const frontendEnv = makeEnv(config.paths.frontendViews);
export const adminEnv = makeEnv(config.paths.adminViews);

// Gắn res.view() và res.adminView() để render template
export function viewHelpers(req, res, next) {
  res.view = (tpl, ctx = {}, status = 200) => res.status(status).type('html').send(frontendEnv.render(tpl, { ...res.locals, ...ctx }));
  res.adminView = (tpl, ctx = {}, status = 200) => res.status(status).type('html').send(adminEnv.render(tpl, { ...res.locals, ...ctx }));
  next();
}
