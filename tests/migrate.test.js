// Migration: database đã có dữ liệu được chụp trước khi đổi cấu trúc; file lỗi dừng ngay, nói rõ file nào và không để lại gì.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const data = fs.mkdtempSync(path.join(os.tmpdir(), 'ln-mig-data-'));
const mig = fs.mkdtempSync(path.join(os.tmpdir(), 'ln-mig-sql-'));
process.env.LN_DATA_DIR = data;
delete process.env.NODE_ENV;
const { db, migrate, pendingMigrations } = await import('../backend/lib/db.js');
const snapshots = () => (fs.existsSync(path.join(data, 'pre-migrate')) ? fs.readdirSync(path.join(data, 'pre-migrate')) : []);
const write = (name, sql) => fs.writeFileSync(path.join(mig, name), sql);
const quiet = { log: () => {}, dir: mig };

after(() => { db.close(); fs.rmSync(data, { recursive: true, force: true }); fs.rmSync(mig, { recursive: true, force: true }); });

test('database mới: chạy hết migration, không cần chụp bản nào', () => {
  write('001_a.sql', 'CREATE TABLE a (id INTEGER PRIMARY KEY, v TEXT); INSERT INTO a (v) VALUES (\'giữ\');');
  assert.deepEqual(pendingMigrations({ dir: mig }), ['001_a.sql']);
  assert.equal(migrate(quiet), 1);
  assert.equal(snapshots().length, 0);
  assert.equal(migrate(quiet), 0, 'chạy lại không làm gì');
  assert.deepEqual(pendingMigrations({ dir: mig }), []);
});

test('database đã có dữ liệu: có migration mới thì tự chụp trước khi chạy', () => {
  write('002_b.sql', 'ALTER TABLE a ADD COLUMN w TEXT;');
  assert.equal(migrate(quiet), 1);
  assert.equal(snapshots().length, 1);
});

test('migration lỗi: báo đúng file, không lưu dở dang, các file trước vẫn giữ', () => {
  write('003_ok.sql', 'CREATE TABLE c (id INTEGER);');
  write('004_loi.sql', 'CREATE TABLE d (id INTEGER); SELECT * FROM bang_khong_ton_tai;');
  let err;
  try { migrate(quiet); } catch (e) { err = e; }
  assert.ok(err, 'phải ném lỗi');
  assert.equal(err.migration, '004_loi.sql');
  assert.match(err.message, /004_loi\.sql/);
  assert.match(err.message, /pre-migrate/, 'nêu nơi lưu bản chụp');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").pluck().all();
  assert.ok(tables.includes('c'), '003 đã chạy xong thì giữ lại');
  assert.ok(!tables.includes('d'), 'phần chạy dở của 004 bị hoàn tác');
  assert.deepEqual(pendingMigrations({ dir: mig }), ['004_loi.sql']);
  assert.equal(db.prepare('SELECT v FROM a').pluck().get(), 'giữ', 'dữ liệu cũ nguyên vẹn');
});

test('chỉ giữ 5 bản chụp gần nhất', () => {
  const root = path.join(data, 'pre-migrate');
  for (let i = 0; i < 7; i++) fs.writeFileSync(path.join(root, `2020-01-0${i + 1}-00-00-00.sqlite`), '');
  fs.rmSync(path.join(mig, '004_loi.sql'));
  write('005_e.sql', 'CREATE TABLE e (id INTEGER);');
  migrate(quiet);
  assert.equal(snapshots().length, 5);
});
