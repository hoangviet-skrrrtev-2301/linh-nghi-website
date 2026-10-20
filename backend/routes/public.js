// Các trang giao diện khách.
import { Router } from 'express';
import { getPublicSettings, getRaw } from '../services/settings.js';
import {
  searchProducts, productFacets, featuredProducts, getProduct, relatedProducts, listTerms, listProductTypes, SORT_OPTIONS, TERM_TYPES,
} from '../services/catalog.js';
import { listPosts, getPost, listGallery, galleryAlbums, listPostCategories, getPostCategory } from '../services/content.js';
import { buildSeo, productJsonLd, breadcrumbJsonLd, articleJsonLd, collectionJsonLd, webPageJsonLd } from '../lib/seo.js';
import { pageUrlBuilder } from '../lib/pagination.js';
import { galleryView } from '../lib/gallery-view.js';
import { fontLinks } from '../services/fonts.js';
import { formToken } from '../middleware/security.js';
import { HttpError, truncate, stripHtml } from '../lib/utils.js';
import { homeSections } from '../lib/home-layout.js';
import { buildToc } from '../lib/toc.js';
import { navChildren } from '../lib/nav-menu.js';
import { footerColumns, safeLinks } from '../lib/footer-layout.js';
import { listPolicies, getPolicy, policyPath } from '../services/policies.js';
import { listFeedbacksPublic, listReviewsPublic, reviewSummary } from '../services/feedback.js';
import { feedbackPath } from '../lib/feedback-path.js';

const router = Router();

const clampInt = (v, min, max, fallback) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

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


// Dữ liệu chung cho mọi trang khách (header, footer, SEO mặc định...)
export function publicLocals(req, res) {
  const s = getPublicSettings();
  res.locals.s = s;
  res.locals.features = s.features;
  res.locals.currentPath = req.path;
  res.locals.fonts = fontLinks(s.theme);
  res.locals.formToken = formToken();
  res.locals.jadeTypes = listTerms('jade_type', { activeOnly: true });
  res.locals.nav = (s.navigation.items || []).filter((item) => {
    const feature = FEATURE_BY_URL[item.url];
    return item.label && item.url && (!feature || s.features[feature]);
  }).map((item) => ({ ...item, children: navChildren(item, { jadeTypes: res.locals.jadeTypes }) }));
  res.locals.policyLinks = listPolicies().map((x) => ({ title: x.title, url: policyPath(x.slug) }));
  res.locals.policyBar = !!s.policies?.show_in_footer;   // dòng liên kết nhỏ ở thanh dưới cùng (tùy chọn)
  res.locals.footerCols = footerColumns(s.footer, { skip: res.locals.policyLinks.length ? [] : ['policies'] });
  res.locals.footerLinks = safeLinks(s.footer.extra_links);
  // Lối vào trang Feedback ở chân trang (tắt được trong Cài đặt › Feedback & đánh giá khách hàng)
  res.locals.feedbackLink = s.feedback.page_enabled && s.feedback.footer_show ? { url: feedbackPath(s.feedback.page_slug), label: s.feedback.footer_label || s.feedback.page_title } : null;
  res.locals.clientConfig = {
    checkout: !!s.features.checkout,
    showPrices: !!s.features.show_prices,
    searchSuggest: !!s.features.search_suggest,
    animations: !!s.theme.enable_animations,
    welcome: !!s.features.welcome_popup,
    welcomeDelay: Number(s.features.welcome_popup_delay) || 5,
    shopName: s.site.name,
    cartUnavailable: s.forms.cart_unavailable,
    logo: s.site.logo?.md || '',
    orderImage: {
      enabled: !!s.forms.order_image_enabled, title: s.forms.order_image_title, note: s.forms.order_image_note,
      track: s.forms.order_image_track, button: s.forms.order_image_button, share: s.forms.order_image_share,
    },
    feedback: { stars: !!s.feedback.show_stars, date: !!s.feedback.popup_show_date },
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
// Cấu hình banner đầu trang: chuẩn hóa giá trị cài đặt; slide nào là H1 (slide đầu tiên có tiêu đề)
function heroConfig(h) {
  const slides = h.hero_slides || [];
  const delay = Math.min(Math.max(Number(h.hero_delay) || 6, 2), 20) * 1000;
  return {
    mode: h.hero_mode === 'stack' ? 'stack' : 'slider',
    autoplayMs: h.hero_autoplay === false ? 0 : delay,
    effect: h.hero_effect === 'slide' ? 'slide' : 'fade',
    drag: h.hero_drag !== false,
    arrows: !!h.hero_arrows,
    pauseHover: h.hero_pause_hover !== false,
    h1: slides.findIndex((sl) => sl.title),
  };
}
// Feedback ở trang chủ: chỉ lấy khi khối đang bật trong Bố cục trang chủ
function homeFeedbacks(s) {
  const on = (s.home_layout.sections || []).find((x) => x.key === 'testimonials');
  if (on && on.enabled === false) return { items: [], total: 0 };
  return listFeedbacksPublic({ scope: 'home', limit: clampInt(s.feedback.home_limit, 1, 12, 4) });
}

router.get('/', (req, res) => {
  const s = res.locals.s;
  const gallery = s.features.gallery && s.home.show_gallery ? listGallery({ limit: Math.min(Math.max(Number(s.home.gallery_limit) || 24, 4), 60) }) : [];
  res.view('pages/home.njk', {
    sections: homeSections(s.home_layout),
    heroCfg: heroConfig(s.home),
    featured: featuredProducts(Number(s.home.featured_limit) || 8),
    gallery, galleryCfg: galleryView(s, 'home', gallery.length),
    posts: s.features.blog && s.home.show_blog ? listPosts({ perPage: 3 }).items : [],
    feedbacks: homeFeedbacks(s),
  });
});

// ---------------- Sản phẩm ----------------
// Phân cấp địa chỉ: /san-pham  →  /san-pham/<loại ngọc hoặc loại sản phẩm>  →  /san-pham/<loại>/<sản phẩm>
const omit = (obj, ...keys) => Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)));

