// Danh mục phân loại (terms) và sản phẩm.
import { db, tx, likeVn } from '../lib/db.js';
import { productPath } from '../lib/urls.js';
import { addAutoRedirect } from './redirects.js';
import { slugify, safeJson, HttpError, toInt, bool, stripHtml, truncate } from '../lib/utils.js';
import { cleanHtml, cleanText } from '../lib/sanitize.js';
import { getMediaMap } from './media.js';
import { getRaw } from './settings.js';
import { setStockQty } from './stock.js';

export const TERM_TYPES = {
  jade_type: 'Loại ngọc',
  color: 'Màu sắc',
  style: 'Kiểu dáng',
  element: 'Mệnh phong thủy',
};

export const STOCK_LABEL = {
  in_stock: 'Có sẵn',
  made_to_order: 'Đặt trước',
  sold_out: 'Đã bán',
};

// ---------------- Terms ----------------
export function listTerms(type, { activeOnly = false } = {}) {
  const rows = db.prepare(`SELECT * FROM terms WHERE type = ? ${activeOnly ? 'AND active = 1' : ''} ORDER BY sort_order, name`).all(type);
  const media = getMediaMap(rows.map((r) => r.media_id));
  return rows.map((r) => ({ ...r, image: media[r.media_id] || null }));
}

export function allTermsGrouped({ activeOnly = false } = {}) {
  return Object.fromEntries(Object.keys(TERM_TYPES).map((t) => [t, listTerms(t, { activeOnly })]));
}

