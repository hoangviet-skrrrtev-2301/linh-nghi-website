// npm run media:variants — bổ sung bản ảnh nhỏ (xs 320, ms 720) cho ảnh đã tải lên trước đây, tạo từ bản lớn (lg).
// An toàn khi chạy lại: chỉ tạo bản còn thiếu, không đụng ảnh sẵn có. Nên npm run backup trước.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { db } from '../lib/db.js';
import { config } from '../config/index.js';
import { safeJson } from '../lib/utils.js';
import { SIZES } from '../services/media.js';

const QUALITY = { xs: 76, ms: 82 };
const rows = db.prepare('SELECT id, width, height, variants FROM media').all();
let made = 0;
let touched = 0;
for (const row of rows) {
  const v = safeJson(row.variants, {});
  const src = v.lg && path.join(config.paths.uploads, v.lg);
  if (!src || !fs.existsSync(src)) continue;
  let changed = false;
  for (const key of ['xs', 'ms']) {
    if (v[key] || Math.max(row.width, row.height) <= SIZES[key]) continue;
    const rel = v.lg.replace(/-lg\.webp$/, `-${key}.webp`);
    await sharp(src).resize({ width: SIZES[key], height: SIZES[key], fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY[key], effort: 4 }).toFile(path.join(config.paths.uploads, rel));
    v[key] = rel;
    changed = true;
    made++;
  }
  if (changed) { db.prepare('UPDATE media SET variants = ? WHERE id = ?').run(JSON.stringify(v), row.id); touched++; }
}
console.log(`Đã tạo ${made} bản ảnh nhỏ cho ${touched} / ${rows.length} ảnh.`);
