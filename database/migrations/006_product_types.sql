-- ==========================================================
-- 006: Loại sản phẩm (nhóm hàng). Mỗi sản phẩm thuộc 1 loại; mỗi loại tự khai báo danh sách thông số.
-- - "Vòng tay ngọc" dùng bộ thuộc tính ngọc sẵn có (loại ngọc, màu, kiểu dáng, mệnh, ni, chứng chỉ...).
-- - Loại khác (ví dụ "Pháp phục") dùng thông số tự đặt, lưu ở products.attrs (JSON: mã thông số -> giá trị).
-- - Loại "active = 0" (chưa hoạt động): sản phẩm của loại đó không hiện ở bất kỳ đâu phía khách hàng.
-- Lưu ý SQLite: cột thêm bằng ALTER TABLE có REFERENCES thì mặc định phải là NULL, nên product_type_id không khai báo
-- khóa ngoại; ứng dụng tự kiểm tra loại hợp lệ và không cho xóa loại còn sản phẩm.
-- ==========================================================
CREATE TABLE product_types (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL UNIQUE,
  description      TEXT NOT NULL DEFAULT '',
  uses_jade_fields INTEGER NOT NULL DEFAULT 0,
  spec_fields      TEXT NOT NULL DEFAULT '[]',
  active           INTEGER NOT NULL DEFAULT 1,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Loại mặc định (id = 1): toàn bộ sản phẩm hiện có thuộc loại này
INSERT INTO product_types (name, slug, description, uses_jade_fields, spec_fields, active, sort_order)
VALUES ('Vòng tay ngọc', 'vong-ngoc', 'Sản phẩm chính của shop', 1, '[]', 1, 0);

-- Loại thứ hai: Pháp phục, tạo sẵn ở trạng thái chưa hoạt động (khách chưa thấy), chủ shop tự sửa thông số trong admin
INSERT INTO product_types (name, slug, description, uses_jade_fields, spec_fields, active, sort_order)
VALUES ('Pháp phục', 'phap-phuc', 'Chưa hoạt động: sản phẩm loại này chưa hiện ra website', 0,
  '[{"key":"chat_lieu","label":"Chất liệu","kind":"text","options":[]},{"key":"kich_co","label":"Kích cỡ","kind":"select","options":["S","M","L","XL"]},{"key":"mau_sac","label":"Màu sắc","kind":"text","options":[]},{"key":"kieu_dang","label":"Kiểu dáng","kind":"text","options":[]}]',
  0, 1);

ALTER TABLE products ADD COLUMN product_type_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN attrs TEXT NOT NULL DEFAULT '{}';
CREATE INDEX idx_products_type ON products(product_type_id, status);