function uniqueSlug(table, base, id, extraWhere = '', extraParams = []) {
  let slug = base || 'muc';
  let i = 2;
  while (db.prepare(`SELECT 1 FROM ${table} WHERE slug = ? ${extraWhere} AND id != ?`).get(slug, ...extraParams, id || 0)) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

// /san-pham/<a> có thể là loại ngọc, loại sản phẩm hoặc (sản phẩm chưa có loại): ba nhóm này không được trùng tên đường dẫn
function categorySlugTaken(slug, { exceptTermId = 0, exceptTypeId = 0 } = {}) {
  return !!(db.prepare("SELECT 1 FROM terms WHERE type = 'jade_type' AND slug = ? AND id != ?").get(slug, exceptTermId)
    || db.prepare('SELECT 1 FROM product_types WHERE slug = ? AND id != ?').get(slug, exceptTypeId));
}
function freeCategorySlug(slug, except) {
  let s = slug;
  let i = 2;
  while (categorySlugTaken(s, except) || db.prepare('SELECT 1 FROM products WHERE slug = ?').get(s)) s = `${slug}-${i++}`;
  return s;
}

// Ghi lại địa chỉ hiện tại của các sản phẩm đã đăng; sau khi đổi dữ liệu gọi redirectMoved để tự chuyển 301 địa chỉ cũ → mới
function snapUrls(ids) {
  const list = [...new Set(ids)].filter(Boolean);
  if (!list.length) return {};
  const rows = db.prepare(`SELECT * FROM products p WHERE status = 'published' AND id IN (${list.map(() => '?').join(',')})`).all(...list);
  return Object.fromEntries(hydrate(rows).map((p) => [p.id, p.url]));
}
function redirectMoved(before) {
  const now = snapUrls(Object.keys(before).map(Number));
  for (const [id, old] of Object.entries(before)) if (now[id] && now[id] !== old) addAutoRedirect(old, now[id]);
}
const productIdsOf = (col, id) => db.prepare(`SELECT id FROM products WHERE ${col} = ?`).pluck().all(id);

export function saveTerm(id, data) {
  const type = id ? db.prepare('SELECT type FROM terms WHERE id = ?').pluck().get(id) : data.type;
  if (!TERM_TYPES[type]) throw new HttpError(400, 'Loại danh mục không hợp lệ');
  const name = cleanText(data.name, 120);
  if (!name) throw new HttpError(400, 'Vui lòng nhập tên');
  let slug = uniqueSlug('terms', slugify(data.slug || name), id, 'AND type = ?', [type]);
  const old = id ? db.prepare('SELECT slug FROM terms WHERE id = ?').get(id) : null;
  if (type === 'jade_type') slug = freeCategorySlug(slug, { exceptTermId: id || 0 });
  const values = {
    type, name, slug,
    description: cleanText(data.description, 2000),
    color_hex: /^#[0-9a-f]{3,8}$/i.test(data.color_hex || '') ? data.color_hex : null,
    media_id: toInt(data.media_id),
    sort_order: toInt(data.sort_order, 0),
    active: bool(data.active ?? true) ? 1 : 0,
  };
  if (id) {
    // Đổi đường dẫn loại ngọc thì địa chỉ trang loại và mọi sản phẩm thuộc loại đó đổi theo: tự chuyển 301
    const before = type === 'jade_type' && old && old.slug !== slug ? snapUrls(productIdsOf('jade_type_id', id)) : null;
    db.prepare(`UPDATE terms SET name=@name, slug=@slug, description=@description, color_hex=@color_hex,
      media_id=@media_id, sort_order=@sort_order, active=@active WHERE id=@id`).run({ ...values, id });
    if (before) { addAutoRedirect(`/san-pham/${old.slug}`, `/san-pham/${slug}`); redirectMoved(before); }
    return id;
  }
  return db.prepare(`INSERT INTO terms (type, name, slug, description, color_hex, media_id, sort_order, active)
    VALUES (@type, @name, @slug, @description, @color_hex, @media_id, @sort_order, @active)`).run(values).lastInsertRowid;
}

export function deleteTerm(id) {
  const t = db.prepare('SELECT type, slug FROM terms WHERE id = ?').get(id);
  // Xóa loại ngọc: sản phẩm của loại đó mất tầng cha nên đổi địa chỉ, và trang loại không còn: chuyển 301 về trang Sản phẩm
  const before = t?.type === 'jade_type' ? snapUrls(productIdsOf('jade_type_id', id)) : null;
  db.prepare('DELETE FROM terms WHERE id = ?').run(id);
  if (before) { addAutoRedirect(`/san-pham/${t.slug}`, '/san-pham'); redirectMoved(before); }
}

// ---------------- Products ----------------
const EFFECTIVE_PRICE = 'COALESCE(p.sale_price, p.price)';
// Sản phẩm thuộc loại "chưa hoạt động" không được hiện ở bất kỳ đâu phía khách hàng (danh sách, tìm kiếm, sitemap, giỏ hàng...)
export const TYPE_ACTIVE = 'p.product_type_id IN (SELECT id FROM product_types WHERE active = 1)';
// Trang "Tất cả sản phẩm" chỉ gồm các loại được bật "hiện chung" (mặc định chỉ ngọc); loại khác xem qua đường dẫn riêng ?nhom=<slug>
const IN_MAIN_LIST = 'p.product_type_id IN (SELECT id FROM product_types WHERE in_main_list = 1)';

function hydrate(rows, { withImages = false } = {}) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const marks = ids.map(() => '?').join(',');
  const terms = Object.fromEntries(db.prepare('SELECT * FROM terms').all().map((t) => [t.id, t]));
  const types = Object.fromEntries(db.prepare('SELECT * FROM product_types').all().map((t) => [t.id, { ...t, spec_fields: safeJson(t.spec_fields, []) }]));
  const feat = getRaw('features');
  const invOn = !!feat.inventory_enabled;
  const elements = db.prepare(`SELECT product_id, term_id FROM product_elements WHERE product_id IN (${marks})`).all(...ids);
  const images = db.prepare(`SELECT product_id, media_id FROM product_images WHERE product_id IN (${marks}) ORDER BY sort_order`).all(...ids);
  const newDays = Number(getRaw('pages').new_days) || 0;
  const mediaIds = [...rows.map((r) => r.cover_media_id), ...images.map((i) => i.media_id)];
  const media = getMediaMap(mediaIds);
  // Số sao trung bình từ đánh giá đã duyệt (chỉ tính khi bật đánh giá và hiện sao trên thẻ sản phẩm)
  const fbCfg = getRaw('feedback');
  const ratings = fbCfg.reviews_enabled && fbCfg.reviews_show_on_card
    ? Object.fromEntries(db.prepare(`SELECT product_id, COUNT(*) AS c, AVG(rating) AS a FROM product_reviews WHERE status = 'approved' AND product_id IN (${marks}) GROUP BY product_id`).all(...ids).map((x) => [x.product_id, x]))
    : {};

  return rows.map((r) => {
    const pick = (tid) => (terms[tid] ? { id: terms[tid].id, name: terms[tid].name, slug: terms[tid].slug, color_hex: terms[tid].color_hex } : null);
    const gallery = images.filter((i) => i.product_id === r.id).map((i) => media[i.media_id]).filter(Boolean);
    const cover = media[r.cover_media_id] || gallery[0] || null;
    const type = types[r.product_type_id] || null;
    const attrs = safeJson(r.attrs, {});
    // Kho (tùy chọn): chỉ sản phẩm được tick theo dõi; hết hàng thì tự hiện "Đã bán" mà không sửa dữ liệu gốc
    const tracked = invOn && !!r.track_stock;
    const left = tracked ? Math.max(0, r.stock_qty) : null;
    const low = Math.max(1, Number(feat.inventory_low) || 3);
    const shows = tracked && left > 0 && (feat.inventory_display === 'always' || (feat.inventory_display === 'low' && left <= low));
    const stockText = shows ? String((left <= low ? feat.inventory_text_low : feat.inventory_text_in) || '').replace(/\{n\}/g, left) : '';
    const item = {
      ...r,
      stock_status: tracked && left <= 0 ? 'sold_out' : r.stock_status,
      stock_tracked: tracked,
      stock_left: left,
      stock_low: tracked && left <= low,
      stock_note: stockText,
      max_qty: tracked && feat.inventory_block_over ? Math.max(1, Math.min(20, left)) : 20,
      size_cfg: type ? { label: type.size_label || 'Kích cỡ', unit: type.size_unit || '', free: !!type.size_free, info_label: type.info_label || '' } : { label: 'Kích cỡ', unit: '', free: false, info_label: '' },
      product_type: type ? { id: type.id, name: type.name, slug: type.slug, uses_jade_fields: !!type.uses_jade_fields, active: !!type.active } : null,
      type_active: type ? !!type.active : true,
      attrs,
      // Thông số tự đặt của loại sản phẩm, đã ghép nhãn + giá trị để hiển thị
      spec_values: (type?.spec_fields || []).map((f) => ({ label: f.label, value: attrs[f.key] })).filter((v) => v.value !== undefined && v.value !== ''),
      sizes: safeJson(r.sizes, []),
      specs: safeJson(r.specs, []),
      jade_type: pick(r.jade_type_id),
      color: pick(r.color_id),
      style: pick(r.style_id),
      elements: elements.filter((e) => e.product_id === r.id).map((e) => pick(e.term_id)).filter(Boolean),
      cover,
      rating_count: ratings[r.id]?.c || 0,
      rating_avg: ratings[r.id] ? Math.round(ratings[r.id].a * 10) / 10 : 0,
      images: withImages ? [cover, ...gallery.filter((g) => g.id !== cover?.id)].filter(Boolean) : undefined,
      // Ảnh góc khác, hiện khi di chuột vào thẻ sản phẩm
      hover: gallery.find((g) => g.id !== cover?.id) || null,
      final_price: r.sale_price ?? r.price,
      on_sale: r.sale_price != null && r.price != null && r.sale_price < r.price,
      stock_label: STOCK_LABEL[tracked && left <= 0 ? 'sold_out' : r.stock_status],
      show_new: !!r.is_new || (newDays > 0 && Date.now() - new Date(String(r.created_at).replace(' ', 'T') + 'Z').getTime() < newDays * 864e5),
    };
    // Đường dẫn chuẩn theo phân cấp: /san-pham/<loại>/<sản phẩm>
    item.url = productPath(item);
    return item;
  });
}

