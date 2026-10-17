// Các trang giao diện khách.
import { Router } from 'express';
import { getPublicSettings, getRaw } from '../services/settings.js';
import {
  searchProducts, productFacets, featuredProducts, getProduct, relatedProducts, listTerms, SORT_OPTIONS, TERM_TYPES,
} from '../services/catalog.js';
import { listPosts, getPost, listGallery, galleryAlbums } from '../services/content.js';
import { buildSeo, productJsonLd, breadcrumbJsonLd, articleJsonLd, collectionJsonLd, webPageJsonLd } from '../lib/seo.js';
import { pageUrlBuilder } from '../lib/pagination.js';
import { formToken } from '../middleware/security.js';
import { HttpError } from '../lib/utils.js';
import { homeSections } from '../lib/home-layout.js';
import { buildToc } from '../lib/toc.js';
import { navChildren } from '../lib/nav-menu.js';
import { footerColumns, safeLinks } from '../lib/footer-layout.js';

const router = Router();

// Dữ liệu có cấu trúc cho trang thường: WebPage (hoặc AboutPage, ContactPage...) + đường dẫn breadcrumb
function pageSchema({ type, path, name, description, image }) {
  return [
    webPageJsonLd({ type, name, description, path, image }),
    breadcrumbJsonLd([{ name: 'Trang chủ', url: '/' }, { name, url: path }]),
  ];
}

// ?trang= sai (không phải số, =1, hoặc vượt quá số trang) thì chuyển về trang hợp lệ để không bị trùng nội dung
function redirectBadPage(res, raw, result, pageUrl) {
  if (raw === undefined) return false;
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 2 && n <= result.pages) return false;
  res.redirect(301, pageUrl(n > result.pages ? result.pages : 1));
  return true;
}

// Trang gắn với tính năng bật/tắt
const FEATURE_BY_URL = {
  '/blog': 'blog',
  '/gallery': 'gallery',
  '/huong-dan-size': 'size_guide',
  '/thiet-ke-rieng': 'custom_request',
  '/gio-hang': 'checkout',
};

function googleFontsUrl(theme) {
  const families = [...new Set([theme.font_heading, theme.font_body])]
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400`);
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
}

// Dữ liệu chung cho mọi trang khách (header, footer, SEO mặc định...)
export function publicLocals(req, res) {
  const s = getPublicSettings();
  res.locals.s = s;
  res.locals.features = s.features;
  res.locals.currentPath = req.path;
  res.locals.fontsUrl = googleFontsUrl(s.theme);
  res.locals.formToken = formToken();
  res.locals.jadeTypes = listTerms('jade_type', { activeOnly: true });
  res.locals.nav = (s.navigation.items || []).filter((item) => {
    const feature = FEATURE_BY_URL[item.url];
    return item.label && item.url && (!feature || s.features[feature]);
  }).map((item) => ({ ...item, children: navChildren(item, { jadeTypes: res.locals.jadeTypes }) }));
  res.locals.footerCols = footerColumns(s.footer);
  res.locals.footerLinks = safeLinks(s.footer.extra_links);
  res.locals.clientConfig = {
    checkout: !!s.features.checkout,
    showPrices: !!s.features.show_prices,
    animations: !!s.theme.enable_animations,
    welcome: !!s.features.welcome_popup,
    welcomeDelay: Number(s.features.welcome_popup_delay) || 5,
    shopName: s.site.name,
    logo: s.site.logo?.md || '',
    orderImage: {
      enabled: !!s.forms.order_image_enabled, title: s.forms.order_image_title, note: s.forms.order_image_note,
      track: s.forms.order_image_track, button: s.forms.order_image_button, share: s.forms.order_image_share,
    },
    zalo: String(s.site.zalo || '').replace(/[^\d]/g, ''),
    phone: String(s.site.phone || '').replace(/[^\d+]/g, ''),
  };
  res.locals.seo = buildSeo(req, { page: req.path === '/' ? 'home' : undefined });
}

router.use((req, res, next) => {
  publicLocals(req, res);
  // Không cache HTML ở trình duyệt/proxy để nội dung admin sửa hiện ngay
  res.set('Cache-Control', 'no-cache');
  next();
});

// Link video -> link nhúng. Hỗ trợ YouTube (watch, youtu.be, shorts; nhúng không cookie) và TikTok
// (dạng đầy đủ tiktok.com/@tên/video/số; link rút gọn vm.tiktok.com không đổi được ra mã video). Link khác bị bỏ qua.
function videoEmbed(url) {
  const u = String(url || '');
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { src: `https://www.youtube-nocookie.com/embed/${yt[1]}`, vertical: false };
  const tt = u.match(/tiktok\.com\/(?:@[\w.-]+\/video|embed(?:\/v2)?)\/(\d{8,25})/);
  if (tt) return { src: `https://www.tiktok.com/embed/v2/${tt[1]}`, vertical: true };
  return null;
}

