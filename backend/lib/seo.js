// Tạo thẻ meta, Open Graph, canonical và dữ liệu có cấu trúc (JSON-LD).
import { config } from '../config/index.js';
import { getPublicSettings } from '../services/settings.js';
import { truncate, stripHtml } from './utils.js';

const abs = (url) => (!url ? null : /^https?:\/\//.test(url) ? url : `${config.baseUrl}${url}`);

// page: khóa trang trong nhóm "SEO từng trang" (home, products, gallery...). Giá trị nhập ở đó được ưu tiên.
// pagination: { page, pages, url: (n) => đường dẫn trang n } → canonical riêng từng trang, rel prev/next, hậu tố "Trang N"
export function buildSeo(req, { page, title, description, image, type = 'website', noindex = false, followLinks = false, jsonLd = [], canonical, pagination } = {}) {
  const s = getPublicSettings();
  const isHome = req.path === '/';
  const ps = page ? s.seo_pages || {} : {};
  const pageTitle = ps[`${page}_title`];
  const pageNo = pagination && pagination.page > 1 ? pagination.page : 0;
  const baseTitle = isHome && !title
    ? pageTitle || s.seo.home_title
    // Cài đặt tự cắt khoảng trắng đầu / cuối nên hậu tố "| Tên shop" lưu không còn dấu cách đầu: nối lại bằng 1 dấu cách
    : pageTitle || `${title || s.site.name}${s.seo.title_suffix ? ` ${String(s.seo.title_suffix).trim()}` : ''}`;
  const fullTitle = pageNo ? `${baseTitle} – Trang ${pageNo}` : baseTitle;
  const desc = truncate(stripHtml(ps[`${page}_description`] || description || s.seo.default_description), 160);
  const img = abs(ps[`${page}_og_image`]?.lg || image || s.seo.og_image?.lg);
  // Canonical bỏ các tham số lọc/trang để tránh trùng lặp nội dung
  const url = pagination ? abs(pagination.url(pagination.page)) : canonical ? abs(canonical) : `${config.baseUrl}${req.path === '/' ? '/' : req.path.replace(/\/+$/, '')}`;

  const org = {
    '@context': 'https://schema.org',
    '@type': 'JewelryStore',
    '@id': `${config.baseUrl}/#organization`,
    name: s.site.name,
    url: config.baseUrl,
    logo: abs(s.site.logo?.md),
    image: img,
    telephone: s.site.phone,
    email: s.site.email,
    address: s.site.address ? { '@type': 'PostalAddress', streetAddress: s.site.address.replace(/\s*\n\s*/g, ', '), addressCountry: 'VN' } : undefined,
    contactPoint: s.site.phone ? { '@type': 'ContactPoint', telephone: s.site.phone, contactType: 'customer service', areaServed: 'VN', availableLanguage: 'Vietnamese' } : undefined,
    slogan: s.site.slogan,
    sameAs: [s.site.facebook, s.site.instagram, s.site.threads, s.site.tiktok, s.site.youtube, s.site.shopee].filter(Boolean),
  };

  return {
    title: fullTitle,
    description: desc,
    keywords: ps[`${page}_keywords`] || s.seo.keywords,
    canonical: url,
    image: img,
    type,
    prev: pagination && pagination.page > 1 ? abs(pagination.url(pagination.page - 1)) : null,
    next: pagination && pagination.page < pagination.pages ? abs(pagination.url(pagination.page + 1)) : null,
    // followLinks: trang noindex nhưng vẫn cho Google đi theo các liên kết bên trong (trang chuyên mục)
    robots: !s.seo.allow_indexing ? 'noindex, nofollow' : noindex ? (followLinks ? 'noindex, follow' : 'noindex, nofollow') : 'index, follow, max-image-preview:large',
    siteName: s.site.name,
    // Tổ chức + website có mặt ở mọi trang để các trang con tham chiếu bằng @id
    jsonLd: [...([org, { '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${config.baseUrl}/#website`, name: s.site.name, url: config.baseUrl, inLanguage: 'vi', publisher: { '@id': `${config.baseUrl}/#organization` },
      potentialAction: { '@type': 'SearchAction', target: `${config.baseUrl}/san-pham?q={search_term_string}`, 'query-input': 'required name=search_term_string' } }]), ...jsonLd]
      .map((obj) => JSON.stringify(obj).replace(/</g, '\\u003c')),
  };
}

export function productJsonLd(p) {
  const s = getPublicSettings();
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${config.baseUrl}/san-pham/${p.slug}#product`,
    url: `${config.baseUrl}/san-pham/${p.slug}`,
    name: p.name,
    sku: p.sku || undefined,
    description: truncate(stripHtml(p.short_description || p.description), 300),
    image: (p.images || []).map((i) => abs(i.lg)),
    brand: { '@type': 'Brand', name: s.site.name },
    category: p.jade_type?.name || p.product_type?.name,
    material: p.jade_type?.name,
    color: p.color?.name,
  };
  if (p.final_price != null) {
    data.offers = {
      '@type': 'Offer',
      url: `${config.baseUrl}/san-pham/${p.slug}`,
      priceCurrency: 'VND',
      itemCondition: 'https://schema.org/NewCondition',
      price: p.final_price,
      availability: p.stock_status === 'sold_out' ? 'https://schema.org/SoldOut'
        : p.stock_status === 'made_to_order' ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: s.site.name },
    };
  }
  return data;
}