function termIdBySlug(type, slug) {
  if (!slug) return null;
  return db.prepare('SELECT id FROM terms WHERE type = ? AND slug = ?').pluck().get(type, slug) ?? -1;
}

// Bộ lọc dùng chung cho trang sản phẩm. Trả về điều kiện SQL + tham số.
function buildFilter(f, { includeDrafts = false } = {}) {
  const where = [];
  const params = [];
  if (!includeDrafts) where.push(`p.status = 'published'`, TYPE_ACTIVE);
  // Không chọn loại và không tìm kiếm thì chỉ hiện các loại "hiện chung"; khách chủ động tìm kiếm thì tìm trên mọi loại đang hoạt động
  if (!includeDrafts && !f.nhom && !f.q) where.push(IN_MAIN_LIST);
  else if (f.status) { where.push('p.status = ?'); params.push(f.status); }
  // Lọc theo loại sản phẩm: admin truyền id (type), phía khách dùng slug (nhom)
  if (f.type) { where.push('p.product_type_id = ?'); params.push(toInt(f.type, -1)); }
  if (f.nhom) { where.push('p.product_type_id IN (SELECT id FROM product_types WHERE slug = ?)'); params.push(String(f.nhom)); }

  if (f.q) {
    const like = likeVn(String(f.q).slice(0, 100));
    where.push(`(vn(p.name) LIKE ? OR vn(p.sku) LIKE ? OR vn(p.short_description) LIKE ? OR vn(p.origin) LIKE ?
      OR p.jade_type_id IN (SELECT id FROM terms WHERE vn(name) LIKE ?))`);
    params.push(like, like, like, like, like);
  }
  for (const [key, col, type] of [['loai', 'jade_type_id', 'jade_type'], ['mau', 'color_id', 'color'], ['kieu', 'style_id', 'style']]) {
    const slugs = [].concat(f[key] || []).filter(Boolean);
    if (slugs.length) {
      const ids = slugs.map((s) => termIdBySlug(type, s));
      where.push(`p.${col} IN (${ids.map(() => '?').join(',')})`);
      params.push(...ids);
    }
  }
  const elems = [].concat(f.menh || []).filter(Boolean);
  if (elems.length) {
    const ids = elems.map((s) => termIdBySlug('element', s));
    where.push(`p.id IN (SELECT product_id FROM product_elements WHERE term_id IN (${ids.map(() => '?').join(',')}))`);
    params.push(...ids);
  }
  const min = toInt(f.gia_tu);
  const max = toInt(f.gia_den);
  if (f.gia_lh) where.push(`${EFFECTIVE_PRICE} IS NULL`); // giá liên hệ: bỏ qua khoảng giá (sản phẩm giá liên hệ không nằm trong khoảng nào)
  else {
    if (min != null) { where.push(`${EFFECTIVE_PRICE} >= ?`); params.push(min); }
    if (max != null) { where.push(`${EFFECTIVE_PRICE} <= ?`); params.push(max); }
  }
  const size = toInt(f.ni);
  if (size != null) {
    where.push(`EXISTS (SELECT 1 FROM json_each(p.sizes) WHERE CAST(json_each.value AS INTEGER) = ?)`);
    params.push(size);
  }
  if (f.con_hang) where.push(`p.stock_status != 'sold_out'`);
  if (f.custom) where.push('p.is_customizable = 1');
  if (f.featured) where.push('p.is_featured = 1');
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

const SOLD_JOIN = `LEFT JOIN (SELECT json_extract(j.value, '$.id') AS pid, SUM(json_extract(j.value, '$.qty')) AS qty
  FROM inquiries i, json_each(i.items) j WHERE i.type = 'order' AND i.status IN ('confirmed', 'shipping', 'completed') GROUP BY pid) sold ON sold.pid = p.id`;

const SORTS = {
  moi: 'p.created_at DESC, p.id DESC',
  gia_tang: `(${EFFECTIVE_PRICE} IS NULL), ${EFFECTIVE_PRICE} ASC`,
  gia_giam: `${EFFECTIVE_PRICE} DESC`,
  // Thứ tự kéo thả trong admin (sort_order) đứng đầu; sản phẩm chưa sắp xếp (sort_order bằng nhau) thì Best Seller, nổi bật lên trước
  noi_bat: 'p.sort_order ASC, p.is_bestseller DESC, p.is_featured DESC, p.id DESC',
  // Best Seller trước, sau đó theo số lượng đã bán (đơn đã xác nhận / hoàn thành)
  // Số đã bán tính MỘT lần cho cả bảng (SOLD_JOIN) rồi ghép vào, không tính lại cho từng sản phẩm (cách cũ chậm theo cấp số nhân khi nhiều đơn)
  ban_chay: 'p.is_bestseller DESC, COALESCE(sold.qty, 0) DESC, p.id DESC',
  ten: 'p.name COLLATE NOCASE ASC',
};
export const SORT_OPTIONS = [
  { value: 'noi_bat', label: 'Nổi bật' },
  { value: 'ban_chay', label: 'Bán chạy nhất' },
  { value: 'moi', label: 'Mới nhất' },
  { value: 'gia_tang', label: 'Giá tăng dần' },
  { value: 'gia_giam', label: 'Giá giảm dần' },
  { value: 'ten', label: 'Tên A–Z' },
];

export function searchProducts(filters = {}, { page = 1, perPage = 12, includeDrafts = false } = {}) {
  const { sql, params } = buildFilter(filters, { includeDrafts });
  const order = SORTS[filters.sap_xep] || SORTS.noi_bat;
  const total = db.prepare(`SELECT COUNT(*) FROM products p ${sql}`).pluck().get(...params);
  const pages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, toInt(page, 1)), pages);
  const rows = db.prepare(`SELECT p.* FROM products p ${filters.sap_xep === 'ban_chay' ? SOLD_JOIN : ''} ${sql} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .all(...params, perPage, (current - 1) * perPage);
  return { items: hydrate(rows), total, page: current, pages, perPage };
}

// Gợi ý khi khách gõ vào ô tìm kiếm: sản phẩm (tên bắt đầu bằng từ khóa xếp trước, rồi tên chứa, rồi mã / mô tả / loại ngọc)
// và vài loại ngọc / loại sản phẩm khớp tên để bấm vào thẳng trang loại. Không phân biệt hoa thường và dấu.
export function suggestProducts(q, limit = 6) {
  const text = String(q || '').trim().slice(0, 60);
  if (text.length < 2) return { items: [], groups: [] };
  const max = Math.min(10, Math.max(3, Number(limit) || 6));
  const contains = likeVn(text);
  const prefix = likeVn(text).replace(/^%/, '');
  const rows = db.prepare(`SELECT p.* FROM products p
    WHERE p.status = 'published' AND ${TYPE_ACTIVE}
      AND (vn(p.name) LIKE @c OR vn(p.sku) LIKE @c OR vn(p.short_description) LIKE @c OR p.jade_type_id IN (SELECT id FROM terms WHERE vn(name) LIKE @c))
    ORDER BY (vn(p.name) LIKE @p) DESC, (vn(p.name) LIKE @c) DESC, (p.stock_status = 'sold_out') ASC, p.sort_order ASC, p.id DESC LIMIT @n`)
    .all({ c: contains, p: prefix, n: max });
  const groups = [
    ...db.prepare("SELECT name, slug FROM terms WHERE type = 'jade_type' AND active = 1 AND vn(name) LIKE ? ORDER BY sort_order, name LIMIT 3").all(contains)
      .map((t) => ({ name: t.name, url: `/san-pham/${t.slug}` })),
    ...db.prepare('SELECT name, slug FROM product_types WHERE active = 1 AND uses_jade_fields = 0 AND vn(name) LIKE ? ORDER BY sort_order LIMIT 2').all(contains)
      .map((t) => ({ name: t.name, url: `/san-pham/${t.slug}` })),
  ].slice(0, 4);
  return { items: hydrate(rows), groups };
}

// Đổi vị trí sản phẩm bằng kéo thả. ids = các sản phẩm đang hiện (một trang, hoặc đã lọc) theo thứ tự MỚI.
// Chỉ hoán đổi vị trí giữa chính các sản phẩm đó trong thứ tự toàn bộ cửa hàng, sản phẩm khác giữ nguyên chỗ;
// rồi ghi lại sort_order 1..n cho tất cả để thứ tự ổn định.
export function reorderProducts(ids) {
  const wanted = [...new Set((ids || []).map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  if (wanted.length < 2) return 0;
  const all = db.prepare(`SELECT p.id FROM products p ORDER BY ${SORTS.noi_bat}`).pluck().all();
  const present = new Set(all);
  const moved = wanted.filter((id) => present.has(id));
  const inMoved = new Set(moved);
  const slots = all.map((id, i) => (inMoved.has(id) ? i : -1)).filter((i) => i >= 0);
  const next = [...all];
  slots.forEach((slot, k) => { next[slot] = moved[k]; });
  const upd = db.prepare('UPDATE products SET sort_order = ? WHERE id = ? AND sort_order != ?');
  tx(() => next.forEach((id, i) => upd.run(i + 1, id, i + 1)));
  return moved.length;
}

export function featuredProducts(limit = 8) {
  const rows = db.prepare(`SELECT * FROM products p WHERE status = 'published' AND ${TYPE_ACTIVE} AND (is_featured = 1 OR is_bestseller = 1)
    ORDER BY sort_order, is_bestseller DESC, id DESC LIMIT ?`).all(limit);
  return hydrate(rows);
}

// Dữ liệu cho thanh lọc: danh mục + số lượng, các ni có sẵn, khoảng giá
export function productFacets() {
  const counts = Object.fromEntries(db.prepare(`
    SELECT t.id, COUNT(DISTINCT p.id) AS c FROM terms t
    LEFT JOIN products p ON p.status = 'published' AND ${TYPE_ACTIVE} AND (p.jade_type_id = t.id OR p.color_id = t.id OR p.style_id = t.id
      OR p.id IN (SELECT product_id FROM product_elements WHERE term_id = t.id))
    GROUP BY t.id`).all().map((r) => [r.id, r.c]));
  const terms = allTermsGrouped({ activeOnly: true });
  for (const list of Object.values(terms)) for (const t of list) t.count = counts[t.id] || 0;
  const sizes = db.prepare(`SELECT DISTINCT CAST(j.value AS INTEGER) AS s FROM products p, json_each(p.sizes) j
    WHERE p.status = 'published' AND ${TYPE_ACTIVE} ORDER BY s`).pluck().all().filter((s) => s > 0);
  const price = db.prepare(`SELECT MIN(${EFFECTIVE_PRICE}) AS min, MAX(${EFFECTIVE_PRICE}) AS max FROM products p WHERE status = 'published' AND ${TYPE_ACTIVE} AND ${IN_MAIN_LIST}`).get();
  return { terms, sizes, price };
}

export function getProduct(idOrSlug, { publicOnly = true } = {}) {
  const col = typeof idOrSlug === 'number' ? 'id' : 'slug';
  const row = db.prepare(`SELECT * FROM products p WHERE ${col} = ? ${publicOnly ? `AND status = 'published' AND ${TYPE_ACTIVE}` : ''}`).get(idOrSlug);
  if (!row) return null;
  const [product] = hydrate([row], { withImages: true });
  const certs = db.prepare('SELECT * FROM certificates WHERE product_id = ? ORDER BY sort_order, id').all(row.id);
  const certMedia = getMediaMap(certs.map((c) => c.media_id));
  product.certificates = certs.map((c) => ({ ...c, image: certMedia[c.media_id] || null }));
  product.element_ids = product.elements.map((e) => e.id);
  product.image_ids = db.prepare('SELECT media_id FROM product_images WHERE product_id = ? ORDER BY sort_order').pluck().all(row.id);
  product.summary = product.short_description || truncate(stripHtml(product.description), 180);
  return product;
}

export function relatedProducts(product, limit = 4) {
  // Gợi ý cùng loại sản phẩm (pháp phục gợi ý pháp phục, ngọc gợi ý ngọc)
  const rows = db.prepare(`SELECT * FROM products p WHERE status = 'published' AND ${TYPE_ACTIVE} AND id != ? AND product_type_id = ?
    ORDER BY (jade_type_id = ?) DESC, is_featured DESC, id DESC LIMIT ?`).all(product.id, product.product_type_id || 1, product.jade_type_id || 0, limit);
  return hydrate(rows);
}

// Lấy sản phẩm theo danh sách id (dùng khi tính lại giá giỏ hàng phía server)
export function productsByIds(ids) {
  const list = [...new Set(ids.map(Number).filter(Number.isInteger))];
  if (!list.length) return [];
  const rows = db.prepare(`SELECT * FROM products p WHERE status = 'published' AND ${TYPE_ACTIVE} AND id IN (${list.map(() => '?').join(',')})`).all(...list);
  return hydrate(rows);
}

// ---------------- Loại sản phẩm ----------------
const SPEC_KINDS = ['text', 'number', 'select'];

function parseType(row) {
  return row && { ...row, uses_jade_fields: !!row.uses_jade_fields, in_main_list: !!row.in_main_list, active: !!row.active, size_free: !!row.size_free, spec_fields: safeJson(row.spec_fields, []), size_options: safeJson(row.size_options, []) };
}

export function getProductType(id) {
  if (!id) return null;
  return parseType(db.prepare('SELECT * FROM product_types WHERE id = ?').get(id));
}

// product_count: số sản phẩm thuộc loại (kể cả bản nháp)
export function listProductTypes({ activeOnly = false } = {}) {
  return db.prepare(`SELECT t.*, (SELECT COUNT(*) FROM products p WHERE p.product_type_id = t.id) AS product_count
    FROM product_types t ${activeOnly ? 'WHERE t.active = 1' : ''} ORDER BY t.sort_order, t.id`).all().map(parseType);
}

// Các loại sản phẩm đang hoạt động và có ít nhất 1 sản phẩm đang bán (dùng cho menu, sitemap, trang theo loại).
// onlyNonJade = true: bỏ loại ngọc (ngọc đã có menu theo loại ngọc riêng).
export function listPublicProductGroups({ onlyNonJade = false } = {}) {
  return db.prepare(`SELECT t.*, (SELECT COUNT(*) FROM products p WHERE p.product_type_id = t.id AND p.status = 'published') AS public_count
    FROM product_types t WHERE t.active = 1 ${onlyNonJade ? 'AND t.uses_jade_fields = 0' : ''} ORDER BY t.sort_order, t.id`).all()
    .map(parseType).filter((t) => t.public_count > 0);
}

const cleanOptions = (value) => [...new Set((Array.isArray(value) ? value : String(value || '').split(/[\n,;]+/))
  .map((o) => cleanText(o, 60)).filter(Boolean))].slice(0, 50);

// Chuẩn hóa danh sách thông số do chủ shop khai báo: nhãn, kiểu (ô chữ / số / danh sách chọn), mã duy nhất
function cleanSpecFields(list) {
  const used = new Set();
  return (Array.isArray(list) ? list : []).slice(0, 30).map((f) => {
    const label = cleanText(f?.label, 80);
    if (!label) return null;
    const base = (cleanText(f.key, 40) || slugify(label).replace(/-/g, '_') || 'thong_so');
    let key = base;
    for (let i = 2; used.has(key); i++) key = `${base}_${i}`;
    used.add(key);
    const kind = SPEC_KINDS.includes(f.kind) ? f.kind : 'text';
    return { key, label, kind, options: kind === 'select' ? cleanOptions(f.options) : [] };
  }).filter(Boolean);
}

export function saveProductType(id, data) {
  const name = cleanText(data.name, 80);
  if (!name) throw new HttpError(400, 'Vui lòng nhập tên loại sản phẩm');
  const current = id ? getProductType(id) : null;
  if (id && !current) throw new HttpError(404, 'Không tìm thấy loại sản phẩm');
  const active = bool(data.active ?? true);
  if (current?.uses_jade_fields && !active) throw new HttpError(400, 'Không thể tắt loại sản phẩm chính của shop (Vòng tay ngọc)');
  const values = {
    name,
    slug: freeCategorySlug(uniqueSlug('product_types', slugify(data.slug || name), id), { exceptTypeId: id || 0 }),
    description: cleanText(data.description, 300),
    active: active ? 1 : 0,
    // Loại chính (ngọc) luôn hiện trong "Tất cả sản phẩm"; loại khác tùy chủ shop, mặc định không
    in_main_list: current?.uses_jade_fields || bool(data.in_main_list) ? 1 : 0,
    sort_order: toInt(data.sort_order, 0),
    // Loại dùng bộ thuộc tính ngọc chỉ có loại chính; không cho đổi từ giao diện
    spec_fields: JSON.stringify(current?.uses_jade_fields ? [] : cleanSpecFields(data.spec_fields)),
    // Lựa chọn khi đặt hàng: nhãn ("Ni tay", "Kích cỡ"), đơn vị, gợi ý nhanh, cho khách nhập riêng, ô thông tin thêm
    // Loại ngọc có cách chọn ni cố định (số, mm) nên giữ nguyên
    size_label: current?.uses_jade_fields ? current.size_label : (cleanText(data.size_label, 40) || 'Kích cỡ'),
    size_unit: current?.uses_jade_fields ? current.size_unit : cleanText(data.size_unit, 12),
    size_options: JSON.stringify(current?.uses_jade_fields ? current.size_options : cleanOptions(data.size_options).map((o) => o.slice(0, 20))),
    size_free: current?.uses_jade_fields ? 1 : (bool(data.size_free) ? 1 : 0),
    info_label: current?.uses_jade_fields ? current.info_label : cleanText(data.info_label, 120),
  };
  if (id) {
    const before = current && current.slug !== values.slug && !current.uses_jade_fields ? snapUrls(productIdsOf('product_type_id', id)) : null;
    db.prepare(`UPDATE product_types SET name=@name, slug=@slug, description=@description, active=@active, in_main_list=@in_main_list, sort_order=@sort_order, spec_fields=@spec_fields,
      size_label=@size_label, size_unit=@size_unit, size_options=@size_options, size_free=@size_free, info_label=@info_label WHERE id=@id`).run({ ...values, id });
    if (before) { addAutoRedirect(`/san-pham/${current.slug}`, `/san-pham/${values.slug}`); redirectMoved(before); }
    return id;
  }
  return db.prepare(`INSERT INTO product_types (name, slug, description, uses_jade_fields, spec_fields, active, in_main_list, sort_order, size_label, size_unit, size_options, size_free, info_label)
    VALUES (@name, @slug, @description, 0, @spec_fields, @active, @in_main_list, @sort_order, @size_label, @size_unit, @size_options, @size_free, @info_label)`).run(values).lastInsertRowid;
}

export function deleteProductType(id) {
  const t = getProductType(id);
  if (!t) throw new HttpError(404, 'Không tìm thấy loại sản phẩm');
  if (t.uses_jade_fields) throw new HttpError(400, 'Không thể xóa loại sản phẩm chính của shop');
  const n = db.prepare('SELECT COUNT(*) FROM products WHERE product_type_id = ?').pluck().get(id);
  if (n) throw new HttpError(409, `Loại này còn ${n} sản phẩm. Hãy chuyển hoặc xóa các sản phẩm đó trước.`);
  db.prepare('DELETE FROM product_types WHERE id = ?').run(id);
}

// Làm sạch giá trị thông số tự đặt theo khai báo của loại. Giá trị mới ở thông số dạng danh sách chọn
// được tự thêm vào danh sách (trả về fields mới để lưu lại, hoặc null nếu không đổi).
function sanitizeAttrs(type, input) {
  const src = input && typeof input === 'object' ? input : {};
  const attrs = {};
  let changed = false;
  const fields = (type.spec_fields || []).map((f) => ({ ...f, options: [...(f.options || [])] }));
  for (const f of fields) {
    const raw = src[f.key];
    if (raw === undefined || raw === null || raw === '') continue;
    let value;
    if (f.kind === 'number') {
      const n = Number(String(raw).replace(',', '.'));
      value = Number.isFinite(n) ? String(n) : '';
    } else {
      value = cleanText(raw, f.kind === 'select' ? 100 : 300);
    }
    if (!value) continue;
    if (f.kind === 'select' && !f.options.includes(value) && f.options.length < 50) { f.options.push(value); changed = true; }
    attrs[f.key] = value;
  }
  return { attrs, fields: changed ? fields : null };
}

const priceOrNull = (v) => {
  const n = toInt(String(v ?? '').replace(/[^\d]/g, ''));
  return n != null && n >= 0 ? n : null;
};

// Sửa nhanh giá bán / giá khuyến mãi ngay ở danh sách. Để trống giá bán = hiển thị "Liên hệ".
export function updateProductPrice(id, data) {
  const cur = db.prepare('SELECT id, price, sale_price FROM products WHERE id = ?').get(id);
  if (!cur) throw new HttpError(404, 'Không tìm thấy sản phẩm');
  const price = priceOrNull(data.price);
  const sale = priceOrNull(data.sale_price);
  if (price == null && sale != null) throw new HttpError(422, 'Hãy nhập giá bán trước khi nhập giá khuyến mãi', { price: 'Cần nhập giá bán' });
  if (price != null && sale != null && sale >= price) throw new HttpError(422, 'Giá khuyến mãi phải nhỏ hơn giá bán', { sale_price: 'Phải nhỏ hơn giá bán' });
  if (price != null && price > 1e11) throw new HttpError(422, 'Giá quá lớn', { price: 'Giá quá lớn' });
  db.prepare("UPDATE products SET price = ?, sale_price = ?, updated_at = datetime('now') WHERE id = ?").run(price, sale, id);
  return { id, before: { price: cur.price, sale_price: cur.sale_price }, price, sale_price: sale, final_price: sale ?? price, on_sale: sale != null && price != null && sale < price };
}

export function saveProduct(id, data, userId = null) {
  const name = cleanText(data.name, 200);
  if (!name) throw new HttpError(400, 'Vui lòng nhập tên sản phẩm');
  let slug = uniqueSlug('products', slugify(data.slug || name), id);
  // Không trùng tên với trang loại ngọc / loại sản phẩm (cùng nằm dưới /san-pham/)
  { let i = 2; const base = slug; while (categorySlugTaken(slug)) slug = `${base}-${i++}`; }
  const urlBefore = id ? snapUrls([id]) : {};
  const specs = (Array.isArray(data.specs) ? data.specs : [])
    .map((s) => ({ label: cleanText(s?.label, 100), value: cleanText(s?.value, 300) }))
    .filter((s) => s.label && s.value).slice(0, 30);

  // Loại sản phẩm: loại không dùng bộ thuộc tính ngọc thì các trường riêng của ngọc được xóa trắng, thông số tự đặt lưu ở attrs
  const type = getProductType(toInt(data.product_type_id)) || getProductType(1);
  const jade = !!type.uses_jade_fields;
  const { attrs, fields: typeFields } = sanitizeAttrs(type, jade ? {} : data.attrs);
  // Ngọc: ni là số (mm), sắp xếp tăng dần. Loại khác: kích cỡ là chữ tự đặt (S, M, L, Free size...), giữ thứ tự nhập
  const sizes = jade
    ? [...new Set([].concat(data.sizes || []).flatMap((s) => String(s).split(/[,;\s]+/)).map((s) => toInt(s)).filter((s) => s > 0 && s < 200))].sort((a, b) => a - b)
    : [...new Set([].concat(data.sizes || []).flatMap((s) => String(s).split(/[,;\n]+/)).map((s) => cleanText(s, 20)).filter(Boolean))].slice(0, 30);

  const values = {
    name, slug,
    product_type_id: type.id,
    attrs: JSON.stringify(attrs),
    sku: cleanText(data.sku, 60),
    short_description: cleanText(data.short_description, 500),
    description: cleanHtml(data.description),
    price: priceOrNull(data.price),
    sale_price: priceOrNull(data.sale_price),
    jade_type_id: jade ? toInt(data.jade_type_id) : null,
    color_id: jade ? toInt(data.color_id) : null,
    style_id: jade ? toInt(data.style_id) : null,
    sizes: JSON.stringify(sizes),
    track_stock: bool(data.track_stock) ? 1 : 0,
    bead_size: jade ? cleanText(data.bead_size, 100) : '',
    origin: jade ? cleanText(data.origin, 150) : '',
    weight: jade ? cleanText(data.weight, 60) : '',
    specs: JSON.stringify(specs),
    stock_status: STOCK_LABEL[data.stock_status] ? data.stock_status : 'in_stock',
    is_featured: bool(data.is_featured) ? 1 : 0,
    is_bestseller: bool(data.is_bestseller) ? 1 : 0,
    is_new: bool(data.is_new) ? 1 : 0,
    fengshui: jade ? cleanText(data.fengshui, 3000) : '',
    is_customizable: bool(data.is_customizable) ? 1 : 0,
    status: data.status === 'published' ? 'published' : 'draft',
    sort_order: toInt(data.sort_order, 0),
    cover_media_id: toInt(data.cover_media_id),
    seo_title: cleanText(data.seo_title, 200),
    seo_description: cleanText(data.seo_description, 400),
  };

  const result = tx(() => {
    let pid = id;
    if (id) {
      const sets = Object.keys(values).map((k) => `${k} = @${k}`).join(', ');
      const res = db.prepare(`UPDATE products SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run({ ...values, id });
      if (!res.changes) throw new HttpError(404, 'Không tìm thấy sản phẩm');
    } else {
      const cols = Object.keys(values);
      pid = db.prepare(`INSERT INTO products (${cols.join(',')}) VALUES (${cols.map((c) => '@' + c).join(',')})`).run(values).lastInsertRowid;
    }

    db.prepare('DELETE FROM product_elements WHERE product_id = ?').run(pid);
    const insEl = db.prepare('INSERT OR IGNORE INTO product_elements (product_id, term_id) VALUES (?, ?)');
    if (jade) for (const tid of [].concat(data.element_ids || []).map((x) => toInt(x)).filter(Boolean)) insEl.run(pid, tid);

    db.prepare('DELETE FROM product_images WHERE product_id = ?').run(pid);
    const insImg = db.prepare('INSERT OR IGNORE INTO product_images (product_id, media_id, sort_order) VALUES (?, ?, ?)');
    [].concat(data.image_ids || []).map((x) => toInt(x)).filter(Boolean).forEach((mid, i) => insImg.run(pid, mid, i));

    db.prepare('DELETE FROM certificates WHERE product_id = ?').run(pid);
    const insCert = db.prepare(`INSERT INTO certificates (product_id, issuer, code, issued_date, note, media_id, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)`);
    // Tự thêm giá trị mới của thông số dạng danh sách chọn vào loại sản phẩm (lần sau chọn lại được)
    if (typeFields) db.prepare('UPDATE product_types SET spec_fields = ? WHERE id = ?').run(JSON.stringify(typeFields), type.id);

    (jade && Array.isArray(data.certificates) ? data.certificates : []).slice(0, 10).forEach((c, i) => {
      if (!c?.code && !c?.issuer && !c?.media_id) return;
      insCert.run(pid, cleanText(c.issuer, 200), cleanText(c.code, 100), cleanText(c.issued_date, 30), cleanText(c.note, 500), toInt(c.media_id), i);
    });
    return pid;
  });
  if (id) redirectMoved(urlBefore);
  // Số lượng tồn nhập tay (ghi nhật ký kho); chỉ nhận khi form gửi lên ô này
  if (data.stock_qty !== undefined && data.stock_qty !== '' && data.stock_qty !== null) setStockQty(id || result, data.stock_qty, { reason: id ? 'Sửa tay' : 'Nhập kho ban đầu', userId });
  return id || result;
}