// Danh sách sản phẩm. forced = { loai: slug } (trang một loại ngọc) hoặc { nhom: slug } (trang một loại sản phẩm như Pháp phục)
function renderProductList(req, res, next, forced = {}) {
  const s = res.locals.s;
  const q = req.query;
  const filters = {
    q: typeof q.q === 'string' ? q.q.slice(0, 100) : '',
    loai: [].concat(q.loai || []), mau: [].concat(q.mau || []), kieu: [].concat(q.kieu || []), menh: [].concat(q.menh || []),
  };
  for (const k of ['gia_tu', 'gia_den', 'ni', 'sap_xep', 'con_hang', 'custom', 'nhom']) {
    filters[k] = typeof q[k] === 'string' ? q[k].slice(0, 20) : '';
  }
  if (forced.loai) filters.loai = [forced.loai];
  if (forced.nhom) filters.nhom = forced.nhom;
  // Địa chỉ cũ ?loai=<slug> / ?nhom=<slug> (không kèm bộ lọc khác) chuyển 301 sang địa chỉ phân cấp mới
  if (!forced.loai && !forced.nhom) {
    const only = Object.keys(q).filter((k) => k !== 'trang');
    if (only.length === 1 && only[0] === 'loai' && filters.loai.length === 1 && listTerms('jade_type', { activeOnly: true }).some((t) => t.slug === filters.loai[0])) {
      return res.redirect(301, pageUrlBuilder(`/san-pham/${filters.loai[0]}`, omit(q, 'loai', 'nhom'))(Number(q.trang) || 1));
    }
    if (only.length === 1 && only[0] === 'nhom' && filters.nhom) {
      const t = listProductTypes({ activeOnly: true }).find((x) => x.slug === filters.nhom);
      if (t) return res.redirect(301, t.uses_jade_fields ? '/san-pham' : pageUrlBuilder(`/san-pham/${t.slug}`, omit(q, 'loai', 'nhom'))(Number(q.trang) || 1));
    }
  }
  // Loại sản phẩm (Pháp phục...): loại chưa hoạt động coi như không tồn tại.
  const group = filters.nhom ? listProductTypes({ activeOnly: true }).find((t) => t.slug === filters.nhom) : null;
  if (filters.nhom && !group) return next(new HttpError(404, 'Không tìm thấy loại sản phẩm'));
  // Bộ lọc (loại ngọc, màu, ni...) chỉ dành cho ngọc: loại khác chỉ có tìm nhanh và sắp xếp
  const showFilters = !group || group.uses_jade_fields;
  const result = searchProducts(filters, { page: q.trang, perPage: Number(s.pages.products_per_page) || 12 });
  const facets = productFacets();
  const activeType = filters.loai.length === 1 ? facets.terms.jade_type.find((t) => t.slug === filters.loai[0]) : null;
  // Địa chỉ gốc của danh sách đang xem (đồng thời là canonical)
  const basePath = activeType ? `/san-pham/${activeType.slug}` : group && !group.uses_jade_fields ? `/san-pham/${group.slug}` : '/san-pham';
  const forcedPath = forced.loai || forced.nhom ? basePath : '/san-pham';
  const pageUrl = pageUrlBuilder(forcedPath, forced.loai || forced.nhom ? omit(q, 'loai', 'nhom') : q);
  if (redirectBadPage(res, q.trang, result, pageUrl)) return;
  const hasFilter = Object.entries(filters).some(([k, v]) => k !== 'sap_xep' && (Array.isArray(v) ? v.length : v));
  // Danh sách "sạch" (tất cả, hoặc đúng 1 loại ngọc, không sắp xếp riêng) mới tự có canonical theo từng trang
  const otherFilters = Object.entries(filters).some(([k, v]) => !['sap_xep', 'loai', 'nhom'].includes(k) && (Array.isArray(v) ? v.length : v))
    || filters.loai.length > 1 || (filters.loai.length === 1 && !activeType) || (!!group && filters.loai.length > 0);
  const clean = !otherFilters && !filters.sap_xep;
  const categoryCrumb = activeType ? [{ name: activeType.name, url: basePath }] : group && !group.uses_jade_fields ? [{ name: group.name, url: basePath }] : [];

  // Mô tả cho Google: loại không phải ngọc dùng mô tả của loại đó, chưa có thì ghi tên loại + tên shop
  const metaDescription = activeType?.description
    || (group && !group.uses_jade_fields ? group.description || `${group.name} tại ${s.site.name}` : group?.description || s.pages.products_intro);
  res.locals.seo = buildSeo(req, {
    page: hasFilter ? undefined : 'products',
    title: filters.q ? `Tìm kiếm: ${filters.q}` : activeType ? `Vòng ${activeType.name}` : group ? group.name : s.pages.products_title,
    description: metaDescription,
    // Trang tìm kiếm và trang lọc nhiều điều kiện không cần Google lập chỉ mục
    noindex: !!filters.q || otherFilters || (!clean && result.page > 1),
    canonical: pageUrlBuilder(basePath)(1),
    pagination: clean ? { page: result.page, pages: result.pages, url: pageUrlBuilder(basePath) } : undefined,
    jsonLd: [
      collectionJsonLd({
        name: activeType ? `Vòng ${activeType.name}` : group ? group.name : s.pages.products_title, description: metaDescription,
        path: pageUrlBuilder(basePath)(clean ? result.page : 1), offset: (result.page - 1) * result.perPage,
        items: result.items.map((p) => ({ name: p.name, url: p.url, image: p.cover?.md })),
      }),
      breadcrumbJsonLd([{ name: 'Trang chủ', url: '/' }, { name: 'Sản phẩm', url: '/san-pham' }, ...categoryCrumb]),
    ],
  });
  res.view('pages/products.njk', { result, pg: result, pageUrl, facets, filters, activeType, activeGroup: group, showFilters, hasFilter, sortOptions: SORT_OPTIONS, termTypes: TERM_TYPES, query: q });
}

