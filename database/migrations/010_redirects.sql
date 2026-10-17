-- ==========================================================
-- 010: Chuyển hướng 301 (và 302 / 410) do shop tự cấu hình + nhật ký các đường dẫn bị lỗi 404.
--   redirects.from_path  đường dẫn cũ (chữ thường, không dấu "/" cuối), duy nhất
--   redirects.to_url     đường dẫn mới (/san-pham/...) hoặc địa chỉ đầy đủ https://...; rỗng với 410 (đã gỡ)
--   redirects.auto       1 = hệ thống tự tạo khi đổi đường dẫn (slug) của sản phẩm / bài viết / chuyên mục
--   not_found_log        các đường dẫn khách / Google truy cập bị 404, để shop tạo chuyển hướng cho đúng chỗ
-- ==========================================================
CREATE TABLE redirects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  from_path   TEXT NOT NULL UNIQUE,
  to_url      TEXT NOT NULL DEFAULT '',
  status      INTEGER NOT NULL DEFAULT 301 CHECK (status IN (301, 302, 410)),
  note        TEXT NOT NULL DEFAULT '',
  auto        INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  hits        INTEGER NOT NULL DEFAULT 0,
  last_hit_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE not_found_log (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  path      TEXT NOT NULL UNIQUE,
  hits      INTEGER NOT NULL DEFAULT 1,
  referer   TEXT NOT NULL DEFAULT '',
  last_seen TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_not_found_hits ON not_found_log(hits DESC, last_seen DESC);
