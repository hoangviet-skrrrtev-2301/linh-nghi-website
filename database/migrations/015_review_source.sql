-- Đánh giá sản phẩm: cho phép shop tự thêm (source = 'shop', không cần số điện thoại) và ghi nhận khách đã mua đúng sản phẩm hay chưa (verified).
-- SQLite không bỏ được ràng buộc UNIQUE (product_id, phone) của cột sẵn có nên xây lại bảng; ràng buộc "mỗi số điện thoại một đánh giá cho mỗi sản phẩm" chuyển thành chỉ mục duy nhất bỏ qua số điện thoại trống.
CREATE TABLE product_reviews_new (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  inquiry_id  INTEGER REFERENCES inquiries(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL DEFAULT '',
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content     TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'hidden')),
  source      TEXT NOT NULL DEFAULT 'customer' CHECK (source IN ('customer', 'shop')),   -- customer: khách tự gửi; shop: chủ shop tự nhập
  verified    INTEGER NOT NULL DEFAULT 0,                                                 -- 1: số điện thoại có đơn Hoàn thành chứa đúng sản phẩm này
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO product_reviews_new (id, product_id, customer_id, inquiry_id, name, phone, rating, content, status, source, verified, created_at, updated_at)
SELECT id, product_id, customer_id, inquiry_id, name, phone, rating, content, status, 'customer', CASE WHEN inquiry_id IS NOT NULL THEN 1 ELSE 0 END, created_at, updated_at
FROM product_reviews;

DROP TABLE product_reviews;
ALTER TABLE product_reviews_new RENAME TO product_reviews;

CREATE UNIQUE INDEX uq_reviews_phone ON product_reviews (product_id, phone) WHERE phone <> '';
CREATE INDEX idx_reviews_product ON product_reviews (product_id, status);
CREATE INDEX idx_reviews_status ON product_reviews (status, created_at);