router.get('/san-pham', (req, res, next) => renderProductList(req, res, next));

// Số sao tổng hợp cho Google: chỉ khi bật đánh giá + bật khai báo + có đánh giá đã duyệt
function reviewsForSchema(s, product) {
  if (!s.feedback.reviews_enabled || !s.feedback.reviews_schema) return null;
  const sum = reviewSummary(product.id, { customerOnly: true }); // đánh giá do shop nhập không đưa vào schema cho Google
  return sum.count ? sum : null;
}

function renderProduct(req, res, product) {
  const parent = product.jade_type || (product.product_type && !product.product_type.uses_jade_fields ? product.product_type : null);
  res.locals.seo = buildSeo(req, {
    title: product.seo_title || product.name,
    description: product.seo_description || product.summary,
    image: product.cover?.lg,
    type: 'product',
    jsonLd: [productJsonLd(product, reviewsForSchema(res.locals.s, product)), breadcrumbJsonLd([
      { name: 'Trang chủ', url: '/' }, { name: 'Sản phẩm', url: '/san-pham' },
      ...(parent ? [{ name: parent.name, url: `/san-pham/${parent.slug}` }] : []),
      { name: product.name, url: product.url },
    ])],
  });
  const fb = res.locals.s.feedback;
  const reviews = fb.reviews_enabled
    ? { summary: reviewSummary(product.id), ...(fb.reviews_show_on_product ? listReviewsPublic({ productId: product.id, limit: clampInt(fb.reviews_per_product, 3, 30, 6) }) : { items: [], total: 0, limit: 6 }) }
    : null;
  res.view('pages/product-detail.njk', { product, related: relatedProducts(product), parent, reviews });
}

