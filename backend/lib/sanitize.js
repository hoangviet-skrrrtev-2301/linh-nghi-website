// Làm sạch HTML từ trình soạn thảo trước khi lưu, chống chèn mã độc (XSS).
import sanitizeHtml from 'sanitize-html';

const ALIGN = /^ql-(align|indent|size|font)-[a-z0-9-]+$/;
const COLOR = /^#[0-9a-f]{3,8}$/i;
const RGB = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/;

const OPTIONS = {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'a', 'ul', 'ol', 'li', 'h2', 'h3', 'h4',
    'blockquote', 'img', 'figure', 'figcaption', 'span', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'pre', 'code', 'sub', 'sup',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel', 'title'],
    img: ['src', 'alt', 'width', 'height', 'loading'],
    li: ['data-list', 'class'],
    p: ['class'],
    h2: ['class'], h3: ['class'], h4: ['class'],
    span: ['class', 'style'],
    td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'],
  },
  // Chỉ cho phép màu chữ / màu nền (từ bộ chọn màu của trình soạn thảo), không cho kiểu dáng khác
  allowedStyles: {
    span: { color: [COLOR, RGB], 'background-color': [COLOR, RGB] },
  },
  allowedClasses: { '*': [ALIGN] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => {
      const external = /^https?:\/\//i.test(attribs.href || '');
      return { tagName, attribs: external ? { ...attribs, target: '_blank', rel: 'noopener noreferrer nofollow' } : attribs };
    },
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: 'lazy' } }),
  },
};

// Ảnh cho phép: đường dẫn nội bộ /uploads/... hoặc link https
const IMG_LOCAL = /^\/uploads\//;

export function cleanHtml(dirty) {
  return sanitizeHtml(String(dirty || ''), {
    ...OPTIONS,
    exclusiveFilter: (frame) => frame.tag === 'img' && !(IMG_LOCAL.test(frame.attribs.src || '') || /^https:\/\//.test(frame.attribs.src || '')),
  });
}

export function cleanText(input, max = 5000) {
  return String(input ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}
