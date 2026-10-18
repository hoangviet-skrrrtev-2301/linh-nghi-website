// Gói nội dung bàn giao: xuất ra không được lẫn tài khoản, khách, đơn, nhật ký, cấu hình email; nạp không ghi đè dữ liệu đang có.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { boot, REPO_PACK, OWNER } from './helpers.js';

let ctx;
let owner;
let pack;

const PRIVATE = ['sessions', 'audit_logs', 'not_found_log', 'stock_log', 'inquiries', 'customers', 'users'];
const countOf = (db, t) => db.prepare(`SELECT COUNT(*) FROM ${t}`).pluck().get();

before(async () => {
  ctx = await boot({ content: true });
  // gói của bài kiểm thử nằm trong thư mục tạm, không đụng gói thật trong git
  process.env.LN_PACK_DIR = path.join(ctx.dir, 'pack-out');
  pack = await import('../backend/lib/content-pack.js?out');
  owner = ctx.session();
  await owner.login(OWNER);
  // tạo dữ liệu riêng tư để chắc chắn công cụ xuất phải gỡ bỏ
  await owner.api('/inquiries', 'POST', { type: 'order', customer: { name: 'Khách bí mật', phone: '0900000001', email: 'bi-mat@khach.test' }, items: [{ name: 'x', qty: 1, price: 1000 }] });
  ctx.db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('mail', ?)").run(JSON.stringify({ enabled: true, user: 'shop@gmail.com', password: 'enc:bi-mat-smtp' }));
});
after(() => ctx.close());

test('trước khi xuất, database thử đúng là có dữ liệu riêng tư', () => {
  assert.ok(countOf(ctx.db, 'users') >= 2);
  assert.ok(countOf(ctx.db, 'customers') >= 1);
  assert.ok(countOf(ctx.db, 'inquiries') >= 1);
  assert.ok(countOf(ctx.db, 'sessions') >= 1);
});

test('xuất gói: các bảng riêng tư rỗng, không có cấu hình email, vẫn đủ nội dung', () => {
  const r = pack.exportPack();
  assert.ok(r.counts.products > 0 && r.counts.settings > 0);
  const db = new Database(path.join(ctx.dir, 'pack-out', 'content.sqlite'), { readonly: true });
  for (const t of PRIVATE) assert.equal(countOf(db, t), 0, `bảng ${t} phải rỗng`);
  assert.equal(db.prepare("SELECT COUNT(*) FROM settings WHERE key = 'mail'").pluck().get(), 0);
  db.close();
});

test('file gói không còn dấu vết dữ liệu riêng tư (kể cả trong trang trống của SQLite)', () => {
  const raw = fs.readFileSync(path.join(ctx.dir, 'pack-out', 'content.sqlite'));
  for (const secret of ['bi-mat@khach.test', '0900000001', 'Khách bí mật', 'bi-mat-smtp', OWNER.email, '$argon2', '$2b$']) {
    assert.equal(raw.includes(Buffer.from(secret)), false, `gói không được chứa "${secret}"`);
  }
});

test('database đang dùng không bị đụng tới khi xuất', () => {
  assert.ok(countOf(ctx.db, 'users') >= 2);
  assert.ok(countOf(ctx.db, 'inquiries') >= 1);
});

test('nạp gói vào database đã có dữ liệu bị từ chối nếu không có --force', async () => {
  const r = await pack.importPack();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'not-empty');
  assert.ok(countOf(ctx.db, 'users') >= 2, 'dữ liệu vẫn còn nguyên');
});

test('gói đang lưu trong git cũng sạch (đây là thứ được đưa lên GitHub)', () => {
  const db = new Database(path.join(REPO_PACK, 'content.sqlite'), { readonly: true });
  // Gói xuất từ trước khi có bảng mới thì chưa có bảng đó: bỏ qua bảng không tồn tại
  const has = (t) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(t);
  for (const t of PRIVATE.filter(has)) assert.equal(countOf(db, t), 0, `bảng ${t} trong gói git phải rỗng`);
  assert.equal(db.prepare("SELECT COUNT(*) FROM settings WHERE key = 'mail'").pluck().get(), 0);
  db.close();
  const raw = fs.readFileSync(path.join(REPO_PACK, 'content.sqlite'));
  assert.equal(raw.includes(Buffer.from('$argon2')), false);
  assert.equal(raw.includes(Buffer.from('$2b$')), false);
});
