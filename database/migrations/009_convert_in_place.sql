-- ==========================================================
-- 009: Lên đơn ngay trên cùng một bản ghi (không còn sinh thêm yêu cầu thứ hai).
-- Khi custom / liên hệ được "lên đơn", chính bản ghi đó chuyển thành đơn hàng (mã DH mới)
-- và nhớ lại nguồn gốc để khách vẫn tra cứu được bằng mã cũ:
--   origin_type  loại ban đầu (custom | contact), rỗng nếu không phải đơn lên từ yêu cầu
--   origin_code  mã ban đầu (CT... / LH...)
-- Dữ liệu cũ giữ nguyên (cột parent_id vẫn dùng để hiển thị các đơn đã lên theo cách cũ).
-- ==========================================================
ALTER TABLE inquiries ADD COLUMN origin_type TEXT NOT NULL DEFAULT '';
ALTER TABLE inquiries ADD COLUMN origin_code TEXT NOT NULL DEFAULT '';
CREATE INDEX idx_inquiries_origin ON inquiries(origin_code);
