-- ==========================================================
-- 005: Chuyên mục (category) cho bài viết blog.
-- Mỗi bài thuộc tối đa 1 chuyên mục; xóa chuyên mục thì bài chuyển về "chưa phân loại".
-- ==========================================================
CREATE TABLE post_categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE posts ADD COLUMN category_id INTEGER REFERENCES post_categories(id) ON DELETE SET NULL;
CREATE INDEX idx_posts_category ON posts(category_id);
