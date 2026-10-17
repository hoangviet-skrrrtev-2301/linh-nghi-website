// Blog và Gallery.
import { db, likeVn } from '../lib/db.js';
import { slugify, HttpError, toInt, bool, stripHtml, truncate } from '../lib/utils.js';
import { cleanHtml, cleanText } from '../lib/sanitize.js';
import { getMediaMap } from './media.js';
import { postPath, productPath, RESERVED_BLOG } from '../lib/urls.js';
import { addAutoRedirect } from './redirects.js';

// ---------------- Blog ----------------
const withUrl = (post) => ({ ...post, url: postPath(post) });

function hydratePosts(rows) {
  const media = getMediaMap(rows.map((r) => r.cover_media_id));
  const authors = Object.fromEntries(db.prepare('SELECT id, name FROM users').all().map((u) => [u.id, u.name]));
  const cats = Object.fromEntries(db.prepare('SELECT id, name, slug, active FROM post_categories').all().map((x) => [x.id, x]));
  return rows.map((r) => withUrl({
    ...r,
    category: cats[r.category_id] || null,
    cover: media[r.cover_media_id] || null,
    author: authors[r.author_id] || '',
    summary: r.excerpt || truncate(stripHtml(r.content), 180),
    reading_minutes: Math.max(1, Math.round(stripHtml(r.content).split(' ').length / 220)),
  }));
}

