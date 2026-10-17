// Tạo mục lục từ các thẻ <h2>, <h3> trong nội dung bài viết (HTML đã qua cleanHtml) và gắn id cho thẻ đó.
import { stripHtml } from './utils.js';

function slug(text) {
  return String(text)
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'muc';
}

export function buildToc(html) {
  const toc = [];
  const used = new Set();
  const out = String(html || '').replace(/<h([23])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi, (m, level, attrs = '', inner) => {
    const text = stripHtml(inner).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim();
    if (!text) return m;
    let id = `m-${slug(text)}`;
    for (let n = 2; used.has(id); n++) id = `m-${slug(text)}-${n}`;
    used.add(id);
    toc.push({ id, text, level: Number(level) });
    return `<h${level}${attrs.replace(/\sid="[^"]*"/i, '')} id="${id}">${inner}</h${level}>`;
  });
  return { html: out, toc };
}