// /san-pham/<a>: trang một loại ngọc, trang một loại sản phẩm, hoặc địa chỉ cũ của sản phẩm (chuyển 301 sang địa chỉ phân cấp)
router.get('/san-pham/:a', (req, res, next) => {
  const a = req.params.a;
  if (listTerms('jade_type', { activeOnly: true }).some((t) => t.slug === a)) return renderProductList(req, res, next, { loai: a });
  const type = listProductTypes({ activeOnly: true }).find((t) => t.slug === a);
  if (type) return type.uses_jade_fields ? res.redirect(301, '/san-pham') : renderProductList(req, res, next, { nhom: a });
  const product = getProduct(a);
  if (!product) return next(new HttpError(404, 'Không tìm thấy sản phẩm'));
  if (product.url !== `/san-pham/${a}`) return res.redirect(301, product.url);
  renderProduct(req, res, product);
});

router.get('/san-pham/:a/:slug', (req, res, next) => {
  const product = getProduct(req.params.slug);
  if (!product) return next(new HttpError(404, 'Không tìm thấy sản phẩm'));
  // Sai loại trong đường dẫn (hoặc sản phẩm đã đổi loại): chuyển 301 về đúng địa chỉ
  if (product.url !== `/san-pham/${req.params.a}/${req.params.slug}`) return res.redirect(301, product.url);
  renderProduct(req, res, product);
});

