// Đóng gói ứng dụng thành MỘT tệp (api/app.bundle.mjs) cho bản xem thử trên Vercel. Chạy bởi vercel.json › buildCommand.
// Lý do: runtime của Vercel không chạy được require() một module ESM (sanitize-html → htmlparser2), đóng gói sẵn thì hết lỗi này.
// Thư viện native (better-sqlite3, sharp) giữ ở ngoài, được cài bằng npm install như thường.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const banner = "import {createRequire as __cr} from 'module'; const require = __cr(import.meta.url);";
const args = [
  '--yes', 'esbuild@0.25.10', 'backend/vercel-entry.js', '--bundle', '--platform=node', '--format=esm', '--target=node22',
  '--outfile=api/app.bundle.mjs', '--external:better-sqlite3', '--external:sharp', '--external:chokidar', process.platform === "win32" ? `"--banner:js=${banner}"` : `--banner:js=${banner}`,
];
// Tải sẵn font vào vercel-fonts/ (bản xem thử không ghi bền được ổ đĩa nên không tự tải lúc chạy); lỗi thì bỏ qua, trang dùng Google Fonts
spawnSync(process.execPath, ['backend/scripts/vercel-fonts.js'], { cwd: ROOT, stdio: 'inherit' });
const r = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(r.status ?? 1);
