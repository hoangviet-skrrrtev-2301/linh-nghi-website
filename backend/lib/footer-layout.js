// Các cột chân trang đang bật, theo thứ tự admin đã sắp (cài đặt nhóm footer).
const KEYS = ['brand', 'nav', 'jade', 'links', 'contact', 'policies'];
const FR = { brand: '1.6fr', contact: '1.6fr', nav: '1fr', jade: '1fr', links: '1fr', policies: '1fr' };

// skip: mã cột không có nội dung để hiện (ví dụ chưa có trang chính sách nào) thì bỏ khỏi lưới để không chừa khoảng trống
export function footerColumns(footer, { skip = [] } = {}) {
  const saved = Array.isArray(footer?.columns) ? footer.columns : [];
  const seen = new Set();
  const ordered = [];
  for (const c of saved) if (KEYS.includes(c?.key) && !seen.has(c.key)) { seen.add(c.key); ordered.push(c); }
  for (const k of KEYS) if (!seen.has(k)) ordered.push({ key: k, enabled: k !== 'links', title: k === 'policies' ? 'Chính sách' : '' });
  const cols = ordered.filter((c) => c.enabled !== false && !skip.includes(c.key));
  return { cols, template: cols.map((c) => FR[c.key]).join(' ') };
}

// Chỉ nhận đường dẫn nội bộ hoặc http(s)
export function safeLinks(list) {
  return (list || []).filter((l) => l.label && /^(\/|https?:\/\/)/i.test(l.url || ''));
}
