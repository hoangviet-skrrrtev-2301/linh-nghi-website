// Chạy TRƯỚC khi lib/db.js được nạp (db.js mở database ngay khi nạp): đặt gói nội dung vào /tmp nếu chưa có database.
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config/index.js';
import { importPack } from './lib/content-pack.js';

// Font đã tải sẵn lúc build (vercel-fonts/): chép vào ổ đĩa tạm để dùng như máy chủ thật (preload, không chặn hiển thị)
const bundled = path.join(process.env.LN_ROOT || '.', 'vercel-fonts');
if (fs.existsSync(bundled) && !fs.existsSync(config.paths.fonts)) fs.cpSync(bundled, config.paths.fonts, { recursive: true });

if (!fs.existsSync(config.paths.database)) {
  const r = await importPack({ force: true });
  if (!r.ok) console.error('[vercel] Không nạp được gói nội dung:', r.reason);
}