const requireFeature =(key) => (req, res, next) => (getRaw('features')[key] ? next() : next(new HttpError(404, 'Trang không tồn tại')));

// ---------------- Trang chủ ----------------
router.get('/', (req, res) => {
  const s = res.locals.s;
  res.view('pages/home.njk', {
    sections: homeSections(s.home_layout),
    featured: featuredProducts(Number(s.home.featured_limit) || 8),
    gallery: s.features.gallery && s.home.show_gallery ? listGallery({ limit: Math.min(Math.max(Number(s.home.gallery_limit) || 24, 4), 60) }) : [],
    posts: s.features.blog && s.home.show_blog ? listPosts({ perPage: 3 }).items : [],
  });
});

// ---------------- Sản phẩm ----------------
router.get('/san-pham', (req, res) => {
  const s = res.locals.s;
  const q = req.query;
  const filters = {
    q: typeof q.q === 'string' ? q.q.slice(0, 100) : '',
    loai: [].concat(q.loai || []), mau: [].concat(q.mau || []), kieu: [].concat(q.kieu || []), menh: [].concat(q.menh || []),
  };
  for (const k of ['gia_tu', 'gia_den', 'ni', 'sap_xep', 'con_hang', 'custom']) {
    filters[k] = typeof q[k] === 'string' ? q[k].slice(0, 20) : '';
  }
  const result = searchProducts(filters, { page: q.trang, perPage: Number(s.pages.products_per_page) || 12 });
  const pageUrl = pageUrlBuilder('/san-pham', q);
  if (redirectBadPage(res, q.trang, result, pageUrl)) return;
  const facets = productFacets();
  const activeType = filters.loai.length === 1 ? facets.terms.jade_type.find((t) => t.slug === filters.loai[0]) : null;
  const hasFilter = Object.entries(filters).some(([k, v]) => k !== 'sap_xep' && (Array.isArray(v) ? v.length : v));
  // Danh sách "sạch" (tất cả, hoặc đúng 1 loại ngọc, không sắp xếp riêng) mới tự có canonical theo từng trang
  const otherFilters = Object.entries(filters).some(([k, v]) => !['sap_xep', 'loai'].includes(k) && (Array.isArray(v) ? v.length : v))
    || filters.loai.length > 1 || (filters.loai.length === 1 && !activeType);
  const clean = !otherFilters && !filters.sap_xep;
  const basePath = '/san-pham';
  const baseQuery = activeType ? { loai: activeType.slug } : {};

  res.locals.seo = buildSeo(req, {
    page: hasFilter ? undefined : 'products',
    title: filters.q ? `Tìm kiếm: ${filters.q}` : activeType ? `Vòng ${activeType.name}` : s.pages.products_title,
    description: activeType?.description || s.pages.products_intro,
    // Trang tìm kiếm và trang lọc nhiều điều kiện không cần Google lập chỉ mục
    noindex: !!filters.q || otherFilters || (!clean && result.page > 1),
    canonical: pageUrlBuilder(basePath, baseQuery)(1),
    pagination: clean ? { page: result.page, pages: result.pages, url: pageUrlBuilder(basePath, baseQuery) } : undefined,
    jsonLd: [
      collectionJsonLd({
        name: activeType ? `Vòng ${activeType.name}` : s.pages.products_title, description: activeType?.description || s.pages.products_intro,
        path: pageUrlBuilder(basePath, baseQuery)(clean ? result.page : 1), offset: (result.page - 1) * result.perPage,
        items: result.items.map((p) => ({ name: p.name, url: `/san-pham/${p.slug}`, image: p.cover?.md })),
      }),
      breadcrumbJsonLd([{ name: 'Trang chủ', url: '/' }, { name: 'Sản phẩm', url: '/san-pham' }, ...(activeType ? [{ name: activeType.name, url: `/san-pham?loai=${activeType.slug}` }] : [])]),
    ],
  });
  res.view('pages/products.njk', { result, pg: result, pageUrl, facets, filters, activeType, hasFilter, sortOptions: SORT_OPTIONS, termTypes: TERM_TYPES, query: q });
});

