// Thứ tự và bật/tắt các khối trang chủ (cài đặt nhóm home_layout). Nền của từng khối lấy từ nhóm "backgrounds" (Nền các khối).
import { HOME_SECTIONS } from '../config/settings-schema.js';
import { blockBackground } from './block-bg.js';

// Trả về danh sách khối đang bật theo đúng thứ tự admin đã sắp.
// Khối mới thêm vào code về sau (chưa có trong dữ liệu đã lưu) được nối vào cuối.
// backgrounds: cài đặt nhóm "backgrounds" (danh sách blocks theo mã khối)
export function homeSections(layout, backgrounds) {
  const saved = Array.isArray(layout?.sections) ? layout.sections : [];
  const known = new Set(HOME_SECTIONS.map((x) => x.key));
  const seen = new Set();
  const ordered = [];
  for (const item of saved) {
    if (known.has(item?.key) && !seen.has(item.key)) { seen.add(item.key); ordered.push(item); }
  }
  for (const def of HOME_SECTIONS) if (!seen.has(def.key)) ordered.push({ key: def.key, enabled: true });
  const bgByKey = Object.fromEntries((Array.isArray(backgrounds?.blocks) ? backgrounds.blocks : []).map((b) => [b.key, b]));

  const out = [];
  for (const item of ordered) {
    if (item.enabled === false) continue;
    const meta = HOME_SECTIONS.find((x) => x.key === item.key);
    const bg = meta.bg ? blockBackground(bgByKey[item.key]) : null;
    out.push({ key: item.key, hasBg: !!bg?.hasBg, style: bg?.style || '', pattern: bg?.pattern || '' });
  }
  out.forEach((sec, i) => { sec.afterBanner = out[i - 1]?.key === 'banner'; });
  return out;
}
