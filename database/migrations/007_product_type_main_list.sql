-- ==========================================================
-- 007: Loại sản phẩm có hiện chung trong trang "Tất cả sản phẩm" hay không.
-- Mặc định bật cho loại dùng bộ thuộc tính ngọc (loại chính), tắt cho các loại khác (Pháp phục...):
-- loại tắt chỉ xem được qua đường dẫn riêng /san-pham?nhom=<slug> (hoặc khi khách tìm kiếm).
-- ==========================================================
ALTER TABLE product_types ADD COLUMN in_main_list INTEGER NOT NULL DEFAULT 0;
UPDATE product_types SET in_main_list = 1 WHERE uses_jade_fields = 1;
