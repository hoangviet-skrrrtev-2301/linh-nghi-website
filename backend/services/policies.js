// Trang chính sách: chuẩn hóa khi lưu cài đặt, lấy danh sách / một trang để hiển thị.
import crypto from 'node:crypto';
import { slugify } from '../lib/utils.js';
import { addAutoRedirect } from './redirects.js';
import { getPublicSettings } from './settings.js';

export const policyPath = (slug) => '/chinh-sach/' + slug;

// Gọi trong saveGroup('policies'): gán mã trang, tạo đường dẫn duy nhất, tự chuyển hướng 301 khi đổi đường dẫn
export function normalizePolicies(prevPages, nextPages) {
  const prev = Object.fromEntries((prevPages || []).filter((x) => x.key).map((x) => [x.key, x]));
  const used = new Set();
  const out = (nextPages || []).map((item) => {
    const it = { ...item };
    if (!it.key || used.has('key:' + it.key)) it.key = 'p' + crypto.randomBytes(4).toString('hex');
    used.add('key:' + it.key);
    const base = slugify(it.slug || it.title) || 'chinh-sach';
    let slug = base;
    let i = 2;
    while (used.has('slug:' + slug)) slug = base + '-' + i++;
    used.add('slug:' + slug);
    it.slug = slug;
    return it;
  });
  for (const it of out) {
    const old = prev[it.key];
    if (old && old.slug && old.slug !== it.slug && old.enabled) addAutoRedirect(policyPath(old.slug), policyPath(it.slug));
  }
  return out;
}

export const listPolicies = () => (getPublicSettings().policies?.policy_pages || []).filter((x) => x.enabled && x.title && x.slug);
export const getPolicy = (slug) => listPolicies().find((x) => x.slug === slug) || null;
