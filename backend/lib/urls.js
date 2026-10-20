// Đường dẫn chuẩn theo phân cấp cha → con, dùng ở mọi nơi (template, sitemap, JSON-LD, chuyển hướng).
//   Sản phẩm:  /san-pham  →  /san-pham/<loại ngọc | loại sản phẩm>  →  /san-pham/<loại>/<sản phẩm>
//   Blog:      /blog      →  /blog/<chuyên mục>                       →  /blog/<chuyên mục>/<bài viết>
// Sản phẩm chưa có loại ngọc / bài chưa có chuyên mục thì nằm thẳng dưới cấp gốc.

// Phần đầu của đường dẫn không được trùng tên để khỏi nhầm với trang cố định
export const RESERVED_BLOG = ['chuyen-muc'];

// product cần có jade_type / product_type (đã gắn trong catalog.hydrate)
export function productParentSlug(p) {
  return p.jade_type?.slug || (p.product_type && !p.product_type.uses_jade_fields ? p.product_type.slug : '') || '';
}

export function productPath(p) {
  const parent = productParentSlug(p);
  return parent ? `/san-pham/${parent}/${p.slug}` : `/san-pham/${p.slug}`;
}

export function postPath(post) {
  return post.category?.active ? `/blog/${post.category.slug}/${post.slug}` : `/blog/${post.slug}`;
}
