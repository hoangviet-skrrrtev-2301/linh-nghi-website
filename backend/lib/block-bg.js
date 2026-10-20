// Nền tùy chỉnh cho các khối của website (cài đặt nhóm "backgrounds" › Giao diện › Nền các khối):
// các khối trang chủ, thanh thông báo, chân trang, phần đầu các trang con, đánh giá / sản phẩm liên quan ở trang sản phẩm.
// Mỗi khối có: bg_mode (none | color | pattern | image), màu, họa tiết, ảnh + lớp phủ, và màu chữ (tự chọn theo độ sáng của nền).

const PATTERNS = new Set(['dots', 'grid', 'diagonal', 'rings', 'waves']);

function luminance(hex) {
  let h = String(hex || '').replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (!Number.isFinite(n)) return 1;
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

const clamp = (v, min, max, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const hex = (v, fallback) => (/^#[0-9a-f]{3,8}$/i.test(String(v)) ? v : fallback);

// Biến màu chữ đặt trên khối để mọi thành phần bên trong (text-ink, text-muted, border-line...) đổi theo nền
const TONES = {
  // Nền tối: màu chủ đạo dùng bản sáng hơn để giá, liên kết, nút vẫn đọc được
  light: '--c-text:#fff;--c-muted:rgba(255,255,255,.74);--c-border:rgba(255,255,255,.24);--c-surface:rgba(255,255,255,.1);--c-primary:#8fc0e6;--c-on-primary:#0e1a24;color:#fff;',
  dark: '--c-text:#1d2b36;--c-muted:#52636e;--c-border:rgba(29,43,54,.14);--c-surface:rgba(255,255,255,.72);color:#1d2b36;',
};

// item: một mục cài đặt nền. Trả về { hasBg, style, pattern, tone } (hasBg = false: dùng giao diện mặc định)
export function blockBackground(item) {
  const out = { hasBg: false, style: '', bgStyle: '', toneStyle: '', pattern: '', tone: '' };
  const mode = item?.bg_mode;
  if (!(mode === 'color' || mode === 'pattern' || (mode === 'image' && item.bg_image?.lg))) return out;
  const bg = hex(item.bg_color, '#f1ece1');
  let style;
  let tone;
  if (mode === 'image') {
    const pct = clamp(item.bg_overlay, 0, 90, 35);
    const oc = hex(item.bg_overlay_color, '#000000');
    const layer = `color-mix(in srgb, ${oc} ${pct}%, transparent)`;
    style = `background-image:linear-gradient(${layer},${layer}),url(${JSON.stringify(item.bg_image.lg)});background-size:cover;background-position:center;`;
    tone = pct >= 25 && luminance(oc) > 0.6 ? 'dark' : 'light';
  } else {
    style = `background-color:${bg};`;
    tone = luminance(bg) > 0.55 ? 'dark' : 'light';
    if (mode === 'pattern' && PATTERNS.has(item.bg_pattern)) {
      out.pattern = `pat-${item.bg_pattern}`;
      style += `--pat-color:${hex(item.bg_pattern_color, '#2e6b94')};--pat-strength:${clamp(item.bg_pattern_strength, 5, 60, 18)}%;`;
    }
  }
  if (item.text_tone === 'light' || item.text_tone === 'dark') tone = item.text_tone;
  out.hasBg = true;
  out.tone = tone;
  out.bgStyle = style;            // chỉ phần nền (dùng khi chữ đổi bằng lớp riêng, ví dụ thanh menu)
  out.toneStyle = TONES[tone];
  out.style = style + TONES[tone];
  return out;
}

// Toàn bộ nền theo mã khối: { footer: {...}, announcement: {...}, ... } (khối chưa có cài đặt = không có nền riêng)
export function blockBackgrounds(settings) {
  const out = {};
  for (const item of Array.isArray(settings?.blocks) ? settings.blocks : []) {
    if (item?.key) out[item.key] = blockBackground(item);
  }
  return out;
}
