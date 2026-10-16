// Danh mục phân loại (terms) và sản phẩm.
import { db, tx } from '../lib/db.js';
import { slugify, safeJson, HttpError, toInt, bool, stripHtml, truncate } from '../lib/utils.js';
import { cleanHtml, cleanText } from '../lib/sanitize.js';
import { getMediaMap } from './media.js';
import { getRaw } from './settings.js';

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

export function saveTerm(id, data) {
  const type = id ? db.prepare('SELECT type FROM terms WHERE id = ?').pluck().get(id) : data.type;
  if (!TERM_TYPES[type]) throw new HttpError(400, 'Loại danh mục không hợp lệ');
  const name = cleanText(data.name, 120);
  if (!name) throw new HttpError(400, 'Vui lòng nhập tên');
  const slug = uniqueSlug('terms', slugify(data.slug || name), id, 'AND type = ?', [type]);
  const values = {
    type, name, slug,
    description: cleanText(data.description, 2000),
    color_hex: /^#[0-9a-f]{3,8}$/i.test(data.color_hex || '') ? data.color_hex : null,
    media_id: toInt(data.media_id),
    sort_order: toInt(data.sort_order, 0),
    active: bool(data.active ?? true) ? 1 : 0,
  };
  if (id) {
    db.prepare(`UPDATE terms SET name=@name, slug=@slug, description=@description, color_hex=@color_hex,
      media_id=@media_id, sort_order=@sort_order, active=@active WHERE id=@id`).run({ ...values, id });
    return id;
  }
  return db.prepare(`INSERT INTO terms (type, name, slug, description, color_hex, media_id, sort_order, active)
    VALUES (@type, @name, @slug, @description, @color_hex, @media_id, @sort_order, @active)`).run(values).lastInsertRowid;
}

export function deleteTerm(id) {
  db.prepare('DELETE FROM terms WHERE id = ?').run(id);
}

// ---------------- Products ----------------
const EFFECTIVE_PRICE = 'COALESCE(p.sale_price, p.price)';

