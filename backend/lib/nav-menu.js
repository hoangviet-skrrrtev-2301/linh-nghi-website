// Menu sổ dọc (dropdown): nguồn danh sách con do chủ shop chọn ở Admin › Cài đặt › Menu.
import { listTerms, listPublicProductGroups } from '../services/catalog.js';
import { listPosts, listPostCategories } from '../services/content.js';

export const NAV_TERM_PARAM = { jade_type: 'loai', color: 'mau', style: 'kieu', element: 'menh' };

// Chưa chọn kiểu (dữ liệu menu cũ) thì mục /san-pham mặc định sổ theo loại ngọc
function dropdownOf(item) {
  return item.dropdown || (item.url === '/san-pham' ? 'jade_type' : 'none');
}

function customLinks(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    const [label, url] = line.split('|').map((x) => x.trim());
    return label && /^(\/|https?:\/\/)/i.test(url || '') ? { label, url } : null;
  }).filter(Boolean).slice(0, 30);
}

// jadeTypes: danh sách loại ngọc đã có sẵn trong request (đỡ truy vấn lại)
export function navChildren(item, { jadeTypes = [], limit = 8 } = {}) {
  const kind = dropdownOf(item);
  if (kind === 'none') return [];
  if (kind === 'custom') return customLinks(item.dropdown_custom);
  const groupLink = (g) => ({ label: g.name, url: g.uses_jade_fields ? '/san-pham' : `/san-pham/${encodeURIComponent(g.slug)}` });
  // Theo loại sản phẩm: Vòng tay ngọc, Pháp phục... (chỉ loại đang hoạt động và có sản phẩm)
  if (kind === 'product_type') return listPublicProductGroups().map(groupLink);
  if (kind === 'blog_category') return listPostCategories({ activeOnly: true }).map((c) => ({ label: c.name, url: `/blog/${encodeURIComponent(c.slug)}` }));
  if (kind === 'posts') return listPosts({ perPage: limit }).items.map((p) => ({ label: p.title, url: p.url }));
  const param = NAV_TERM_PARAM[kind];
  if (!param) return [];
  const terms = kind === 'jade_type' ? jadeTypes : listTerms(kind, { activeOnly: true });
  const links = terms.map((t) => ({ label: t.name, url: kind === 'jade_type' ? `/san-pham/${encodeURIComponent(t.slug)}` : `/san-pham?${param}=${encodeURIComponent(t.slug)}` }));
  // Menu Sản phẩm sổ theo ngọc thì thêm các loại hàng khác đang hoạt động (ví dụ Pháp phục) ở cuối danh sách
  if (String(item.url).startsWith('/san-pham')) links.push(...listPublicProductGroups({ onlyNonJade: true }).map(groupLink));
  return links;
}