export function listPosts({ page = 1, perPage = 9, includeDrafts = false, q, status, categoryId } = {}) {
  const where = [];
  const params = [];
  if (!includeDrafts) where.push(`status = 'published' AND published_at <= datetime('now')`);
  else if (status) { where.push('status = ?'); params.push(status); }
  if (q) { where.push('(vn(title) LIKE ? OR vn(excerpt) LIKE ?)'); params.push(likeVn(q), likeVn(q)); }
  if (categoryId === 'none') where.push('category_id IS NULL');
  else if (categoryId) { where.push('category_id = ?'); params.push(Number(categoryId)); }
  const sql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) FROM posts ${sql}`).pluck().get(...params);
  const pages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, toInt(page, 1)), pages);
  const rows = db.prepare(`SELECT * FROM posts ${sql} ORDER BY COALESCE(published_at, created_at) DESC LIMIT ? OFFSET ?`)
    .all(...params, perPage, (current - 1) * perPage);
  return { items: hydratePosts(rows), total, page: current, pages };
}

export function getPost(idOrSlug, { publicOnly = true } = {}) {
  const col = typeof idOrSlug === 'number' ? 'id' : 'slug';
  const row = db.prepare(`SELECT * FROM posts WHERE ${col} = ? ${publicOnly ? `AND status = 'published' AND published_at <= datetime('now')` : ''}`).get(idOrSlug);
  return row ? hydratePosts([row])[0] : null;
}

export function savePost(id, data, userId) {
  const title = cleanText(data.title, 250);
  if (!title) throw new HttpError(400, 'Vui lòng nhập tiêu đề');
  let slug = slugify(data.slug || title) || 'bai-viet';
  let i = 2;
  const base = slug;
  // Không trùng bài khác, tên chuyên mục, hoặc từ khóa dành riêng (cùng nằm dưới /blog/)
  while (db.prepare('SELECT 1 FROM posts WHERE slug = ? AND id != ?').get(slug, id || 0) || db.prepare('SELECT 1 FROM post_categories WHERE slug = ?').get(slug) || RESERVED_BLOG.includes(slug)) slug = `${base}-${i++}`;
  const status = data.status === 'published' ? 'published' : 'draft';
  // Ngày đăng: lấy từ form (giờ VN) hoặc hiện tại khi đăng lần đầu
  let publishedAt = null;
  if (data.published_at) {
    const d = new Date(`${data.published_at}${data.published_at.length <= 16 ? ':00' : ''}+07:00`);
    if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString().slice(0, 19).replace('T', ' ');
  }
  if (!publishedAt && status === 'published') {
    publishedAt = (id && db.prepare('SELECT published_at FROM posts WHERE id = ?').pluck().get(id))
      || new Date().toISOString().slice(0, 19).replace('T', ' ');
  }
  const v = {
    title, slug, status,
    excerpt: cleanText(data.excerpt, 600),
    content: cleanHtml(data.content),
    cover_media_id: toInt(data.cover_media_id),
    category_id: db.prepare('SELECT id FROM post_categories WHERE id = ?').pluck().get(toInt(data.category_id)) || null,
    published_at: publishedAt,
    seo_title: cleanText(data.seo_title, 200),
    seo_description: cleanText(data.seo_description, 400),
  };
  if (id) {
    const before = getPost(id, { publicOnly: false });
    const res = db.prepare(`UPDATE posts SET title=@title, slug=@slug, status=@status, excerpt=@excerpt, content=@content,
      cover_media_id=@cover_media_id, category_id=@category_id, published_at=@published_at, seo_title=@seo_title, seo_description=@seo_description,
      updated_at=datetime('now') WHERE id=@id`).run({ ...v, id });
    if (!res.changes) throw new HttpError(404, 'Không tìm thấy bài viết');
    // Đổi đường dẫn hoặc chuyên mục thì địa chỉ bài đổi: tự chuyển 301 từ địa chỉ cũ
    const after = getPost(id, { publicOnly: false });
    if (before?.status === 'published' && after && before.url !== after.url) addAutoRedirect(before.url, after.url);
    return id;
  }
  return db.prepare(`INSERT INTO posts (title, slug, status, excerpt, content, cover_media_id, category_id, published_at, seo_title, seo_description, author_id)
    VALUES (@title, @slug, @status, @excerpt, @content, @cover_media_id, @category_id, @published_at, @seo_title, @seo_description, @author_id)`)
    .run({ ...v, author_id: userId }).lastInsertRowid;
}

export function deletePost(id) {
  db.prepare('DELETE FROM posts WHERE id = ?').run(id);
}

// ---------------- Chuyên mục blog ----------------
// postCount: số bài đã đăng (công khai) trong chuyên mục; adminCount: tính cả nháp
export function listPostCategories({ activeOnly = false } = {}) {
  return db.prepare(`SELECT c.*,
      (SELECT COUNT(*) FROM posts p WHERE p.category_id = c.id AND p.status = 'published' AND p.published_at <= datetime('now')) AS post_count,
      (SELECT COUNT(*) FROM posts p WHERE p.category_id = c.id) AS total_count
    FROM post_categories c ${activeOnly ? 'WHERE c.active = 1' : ''} ORDER BY c.sort_order, c.name`).all();
}

export function getPostCategory(slug) {
  return db.prepare('SELECT * FROM post_categories WHERE slug = ? AND active = 1').get(slug) || null;
}

export function savePostCategory(id, data) {
  const name = cleanText(data.name, 80);
  if (!name) throw new HttpError(400, 'Vui lòng nhập tên chuyên mục');
  const base = slugify(data.slug || name) || 'chuyen-muc';
  let slug = base;
  let i = 2;
  while (db.prepare('SELECT 1 FROM post_categories WHERE slug = ? AND id != ?').get(slug, id || 0) || db.prepare('SELECT 1 FROM posts WHERE slug = ?').get(slug) || RESERVED_BLOG.includes(slug)) slug = `${base}-${i++}`;
  const v = { name, slug, description: cleanText(data.description, 400), sort_order: toInt(data.sort_order, 0), active: bool(data.active ?? true) ? 1 : 0 };
  if (id) {
    const old = db.prepare('SELECT slug FROM post_categories WHERE id = ?').get(id);
    const beforeUrls = old && old.slug !== slug ? Object.fromEntries(db.prepare("SELECT id FROM posts WHERE category_id = ? AND status = 'published'").pluck().all(id).map((pid) => [pid, getPost(pid, { publicOnly: false }).url])) : null;
    const res = db.prepare('UPDATE post_categories SET name=@name, slug=@slug, description=@description, sort_order=@sort_order, active=@active WHERE id=@id').run({ ...v, id });
    if (!res.changes) throw new HttpError(404, 'Không tìm thấy chuyên mục');
    if (beforeUrls) {
      addAutoRedirect(`/blog/${old.slug}`, `/blog/${slug}`);
      for (const [pid, url] of Object.entries(beforeUrls)) addAutoRedirect(url, getPost(Number(pid), { publicOnly: false }).url);
    }
    return id;
  }
  return db.prepare('INSERT INTO post_categories (name, slug, description, sort_order, active) VALUES (@name, @slug, @description, @sort_order, @active)').run(v).lastInsertRowid;
}

// Xóa chuyên mục: các bài thuộc chuyên mục đó chuyển về "chưa phân loại" (không bị xóa)
export function deletePostCategory(id) {
  const old = db.prepare('SELECT slug FROM post_categories WHERE id = ?').get(id);
  const beforeUrls = old ? Object.fromEntries(db.prepare("SELECT id FROM posts WHERE category_id = ? AND status = 'published'").pluck().all(id).map((pid) => [pid, getPost(pid, { publicOnly: false }).url])) : {};
  db.prepare('DELETE FROM post_categories WHERE id = ?').run(id);
  if (old) {
    addAutoRedirect(`/blog/${old.slug}`, '/blog');
    for (const [pid, url] of Object.entries(beforeUrls)) { const p = getPost(Number(pid), { publicOnly: false }); if (p) addAutoRedirect(url, p.url); }
  }
}

// ---------------- Gallery ----------------
// activeOnly: chỉ ảnh đang bật "Hiện ở Gallery tổng" (tab Tất cả, trang chủ).
// Khi lọc theo album thì luôn lấy hết ảnh của album đó, bật hay tắt đều hiện.
export function listGallery({ activeOnly = true, album, limit } = {}) {
  const where = [];
  const params = [];
  if (album) { where.push('g.album = ?'); params.push(album); }
  else if (activeOnly) where.push('g.active = 1');
  const rows = db.prepare(`SELECT g.*, p.slug AS product_slug, p.name AS product_name, jt.slug AS jade_slug,
      CASE WHEN pt.uses_jade_fields = 0 THEN pt.slug END AS type_slug FROM gallery_items g
    LEFT JOIN products p ON p.id = g.product_id AND p.status = 'published' AND p.product_type_id IN (SELECT id FROM product_types WHERE active = 1)
    LEFT JOIN terms jt ON jt.id = p.jade_type_id LEFT JOIN product_types pt ON pt.id = p.product_type_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY g.sort_order, g.id DESC ${limit ? 'LIMIT ' + Number(limit) : ''}`).all(...params);
  const media = getMediaMap(rows.map((r) => r.media_id));
  return rows.map((r) => ({ ...r, image: media[r.media_id] || null, product_url: r.product_slug ? productPath({ slug: r.product_slug, jade_type: r.jade_slug ? { slug: r.jade_slug } : null, product_type: r.type_slug ? { slug: r.type_slug, uses_jade_fields: false } : null }) : '' })).filter((r) => r.image);
}

export function galleryAlbums() {
  return db.prepare(`SELECT album, COUNT(*) AS count FROM gallery_items WHERE album != '' GROUP BY album ORDER BY album`).all();
}

export function saveGalleryItem(id, data) {
  const v = {
    media_id: toInt(data.media_id),
    title: cleanText(data.title, 200),
    caption: cleanText(data.caption, 1000),
    album: cleanText(data.album, 80),
    product_id: toInt(data.product_id),
    sort_order: toInt(data.sort_order, 0),
    active: bool(data.active ?? true) ? 1 : 0,
  };
  if (!v.media_id) throw new HttpError(400, 'Vui lòng chọn ảnh');
  if (id) {
    db.prepare(`UPDATE gallery_items SET media_id=@media_id, title=@title, caption=@caption, album=@album,
      product_id=@product_id, sort_order=@sort_order, active=@active WHERE id=@id`).run({ ...v, id });
    return id;
  }
  return db.prepare(`INSERT INTO gallery_items (media_id, title, caption, album, product_id, sort_order, active)
    VALUES (@media_id, @title, @caption, @album, @product_id, @sort_order, @active)`).run(v).lastInsertRowid;
}

export function reorderGallery(ids) {
  const upd = db.prepare('UPDATE gallery_items SET sort_order = ? WHERE id = ?');
  db.transaction(() => ids.forEach((id, i) => upd.run(i, id)))();
}

export function deleteGalleryItem(id) {
  db.prepare('DELETE FROM gallery_items WHERE id = ?').run(id);
}
