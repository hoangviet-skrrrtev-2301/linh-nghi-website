-- Tác giả bài viết blog (không có trang tác giả riêng; hiện khung giới thiệu cuối bài và khai báo schema Person)
CREATE TABLE authors (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  job_title       TEXT NOT NULL DEFAULT '',
  bio             TEXT NOT NULL DEFAULT '',
  avatar_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  links           TEXT NOT NULL DEFAULT '[]',   -- JSON: danh sách địa chỉ mạng xã hội / website của tác giả
  active          INTEGER NOT NULL DEFAULT 1,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tác giả của bài (posts.author_id cũ là tài khoản quản trị đã tạo bài, giữ nguyên)
ALTER TABLE posts ADD COLUMN writer_id INTEGER REFERENCES authors(id) ON DELETE SET NULL;
