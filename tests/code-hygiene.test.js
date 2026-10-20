// Vệ sinh mã nguồn: JS đã minify phải khớp với nguồn (quên chạy npm run build:js thì báo lỗi), và không để hàm xuất ra mà không ai dùng.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAll } from '../backend/scripts/build-js.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir, exts, out = []) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) { if (!['node_modules', 'public', 'vendor'].includes(e.name)) walk(rel, exts, out); } else if (exts.some((x) => e.name.endsWith(x))) out.push(rel);
  }
  return out;
}

test('JS đã minify (frontend/public/js, admin/public/js) khớp với nguồn (frontend/src/js, admin/src/js)', async () => {
  const built = await buildAll();
  for (const [out, code] of Object.entries(built)) {
    const have = fs.readFileSync(path.join(ROOT, out), 'utf8');
    assert.ok(have === code, `${out} đã cũ so với nguồn: chạy npm run build:js rồi commit tệp mới`);
  }
});

test('không có hàm / hằng xuất ra (export) ở backend mà không nơi nào dùng', () => {
  // Cố ý giữ dù chưa ai gọi: thêm tên vào đây kèm lý do
  const ALLOW = new Set([]);
  const files = walk('backend', ['.js']);
  const corpus = [...files, ...walk('tests', ['.js']), ...walk('admin', ['.js', '.njk']), ...walk('frontend', ['.js', '.njk']), ...walk('api', ['.js'])]
    .map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  const unused = [];
  for (const f of files) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of src.matchAll(/^export (?:async )?(?:function\*? |const |let |class )([A-Za-z0-9_$]+)/gm)) {
      const name = m[1];
      if (ALLOW.has(name)) continue;
      const count = (corpus.match(new RegExp(`(?<![A-Za-z0-9_$])${name.replace(/\$/g, '\\$')}(?![A-Za-z0-9_$])`, 'g')) || []).length;
      if (count <= 1) unused.push(`${name} (${f})`);
    }
  }
  assert.deepEqual(unused, [], 'hàm xuất ra nhưng không ai dùng (xóa, hoặc thêm vào ALLOW kèm lý do): ' + unused.join(', '));
});
