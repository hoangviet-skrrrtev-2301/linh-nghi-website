-- Vai trò tùy chỉnh và phân quyền chi tiết cho tài khoản quản trị.
-- users.role vẫn là 'owner' (toàn quyền) hoặc 'staff' (theo vai trò); users.role_id chọn vai trò cho nhân viên.
CREATE TABLE roles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  permissions TEXT NOT NULL DEFAULT '[]',   -- JSON: danh sách mã quyền (xem backend/config/permissions.js)
  is_system   INTEGER NOT NULL DEFAULT 0,   -- 1 = vai trò có sẵn, không xóa được
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Vai trò "Nhân viên" có sẵn: đúng quyền nhân viên trước đây (mọi việc trừ cấu hình email, tài khoản, nhật ký, sao lưu, chuyển hướng, xóa / xuất dữ liệu khách)
INSERT INTO roles (id, name, description, permissions, is_system) VALUES
  (1, 'Nhân viên', 'Quyền mặc định của nhân viên: quản lý bán hàng, sản phẩm, nội dung và cài đặt giao diện / SEO; không đụng tới email, tài khoản, nhật ký, sao lưu, chuyển hướng, xóa hoặc xuất dữ liệu khách.',
   '["orders","customers","products","terms","gallery","posts","media","settings_site","settings_pages","settings_design","settings_seo"]', 1);

ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL;
