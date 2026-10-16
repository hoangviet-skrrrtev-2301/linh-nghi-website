-- 002: Nhãn Best Seller / Mới và ý nghĩa phong thủy cho sản phẩm
ALTER TABLE products ADD COLUMN is_bestseller INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN is_new INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN fengshui TEXT NOT NULL DEFAULT '';
