// Các cột chân trang đang bật, theo thứ tự admin đã sắp (cài đặt nhóm footer).
const KEYS = ['brand', 'nav', 'jade', 'links', 'contact'];
const FR = { brand: '1.6fr', contact: '1.6fr', nav: '1fr', jade: '1fr', links: '1fr' };

export function footerColumns(footer) {
  const saved = Array.isArray(footer?.columns) ? footer.columns : [];
  const seen = new Set();
  const ordered = [];
  for (const c of saved) if (KEYS.includes(c?.key) && !seen.has(c.key)) { seen.add(c.key); ordered.push(c); }
  for (const k of KEYS) if (!seen.has(k)) ordered.push({ key: k, enabled: k !== 'links', title: '' });
  const cols = ordered.filter((c) => c.enabled !== false);
  return { cols, template: cols.map((c) => FR[c.key]).join(' ') };
}

// Chỉ nhận đường dẫn nội bộ hoặc http(s)
export function safeLinks(list) {
  return (list || []).filter((l) => l.label && /^(\/|https?:\/\/)/i.test(l.url || ''));
}