export function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.url) })),
  };
}

export function articleJsonLd(post) {
  const s = getPublicSettings();
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    url: `${config.baseUrl}/blog/${post.slug}`,
    inLanguage: 'vi',
    articleSection: post.category?.name,
    wordCount: stripHtml(post.content).split(' ').length,
    isPartOf: { '@type': 'Blog', name: s.pages.blog_title, url: `${config.baseUrl}/blog` },
    headline: post.title,
    description: post.summary,
    image: post.cover ? [abs(post.cover.lg)] : undefined,
    datePublished: post.published_at ? new Date(post.published_at.replace(' ', 'T') + 'Z').toISOString() : undefined,
    dateModified: new Date(post.updated_at.replace(' ', 'T') + 'Z').toISOString(),
    author: { '@type': 'Person', name: post.author || s.site.name },
    publisher: { '@type': 'Organization', name: s.site.name, logo: s.site.logo ? { '@type': 'ImageObject', url: abs(s.site.logo.md) } : undefined },
    mainEntityOfPage: `${config.baseUrl}/blog/${post.slug}`,
  };
}

// Trang danh sách (sản phẩm, blog): CollectionPage + ItemList các mục trên trang hiện tại.
// items: [{ name, url, image }]; offset = số mục của các trang trước (để thứ tự liên tục).
export function collectionJsonLd({ type = 'CollectionPage', name, description, path, items = [], offset = 0 }) {
  const s = getPublicSettings();
  return {
    '@context': 'https://schema.org',
    '@type': type,
    name,
    description: description ? truncate(stripHtml(description), 300) : undefined,
    url: abs(path),
    inLanguage: 'vi',
    isPartOf: { '@id': `${config.baseUrl}/#website` },
    publisher: { '@type': 'Organization', name: s.site.name },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((it, i) => ({
        '@type': 'ListItem', position: offset + i + 1, url: abs(it.url), name: it.name, image: it.image ? abs(it.image) : undefined,
      })),
    },
  };
}

// Trang thường (Về shop, Liên hệ, Gallery, Hướng dẫn size...): type = WebPage | AboutPage | ContactPage | CollectionPage...
export function webPageJsonLd({ type = 'WebPage', name, description, path, image }) {
  return {
    '@context': 'https://schema.org',
    '@type': type,
    name,
    description: description ? truncate(stripHtml(description), 300) : undefined,
    url: abs(path),
    inLanguage: 'vi',
    image: image ? abs(image) : undefined,
    isPartOf: { '@id': `${config.baseUrl}/#website` },
    about: { '@id': `${config.baseUrl}/#organization` },
  };
}
