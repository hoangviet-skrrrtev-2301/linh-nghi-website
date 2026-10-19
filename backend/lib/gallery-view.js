// Cấu hình hiển thị Gallery (trang chủ và trang Gallery) từ cài đặt.
// Trang chủ dùng các trường gallery_*; trang Gallery dùng gallery_page_* hoặc "giống trang chủ" (mặc định).
export const GALLERY_LAYOUTS = [
  { value: 'auto', label: 'Tự động: ít ảnh thì lưới tĩnh, nhiều ảnh hơn số ô nhìn thấy thì băng chuyền' },
  { value: 'carousel', label: 'Băng chuyền: ảnh trượt ngang, khách kéo / vuốt được' },
  { value: 'grid', label: 'Lưới tĩnh: hiện đủ ảnh, không chuyển động' },
  { value: 'masonry', label: 'Xếp gạch tĩnh: cột so le, giữ nguyên tỷ lệ ảnh' },
];
export const GALLERY_ROWS = ['1', '2', '3', '4'].map((v) => ({ value: v, label: v === '1' ? '1 dòng' : v + ' dòng' }));
export const GALLERY_COLS = ['2', '3', '4', '5', '6'].map((v) => ({ value: v, label: v + ' cột' }));
export const GALLERY_COLS_MOBILE = ['1', '2', '3'].map((v) => ({ value: v, label: v + ' cột' }));
export const GALLERY_DIRECTIONS = [{ value: 'rtl', label: 'Từ phải sang trái' }, { value: 'ltr', label: 'Từ trái sang phải' }];
export const GALLERY_RATIOS = [
  { value: 'square', label: 'Vuông' }, { value: 'portrait', label: 'Dọc 4:5' }, { value: 'landscape', label: 'Ngang 4:3' },
];

const RATIO_CSS = { square: '1 / 1', portrait: '4 / 5', landscape: '4 / 3' };
const pick = (v, list, def) => (list.some((o) => o.value === String(v)) ? String(v) : def);
const num = (v, min, max, def) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };

// where: 'home' | 'page'; count: số ảnh sẽ hiện (để "Tự động" chọn lưới hay băng chuyền)
export function galleryView(s, where, count) {
  const h = s.home || {};
  const p = s.pages || {};
  const own = where === 'page' && (p.gallery_page_layout || 'same') !== 'same';
  const f = own
    ? { layout: p.gallery_page_layout, rows: p.gallery_page_rows, cols: p.gallery_page_cols, colsSm: p.gallery_page_cols_mobile, auto: p.gallery_page_autoscroll, seconds: p.gallery_page_scroll_seconds, dir: p.gallery_page_direction, ratio: p.gallery_page_ratio }
    : { layout: h.gallery_layout, rows: h.gallery_rows, cols: h.gallery_cols, colsSm: h.gallery_cols_mobile, auto: h.gallery_autoscroll, seconds: h.gallery_scroll_seconds, dir: h.gallery_direction, ratio: h.gallery_ratio };
  const rows = Number(pick(f.rows, GALLERY_ROWS, '2'));
  const cols = Number(pick(f.cols, GALLERY_COLS, '4'));
  let layout = pick(f.layout, GALLERY_LAYOUTS, 'auto');
  if (layout === 'auto') layout = count > rows * cols ? 'carousel' : 'grid';
  const ratio = pick(f.ratio, GALLERY_RATIOS, 'square');
  return {
    layout, rows, cols, colsSm: Number(pick(f.colsSm, GALLERY_COLS_MOBILE, '2')),
    auto: f.auto !== false, seconds: num(f.seconds, 5, 600, 45), rtl: pick(f.dir, GALLERY_DIRECTIONS, 'rtl') === 'rtl',
    ratio, ratioCss: layout === 'masonry' ? '' : RATIO_CSS[ratio],
  };
}
