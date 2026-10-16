-- ==========================================================
-- 001: Cấu trúc database ban đầu
-- Mỗi file trong thư mục migrations chỉ chạy MỘT lần, theo thứ tự tên file.
-- Muốn thay đổi cấu trúc: tạo file mới 002_xxx.sql, không sửa file cũ.
-- ==========================================================

-- Tài khoản quản trị. role: owner (chủ shop) | staff (nhân viên)
CREATE TABLE users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name            TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'staff')),
  totp_secret     TEXT,
  totp_enabled    INTEGER NOT NULL DEFAULT 0,
  active          INTEGER NOT NULL DEFAULT 1,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    TEXT,
  last_login_at   TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Phiên đăng nhập
CREATE TABLE sessions (
  sid        TEXT PRIMARY KEY,
  data       TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Cấu hình website dạng key -> JSON (thông tin shop, giao diện, SEO, email, nội dung trang...)
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Thư viện ảnh. variants: JSON {"sm": "...", "md": "...", "lg": "..."} đường dẫn tương đối
CREATE TABLE media (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  original_name TEXT,
  alt           TEXT NOT NULL DEFAULT '',
  width         INTEGER,
  height        INTEGER,
  size_bytes    INTEGER,
  variants      TEXT NOT NULL,
  folder        TEXT NOT NULL DEFAULT 'general',
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Danh mục phân loại dùng chung.
-- type: jade_type (loại ngọc) | color (màu sắc) | style (kiểu dáng) | element (mệnh)
CREATE TABLE terms (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL CHECK (type IN ('jade_type', 'color', 'style', 'element')),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color_hex   TEXT,
  media_id    INTEGER REFERENCES media(id) ON DELETE SET NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  UNIQUE (type, slug)
);

-- Sản phẩm. Giá lưu bằng số nguyên VND. price NULL = hiển thị "Liên hệ"
CREATE TABLE products (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  sku               TEXT,
  short_description TEXT NOT NULL DEFAULT '',
  description       TEXT NOT NULL DEFAULT '',
  price             INTEGER,
  sale_price        INTEGER,
  jade_type_id      INTEGER REFERENCES terms(id) ON DELETE SET NULL,
  color_id          INTEGER REFERENCES terms(id) ON DELETE SET NULL,
  style_id          INTEGER REFERENCES terms(id) ON DELETE SET NULL,
  sizes             TEXT NOT NULL DEFAULT '[]',
  bead_size         TEXT NOT NULL DEFAULT '',
  origin            TEXT NOT NULL DEFAULT '',
  weight            TEXT NOT NULL DEFAULT '',
  specs             TEXT NOT NULL DEFAULT '[]',
  stock_status      TEXT NOT NULL DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'made_to_order', 'sold_out')),
  is_featured       INTEGER NOT NULL DEFAULT 0,
  is_customizable   INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('published', 'draft')),
  sort_order        INTEGER NOT NULL DEFAULT 0,
  cover_media_id    INTEGER REFERENCES media(id) ON DELETE SET NULL,
  seo_title         TEXT NOT NULL DEFAULT '',
  seo_description   TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_products_status ON products(status, sort_order);
CREATE INDEX idx_products_jade ON products(jade_type_id);

-- Mệnh phong thủy phù hợp (một sản phẩm hợp nhiều mệnh)
CREATE TABLE product_elements (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  term_id    INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, term_id)
);

-- Ảnh phụ của sản phẩm
CREATE TABLE product_images (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_id   INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, media_id)
);

-- Chứng chỉ kiểm định
CREATE TABLE certificates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  issuer      TEXT NOT NULL DEFAULT '',
  code        TEXT NOT NULL DEFAULT '',
  issued_date TEXT NOT NULL DEFAULT '',
  note        TEXT NOT NULL DEFAULT '',
  media_id    INTEGER REFERENCES media(id) ON DELETE SET NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- Bộ sưu tập ảnh (Gallery)
CREATE TABLE gallery_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  media_id   INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT '',
  caption    TEXT NOT NULL DEFAULT '',
  album      TEXT NOT NULL DEFAULT '',
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Bài viết blog
CREATE TABLE posts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  excerpt         TEXT NOT NULL DEFAULT '',
  content         TEXT NOT NULL DEFAULT '',
  cover_media_id  INTEGER REFERENCES media(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('published', 'draft')),
  published_at    TEXT,
  author_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  seo_title       TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_posts_status ON posts(status, published_at);

-- Khách hàng (tự tạo khi khách gửi đơn/yêu cầu, gộp theo số điện thoại)
CREATE TABLE customers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL UNIQUE,
  email      TEXT NOT NULL DEFAULT '',
  address    TEXT NOT NULL DEFAULT '',
  wrist_size TEXT NOT NULL DEFAULT '',
  note       TEXT NOT NULL DEFAULT '',
  tags       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Đơn đặt hàng / yêu cầu custom / liên hệ
-- type: order | custom | contact
-- status: new | contacted | confirmed | completed | cancelled
CREATE TABLE inquiries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL CHECK (type IN ('order', 'custom', 'contact')),
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT NOT NULL DEFAULT '',
  address     TEXT NOT NULL DEFAULT '',
  contact_via TEXT NOT NULL DEFAULT '',
  items       TEXT NOT NULL DEFAULT '[]',
  total       INTEGER,
  details     TEXT NOT NULL DEFAULT '{}',
  message     TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'confirmed', 'completed', 'cancelled')),
  admin_note  TEXT NOT NULL DEFAULT '',
  mail_status TEXT NOT NULL DEFAULT 'pending',
  ip          TEXT NOT NULL DEFAULT '',
  user_agent  TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_inquiries_type ON inquiries(type, status, created_at);
CREATE INDEX idx_inquiries_customer ON inquiries(customer_id);

-- Nhật ký thao tác quản trị
CREATE TABLE audit_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL DEFAULT '',
  entity_id  TEXT NOT NULL DEFAULT '',
  detail     TEXT NOT NULL DEFAULT '',
  ip         TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