export function deleteProduct(id) {
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
}

// Ẩn / hiện / xóa nhiều sản phẩm cùng lúc. Ẩn = chuyển về bản nháp (khách không thấy, dữ liệu vẫn giữ).
export function bulkProducts(ids, action) {
  const list = [...new Set((ids || []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 500);
  if (!list.length) throw new HttpError(400, 'Chưa chọn sản phẩm nào');
  const marks = list.map(() => '?').join(',');
  let result;
  if (action === 'hide') result = db.prepare(`UPDATE products SET status = 'draft', updated_at = datetime('now') WHERE id IN (${marks})`).run(...list);
  else if (action === 'show') result = db.prepare(`UPDATE products SET status = 'published', updated_at = datetime('now') WHERE id IN (${marks})`).run(...list);
  else if (action === 'delete') result = db.prepare(`DELETE FROM products WHERE id IN (${marks})`).run(...list);
  else throw new HttpError(400, 'Thao tác không hợp lệ');
  return { ids: list, changed: result.changes };
}

export function duplicateProduct(id) {
  const p = getProduct(Number(id), { publicOnly: false });
  if (!p) throw new HttpError(404, 'Không tìm thấy sản phẩm');
  return saveProduct(null, {
    ...p,
    name: `${p.name} (bản sao)`,
    slug: '',
    status: 'draft',
    stock_qty: 0,
    element_ids: p.element_ids,
    image_ids: p.image_ids,
    certificates: [],
  });
}