function hydrate(rows, { withImages = false } = {}) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const marks = ids.map(() => '?').join(',');
  const terms = Object.fromEntries(db.prepare('SELECT * FROM terms').all().map((t) => [t.id, t]));
  const elements = db.prepare(`SELECT product_id, term_id FROM product_elements WHERE product_id IN (${marks})`).all(...ids);
  const images = db.prepare(`SELECT product_id, media_id FROM product_images WHERE product_id IN (${marks}) ORDER BY sort_order`).all(...ids);
  const newDays = Number(getRaw('pages').new_days) || 0;
  const mediaIds = [...rows.map((r) => r.cover_media_id), ...images.map((i) => i.media_id)];
  const media = getMediaMap(mediaIds);

  return rows.map((r) => {
    const pick = (tid) => (terms[tid] ? { id: terms[tid].id, name: terms[tid].name, slug: terms[tid].slug, color_hex: terms[tid].color_hex } : null);
    const gallery = images.filter((i) => i.product_id === r.id).map((i) => media[i.media_id]).filter(Boolean);
    const cover = media[r.cover_media_id] || gallery[0] || null;
    return {
      ...r,
      sizes: safeJson(r.sizes, []),
      specs: safeJson(r.specs, []),
      jade_type: pick(r.jade_type_id),
      color: pick(r.color_id),
      style: pick(r.style_id),
      elements: elements.filter((e) => e.product_id === r.id).map((e) => pick(e.term_id)).filter(Boolean),
      cover,
      images: withImages ? [cover, ...gallery.filter((g) => g.id !== cover?.id)].filter(Boolean) : undefined,
      // Ảnh góc khác, hiện khi di chuột vào thẻ sản phẩm
      hover: gallery.find((g) => g.id !== cover?.id) || null,
      final_price: r.sale_price ?? r.price,
      on_sale: r.sale_price != null && r.price != null && r.sale_price < r.price,
      stock_label: STOCK_LABEL[r.stock_status],
      show_new: !!r.is_new || (newDays > 0 && Date.now() - new Date(String(r.created_at).replace(' ', 'T') + 'Z').getTime() < newDays * 864e5),
    };
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
  if (!includeDrafts) where.push(`p.status = 'published'`);
  else if (f.status) { where.push('p.status = ?'); params.push(f.status); }

  if (f.q) {
    const like = `%${String(f.q).trim().slice(0, 100)}%`;
    where.push(`(p.name LIKE ? OR p.sku LIKE ? OR p.short_description LIKE ? OR p.origin LIKE ?
      OR p.jade_type_id IN (SELECT id FROM terms WHERE name LIKE ?))`);
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
  if (min != null) { where.push(`${EFFECTIVE_PRICE} >= ?`); params.push(min); }
  if (max != null) { where.push(`${EFFECTIVE_PRICE} <= ?`); params.push(max); }
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

const SORTS = {
  moi: 'p.created_at DESC, p.id DESC',
  gia_tang: `(${EFFECTIVE_PRICE} IS NULL), ${EFFECTIVE_PRICE} ASC`,
  gia_giam: `${EFFECTIVE_PRICE} DESC`,
  noi_bat: 'p.is_bestseller DESC, p.is_featured DESC, p.sort_order ASC, p.id DESC',
  // Best Seller trước, sau đó theo số lượng đã bán (đơn đã xác nhận / hoàn thành)
  ban_chay: `p.is_bestseller DESC, (SELECT COALESCE(SUM(json_extract(j.value, '$.qty')), 0) FROM inquiries i, json_each(i.items) j
    WHERE i.type = 'order' AND i.status IN ('confirmed', 'completed') AND json_extract(j.value, '$.id') = p.id) DESC, p.id DESC`,
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
  const rows = db.prepare(`SELECT p.* FROM products p ${sql} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .all(...params, perPage, (current - 1) * perPage);
  return { items: hydrate(rows), total, page: current, pages, perPage };
}

export function featuredProducts(limit = 8) {
  const rows = db.prepare(`SELECT * FROM products p WHERE status = 'published' AND (is_featured = 1 OR is_bestseller = 1)
    ORDER BY is_bestseller DESC, sort_order, id DESC LIMIT ?`).all(limit);
  return hydrate(rows);
}

// Dữ liệu cho thanh lọc: danh mục + số lượng, các ni có sẵn, khoảng giá
export function productFacets() {
  const counts = Object.fromEntries(db.prepare(`
    SELECT t.id, COUNT(DISTINCT p.id) AS c FROM terms t
    LEFT JOIN products p ON p.status = 'published' AND (p.jade_type_id = t.id OR p.color_id = t.id OR p.style_id = t.id
      OR p.id IN (SELECT product_id FROM product_elements WHERE term_id = t.id))
    GROUP BY t.id`).all().map((r) => [r.id, r.c]));
  const terms = allTermsGrouped({ activeOnly: true });
  for (const list of Object.values(terms)) for (const t of list) t.count = counts[t.id] || 0;
  const sizes = db.prepare(`SELECT DISTINCT CAST(j.value AS INTEGER) AS s FROM products p, json_each(p.sizes) j
    WHERE p.status = 'published' ORDER BY s`).pluck().all().filter((s) => s > 0);
  const price = db.prepare(`SELECT MIN(${EFFECTIVE_PRICE}) AS min, MAX(${EFFECTIVE_PRICE}) AS max FROM products p WHERE status = 'published'`).get();
  return { terms, sizes, price };
}

export function getProduct(idOrSlug, { publicOnly = true } = {}) {
  const col = typeof idOrSlug === 'number' ? 'id' : 'slug';
  const row = db.prepare(`SELECT * FROM products p WHERE ${col} = ? ${publicOnly ? `AND status = 'published'` : ''}`).get(idOrSlug);
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
  const rows = db.prepare(`SELECT * FROM products p WHERE status = 'published' AND id != ?
    ORDER BY (jade_type_id = ?) DESC, is_featured DESC, id DESC LIMIT ?`).all(product.id, product.jade_type_id || 0, limit);
  return hydrate(rows);
}

// Lấy sản phẩm theo danh sách id (dùng khi tính lại giá giỏ hàng phía server)
export function productsByIds(ids) {
  const list = [...new Set(ids.map(Number).filter(Number.isInteger))];
  if (!list.length) return [];
  const rows = db.prepare(`SELECT * FROM products p WHERE status = 'published' AND id IN (${list.map(() => '?').join(',')})`).all(...list);
  return hydrate(rows);
}

const priceOrNull = (v) => {
  const n = toInt(String(v ?? '').replace(/[^\d]/g, ''));
  return n != null && n >= 0 ? n : null;
};

export function saveProduct(id, data) {
  const name = cleanText(data.name, 200);
  if (!name) throw new HttpError(400, 'Vui lòng nhập tên sản phẩm');
  const slug = uniqueSlug('products', slugify(data.slug || name), id);
  const sizes = [].concat(data.sizes || [])
    .flatMap((s) => String(s).split(/[,;\s]+/))
    .map((s) => toInt(s)).filter((s) => s > 0 && s < 200);
  const specs = (Array.isArray(data.specs) ? data.specs : [])
    .map((s) => ({ label: cleanText(s?.label, 100), value: cleanText(s?.value, 300) }))
    .filter((s) => s.label && s.value).slice(0, 30);

  const values = {
    name, slug,
    sku: cleanText(data.sku, 60),
    short_description: cleanText(data.short_description, 500),
    description: cleanHtml(data.description),
    price: priceOrNull(data.price),
    sale_price: priceOrNull(data.sale_price),
    jade_type_id: toInt(data.jade_type_id),
    color_id: toInt(data.color_id),
    style_id: toInt(data.style_id),
    sizes: JSON.stringify([...new Set(sizes)].sort((a, b) => a - b)),
    bead_size: cleanText(data.bead_size, 100),
    origin: cleanText(data.origin, 150),
    weight: cleanText(data.weight, 60),
    specs: JSON.stringify(specs),
    stock_status: STOCK_LABEL[data.stock_status] ? data.stock_status : 'in_stock',
    is_featured: bool(data.is_featured) ? 1 : 0,
    is_bestseller: bool(data.is_bestseller) ? 1 : 0,
    is_new: bool(data.is_new) ? 1 : 0,
    fengshui: cleanText(data.fengshui, 3000),
    is_customizable: bool(data.is_customizable) ? 1 : 0,
    status: data.status === 'published' ? 'published' : 'draft',
    sort_order: toInt(data.sort_order, 0),
    cover_media_id: toInt(data.cover_media_id),
    seo_title: cleanText(data.seo_title, 200),
    seo_description: cleanText(data.seo_description, 400),
  };

  return tx(() => {
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
    for (const tid of [].concat(data.element_ids || []).map((x) => toInt(x)).filter(Boolean)) insEl.run(pid, tid);

    db.prepare('DELETE FROM product_images WHERE product_id = ?').run(pid);
    const insImg = db.prepare('INSERT OR IGNORE INTO product_images (product_id, media_id, sort_order) VALUES (?, ?, ?)');
    [].concat(data.image_ids || []).map((x) => toInt(x)).filter(Boolean).forEach((mid, i) => insImg.run(pid, mid, i));

    db.prepare('DELETE FROM certificates WHERE product_id = ?').run(pid);
    const insCert = db.prepare(`INSERT INTO certificates (product_id, issuer, code, issued_date, note, media_id, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)`);
    (Array.isArray(data.certificates) ? data.certificates : []).slice(0, 10).forEach((c, i) => {
      if (!c?.code && !c?.issuer && !c?.media_id) return;
      insCert.run(pid, cleanText(c.issuer, 200), cleanText(c.code, 100), cleanText(c.issued_date, 30), cleanText(c.note, 500), toInt(c.media_id), i);
    });
    return pid;
  });
}

export function deleteProduct(id) {
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
}

export function duplicateProduct(id) {
  const p = getProduct(Number(id), { publicOnly: false });
  if (!p) throw new HttpError(404, 'Không tìm thấy sản phẩm');
  return saveProduct(null, {
    ...p,
    name: `${p.name} (bản sao)`,
    slug: '',
    status: 'draft',
    element_ids: p.element_ids,
    image_ids: p.image_ids,
    certificates: [],
  });
}
