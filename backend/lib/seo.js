// Tạo thẻ meta, Open Graph, canonical và dữ liệu có cấu trúc (JSON-LD).
import { config } from '../config/index.js';
import { getPublicSettings } from '../services/settings.js';
import { truncate, stripHtml } from './utils.js';

const abs = (url) => (!url ? null : /^https?:\/\//.test(url) ? url : `${config.baseUrl}${url}`);

// Tham số theo dõi quảng cáo: cùng nội dung với trang gốc (canonical về trang sạch, vẫn cho index).
// MỌI tham số khác (lọc, sắp xếp, tìm kiếm, phân trang, album...) tạo ra biến thể của trang: tự gắn noindex, follow và KHÔNG có canonical
// (Google khuyên không dùng cùng lúc noindex và canonical), robots.txt cũng chặn "/*?". Tham số mới thêm sau này tự được xử lý như vậy.
const TRACKING = /^(utm_[a-z0-9_]+|fbclid|gclid|gbraid|wbraid|msclkid|yclid|mc_cid|mc_eid|_ga|_gl|ref|zarsrc)$/i;
export const hasRealParams = (req) => Object.keys(req.query || {}).some((k) => !TRACKING.test(k));

const PAGE_TYPES = new Set(['WebPage', 'AboutPage', 'ContactPage', 'CollectionPage', 'ItemPage', 'FAQPage', 'ProfilePage', 'Product', 'BlogPosting', 'Article']);
const num = (v) => { const n = Number(String(v ?? '').replace(',', '.')); return String(v ?? '').trim() !== '' && Number.isFinite(n) ? n : null; };

// Dữ liệu cửa hàng / tổ chức: dựng mỗi lần từ cài đặt nên tự cập nhật ngay khi shop sửa
function organizationJsonLd(s, img) {
  const sc = s.schema || {};
  const street = (sc.address_street || s.site.address || '').replace(/\s*\n\s*/g, ', ').trim();
  const lat = num(sc.geo_lat); const lng = num(sc.geo_lng);
  const hours = String(sc.opening_hours || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const address = street || sc.address_locality || sc.address_region || sc.address_postal
    ? { '@type': 'PostalAddress', streetAddress: street || undefined, addressLocality: sc.address_locality || undefined, addressRegion: sc.address_region || undefined, postalCode: sc.address_postal || undefined, addressCountry: 'VN' }
    : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': sc.business_type || 'JewelryStore',
    '@id': config.baseUrl + '/#organization',
    name: s.site.name,
    url: config.baseUrl,
    logo: abs(s.site.logo?.md),
    image: img,
    telephone: s.site.phone || undefined,
    email: s.site.email || undefined,
    address,
    geo: lat != null && lng != null ? { '@type': 'GeoCoordinates', latitude: lat, longitude: lng } : undefined,
    priceRange: sc.price_range || undefined,
    openingHours: hours.length ? hours : undefined,
    contactPoint: s.site.phone ? { '@type': 'ContactPoint', telephone: s.site.phone, contactType: 'customer service', areaServed: 'VN', availableLanguage: 'Vietnamese' } : undefined,
    slogan: s.site.slogan || undefined,
    sameAs: [s.site.facebook, s.site.instagram, s.site.threads, s.site.tiktok, s.site.youtube, s.site.shopee].filter(Boolean),
  };
}

// page: khóa trang trong nhóm "SEO từng trang" (home, products, gallery...). Giá trị nhập ở đó được ưu tiên.
// pagination: { page, pages, url: (n) => đường dẫn trang n } → hậu tố "Trang N" trong tiêu đề; trang 2 trở đi là biến thể (noindex)
// Trang nào không tự khai báo schema thì vẫn có WebPage + BreadcrumbList tự động (chỉ trang cho index).
export function buildSeo(req, { page, title, description, image, type = 'website', noindex = false, followLinks = false, jsonLd = [], canonical, pagination } = {}) {
  const s = getPublicSettings();
  const isHome = req.path === '/';
  const ps = page ? s.seo_pages || {} : {};
  const pageTitle = ps[page + '_title'];
  const pageNo = pagination && pagination.page > 1 ? pagination.page : 0;
  const baseTitle = isHome && !title
    ? pageTitle || s.seo.home_title
    // Cài đặt tự cắt khoảng trắng đầu / cuối nên hậu tố "| Tên shop" lưu không còn dấu cách đầu: nối lại bằng 1 dấu cách
    : pageTitle || (title || s.site.name) + (s.seo.title_suffix ? ' ' + String(s.seo.title_suffix).trim() : '');
  const fullTitle = pageNo ? baseTitle + ' – Trang ' + pageNo : baseTitle;
  const desc = truncate(stripHtml(ps[page + '_description'] || description || s.seo.default_description), 160);
  // Ảnh chia sẻ: ảnh riêng của trang → ảnh chia sẻ mặc định → logo (trang nào cũng có og:image)
  const img = abs(ps[page + '_og_image']?.lg || image || s.seo.og_image?.lg || s.site.logo?.lg || s.site.logo?.md);

  const variant = hasRealParams(req) || pageNo > 0;
  const cleanPath = req.path === '/' ? '/' : req.path.replace(/\/+$/, '');
  const cleanUrl = canonical ? abs(canonical) : pagination ? abs(pagination.url(1)) : config.baseUrl + cleanPath;
  const indexable = !!s.seo.allow_indexing && !noindex && !variant;
  const robots = !s.seo.allow_indexing ? 'noindex, nofollow'
    : noindex ? (followLinks || variant ? 'noindex, follow' : 'noindex, nofollow')
      : variant ? 'noindex, follow'
        : 'index, follow, max-image-preview:large';

  const extra = [];
  if (indexable) {
    if (!jsonLd.some((o) => PAGE_TYPES.has(o['@type']))) extra.push(webPageJsonLd({ name: fullTitle, description: desc, path: cleanPath, image: img }));
    if (!isHome && !jsonLd.some((o) => o['@type'] === 'BreadcrumbList')) {
      extra.push(breadcrumbJsonLd([{ name: 'Trang chủ', url: '/' }, { name: title || fullTitle, url: cleanPath }]));
    }
  }
  const sc = s.schema || {};
  const site = {
    '@context': 'https://schema.org', '@type': 'WebSite', '@id': config.baseUrl + '/#website', name: s.site.name, url: config.baseUrl, inLanguage: 'vi',
    publisher: { '@id': config.baseUrl + '/#organization' },
    potentialAction: sc.search_action === false ? undefined : { '@type': 'SearchAction', target: config.baseUrl + '/san-pham?q={search_term_string}', 'query-input': 'required name=search_term_string' },
  };

  return {
    title: fullTitle,
    description: desc,
    keywords: ps[page + '_keywords'] || s.seo.keywords,
    // Trang không cho index (biến thể có tham số, giỏ hàng, chuyên mục blog, khi tắt index...) không có canonical: không dùng cả noindex lẫn canonical
    canonical: indexable ? cleanUrl : null,
    url: cleanUrl,
    image: img,
    type,
    robots,
    siteName: s.site.name,
    // Tổ chức + website có mặt ở mọi trang để các trang con tham chiếu bằng @id
    jsonLd: sc.enabled === false ? [] : [organizationJsonLd(s, img), site, ...extra, ...jsonLd].map((obj) => JSON.stringify(obj).replace(/</g, '\\u003c')),
  };
}

// reviews: { count, avg } số sao tổng hợp từ các đánh giá đã duyệt (null = không khai báo)
export function productJsonLd(p, reviews = null) {
  const s = getPublicSettings();
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${config.baseUrl}${p.url}#product`,
    url: `${config.baseUrl}${p.url}`,
    name: p.name,
    sku: p.sku || undefined,
    description: truncate(stripHtml(p.short_description || p.description), 300),
    image: (p.images || []).map((i) => abs(i.lg)),
    brand: { '@type': 'Brand', name: s.site.name },
    category: p.jade_type?.name || p.product_type?.name,
    material: p.jade_type?.name,
    color: p.color?.name,
  };
  if (reviews?.count) data.aggregateRating = { '@type': 'AggregateRating', ratingValue: reviews.avg, bestRating: 5, worstRating: 1, reviewCount: reviews.count };
  if (p.final_price != null) {
    const sc = s.schema || {};
    const offers = {
      '@type': 'Offer',
      url: config.baseUrl + p.url,
      priceCurrency: 'VND',
      itemCondition: 'https://schema.org/NewCondition',
      price: p.final_price,
      availability: p.stock_status === 'sold_out' ? 'https://schema.org/SoldOut'
        : p.stock_status === 'made_to_order' ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock',
      seller: { '@id': config.baseUrl + '/#organization' },
    };
    const days = Number(sc.product_valid_days);
    if (days > 0) offers.priceValidUntil = new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
    if (sc.return_enabled) {
      offers.hasMerchantReturnPolicy = {
        '@type': 'MerchantReturnPolicy', applicableCountry: 'VN',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow', merchantReturnDays: Number(sc.return_days) || 7,
        returnMethod: sc.return_method === 'store' ? 'https://schema.org/ReturnInStore' : 'https://schema.org/ReturnByMail',
        returnFees: sc.return_fees === 'free' ? 'https://schema.org/FreeReturn' : 'https://schema.org/ReturnShippingFees',
      };
    }
    if (sc.shipping_enabled) {
      const range = (min, max) => ({ '@type': 'QuantitativeValue', minValue: Number(min) || 0, maxValue: Math.max(Number(max) || 0, Number(min) || 0), unitCode: 'DAY' });
      offers.shippingDetails = {
        '@type': 'OfferShippingDetails',
        shippingRate: { '@type': 'MonetaryAmount', value: Number(sc.shipping_cost) || 0, currency: 'VND' },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'VN' },
        deliveryTime: { '@type': 'ShippingDeliveryTime', handlingTime: range(sc.handling_min, sc.handling_max), transitTime: range(sc.transit_min, sc.transit_max) },
      };
    }
    data.offers = offers;
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
    url: `${config.baseUrl}${post.url}`,
    inLanguage: 'vi',
    articleSection: post.category?.name,
    wordCount: stripHtml(post.content).split(' ').length,
    isPartOf: { '@type': 'Blog', name: s.pages.blog_title, url: `${config.baseUrl}/blog` },
    headline: post.title,
    description: post.summary,
    image: post.cover ? [abs(post.cover.lg)] : undefined,
    datePublished: post.published_at ? new Date(post.published_at.replace(' ', 'T') + 'Z').toISOString() : undefined,
    dateModified: new Date(post.updated_at.replace(' ', 'T') + 'Z').toISOString(),
    author: (s.schema || {}).author_type !== 'organization' && post.writer
      ? { '@type': 'Person', name: post.writer.name, jobTitle: post.writer.job_title || undefined, description: post.writer.bio || undefined, image: post.writer.avatar ? abs(post.writer.avatar.md) : undefined, sameAs: post.writer.links?.length ? post.writer.links : undefined }
      : { '@type': 'Organization', name: s.site.name, url: config.baseUrl },
    publisher: { '@type': 'Organization', name: s.site.name, logo: s.site.logo ? { '@type': 'ImageObject', url: abs(s.site.logo.md) } : undefined },
    mainEntityOfPage: `${config.baseUrl}${post.url}`,
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
