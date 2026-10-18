// Chạy TRƯỚC khi lib/db.js được nạp (db.js mở database ngay khi nạp): đặt gói nội dung vào /tmp nếu chưa có database.
import fs from 'node:fs';
import { config } from './config/index.js';
import { importPack } from './lib/content-pack.js';

if (!fs.existsSync(config.paths.database)) {
  const r = await importPack({ force: true });
  if (!r.ok) console.error('[vercel] Không nạp được gói nội dung:', r.reason);
}
