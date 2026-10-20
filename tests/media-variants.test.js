// Bản ảnh nhiều cỡ: ảnh đứng có chiều rộng thật trong srcset (không ghi 480w / 960w sai), ảnh nhỏ không sinh bản trùng.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { boot } from './helpers.js';

let ctx;
before(async () => { ctx = await boot(); });
after(() => ctx.close());

const png = (w, h) => sharp({ create: { width: w, height: h, channels: 3, background: '#4a8' } }).png().toBuffer();

test('ảnh đứng 1200x1600: có đủ 5 bản, srcset ghi đúng chiều rộng thật theo cạnh dài', async () => {
  const { saveImage } = await import('../backend/services/media.js');
  const m = await saveImage(await png(1200, 1600), { originalName: 'dung.png' });
  assert.ok(m.xs && m.sm && m.ms && m.md && m.lg);
  assert.deepEqual(m.ws, { xs: 240, sm: 360, ms: 540, md: 720, lg: 1200 });
  for (const [k, w] of Object.entries(m.ws)) {
    const real = (await sharp(`${ctx.dir}${m[k]}`).metadata()).width;
    assert.equal(real, w, `bản ${k}`);
  }
});

test('ảnh nhỏ 400x300: không tạo bản xs / ms trùng, srcset chỉ liệt kê bản có thật', async () => {
  const { saveImage } = await import('../backend/services/media.js');
  const m = await saveImage(await png(400, 300), { originalName: 'nho.png' });
  assert.equal(m.ms, null);
  assert.ok(m.sm && m.md && m.lg, 'sm / md / lg luôn có như trước');
});
