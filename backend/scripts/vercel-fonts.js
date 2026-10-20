// Bước build của bản xem thử Vercel: tải font Google đang dùng (theo gói nội dung) vào vercel-fonts/.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ln-vfonts-'));
process.env.LN_DATA_DIR = tmp;
process.env.LN_PACK_DIR = path.join(ROOT, 'database/content-pack');
delete process.env.LN_NO_FONTS;
try {
  const { importPack } = await import('../lib/content-pack.js');
  const r = await importPack({ force: true });
  if (!r.ok) throw new Error(r.reason);
  const { migrate } = await import('../lib/db.js');
  migrate({ log: () => {} });
  const { getPublicSettings } = await import('../services/settings.js');
  const { downloadFonts } = await import('../services/fonts.js');
  const t = getPublicSettings().theme;
  await downloadFonts([t.font_heading, t.font_body]);
  const out = path.join(ROOT, 'vercel-fonts');
  fs.rmSync(out, { recursive: true, force: true });
  fs.cpSync(path.join(tmp, 'fonts'), out, { recursive: true });
  console.log('[vercel-fonts] Đã tải font vào vercel-fonts/');
} catch (err) {
  console.warn('[vercel-fonts] Bỏ qua:', err.message);
}
process.exit(0);
