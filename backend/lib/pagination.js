// Phân trang: dãy số trang rút gọn (1 … 4 5 6 … 20) và tạo đường dẫn giữ nguyên bộ lọc.

export function pageWindow(current, total, around = 1) {
  const keep = new Set([1, total]);
  for (let i = current - around; i <= current + around; i++) if (i >= 1 && i <= total) keep.add(i);
  const out = [];
  let last = 0;
  for (const n of [...keep].sort((a, b) => a - b)) {
    if (n - last > 1) out.push(n - last === 2 ? last + 1 : '…');
    out.push(n);
    last = n;
  }
  return out;
}

// Trả về hàm n => đường dẫn trang n. Trang 1 không kèm ?trang= để không bị trùng nội dung.
export function pageUrlBuilder(path, query = {}, param = 'trang') {
  return (n) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (k === param || v === '' || v == null) continue;
      for (const item of [].concat(v)) sp.append(k, String(item));
    }
    if (n > 1) sp.set(param, String(n));
    const qs = sp.toString();
    return qs ? `${path}?${qs}` : path;
  };
}
