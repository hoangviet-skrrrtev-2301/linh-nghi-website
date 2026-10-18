// Nhãn trên sản phẩm (Best Seller, Mới, Sale, Đã bán, Đặt trước, Có thể custom): sinh CSS từ cài đặt Giao diện.
// Mặc định giữ đúng màu theo giao diện như bản gốc (nền đặc, bo tròn, không họa tiết).

export const TAGS = [
  { key: 'bestseller', label: 'Best Seller', bg: 'ink' },
  { key: 'new', label: 'Mới', bg: 'primary' },
  { key: 'sale', label: 'Sale (giảm giá)', bg: 'accent' },
  { key: 'soldout', label: 'Đã bán', bg: 'ink' },
  { key: 'preorder', label: 'Đặt trước', bg: 'surface', surfaceFg: 'var(--c-text)' },
  { key: 'custom', label: 'Có thể custom', bg: 'surface', surfaceFg: 'var(--c-primary)' },
];

export const TAG_BG_OPTIONS = [
  { value: 'ink', label: 'Màu chữ chính (tối)' },
  { value: 'primary', label: 'Màu chủ đạo' },
  { value: 'accent', label: 'Màu nhấn' },
  { value: 'surface', label: 'Màu nền thẻ (sáng)' },
  { value: 'custom', label: 'Màu tùy chọn (chọn ở ô bên dưới)' },
];

export const TAG_PATTERNS = [
  { value: 'none', label: 'Không họa tiết' },
  { value: 'dots', label: 'Chấm bi' },
  { value: 'grid', label: 'Lưới ô vuông' },
  { value: 'diagonal', label: 'Sọc chéo' },
  { value: 'rings', label: 'Vòng tròn (vòng ngọc)' },
  { value: 'waves', label: 'Sóng nhẹ' },
];

const THEME_BG = {
  ink: ['var(--c-text)', 'var(--c-bg)'],
  primary: ['var(--c-primary)', 'var(--c-on-primary)'],
  accent: ['var(--c-accent)', 'var(--c-on-accent)'],
  surface: ['var(--c-surface)', 'var(--c-text)'],
};
const RADIUS = { pill: '9999px', round: '6px', square: '0px' };
const hex = (v, fallback) => (/^#[0-9a-f]{6}$/i.test(String(v)) ? v : fallback);
const clamp = (v, min, max, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
// Chữ trắng hay tối trên một màu nền tùy chọn (theo độ sáng)
const readable = (h) => {
  const n = parseInt(h.slice(1), 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.62 ? '#111827' : '#ffffff';
};

function pattern(kind, fg, strength) {
  const p = `color-mix(in srgb, ${fg} ${strength}%, transparent)`;
  switch (kind) {
    case 'dots': return [`radial-gradient(${p} 1px, transparent 1.2px)`, '7px 7px'];
    case 'grid': return [`linear-gradient(${p} 1px, transparent 1px), linear-gradient(90deg, ${p} 1px, transparent 1px)`, '8px 8px'];
    case 'diagonal': return [`repeating-linear-gradient(45deg, ${p} 0 1px, transparent 1px 6px)`, 'auto'];
    case 'rings': return [`repeating-radial-gradient(circle at 85% 15%, ${p} 0 1px, transparent 1px 7px)`, 'auto'];
    case 'waves': return [`radial-gradient(circle at 50% 100%, transparent 0 4px, ${p} 4px 5px, transparent 5px)`, '10px 5px'];
    default: return ['none', 'auto'];
  }
}

export function tagCss(t) {
  const op = clamp(t.tag_opacity, 10, 100, 100);
  const strength = clamp(t.tag_pattern_strength, 5, 60, 28);
  const style = ['solid', 'outline', 'glass'].includes(t.tag_style) ? t.tag_style : 'solid';
  let css = `:root{--tag-radius:${RADIUS[t.tag_shape] || RADIUS.pill};--tag-op:${style === 'glass' ? Math.min(op, 70) : op}%}\n`;
  if (style === 'outline') css += '.tag{background-color:color-mix(in srgb,var(--c-surface) 92%,transparent);border-color:var(--tg-bg);color:var(--c-text)}\n';
  if (style === 'glass') css += '.tag{-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}\n';
  for (const tag of TAGS) {
    const picked = t[`tag_${tag.key}_bg`];
    const mode = picked === 'custom' || THEME_BG[picked] ? picked : tag.bg;
    let bg; let fg;
    if (mode === 'custom') {
      const c = hex(t[`tag_${tag.key}_color`], '#2e6b94');
      bg = c; fg = readable(c);
    } else {
      [bg, fg] = THEME_BG[mode];
      if (mode === 'surface' && tag.surfaceFg) fg = tag.surfaceFg;
    }
    const tone = t[`tag_${tag.key}_tone`];
    if (tone === 'light') fg = '#ffffff';
    else if (tone === 'dark') fg = '#111827';
    const [img, size] = pattern(t[`tag_${tag.key}_pattern`], fg, strength);
    css += `.tag-${tag.key}{--tg-bg:${bg};--tg-fg:${fg};--tg-pat:${img};--tg-pat-size:${size}}\n`;
  }
  return css;
}
