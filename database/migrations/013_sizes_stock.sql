-- ==========================================================
-- 013: Lựa chọn kích cỡ theo loại sản phẩm + quản lý kho (tùy chọn).
-- - product_types: nhãn lựa chọn khi đặt hàng ("Ni tay", "Kích cỡ"...), đơn vị, gợi ý nhanh, cho khách nhập kích cỡ riêng,
--   và một ô thông tin thêm (ví dụ chiều cao / cân nặng) khách điền cho từng sản phẩm.
-- - products.track_stock / stock_qty: kho theo từng sản phẩm, chỉ có tác dụng khi bật "Quản lý kho" trong Cài đặt.
-- - inquiries.stock_applied: các dòng đã trừ kho của đơn (JSON) để hoàn kho đúng khi đổi trạng thái / sửa / xóa đơn.
-- - stock_log: nhật ký nhập / xuất kho.
-- ==========================================================
ALTER TABLE product_types ADD COLUMN size_label   TEXT NOT NULL DEFAULT 'Kích cỡ';
ALTER TABLE product_types ADD COLUMN size_unit    TEXT NOT NULL DEFAULT '';
ALTER TABLE product_types ADD COLUMN size_options TEXT NOT NULL DEFAULT '[]';
ALTER TABLE product_types ADD COLUMN size_free    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE product_types ADD COLUMN info_label   TEXT NOT NULL DEFAULT '';

UPDATE product_types SET size_label = 'Ni tay', size_unit = 'mm', size_free = 1 WHERE uses_jade_fields = 1;
UPDATE product_types SET size_options = '["S","M","L","XL"]', info_label = 'Chiều cao / cân nặng (để shop tư vấn size)'
  WHERE uses_jade_fields = 0 AND slug = 'phap-phuc';

ALTER TABLE products ADD COLUMN track_stock INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN stock_qty   INTEGER NOT NULL DEFAULT 0;

ALTER TABLE inquiries ADD COLUMN stock_applied TEXT NOT NULL DEFAULT '';

CREATE TABLE stock_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL,
  delta       INTEGER NOT NULL,
  qty_after   INTEGER NOT NULL,
  reason      TEXT NOT NULL DEFAULT '',
  inquiry_id  INTEGER,
  user_id     INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_stock_log_product ON stock_log(product_id, id DESC);