router.get('/san-pham/:slug', (req, res, next) => {
  const product = getProduct(req.params.slug);
  if (!product) return next(new HttpError(404, 'Không tìm thấy sản phẩm'));
  res.locals.seo = buildSeo(req, {
    title: product.seo_title || product.name,
    description: product.seo_description || product.summary,
    image: product.cover?.lg,
    type: 'product',
    jsonLd: [productJsonLd(product), breadcrumbJsonLd([
      { name: 'Trang chủ', url: '/' }, { name: 'Sản phẩm', url: '/san-pham' }, { name: product.name, url: `/san-pham/${product.slug}` },
    ])],
  });
  res.view('pages/product-detail.njk', { product, related: relatedProducts(product) });
});

// ---------------- Gallery ----------------
router.get('/gallery', requireFeature('gallery'), (req, res) => {
  const s = res.locals.s;
  const album = typeof req.query.album === 'string' ? req.query.album : '';
  res.locals.seo = buildSeo(req, {
    page: 'gallery', title: s.pages.gallery_title, description: s.pages.gallery_intro,
    jsonLd: pageSchema({ type: 'CollectionPage', path: '/gallery', name: s.pages.gallery_title, description: s.pages.gallery_intro }),
  });
  res.view('pages/gallery.njk', { items: listGallery({ album: album || undefined }), albums: galleryAlbums(), album });
});

// ---------------- Hướng dẫn size ----------------
router.get('/huong-dan-size', requireFeature('size_guide'), (req, res) => {
  const g = res.locals.s.size_guide;
  res.locals.seo = buildSeo(req, {
    page: 'size_guide', title: g.title, description: g.intro, image: g.image?.lg,
    jsonLd: pageSchema({ path: '/huong-dan-size', name: g.title, description: g.intro, image: g.image?.lg }),
  });
  res.view('pages/size-guide.njk', { video: videoEmbed(g.video_url) });
});

// ---------------- Blog ----------------
// Bài viết gợi ý ở cột phải (bài mới nhất, bỏ bài đang xem)
function sidebarPosts(s, excludeId) {
  const n = Math.min(Math.max(Number(s.pages.blog_related_count) || 4, 1), 10);
  return listPosts({ perPage: n + 1 }).items.filter((p) => p.id !== excludeId).slice(0, n);
}

