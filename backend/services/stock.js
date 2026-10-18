// Quản lý kho (tùy chọn): chỉ sản phẩm được tick "Theo dõi kho" và chỉ khi bật ở Cài đặt › Bật/tắt tính năng.
// Đơn hàng "chiếm kho" từ trạng thái được chọn (mặc định Đã xác nhận); lùi trạng thái, hủy, sửa dòng hàng hoặc xóa đơn thì hoàn kho.
// Số lượng đã trừ của từng đơn lưu ở inquiries.stock_applied nên đồng bộ lại bao nhiêu lần cũng không bị trừ đôi.
import { db, tx } from '../lib/db.js';
import { safeJson } from '../lib/utils.js';
import { getRaw } from './settings.js';

export const inventoryOn = () => !!getRaw('features').inventory_enabled;

const STAGE = { new: 0, contacted: 1, confirmed: 2, shipping: 3, completed: 4 };

function wantsApplied(inq) {
  if (inq.type !== 'order' || inq.status === 'cancelled') return false;
  const at = getRaw('features').inventory_deduct_at || 'confirmed';
  return (STAGE[inq.status] ?? 0) >= (STAGE[at] ?? STAGE.confirmed);
}

export function logStock(productId, delta, qtyAfter, reason, { inquiryId = null, userId = null } = {}) {
  db.prepare('INSERT INTO stock_log (product_id, delta, qty_after, reason, inquiry_id, user_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(productId, delta, qtyAfter, String(reason).slice(0, 200), inquiryId, userId);
}

// Đưa kho của đơn về đúng trạng thái hiện tại của đơn. Gọi sau mỗi thay đổi đơn (tạo, đổi trạng thái, sửa dòng hàng, lên đơn).
// remove = true: đơn sắp bị xóa nên hoàn toàn bộ.
export function syncInquiryStock(id, { userId = null, remove = false } = {}) {
  if (!inventoryOn()) return;
  const inq = db.prepare('SELECT id, code, type, status, items, stock_applied FROM inquiries WHERE id = ?').get(id);
  if (!inq) return;
  const applied = new Map(safeJson(inq.stock_applied, []).map((a) => [Number(a.id), Number(a.qty)]));
  const desired = new Map();
  if (!remove && wantsApplied(inq)) {
    for (const it of safeJson(inq.items, [])) {
      const pid = Number(it.id);
      if (!pid) continue;
      desired.set(pid, (desired.get(pid) || 0) + (Number(it.qty) || 0));
    }
    // Chỉ sản phẩm đang được theo dõi kho
    for (const pid of [...desired.keys()]) {
      if (!db.prepare('SELECT track_stock FROM products WHERE id = ?').pluck().get(pid)) desired.delete(pid);
    }
  }
  const ids = new Set([...applied.keys(), ...desired.keys()]);
  const upd = db.prepare('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?');
  const read = db.prepare('SELECT stock_qty FROM products WHERE id = ?').pluck();
  tx(() => {
    for (const pid of ids) {
      const delta = (applied.get(pid) || 0) - (desired.get(pid) || 0); // dương = hoàn kho
      if (!delta) continue;
      if (upd.run(delta, pid).changes) {
        logStock(pid, delta, read.get(pid), delta > 0 ? `Hoàn kho đơn ${inq.code}` : `Trừ kho đơn ${inq.code}`, { inquiryId: inq.id, userId });
      }
    }
    const next = desired.size ? JSON.stringify([...desired].map(([pid, qty]) => ({ id: pid, qty }))) : '';
    if (next !== (inq.stock_applied || '')) db.prepare('UPDATE inquiries SET stock_applied = ? WHERE id = ?').run(next, id);
  });
}

// Sửa số lượng tồn tay (trong form sản phẩm hoặc nhập kho nhanh). Ghi nhật ký chênh lệch.
export function setStockQty(productId, qty, { reason = 'Sửa tay', userId = null } = {}) {
  const row = db.prepare('SELECT stock_qty FROM products WHERE id = ?').get(productId);
  if (!row) return;
  const next = Math.max(-1e6, Math.min(1e6, Math.round(Number(qty) || 0)));
  if (next === row.stock_qty) return;
  db.prepare('UPDATE products SET stock_qty = ? WHERE id = ?').run(next, productId);
  logStock(productId, next - row.stock_qty, next, reason, { userId });
}

export function stockHistory(productId, limit = 30) {
  return db.prepare(`SELECT l.*, i.code AS inquiry_code FROM stock_log l LEFT JOIN inquiries i ON i.id = l.inquiry_id
    WHERE l.product_id = ? ORDER BY l.id DESC LIMIT ?`).all(productId, limit);
}
