-- ==========================================================
-- 003: Admin tự thêm khách hàng, lên đơn từ yêu cầu custom, điều chỉnh giá đơn
-- ==========================================================

-- Nguồn khách (Zalo, Facebook, cửa hàng, giới thiệu...) để quản lý khách ngoài website
ALTER TABLE customers ADD COLUMN source TEXT NOT NULL DEFAULT '';

-- Đơn lên từ yêu cầu khác (VD: đơn hàng tạo từ yêu cầu custom) → parent_id trỏ về yêu cầu gốc
ALTER TABLE inquiries ADD COLUMN parent_id INTEGER REFERENCES inquiries(id) ON DELETE SET NULL;

-- Điều chỉnh giá sau khi chốt với khách: số âm = giảm giá, số dương = phụ phí / phí ship
ALTER TABLE inquiries ADD COLUMN adjustment INTEGER NOT NULL DEFAULT 0;
ALTER TABLE inquiries ADD COLUMN adjustment_note TEXT NOT NULL DEFAULT '';

-- channel: web (khách gửi qua website) | admin (shop tự tạo)
ALTER TABLE inquiries ADD COLUMN channel TEXT NOT NULL DEFAULT 'web';
ALTER TABLE inquiries ADD COLUMN created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_inquiries_parent ON inquiries(parent_id);
CREATE INDEX idx_customers_created ON customers(created_at);
