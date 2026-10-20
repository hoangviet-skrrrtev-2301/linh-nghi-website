-- ==========================================================
-- 017: Loại sản phẩm "Phụ kiện" (nhẫn, khuyên tai, mặt dây...), tạo sẵn ở trạng thái chưa hoạt động như Pháp phục.
-- Chủ shop tự sửa tên, thông số, lựa chọn kích cỡ ở Admin > Sản phẩm > Loại sản phẩm rồi bật hoạt động.
-- Bỏ qua nếu shop đã có loại dùng đường dẫn "phu-kien".
-- ==========================================================
INSERT INTO product_types (name, slug, description, uses_jade_fields, spec_fields, active, sort_order, size_label, size_unit, size_options, size_free, info_label)
SELECT 'Phụ kiện', 'phu-kien', 'Nhẫn, khuyên tai và phụ kiện ngọc khác', 0,
  '[{"key":"loai_phu_kien","label":"Loại phụ kiện","kind":"select","options":["Nhẫn","Khuyên tai","Mặt dây","Dây chuyền"]},{"key":"chat_lieu","label":"Chất liệu","kind":"text","options":[]},{"key":"loai_da","label":"Loại ngọc / đá","kind":"text","options":[]},{"key":"mau_sac","label":"Màu sắc","kind":"text","options":[]},{"key":"kich_thuoc","label":"Kích thước","kind":"text","options":[]}]',
  0, 2, 'Kích cỡ', '', '[]', 1, ''
WHERE NOT EXISTS (SELECT 1 FROM product_types WHERE slug = 'phu-kien')
  AND NOT EXISTS (SELECT 1 FROM terms WHERE slug = 'phu-kien')
  AND NOT EXISTS (SELECT 1 FROM products WHERE slug = 'phu-kien');
