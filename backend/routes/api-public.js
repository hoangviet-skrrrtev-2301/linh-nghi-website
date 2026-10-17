// API công khai: dữ liệu popup sản phẩm, giỏ hàng, gửi đơn / yêu cầu.
import { Router } from 'express';
import { getProduct, productsByIds } from '../services/catalog.js';
import { createInquiry, lookupInquiry } from '../services/inquiries.js';
import { getPublicSettings } from '../services/settings.js';
import { publicFormGuard, formLimiter, trackLimiter, apiLimiter } from '../middleware/security.js';
import { HttpError } from '../lib/utils.js';

const router = Router();
router.use(apiLimiter);
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Ẩn giá nếu admin tắt "Hiển thị giá"
function card(p, showPrice) {
  return {
    id: p.id, name: p.name, slug: p.slug, url: p.url, sku: p.sku,
    price: showPrice ? p.price : null,
    final_price: showPrice ? p.final_price : null,
    on_sale: showPrice && p.on_sale,
    sizes: p.sizes,
    stock_status: p.stock_status,
    stock_label: p.stock_label,
    cover: p.cover,
    jade_type: p.jade_type?.name || '',
    is_bestseller: !!p.is_bestseller,
    show_new: p.show_new,
  };
}

router.get('/products/:slug', (req, res, next) => {
  const p = getProduct(req.params.slug);
  if (!p) return next(new HttpError(404, 'Không tìm thấy sản phẩm'));
  const showPrice = getPublicSettings().features.show_prices;
  // Cửa sổ xem nhanh: cho trình duyệt giữ 1 phút để mở lại tức thì, sau đó vẫn hiện nhanh trong lúc tải bản mới
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  res.json({
    ...card(p, showPrice),
    summary: p.summary,
    description: p.description,
    images: p.images,
    bead_size: p.bead_size,
    origin: p.origin,
    weight: p.weight,
    specs: p.specs,
    color: p.color?.name || '',
    style: p.style?.name || '',
    elements: p.elements.map((e) => e.name),
    is_customizable: !!p.is_customizable,
    fengshui: p.fengshui,
    sku: p.sku,
    certificates: p.certificates.map((c) => ({ issuer: c.issuer, code: c.code, issued_date: c.issued_date, note: c.note, image: c.image })),
  });
});

// Làm mới thông tin giỏ hàng (giá, tình trạng) theo dữ liệu mới nhất
router.get('/cart', (req, res) => {
  const ids = String(req.query.ids || '').split(',').slice(0, 30);
  const showPrice = getPublicSettings().features.show_prices;
  res.json({ items: productsByIds(ids).map((p) => card(p, showPrice)) });
});

for (const type of ['order', 'custom', 'contact']) {
  router.post(`/inquiries/${type}`, formLimiter, publicFormGuard, async (req, res, next) => {
    try {
      const inq = await createInquiry(type, req.body, { ip: req.ip, userAgent: req.get('user-agent') });
      const f = getPublicSettings().forms;
      res.status(201).json({
        ok: true,
        code: inq.code,
        message: type === 'contact' && inq.details.product
          ? f.consult_success
          : { order: f.order_success, custom: f.custom_success, contact: f.contact_success }[type],
      });
    } catch (err) {
      next(err);
    }
  });
}

// Khách tra cứu tình trạng đơn bằng mã + số điện thoại
router.post('/track', trackLimiter, publicFormGuard, (req, res, next) => {
  try {
    const result = lookupInquiry(req.body?.code, req.body?.phone);
    if (!result) throw new HttpError(404, 'Không tìm thấy yêu cầu. Vui lòng kiểm tra lại mã và số điện thoại đã dùng khi đặt.');
    const f = getPublicSettings().forms;
    res.json({ ok: true, inquiry: result, status_note: f[`track_msg_${result.status}`] || '' });
  } catch (err) {
    next(err);
  }
});

export default router;
