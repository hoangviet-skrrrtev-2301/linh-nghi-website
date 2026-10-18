// Công cụ dùng chung cho bộ kiểm thử (npm test): dựng website thật trong thư mục tạm (database, ảnh, sao lưu riêng),
// không bao giờ đụng tới dữ liệu thật của shop. Mỗi file kiểm thử chạy trong một tiến trình riêng nên có cấu hình riêng.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO_PACK = path.join(ROOT, 'database/content-pack');
export const OWNER = { email: 'chu@kiemthu.test', password: 'MatKhauChu12345' };
export const STAFF = { email: 'nv@kiemthu.test', password: 'MatKhauNV12345' };

// content = true: nạp "gói nội dung" của dự án (23 sản phẩm, ảnh, bài viết...) để kiểm thử trên dữ liệu giống thật
export async function boot({ content = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ln-test-'));
  process.env.LN_DATA_DIR = dir;
  process.env.LN_NO_FONTS = '1';
  process.env.LN_PACK_DIR = content ? REPO_PACK : path.join(dir, 'pack');
  delete process.env.NODE_ENV;

  if (content) {
    const { importPack } = await import('../backend/lib/content-pack.js');
    const r = await importPack({ force: true });
    if (!r.ok) throw new Error('Không nạp được gói nội dung (' + r.reason + ')');
  }
  const { db, migrate } = await import('../backend/lib/db.js');
  migrate({ log: () => {} });
  const users = await import('../backend/services/users.js');
  await users.createUser({ ...OWNER, name: 'Chủ shop thử', role: 'owner' });
  await users.createUser({ ...STAFF, name: 'Nhân viên thử', role: 'staff' });
  const settings = await import('../backend/services/settings.js');
  const { createApp } = await import('../backend/app.js');
  const server = await new Promise((resolve) => { const s = createApp().listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;

  const ctx = {
    base, dir, db, settings, users,
    raw: (p, o = {}) => fetch(base + p, { redirect: 'manual', ...o }),
    // Đặt một nhóm cài đặt (gộp vào giá trị hiện có)
    setSettings(key, patch) { settings.saveGroup(key, { ...settings.getForAdmin(key), ...patch }); },
    session() { return makeSession(base); },
    async close() {
      await new Promise((r) => server.close(r));
      db.close();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
  return ctx;
}

// Phiên đăng nhập quản trị (cookie + CSRF) và gọi API admin
function makeSession(base) {
  let cookie = '';
  let csrf = '';
  const keep = (r) => {
    for (const c of r.headers.getSetCookie?.() || []) {
      const k = c.split(';')[0].split('=')[0];
      cookie = cookie.split('; ').filter((x) => x && !x.startsWith(k + '=')).concat(c.split(';')[0]).join('; ');
    }
  };
  const get = async (p, o = {}) => {
    const r = await fetch(base + p, { redirect: 'manual', ...o, headers: { cookie, ...(o.headers || {}) } });
    keep(r);
    return r;
  };
  return {
    get,
    csrf: () => csrf,
    async login({ email, password }) {
      const page = await (await get('/admin/login')).text();
      const c0 = page.match(/name="_csrf" value="([^"]+)"/)?.[1];
      const r = await get('/admin/login', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ _csrf: c0, email, password }) });
      const acc = await (await get('/admin/account')).text();
      csrf = acc.match(/csrf[^>]*content="([^"]+)"/i)?.[1] || c0;
      return r;
    },
    async api(p, method = 'GET', body, headers = {}) {
      const r = await get('/admin/api' + p, { method, headers: { 'content-type': 'application/json', 'x-csrf-token': csrf, ...headers }, body: body ? JSON.stringify(body) : undefined });
      let json = null;
      try { json = await r.json(); } catch { /* không phải JSON */ }
      return { status: r.status, json, headers: r.headers };
    },
  };
}

// Đọc các khối JSON-LD của một trang HTML
export function jsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
}
export const head = (html) => html.split('</head>')[0];
