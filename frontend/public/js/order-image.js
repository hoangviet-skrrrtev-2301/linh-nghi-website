// Vẽ ảnh PNG "Thông tin đơn hàng" ngay trên trình duyệt của khách (không gửi gì lên máy chủ).
// Khách tải ảnh về để gửi cho shop và giữ lại mã đơn tra cứu sau này.
// Chữ trong ảnh lấy từ cài đặt (Admin › Biểu mẫu & đặt hàng) và thông tin shop, không fix cứng.

const W = 860;
const PAD = 48;
const SCALE = 2;

const vnd = (n) => new Intl.NumberFormat('vi-VN').format(n) + '₫';

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrap(ctx, text, maxWidth) {
  const lines = [];
  for (const para of String(text || '').split(/\r?\n/)) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth || !line) line = test;
      else { lines.push(line); line = word; }
    }
    lines.push(line);
  }
  return lines;
}

// Vẽ toàn bộ nội dung; trả về chiều cao cần dùng. measure = true thì chỉ đo, không vẽ.
function layout(ctx, d, measure) {
  const { theme, fonts } = d;
  let y = 0;
  const text = (str, x, size, { weight = 400, color = theme.ink, font = fonts.body, align = 'left', maxWidth } = {}) => {
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    if (!measure) ctx.fillText(str, x, y, maxWidth);
  };
  const block = (str, x, width, size, opts = {}, lineGap = 1.45) => {
    ctx.font = `${opts.weight || 400} ${size}px ${opts.font || fonts.body}`;
    const lines = wrap(ctx, str, width);
    lines.forEach((l) => { y += size * lineGap; text(l, x, size, opts); });
    return lines.length;
  };

  // --- Đầu ảnh ---
  const headH = 130;
  if (!measure) { ctx.fillStyle = theme.primary; ctx.fillRect(0, 0, W, headH); }
  if (d.logo) {
    const h = 70; const w = d.logo.width * (h / d.logo.height);
    if (!measure) ctx.drawImage(d.logo, PAD, (headH - h) / 2, w, h);
  } else {
    y = 74; text(d.shopName, PAD, 34, { weight: 600, color: theme.onPrimary, font: fonts.heading });
  }
  y = 60; text(d.title.toUpperCase(), W - PAD, 17, { weight: 600, color: theme.onPrimary, align: 'right' });
  y = 90; text(d.shopName, W - PAD, 15, { color: theme.onPrimary, align: 'right' });

  // --- Mã đơn ---
  y = headH + 60;
  text('MÃ ĐƠN HÀNG', PAD, 14, { weight: 600, color: theme.muted });
  y += 52; text(d.code, PAD, 46, { weight: 700, color: theme.primary, font: 'ui-monospace, Consolas, "Courier New", monospace' });
  y += 30; text(d.dateText, PAD, 15, { color: theme.muted });

  const rule = () => {
    y += 28;
    if (!measure) { ctx.strokeStyle = theme.line; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke(); ctx.setLineDash([]); }
  };
  rule();

  // --- Khách hàng ---
  const rows = [['Họ và tên', d.customer.name], ['Điện thoại', d.customer.phone], ['Địa chỉ', d.customer.address], ['Ghi chú', d.customer.message]]
    .filter((r) => r[1]);
  for (const [label, value] of rows) {
    ctx.font = `500 18px ${fonts.body}`;
    const lines = wrap(ctx, String(value).slice(0, 300), W - PAD * 2 - 150);
    lines.forEach((l, i) => {
      y += i === 0 ? 38 : 26;
      if (i === 0) text(label, PAD, 15, { color: theme.muted });
      text(l, PAD + 150, 18, { weight: 500 });
    });
  }
  rule();

  // --- Sản phẩm ---
  y += 36; text('SẢN PHẨM', PAD, 14, { weight: 600, color: theme.muted });
  for (const it of d.items) {
    const priceW = d.showPrices ? 190 : 0;
    ctx.font = `600 19px ${fonts.body}`;
    const lines = wrap(ctx, it.name, W - PAD * 2 - priceW - 16);
    const top = y;
    lines.forEach((l, i) => { y += i === 0 ? 38 : 26; text(l, PAD, 19, { weight: 600 }); });
    const sub = [it.size ? `${it.size_label || 'Ni'} ${it.size}` : '', it.note || '', `SL ${it.qty}`].filter(Boolean).join(' · ');
    y += 24; text(sub, PAD, 15, { color: theme.muted });
    if (d.showPrices) {
      const save = y; y = top + 38;
      text(it.price != null ? vnd(it.price * it.qty) : 'Liên hệ', W - PAD, 19, { weight: 600, align: 'right' });
      y = save;
    }
  }
  if (d.showPrices) {
    rule();
    y += 40;
    text('Tổng cộng', PAD, 19, { weight: 600 });
    text(d.total != null ? vnd(d.total) : 'Liên hệ', W - PAD, 28, { weight: 700, color: theme.primary, align: 'right', font: fonts.heading });
  }
  rule();

  // --- Ghi chú ---
  const noteLines = [d.note, d.trackText].filter(Boolean);
  const boxTop = y + 24;
  y = boxTop + 12;
  for (const n of noteLines) block(n, PAD + 20, W - PAD * 2 - 40, 16, { color: theme.ink }, 1.55);
  y += 24;
  if (!measure) { ctx.fillStyle = theme.soft; ctx.fillRect(PAD, boxTop, W - PAD * 2, y - boxTop); ctx.fillStyle = theme.accent; ctx.fillRect(PAD, boxTop, 5, y - boxTop); }
  if (!measure) {
    // vẽ lại chữ lên trên nền hộp ghi chú
    let yy = boxTop + 12;
    for (const n of noteLines) {
      ctx.font = `400 16px ${fonts.body}`;
      wrap(ctx, n, W - PAD * 2 - 40).forEach((l) => { yy += 16 * 1.55; ctx.fillStyle = theme.ink; ctx.textAlign = 'left'; ctx.fillText(l, PAD + 20, yy); });
    }
  }

  // --- Chân ảnh ---
  y += 44;
  const contact = [d.phone && `ĐT/Zalo: ${d.phone}`, d.site].filter(Boolean).join('   ·   ');
  text(contact || d.shopName, W / 2, 15, { color: theme.muted, align: 'center' });
  y += 36;
  return y;
}