// ---------------- Gallery ----------------
router.get('/gallery', requireFeature('gallery'), (req, res) => {
  const s = res.locals.s;
  const album = typeof req.query.album === 'string' ? req.query.album : '';
  res.locals.seo = buildSeo(req, {
    page: 'gallery', title: s.pages.gallery_title, description: s.pages.gallery_intro,
    jsonLd: pageSchema({ type: 'CollectionPage', path: '/gallery', name: s.pages.gallery_title, description: s.pages.gallery_intro }),
  });
  const items = listGallery({ album: album || undefined });
  res.view('pages/gallery.njk', { items, albums: galleryAlbums(), album, galleryCfg: galleryView(s, 'page', items.length) });
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
// Bài viết gợi ý ở cột phải: ưu tiên cùng chuyên mục, thiếu thì bù bằng bài mới nhất (bỏ bài đang xem)
function sidebarPosts(s, excludeId, categoryId) {
  const n = Math.min(Math.max(Number(s.pages.blog_related_count) || 4, 1), 10);
  const picked = categoryId ? listPosts({ perPage: n + 1, categoryId }).items.filter((p) => p.id !== excludeId) : [];
  if (picked.length < n) {
    const have = new Set(picked.map((p) => p.id));
    for (const p of listPosts({ perPage: n + picked.length + 1 }).items) if (p.id !== excludeId && !have.has(p.id)) picked.push(p);
  }
  return picked.slice(0, n);
}

// Chuyên mục có bài đã đăng, dùng cho thanh chọn và cột phải
const blogCategories = () => listPostCategories({ activeOnly: true }).filter((c) => c.post_count > 0);

// Trang danh sách blog (category = null) hoặc một chuyên mục
function renderBlogList(req, res, category) {
  const s = res.locals.s;
  const basePath = category ? `/blog/${category.slug}` : '/blog';
  const result = listPosts({
    page: req.query.trang, categoryId: category?.id,
    perPage: Math.min(Math.max(Number(s.pages.blog_per_page) || 9, 2), 30),
  });
  const pageUrl = pageUrlBuilder(basePath, req.query);
  if (redirectBadPage(res, req.query.trang, result, pageUrl)) return;
  const name = category ? category.name : s.pages.blog_title;
  const intro = category ? category.description || s.pages.blog_intro : s.pages.blog_intro;
  // Trang chuyên mục mặc định được index (trang 1); tắt ở Cài đặt thì noindex nhưng vẫn cho Google đi theo liên kết tới từng bài.
  // Trang 2+ / có tham số luôn noindex do buildSeo.
  const hideCategory = !!category && !s.pages.blog_category_index;
  res.locals.seo = buildSeo(req, {
    page: category ? undefined : 'blog', title: name, description: intro,
    noindex: hideCategory, followLinks: hideCategory,
    pagination: hideCategory ? undefined : { page: result.page, pages: result.pages, url: pageUrlBuilder(basePath) },
    jsonLd: [
      collectionJsonLd({
        type: category ? 'CollectionPage' : 'Blog', name, description: intro, path: pageUrlBuilder(basePath)(result.page),
        offset: (result.page - 1) * Math.ceil(result.total / result.pages),
        items: result.items.map((p) => ({ name: p.title, url: p.url, image: p.cover?.md })),
      }),
      breadcrumbJsonLd([{ name: 'Trang chủ', url: '/' }, { name: 'Blog', url: '/blog' }, ...(category ? [{ name: category.name, url: basePath }] : [])]),
    ],
  });
  res.view('pages/blog.njk', {
    result, pg: result, pageUrl, category, blogCategories: blogCategories(), blogName: name, blogIntro: intro,
    sidebarPosts: sidebarPosts(s, null, category?.id),
  });
}

router.get('/blog', requireFeature('blog'), (req, res) => renderBlogList(req, res, null));

// Địa chỉ cũ của trang chuyên mục (/blog/chuyen-muc/<slug>) → địa chỉ phân cấp mới /blog/<slug>
router.get('/blog/chuyen-muc/:slug', requireFeature('blog'), (req, res, next) => {
  const category = getPostCategory(req.params.slug);
  if (!category) return next(new HttpError(404, 'Không tìm thấy chuyên mục'));
  res.redirect(301, pageUrlBuilder(`/blog/${category.slug}`, req.query)(Number(req.query.trang) || 1));
});

function renderPost(req, res, post) {
  const category = post.category?.active ? post.category : null;
  res.locals.seo = buildSeo(req, {
    title: post.seo_title || post.title,
    description: post.seo_description || post.summary,
    image: post.cover?.lg,
    type: 'article',
    jsonLd: [articleJsonLd(post), breadcrumbJsonLd([
      { name: 'Trang chủ', url: '/' }, { name: 'Blog', url: '/blog' },
      ...(category ? [{ name: category.name, url: `/blog/${category.slug}` }] : []),
      { name: post.title, url: post.url },
    ])],
  });
  const s = res.locals.s;
  const { html, toc } = buildToc(post.content);
  res.view('pages/post.njk', {
    post: { ...post, content: html }, category,
    toc: s.pages.blog_show_toc && toc.length >= 2 ? toc : [],
    blogCategories: blogCategories(),
    sidebarPosts: sidebarPosts(s, post.id, post.category_id),
  });
}

// /blog/<a>: trang một chuyên mục, hoặc bài viết chưa có chuyên mục (và địa chỉ cũ của bài → chuyển 301 sang địa chỉ phân cấp)
router.get('/blog/:a', requireFeature('blog'), (req, res, next) => {
  const category = getPostCategory(req.params.a);
  if (category) return renderBlogList(req, res, category);
  const post = getPost(req.params.a);
  if (!post) return next(new HttpError(404, 'Không tìm thấy bài viết'));
  if (post.url !== `/blog/${req.params.a}`) return res.redirect(301, post.url);
  renderPost(req, res, post);
});

router.get('/blog/:a/:slug', requireFeature('blog'), (req, res, next) => {
  const post = getPost(req.params.slug);
  if (!post) return next(new HttpError(404, 'Không tìm thấy bài viết'));
  if (post.url !== `/blog/${req.params.a}/${req.params.slug}`) return res.redirect(301, post.url);
  renderPost(req, res, post);
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

// Trang chính sách (nội dung và danh sách sửa ở Admin › Cài đặt › Trang chính sách)
router.get('/chinh-sach/:slug', (req, res, next) => {
  const page = getPolicy(req.params.slug);
  if (!page) return next();
  const path = policyPath(page.slug);
  const description = truncate(stripHtml(page.content), 160);
  res.locals.seo = buildSeo(req, { title: page.title, description, jsonLd: pageSchema({ type: 'WebPage', path, name: page.title, description }) });
  res.view('pages/policy.njk', { policy: page, others: listPolicies().filter((x) => x.slug !== page.slug) });
});

router.get('/ve-shop', (req, res) => {
  const a = res.locals.s.about;
  res.locals.seo = buildSeo(req, {
    page: 'about', title: a.title, description: a.intro, image: a.image?.lg,
    jsonLd: pageSchema({ type: 'AboutPage', path: '/ve-shop', name: a.title, description: a.intro, image: a.image?.lg }),
  });
  res.view('pages/about.njk');
});

// Trang Feedback khách hàng: đường dẫn đổi được trong cài đặt, nên khớp động và đặt SAU mọi trang cố định
router.get('/:slug', (req, res, next) => {
  const s = res.locals.s;
  const fb = s.feedback;
  if (!fb.page_enabled || req.params.slug !== fb.page_slug) return next();
  const path = feedbackPath(fb.page_slug);
  const perPage = clampInt(fb.page_per_page, 4, 48, 12);
  const raw = req.query.trang;
  const result = listFeedbacksPublic({ scope: 'page', page: Number(raw) || 1, perPage });
  const pageUrl = pageUrlBuilder(path);
  if (redirectBadPage(res, raw, result, pageUrl)) return;
  const reviews = fb.reviews_enabled ? listReviewsPublic({ limit: clampInt(fb.page_reviews_limit, 4, 30, 12) }) : { items: [], total: 0 };
  res.locals.seo = buildSeo(req, {
    page: 'feedback', title: fb.page_title, description: fb.page_intro,
    pagination: result.pages > 1 ? { page: result.page, pages: result.pages, url: pageUrl } : undefined,
    jsonLd: pageSchema({ type: 'CollectionPage', path, name: fb.page_title, description: fb.page_intro }),
  });
  res.view('pages/feedback.njk', { result, pg: result, pageUrl, reviews, feedbackCols: clampInt(fb.page_cols, 1, 3, 2) });
});

export default router;
