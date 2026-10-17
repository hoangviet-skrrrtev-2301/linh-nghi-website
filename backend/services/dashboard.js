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

// Nhóm cột biểu đồ: theo ngày (≤ 45 ngày), theo tuần (≤ 210 ngày), còn lại theo tháng
function bucketer(days) {
  if (days <= 45) {
    return { unit: 'day', key: (d) => d, label: (k) => dm(k), title: (k) => dmy(k) };
  }
  if (days <= 210) {
    const monday = (d) => { const dt = parse(d); return addDays(d, -((dt.getUTCDay() + 6) % 7)); };
    return { unit: 'week', key: monday, label: (k) => dm(k), title: (k) => `Tuần ${dm(k)} – ${dm(addDays(k, 6))}` };
  }
  return { unit: 'month', key: (d) => d.slice(0, 7), label: (k) => `${k.slice(5)}/${k.slice(2, 4)}`, title: (k) => `Tháng ${Number(k.slice(5))}/${k.slice(0, 4)}` };
}

const D = (col) => `date(${col}, '+7 hours')`;

function totalsFor(from, to) {
  const byType = Object.fromEntries(db.prepare(`SELECT type, COUNT(*) AS n FROM inquiries WHERE ${D('created_at')} BETWEEN ? AND ? GROUP BY type`).all(from, to).map((r) => [r.type, r.n]));
  const done = db.prepare(`SELECT COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS n FROM inquiries
    WHERE type = 'order' AND status = 'completed' AND ${D('completed_at')} BETWEEN ? AND ?`).get(from, to);
  const customers = db.prepare(`SELECT COUNT(*) FROM customers WHERE ${D('created_at')} BETWEEN ? AND ?`).pluck().get(from, to);
  return {
    orders: byType.order || 0, custom: byType.custom || 0, contact: byType.contact || 0, customers,
    revenue: done.revenue, completed: done.n, aov: done.n ? Math.round(done.revenue / done.n) : 0,
  };
}

export function dashboardStats({ range, from, to } = {}) {
  const r = resolveRange(range, from, to);
  const prevTo = addDays(r.from, -1);
  const prevFrom = addDays(prevTo, -(r.days - 1));
  const totals = totalsFor(r.from, r.to);
  const prev = totalsFor(prevFrom, prevTo);

  // Biểu đồ: số yêu cầu theo loại và doanh thu (ngày hoàn thành) theo từng cột
  const b = bucketer(r.days);
  const buckets = new Map();
  const first = b.key(r.from);
  for (let d = r.from; d <= r.to; d = addDays(d, 1)) {
    const k = b.key(d);
    if (!buckets.has(k)) buckets.set(k, { key: k, label: b.label(k), title: b.title(k), order: 0, custom: 0, contact: 0, revenue: 0 });
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
    range: { ...r, label: RANGES[r.key], text: `${dmy(r.from)} – ${dmy(r.to)}`, prevText: `${dmy(prevFrom)} – ${dmy(prevTo)}` },
    totals, prev, pending,
    series: { unit: b.unit, first, buckets: [...buckets.values()] },
    statusBreakdown, topProducts, sources,
  };
}
