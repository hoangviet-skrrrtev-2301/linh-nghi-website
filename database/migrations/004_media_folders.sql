-- ==========================================================
-- 004: Thư mục ảnh. media.folder đã có sẵn; bảng này lưu thêm các thư mục còn trống (vừa tạo, chưa có ảnh)
-- ==========================================================
CREATE TABLE media_folders (
  name       TEXT PRIMARY KEY COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_media_folder ON media(folder);