router.get('/blog', requireFeature('blog'), (req, res) => {
  const s = res.locals.s;
  const result = listPosts({ page: req.query.trang, perPage: Math.min(Math.max(Number(s.pages.blog_per_page) || 9, 2), 30) });
  const pageUrl = pageUrlBuilder('/blog', req.query);
  if (redirectBadPage(res, req.query.trang, result, pageUrl)) return;
  res.locals.seo = buildSeo(req, {
    page: 'blog', title: s.pages.blog_title, description: s.pages.blog_intro,
    pagination: { page: result.page, pages: result.pages, url: pageUrlBuilder('/blog') },
    jsonLd: [
      collectionJsonLd({
        type: 'Blog', name: s.pages.blog_title, description: s.pages.blog_intro, path: pageUrlBuilder('/blog')(result.page),
        offset: (result.page - 1) * Math.ceil(result.total / result.pages),
        items: result.items.map((p) => ({ name: p.title, url: `/blog/${p.slug}`, image: p.cover?.md })),
      }),
      breadcrumbJsonLd([{ name: 'Trang chủ', url: '/' }, { name: 'Blog', url: '/blog' }]),
    ],
  });
  res.view('pages/blog.njk', { result, pg: result, pageUrl, sidebarPosts: sidebarPosts(s) });
});

router.get('/blog/:slug', requireFeature('blog'), (req, res, next) => {
  const post = getPost(req.params.slug);
  if (!post) return next(new HttpError(404, 'Không tìm thấy bài viết'));
  res.locals.seo = buildSeo(req, {
    title: post.seo_title || post.title,
    description: post.seo_description || post.summary,
    image: post.cover?.lg,
    type: 'article',
    jsonLd: [articleJsonLd(post), breadcrumbJsonLd([{ name: 'Trang chủ', url: '/' }, { name: 'Blog', url: '/blog' }, { name: post.title, url: `/blog/${post.slug}` }])],
  });
  const s = res.locals.s;
  const { html, toc } = buildToc(post.content);
  res.view('pages/post.njk', {
    post: { ...post, content: html },
    toc: s.pages.blog_show_toc && toc.length >= 2 ? toc : [],
    sidebarPosts: sidebarPosts(s, post.id),
  });
});

// ---------------- Giỏ hàng & đặt hàng ----------------
router.get('/gio-hang', requireFeature('checkout'), (req, res) => {
  res.locals.seo = buildSeo(req, { title: res.locals.s.forms.order_title, noindex: true });
  res.view('pages/cart.njk');
});

// ---------------- Thiết kế riêng ----------------
router.get('/thiet-ke-rieng', requireFeature('custom_request'), (req, res) => {
  const f = res.locals.s.forms;
  res.locals.seo = buildSeo(req, {
    page: 'custom', title: f.custom_title, description: f.custom_intro,
    jsonLd: pageSchema({ path: '/thiet-ke-rieng', name: f.custom_title, description: f.custom_intro }),
  });
  res.view('pages/custom.njk', {
    options: {
      jade_type: listTerms('jade_type', { activeOnly: true }),
      color: listTerms('color', { activeOnly: true }),
      style: listTerms('style', { activeOnly: true }),
      element: listTerms('element', { activeOnly: true }),
    },
    preset: typeof req.query.mau === 'string' ? req.query.mau.slice(0, 200) : '',
  });
});

// ---------------- Tra cứu đơn ----------------
router.get('/tra-cuu-don', (req, res) => {
  const f = res.locals.s.forms;
  res.locals.seo = buildSeo(req, { title: f.track_title, description: f.track_intro, noindex: true });
  res.view('pages/track.njk', { preset: typeof req.query.ma === 'string' ? req.query.ma.slice(0, 30) : '' });
});

// ---------------- Liên hệ / Về shop ----------------
router.get('/lien-he', (req, res) => {
  const c = res.locals.s.contact;
  res.locals.seo = buildSeo(req, {
    page: 'contact', title: c.title, description: c.intro,
    jsonLd: pageSchema({ type: 'ContactPage', path: '/lien-he', name: c.title, description: c.intro }),
  });
  res.view('pages/contact.njk');
});

router.get('/ve-shop', (req, res) => {
  const a = res.locals.s.about;
  res.locals.seo = buildSeo(req, {
    page: 'about', title: a.title, description: a.intro, image: a.image?.lg,
    jsonLd: pageSchema({ type: 'AboutPage', path: '/ve-shop', name: a.title, description: a.intro, image: a.image?.lg }),
  });
  res.view('pages/about.njk');
});

export default router;
