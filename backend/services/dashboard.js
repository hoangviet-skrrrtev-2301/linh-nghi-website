// Số liệu trang Tổng quan admin theo khoảng thời gian. Mọi ngày tính theo giờ Việt Nam (UTC+7).
// Doanh thu = tổng tiền các đơn hàng ĐÃ HOÀN THÀNH, tính theo ngày hoàn thành (completed_at), không phải ngày đặt.
import { db } from '../lib/db.js';
import { HttpError } from '../lib/utils.js';

const DAY = 864e5;
const pad = (n) => String(n).padStart(2, '0');
const toStr = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const addDays = (s, n) => toStr(new Date(parse(s).getTime() + n * DAY));
const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / DAY);
const vnToday = () => toStr(new Date(Date.now() + 7 * 36e5));
const dm = (s) => `${s.slice(8)}/${s.slice(5, 7)}`;
const dmy = (s) => `${s.slice(8)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;

export const RANGES = {
  '7d': 'Trong 7 ngày', '30d': 'Trong 30 ngày', month: 'Tháng này', last_month: 'Tháng trước',
  quarter: 'Quý này', year: 'Năm nay', custom: 'Tùy chọn',
};

// Đổi lựa chọn kỳ thành { key, from, to, days } (from, to là ngày YYYY-MM-DD giờ Việt Nam)
export function resolveRange(key = '30d', fromIn, toIn) {
  const today = vnToday();
  const t = parse(today);
  let from;
  let to = today;
  if (key === '7d') from = addDays(today, -6);
  else if (key === 'month') from = toStr(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1)));
  else if (key === 'last_month') {
    from = toStr(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - 1, 1)));
    to = toStr(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 0)));
  } else if (key === 'quarter') from = toStr(new Date(Date.UTC(t.getUTCFullYear(), Math.floor(t.getUTCMonth() / 3) * 3, 1)));
  else if (key === 'year') from = `${t.getUTCFullYear()}-01-01`;
  else if (key === 'custom') {
    const ok = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !Number.isNaN(parse(s).getTime());
    if (!ok(fromIn) || !ok(toIn)) throw new HttpError(422, 'Vui lòng chọn ngày bắt đầu và ngày kết thúc');
    from = fromIn; to = toIn;
    if (from > to) [from, to] = [to, from];
    if (diffDays(from, to) > 730) throw new HttpError(422, 'Chọn tối đa 2 năm mỗi lần xem');
  } else { key = '30d'; from = addDays(today, -29); }
  return { key, from, to, days: diffDays(from, to) + 1 };
}

// Nhóm cột biểu đồ: theo ngày (≤ 45 ngày, "tháng này" luôn bắt đầu từ ngày 1), theo tuần (≤ 150 ngày), còn lại theo tháng.
// Mỗi cột có start / end bị cắt theo kỳ đang xem, nên cột đầu và cột cuối không lấn ra ngoài kỳ
// (tuần đầu của 1/10 – 31/10 hiện "01/10", không phải thứ Hai 28/09).
function bucketer(days, from, to, crossYear) {
  const clip = (s, e) => [s < from ? from : s, e > to ? to : e];
  if (days <= 45) {
    return {
      unit: 'day', key: (d) => d, span: (k) => [k, k],
      label: (k) => dm(k), title: (k) => dmy(k),
    };
  }
  if (days <= 150) {
    const monday = (d) => { const dt = parse(d); return addDays(d, -((dt.getUTCDay() + 6) % 7)); };
    const span = (k) => clip(k, addDays(k, 6));
    return {
      unit: 'week', key: monday, span,
      label: (k) => dm(span(k)[0]),
      title: (k) => { const [s, e] = span(k); return s === e ? dmy(s) : `Tuần ${dm(s)} – ${dmy(e)}`; },
    };
  }
  const monthEnd = (k) => toStr(new Date(Date.UTC(Number(k.slice(0, 4)), Number(k.slice(5, 7)), 0)));
  const span = (k) => clip(`${k}-01`, monthEnd(k));
  return {
    unit: 'month', key: (d) => d.slice(0, 7), span,
    // "T10" khi kỳ nằm trong một năm, "T10/26" khi kéo dài qua nhiều năm (tránh đọc nhầm "10/26" thành ngày 26/10)
    label: (k) => (crossYear ? `T${Number(k.slice(5))}/${k.slice(2, 4)}` : `T${Number(k.slice(5))}`),
    title: (k) => {
      const [s, e] = span(k);
      const partial = s !== `${k}-01` || e !== monthEnd(k);
      return `Tháng ${Number(k.slice(5))}/${k.slice(0, 4)}${partial ? ` (${dm(s)} – ${dm(e)})` : ''}`;
    },
  };
}

const D = (col) => `date(${col}, '+7 hours')`;

function totalsFor(from, to) {
  const byType = Object.fromEntries(db.prepare(`SELECT type, COUNT(*) AS n FROM inquiries WHERE ${D('created_at')} BETWEEN ? AND ? GROUP BY type`).all(from, to).map((r) => [r.type, r.n]));
  const done = db.prepare(`SELECT COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS n FROM inquiries
    WHERE type = 'order' AND status = 'completed' AND ${D('completed_at')} BETWEEN ? AND ?`).get(from, to);
  const customers = db.prepare(`SELECT COUNT(*) FROM customers WHERE ${D('created_at')} BETWEEN ? AND ?`).pluck().get(from, to);
  // Đơn có nguồn gốc là custom / liên hệ (đã "lên đơn"), và đơn shop tự thêm từ ngoài website
  const fromRequest = db.prepare(`SELECT COUNT(*) FROM inquiries WHERE type = 'order' AND (origin_type != '' OR parent_id IS NOT NULL)
    AND ${D('created_at')} BETWEEN ? AND ?`).pluck().get(from, to);
  const manual = db.prepare(`SELECT COUNT(*) FROM inquiries WHERE type = 'order' AND channel = 'admin' AND origin_type = '' AND parent_id IS NULL
    AND ${D('created_at')} BETWEEN ? AND ?`).pluck().get(from, to);
  return {
    orders: byType.order || 0, custom: byType.custom || 0, contact: byType.contact || 0, customers, fromRequest, manual,
    revenue: done.revenue, completed: done.n, aov: done.n ? Math.round(done.revenue / done.n) : 0,
  };
}

export const COMPARE_MODES = { prev: 'Kỳ liền trước', year: 'Cùng kỳ năm trước', custom: 'Tùy chọn' };

// Kỳ so sánh: tắt (mặc định) | prev = kỳ liền trước cùng số ngày | year = cùng ngày tháng năm trước | custom = tự chọn
function resolveCompare(r, mode, cfrom, cto) {
  if (!COMPARE_MODES[mode]) return null;
  let from; let to;
  if (mode === 'prev') {
    to = addDays(r.from, -1); from = addDays(to, -(r.days - 1));
  } else if (mode === 'year') {
    const back = (s) => { const d = parse(s); const m = d.getUTCMonth(); d.setUTCFullYear(d.getUTCFullYear() - 1); if (d.getUTCMonth() !== m) d.setUTCDate(0); return toStr(d); };
    from = back(r.from); to = back(r.to);
  } else {
    const ok = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !Number.isNaN(parse(s).getTime());
    if (!ok(cfrom) || !ok(cto)) throw new HttpError(422, 'Vui lòng chọn ngày bắt đầu và ngày kết thúc của kỳ so sánh');
    from = cfrom; to = cto;
    if (from > to) [from, to] = [to, from];
    if (diffDays(from, to) > 730) throw new HttpError(422, 'Kỳ so sánh tối đa 2 năm');
  }
  return { mode, label: COMPARE_MODES[mode], from, to, days: diffDays(from, to) + 1, text: `${dmy(from)} – ${dmy(to)}` };
}

export function dashboardStats({ range, from, to, compare, cfrom, cto } = {}) {
  const r = resolveRange(range, from, to);
  const cmp = resolveCompare(r, compare, cfrom, cto);
  const totals = totalsFor(r.from, r.to);
  const prev = cmp ? totalsFor(cmp.from, cmp.to) : null;

  // Biểu đồ: số yêu cầu theo loại và doanh thu (ngày hoàn thành) theo từng cột
  const b = bucketer(r.days, r.from, r.to, r.from.slice(0, 4) !== r.to.slice(0, 4));
  const buckets = new Map();
  const first = b.key(r.from);
  for (let d = r.from; d <= r.to; d = addDays(d, 1)) {
    const k = b.key(d);
    if (!buckets.has(k)) {
      const [start, end] = b.span(k);
      buckets.set(k, { key: k, start, end, label: b.label(k), title: b.title(k), order: 0, custom: 0, contact: 0, revenue: 0 });
    }
  }
  for (const row of db.prepare(`SELECT ${D('created_at')} AS d, type, COUNT(*) AS n FROM inquiries WHERE ${D('created_at')} BETWEEN ? AND ? GROUP BY d, type`).all(r.from, r.to)) {
    const bk = buckets.get(b.key(row.d)); if (bk) bk[row.type] += row.n;
  }
  for (const row of db.prepare(`SELECT ${D('completed_at')} AS d, COALESCE(SUM(total), 0) AS rev FROM inquiries
      WHERE type = 'order' AND status = 'completed' AND ${D('completed_at')} BETWEEN ? AND ? GROUP BY d`).all(r.from, r.to)) {
    const bk = buckets.get(b.key(row.d)); if (bk) bk.revenue += row.rev;
  }

  const statusBreakdown = db.prepare(`SELECT status, COUNT(*) AS n FROM inquiries WHERE type = 'order' AND ${D('created_at')} BETWEEN ? AND ? GROUP BY status`).all(r.from, r.to);
  const topProducts = db.prepare(`SELECT json_extract(j.value, '$.name') AS product, SUM(COALESCE(json_extract(j.value, '$.qty'), 1)) AS qty,
      SUM(COALESCE(json_extract(j.value, '$.price'), 0) * COALESCE(json_extract(j.value, '$.qty'), 1)) AS amount
    FROM inquiries i, json_each(i.items) j
    WHERE i.type = 'order' AND i.status != 'cancelled' AND ${D('i.created_at')} BETWEEN ? AND ?
    GROUP BY product HAVING product IS NOT NULL ORDER BY qty DESC, amount DESC LIMIT 5`).all(r.from, r.to)
    .map((row) => ({ name: row.product, qty: row.qty, amount: row.amount }));
  const sources = db.prepare(`SELECT source, COUNT(*) AS n FROM customers
    WHERE ${D('created_at')} BETWEEN ? AND ? GROUP BY source ORDER BY n DESC LIMIT 6`).all(r.from, r.to)
    .map((row) => ({ name: row.source || 'Chưa ghi nguồn', n: row.n }));

  // Việc đang chờ xử lý (không phụ thuộc kỳ đang xem)
  const pending = {
    order: db.prepare(`SELECT COUNT(*) FROM inquiries WHERE type = 'order' AND status = 'new'`).pluck().get(),
    custom: db.prepare(`SELECT COUNT(*) FROM inquiries WHERE type = 'custom' AND status = 'new'`).pluck().get(),
    contact: db.prepare(`SELECT COUNT(*) FROM inquiries WHERE type = 'contact' AND status = 'new'`).pluck().get(),
    shipping: db.prepare(`SELECT COUNT(*) FROM inquiries WHERE type = 'order' AND status = 'shipping'`).pluck().get(),
  };

  return {
    range: { ...r, label: RANGES[r.key], text: `${dmy(r.from)} – ${dmy(r.to)}`, },
    compare: cmp,
    totals, prev, pending,
    series: { unit: b.unit, first, buckets: [...buckets.values()] },
    statusBreakdown, topProducts, sources,
  };
}
