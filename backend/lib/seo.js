// Tạo thẻ meta, Open Graph, canonical và dữ liệu có cấu trúc (JSON-LD).
import { config } from '../config/index.js';
import { getPublicSettings } from '../services/settings.js';
import { truncate, stripHtml } from './utils.js';

const abs = (url) => (!url ? null : /^https?:\/\//.test(url) ? url : `${config.baseUrl}${url}`);

// page: khóa trang trong nhóm "SEO từng trang" (home, products, gallery...). Giá trị nhập ở đó được ưu tiên.
export function buildSeo(req, { page, title, description, image, type = 'website', noindex = false, jsonLd = [], canonical } = {}) {
  const s = getPublicSettings();
  const isHome = req.path === '/';
  const ps = page ? s.seo_pages || {} : {};
  const pageTitle = ps[`${page}_title`];
  const fullTitle = isHome && !title
    ? pageTitle || s.seo.home_title
    : pageTitle || `${title || s.site.name}${s.seo.title_suffix || ''}`;
  const desc = truncate(stripHtml(ps[`${page}_description`] || description || s.seo.default_description), 160);
  const img = abs(ps[`${page}_og_image`]?.lg || image || s.seo.og_image?.lg);
  // Canonical bỏ các tham số lọc/trang để tránh trùng lặp nội dung
  const url = canonical ? abs(canonical) : `${config.baseUrl}${req.path === '/' ? '/' : req.path.replace(/\/+$/, '')}`;

  const org = {
    '@context': 'https://schema.org',
    '@type': 'JewelryStore',
    name: s.site.name,
    url: config.baseUrl,
    logo: abs(s.site.logo?.md),
    image: img,
    telephone: s.site.phone,
    email: s.site.email,
    address: s.site.address,
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
    robots: noindex || !s.seo.allow_indexing ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    siteName: s.site.name,
    jsonLd: [...(isHome ? [org, { '@context': 'https://schema.org', '@type': 'WebSite', name: s.site.name, url: config.baseUrl,
      potentialAction: { '@type': 'SearchAction', target: `${config.baseUrl}/san-pham?q={search_term_string}`, 'query-input': 'required name=search_term_string' } }] : []), ...jsonLd]
      .map((obj) => JSON.stringify(obj).replace(/</g, '\\u003c')),
  };
}

export function productJsonLd(p) {
  const s = getPublicSettings();
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    sku: p.sku || undefined,
    description: truncate(stripHtml(p.short_description || p.description), 300),
    image: (p.images || []).map((i) => abs(i.lg)),
    brand: { '@type': 'Brand', name: s.site.name },
    category: p.jade_type?.name,
    material: p.jade_type?.name,
    color: p.color?.name,
  };
  if (p.final_price != null) {
    data.offers = {
      '@type': 'Offer',
      url: `${config.baseUrl}/san-pham/${p.slug}`,
      priceCurrency: 'VND',
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
