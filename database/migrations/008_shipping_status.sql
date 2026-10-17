-- ==========================================================
-- 008: Trạng thái "Đang giao hàng" + thông tin vận chuyển + ngày hoàn thành.
-- SQLite không sửa được ràng buộc CHECK của cột status, nên xây lại bảng inquiries (sao chép toàn bộ dòng cũ,
-- giữ nguyên id, mã, liên kết khách hàng và liên kết yêu cầu gốc parent_id).
-- Cột mới:
--   carrier       đơn vị vận chuyển (GHN, GHTK, Viettel Post...)
--   tracking_code mã vận đơn, khách xem được ở trang tra cứu
--   shipped_at    lúc chuyển sang "Đang giao hàng"
--   completed_at  lúc chuyển sang "Hoàn thành" (doanh thu ở trang Tổng quan tính theo ngày này)
-- ==========================================================
CREATE TABLE inquiries_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  code          TEXT NOT NULL UNIQUE,
  type          TEXT NOT NULL CHECK (type IN ('order', 'custom', 'contact')),
  customer_id   INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT NOT NULL DEFAULT '',
  address       TEXT NOT NULL DEFAULT '',
  contact_via   TEXT NOT NULL DEFAULT '',
  items         TEXT NOT NULL DEFAULT '[]',
  total         INTEGER,
  details       TEXT NOT NULL DEFAULT '{}',
  message       TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'confirmed', 'shipping', 'completed', 'cancelled')),
  admin_note    TEXT NOT NULL DEFAULT '',
  mail_status   TEXT NOT NULL DEFAULT 'pending',
  ip            TEXT NOT NULL DEFAULT '',
  user_agent    TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  parent_id     INTEGER REFERENCES inquiries(id) ON DELETE SET NULL,
  adjustment    INTEGER NOT NULL DEFAULT 0,
  adjustment_note TEXT NOT NULL DEFAULT '',
  channel       TEXT NOT NULL DEFAULT 'web',
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  carrier       TEXT NOT NULL DEFAULT '',
  tracking_code TEXT NOT NULL DEFAULT '',
  shipped_at    TEXT,
  completed_at  TEXT
);

INSERT INTO inquiries_new (id, code, type, customer_id, name, phone, email, address, contact_via, items, total, details, message, status,
  admin_note, mail_status, ip, user_agent, created_at, updated_at, parent_id, adjustment, adjustment_note, channel, created_by, completed_at)
SELECT id, code, type, customer_id, name, phone, email, address, contact_via, items, total, details, message, status,
  admin_note, mail_status, ip, user_agent, created_at, updated_at, parent_id, adjustment, adjustment_note, channel, created_by,
  CASE WHEN status = 'completed' THEN updated_at END
FROM inquiries;

DROP TABLE inquiries;
ALTER TABLE inquiries_new RENAME TO inquiries;

CREATE INDEX idx_inquiries_type ON inquiries(type, status, created_at);
CREATE INDEX idx_inquiries_customer ON inquiries(customer_id);
CREATE INDEX idx_inquiries_parent ON inquiries(parent_id);
CREATE INDEX idx_inquiries_completed ON inquiries(completed_at);
