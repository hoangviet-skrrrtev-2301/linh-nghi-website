// Thứ tự, bật/tắt và nền của các khối trang chủ (cài đặt nhóm home_layout).
import { HOME_SECTIONS } from '../config/settings-schema.js';

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

const TONES = {
  light: '--c-text:#fff;--c-muted:rgba(255,255,255,.74);--c-border:rgba(255,255,255,.24);--c-surface:rgba(255,255,255,.1);color:#fff;',
  dark: '--c-text:#1d2b36;--c-muted:#52636e;--c-border:rgba(29,43,54,.14);--c-surface:rgba(255,255,255,.72);color:#1d2b36;',
};

// Trả về danh sách khối đang bật theo đúng thứ tự admin đã sắp.
// Khối mới thêm vào code về sau (chưa có trong dữ liệu đã lưu) được nối vào cuối.
export function homeSections(layout) {
  const saved = Array.isArray(layout?.sections) ? layout.sections : [];
  const known = new Set(HOME_SECTIONS.map((x) => x.key));
  const seen = new Set();
  const ordered = [];
  for (const item of saved) {
    if (known.has(item?.key) && !seen.has(item.key)) { seen.add(item.key); ordered.push(item); }
  }
  for (const def of HOME_SECTIONS) if (!seen.has(def.key)) ordered.push({ key: def.key, enabled: true, bg_mode: 'none' });

  const out = [];
  for (const item of ordered) {
    if (item.enabled === false) continue;
    const meta = HOME_SECTIONS.find((x) => x.key === item.key);
    const mode = meta.bg ? item.bg_mode : 'none';
    const sec = { key: item.key, hasBg: false, style: '', pattern: '' };
    if (mode === 'color' || mode === 'pattern' || (mode === 'image' && item.bg_image?.lg)) {
      const bg = hex(item.bg_color, '#f1ece1');
      let style = '';
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
          sec.pattern = `pat-${item.bg_pattern}`;
          style += `--pat-color:${hex(item.bg_pattern_color, '#2e6b94')};--pat-strength:${clamp(item.bg_pattern_strength, 5, 60, 18)}%;`;
        }
      }
      if (item.text_tone === 'light' || item.text_tone === 'dark') tone = item.text_tone;
      sec.hasBg = true;
      sec.style = style + TONES[tone];
    }
    out.push(sec);
  }
  out.forEach((sec, i) => { sec.afterBanner = out[i - 1]?.key === 'banner'; });
  return out;
}
