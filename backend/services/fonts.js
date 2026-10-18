// Tự lưu font Google trên máy chủ (nhanh hơn, không phụ thuộc fonts.googleapis.com, không chặn hiển thị vì kết nối ngoài).
// Font nào shop chọn ở Admin › Cài đặt › Giao diện sẽ được tải về database/data/fonts một lần, rồi phục vụ ở /fonts/...
// Chưa tải xong (hoặc máy chủ không ra được internet) thì trang tạm dùng link Google như trước, không bao giờ làm hỏng trang.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config/index.js';

const DIR = config.paths.fonts;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const SUBSETS = new Set(['vietnamese', 'latin', 'latin-ext']);
const WEIGHTS = '0,300;0,400;0,500;0,600;0,700;1,400';
const slug = (f) => String(f).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const manifestPath = (f) => path.join(DIR, slug(f), 'manifest.json');

const inflight = new Map();
const retryAfter = new Map();

export const googleFontsUrl = (families) => {
  const q = [...new Set(families)].map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:ital,wght@${WEIGHTS}`);
  return `https://fonts.googleapis.com/css2?${q.join('&')}&display=swap`;
};

function readManifest(family) {
  try { return JSON.parse(fs.readFileSync(manifestPath(family), 'utf8')); } catch { return null; }
}

async function download(family) {
  const dir = path.join(DIR, slug(family));
  fs.mkdirSync(dir, { recursive: true });
  const res = await fetch(googleFontsUrl([family]), { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Google Fonts trả ${res.status} cho "${family}"`);
  const text = await res.text();
  const blocks = [...text.matchAll(/\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)];
  if (!blocks.length) throw new Error(`Không đọc được CSS font "${family}"`);
  const files = new Map(); // url Google → tên file local
  const faces = [];
  for (const [, subset, body] of blocks) {
    if (!SUBSETS.has(subset)) continue;
    const url = body.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/)?.[1];
    if (!url) continue;
    if (!files.has(url)) {
      const name = `${slug(family)}-${crypto.createHash('sha1').update(url).digest('hex').slice(0, 10)}.woff2`;
      const fr = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30000) });
      if (!fr.ok) throw new Error(`Tải ${url} lỗi ${fr.status}`);
      fs.writeFileSync(path.join(dir, name), Buffer.from(await fr.arrayBuffer()));
      files.set(url, name);
    }
    const style = body.match(/font-style:\s*([a-z]+)/)?.[1] || 'normal';
    const weight = body.match(/font-weight:\s*([\d ]+)/)?.[1].trim() || '400';
    const range = body.match(/unicode-range:\s*([^;]+);/)?.[1] || '';
    faces.push({ subset, style, weight, file: files.get(url), range });
  }
  const css = faces.map((f) => `/* ${f.subset} */\n@font-face{font-family:'${family}';font-style:${f.style};font-weight:${f.weight};font-display:swap;`
    + `src:url(/fonts/${slug(family)}/${f.file}) format('woff2');${f.range ? `unicode-range:${f.range};` : ''}}`).join('\n');
  const version = crypto.createHash('sha1').update(css).digest('hex').slice(0, 8);
  const cssName = `${slug(family)}.${version}.css`;
  fs.writeFileSync(path.join(dir, cssName), css);
  fs.writeFileSync(manifestPath(family), JSON.stringify({ family, css: cssName, faces: faces.map(({ subset, style, weight, file }) => ({ subset, style, weight, file })), version }));
}

// Tải (nếu chưa có) font của các họ chữ đang dùng; chạy nền, gọi lại nhiều lần vẫn an toàn.
export function ensureFonts(families) {
  for (const family of new Set(families.filter(Boolean))) {
    if (readManifest(family) || inflight.has(family) || (retryAfter.get(family) || 0) > Date.now()) continue;
    const job = download(family)
      .then(() => console.log(`[fonts] Đã lưu font "${family}" trên máy chủ`))
      .catch((err) => { retryAfter.set(family, Date.now() + 10 * 60 * 1000); console.warn(`[fonts] ${err.message}. Tạm dùng Google Fonts, 10 phút sau thử lại`); })
      .finally(() => inflight.delete(family));
    inflight.set(family, job);
  }
}

// Link CSS + font cần preload cho giao diện hiện tại. local = true khi mọi font đã có trên máy chủ.
export function fontLinks(theme) {
  const families = [...new Set([theme.font_heading, theme.font_body].filter(Boolean))];
  const manifests = families.map(readManifest);
  if (manifests.every(Boolean)) {
    const preload = [];
    const add = (m, weight) => {
      for (const subset of ['latin', 'vietnamese']) {
        const face = m.faces.find((f) => f.style === 'normal' && f.subset === subset && (f.weight === String(weight) || f.weight.includes(' ')));
        if (face) preload.push(`/fonts/${slug(m.family)}/${face.file}`);
      }
    };
    add(manifests[manifests.length - 1], 400); // font nội dung
    if (manifests.length > 1) add(manifests[0], 500); // font tiêu đề
    return { local: true, css: manifests.map((m) => `/fonts/${slug(m.family)}/${m.css}`), preload: [...new Set(preload)], google: null };
  }
  ensureFonts(families);
  return { local: false, css: [], preload: [], google: googleFontsUrl(families) };
}