// Màu chính ở chế độ tối thường rất sáng; ảnh nền trắng nên làm tối lại cho đủ tương phản
function ensureDark(color) {
  const probe = document.createElement('canvas').getContext('2d');
  probe.fillStyle = color;
  const hex = probe.fillStyle;
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return color;
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x, 16));
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum < 0.45) return color;
  const k = 0.45 / lum;
  return `rgb(${Math.round(r * k)}, ${Math.round(g * k)}, ${Math.round(b * k)})`;
}

export async function makeOrderImage(d) {
  const cs = getComputedStyle(document.documentElement);
  const v = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
  const fonts = { heading: v('--ff-heading', 'Georgia, serif'), body: v('--ff-body', 'system-ui, sans-serif') };
  try {
    await Promise.all([document.fonts.load(`600 20px ${fonts.body}`), document.fonts.load(`700 28px ${fonts.heading}`)]);
  } catch { /* dùng font dự phòng */ }
  const data = {
    ...d,
    fonts,
    logo: await loadImage(d.logoUrl),
    theme: {
      primary: ensureDark(v('--c-primary', '#2e6b94')), onPrimary: '#ffffff', accent: v('--c-accent', '#a98a50'),
      ink: '#1d2b36', muted: '#62737e', line: '#cfd8dc', soft: '#f3f6f7',
    },
  };
  // Ảnh luôn nền trắng, chữ tối để dễ đọc dù khách đang bật chế độ tối
  const probe = document.createElement('canvas').getContext('2d');
  const height = Math.ceil(layout(probe, data, true));
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, height);
  layout(ctx, data, false);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}
