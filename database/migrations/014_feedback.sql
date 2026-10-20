-- Feedback khách hàng (shop tự nhập: tin nhắn, ảnh chụp màn hình, lời cảm ơn) và đánh giá sản phẩm (khách đã mua tự gửi).

-- Feedback do shop nhập. rating = 0: không hiện sao. show_home / show_page: hiện ở khối trang chủ / trang Feedback.
CREATE TABLE feedbacks (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT '',           -- nghề nghiệp / nơi ở, ví dụ "Freelancer, TP.HCM"
  content         TEXT NOT NULL DEFAULT '',
  rating          INTEGER NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  avatar_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  feedback_date   TEXT NOT NULL DEFAULT '',            -- YYYY-MM-DD, để trống thì lấy ngày tạo
  show_home       INTEGER NOT NULL DEFAULT 1,
  show_page       INTEGER NOT NULL DEFAULT 1,
  active          INTEGER NOT NULL DEFAULT 1,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_feedbacks_list ON feedbacks (active, sort_order, id);

-- Ảnh đính kèm feedback (ảnh chụp tin nhắn của khách), nhiều ảnh mỗi feedback
CREATE TABLE feedback_images (
  feedback_id INTEGER NOT NULL REFERENCES feedbacks(id) ON DELETE CASCADE,
  media_id    INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (feedback_id, media_id)
);

-- Đánh giá sản phẩm của khách đã mua (số điện thoại trùng khách có đơn Hoàn thành chứa sản phẩm đó).
-- status: pending (chờ duyệt) | approved (đang hiện) | hidden (đã ẩn). Mỗi số điện thoại chỉ đánh giá một sản phẩm một lần.
CREATE TABLE product_reviews (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  inquiry_id  INTEGER REFERENCES inquiries(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content     TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'hidden')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (product_id, phone)
);
CREATE INDEX idx_reviews_product ON product_reviews (product_id, status);
CREATE INDEX idx_reviews_status ON product_reviews (status, created_at);

-- Chuyển danh sách "Cảm nhận khách hàng" cũ (cài đặt trang chủ) sang bảng feedbacks
INSERT INTO feedbacks (name, content, avatar_media_id, sort_order)
SELECT trim(json_extract(j.value, '$.name')), trim(coalesce(json_extract(j.value, '$.content'), '')),
       (SELECT m.id FROM media m WHERE m.id = json_extract(j.value, '$.avatar')), CAST(j.key AS INTEGER)
FROM settings s, json_each(CASE WHEN json_valid(s.value) THEN s.value ELSE '{}' END, '$.testimonials') j
WHERE s.key = 'home' AND trim(coalesce(json_extract(j.value, '$.name'), '')) <> '';
