// npm run seed — tạo dữ liệu mẫu (danh mục, sản phẩm, gallery, blog) để xem thử giao diện.
// Chỉ chạy khi database chưa có sản phẩm. Ảnh mẫu được vẽ tự động, có thể xóa trong Admin > Thư viện ảnh.
import { db, migrate } from '../lib/db.js';
import { config } from '../config/index.js';
import sharp from 'sharp';
import { saveImage as saveRaw } from '../services/media.js';
import { saveTerm, saveProduct } from '../services/catalog.js';
import { saveGalleryItem, savePost } from '../services/content.js';
import { saveGroup } from '../services/settings.js';

migrate({ log: () => {} });

// Ảnh mẫu vẽ bằng SVG, chuyển sang PNG trước khi lưu (upload không nhận SVG vì lý do bảo mật)
const saveImage = async (svg, opts) => saveRaw(await sharp(svg).png().toBuffer(), opts);

if (db.prepare('SELECT COUNT(*) FROM products').pluck().get() > 0 && !process.argv.includes('--force')) {
  console.log('Database đã có sản phẩm, bỏ qua. Dùng "npm run seed -- --force" để thêm dữ liệu mẫu.');
  process.exit(0);
}

// Vẽ ảnh vòng ngọc mẫu bằng SVG
function bangleSvg(c1, c2, bg, beads = false) {
  const ring = beads
    ? Array.from({ length: 18 }, (_, i) => {
      const a = (i / 18) * Math.PI * 2;
      return `<circle cx="${600 + Math.cos(a) * 300}" cy="${600 + Math.sin(a) * 300}" r="62" fill="url(#g)" stroke="${c2}" stroke-opacity=".25"/>`;
    }).join('')
    : `<circle cx="600" cy="600" r="300" fill="none" stroke="url(#g)" stroke-width="110"/>
       <circle cx="600" cy="600" r="300" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="18" stroke-dasharray="220 1700" transform="rotate(-120 600 600)"/>`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200">
    <defs>
      <radialGradient id="g" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${c1}"/><stop offset=".6" stop-color="${c2}"/><stop offset="1" stop-color="${c2}" stop-opacity=".85"/></radialGradient>
      <radialGradient id="bg" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${bg}"/></radialGradient>
    </defs>
    <rect width="1200" height="1200" fill="url(#bg)"/>
    <ellipse cx="600" cy="1010" rx="360" ry="34" fill="#000" opacity=".07"/>
    ${ring}
  </svg>`);
}

const image = async (c1, c2, bg, name, beads) => (await saveImage(bangleSvg(c1, c2, bg, beads), { originalName: name, folder: 'sample', alt: name })).id;

console.log('Đang tạo danh mục...');
const T = {};
const terms = {
  jade_type: [
    ['Phỉ thúy', 'Ngọc Jadeite tự nhiên loại A từ Myanmar, độ cứng cao, màu sắc phong phú.'],
    ['Bích ngọc', 'Ngọc Nephrite xanh lục đậm, vân mây tự nhiên, bền chắc.'],
    ['Ngọc Hòa Điền', 'Ngọc Hetian trắng sữa, mềm mại, ấm áp.'],
    ['Thạch anh', 'Thạch anh tự nhiên nhiều màu, giá dễ tiếp cận.'],
  ],
  color: [['Xanh lục', '#3f8f6b'], ['Xanh lá mạ', '#9cc98a'], ['Trắng', '#eeeee6'], ['Tím', '#a58cc7'], ['Vàng', '#d9b45f'], ['Hồng', '#e6a9b4']],
  style: [['Vòng trơn', ''], ['Vòng bản dẹt', ''], ['Vòng hạt', ''], ['Vòng bọc vàng', '']],
  element: [['Kim', ''], ['Mộc', ''], ['Thủy', ''], ['Hỏa', ''], ['Thổ', '']],
};
for (const [type, list] of Object.entries(terms)) {
  list.forEach(([name, extra], i) => {
    T[name] = saveTerm(null, {
      type, name, sort_order: i, active: true,
      description: type === 'jade_type' ? extra : '',
      color_hex: type === 'color' ? extra : null,
    });
  });
}

console.log('Đang tạo ảnh và sản phẩm mẫu (khoảng 20 giây)...');
const products = [
  { name: 'Vòng Phỉ Thúy Xanh Lục Băng', type: 'Phỉ thúy', color: 'Xanh lục', style: 'Vòng trơn', el: ['Mộc', 'Hỏa'], price: 18500000, sale: 16900000, sizes: [52, 54, 56], c: ['#a6e3c4', '#2e8b62', '#e8f1ec'], featured: 1 },
  { name: 'Vòng Phỉ Thúy Tím Oải Hương', type: 'Phỉ thúy', color: 'Tím', style: 'Vòng bản dẹt', el: ['Hỏa', 'Thổ'], price: 24000000, sizes: [54, 56], c: ['#e3d6f5', '#9b7fc4', '#f1edf7'], featured: 1 },
  { name: 'Vòng Bích Ngọc Vân Mây', type: 'Bích ngọc', color: 'Xanh lục', style: 'Vòng trơn', el: ['Mộc'], price: 6800000, sizes: [54, 56, 58, 60], c: ['#5fa983', '#1f5b42', '#e6eee9'], featured: 1 },
  { name: 'Vòng Hòa Điền Trắng Sữa', type: 'Ngọc Hòa Điền', color: 'Trắng', style: 'Vòng bản dẹt', el: ['Kim', 'Thủy'], price: 12500000, sizes: [52, 54, 56, 58], c: ['#ffffff', '#ddd9cc', '#f3f1ea'], featured: 1 },
  { name: 'Vòng Hạt Phỉ Thúy Mạ Non', type: 'Phỉ thúy', color: 'Xanh lá mạ', style: 'Vòng hạt', el: ['Mộc', 'Hỏa'], price: 4900000, sizes: [], beads: true, c: ['#d7efc7', '#8cc074', '#eff5ea'], featured: 1, custom: 1 },
  { name: 'Vòng Thạch Anh Hồng Tình Duyên', type: 'Thạch anh', color: 'Hồng', style: 'Vòng hạt', el: ['Hỏa', 'Thổ'], price: 1200000, sizes: [], beads: true, c: ['#fbe1e6', '#e09aa8', '#f8eef0'], featured: 1, custom: 1 },
  { name: 'Vòng Phỉ Thúy Vàng Hoàng Kim', type: 'Phỉ thúy', color: 'Vàng', style: 'Vòng trơn', el: ['Kim', 'Thổ'], price: null, sizes: [56], c: ['#f7e3a8', '#c99a3a', '#f6f1e3'], featured: 1, stock: 'made_to_order' },
  { name: 'Vòng Bích Ngọc Bọc Vàng 18K', type: 'Bích ngọc', color: 'Xanh lục', style: 'Vòng bọc vàng', el: ['Mộc', 'Kim'], price: 15800000, sizes: [54, 56], c: ['#4f9b76', '#18523a', '#ece9df'], featured: 1 },
  { name: 'Vòng Thạch Anh Tím An Yên', type: 'Thạch anh', color: 'Tím', style: 'Vòng hạt', el: ['Hỏa'], price: 950000, sizes: [], beads: true, c: ['#e1d4f2', '#8a6bb8', '#f0ecf6'], custom: 1 },
  { name: 'Vòng Hòa Điền Trắng Mỡ Cừu', type: 'Ngọc Hòa Điền', color: 'Trắng', style: 'Vòng trơn', el: ['Kim'], price: 21000000, sizes: [54, 56, 58], c: ['#fffdf6', '#e5dfcd', '#f4f2ec'], stock: 'sold_out' },
];

const covers = [];
for (const [i, p] of products.entries()) {
  const cover = await image(p.c[0], p.c[1], p.c[2], p.name, p.beads);
  const alt = await image(p.c[1], p.c[0], '#ffffff', `${p.name} - góc 2`, p.beads);
  const cert = await saveImage(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="640"><rect width="900" height="640" fill="#fbfaf6"/><rect x="24" y="24" width="852" height="592" fill="none" stroke="#b08d57" stroke-width="4"/><text x="450" y="140" font-family="Georgia" font-size="40" text-anchor="middle" fill="#333">GIẤY CHỨNG NHẬN KIỂM ĐỊNH</text><text x="450" y="200" font-family="Arial" font-size="22" text-anchor="middle" fill="#666">Mẫu minh họa – thay bằng ảnh chứng chỉ thật</text><text x="90" y="320" font-family="Arial" font-size="26" fill="#333">Mẫu vật: ${p.name}</text><text x="90" y="380" font-family="Arial" font-size="26" fill="#333">Kết luận: Ngọc tự nhiên</text><text x="90" y="440" font-family="Arial" font-size="26" fill="#333">Mã số: LN-${2026000 + i}</text></svg>`), { originalName: `chung-chi-${i}.png`, folder: 'certificate' });
  covers.push(cover);
  saveProduct(null, {
    name: p.name,
    sku: `LN${String(i + 1).padStart(3, '0')}`,
    short_description: `${p.name} – ngọc tự nhiên, sáng bóng, có chứng chỉ kiểm định đi kèm.`,
    description: `<p>${p.name} được tuyển chọn kỹ lưỡng, nước ngọc trong, màu đều và tự nhiên.</p><h3>Đặc điểm</h3><ul><li>Ngọc tự nhiên 100%, không xử lý</li><li>Đánh bóng thủ công</li><li>Tặng kèm hộp gỗ và túi nhung</li></ul><p>Nội dung mẫu – chỉnh sửa trong Admin &gt; Sản phẩm.</p>`,
    price: p.price, sale_price: p.sale ?? null,
    jade_type_id: T[p.type], color_id: T[p.color], style_id: T[p.style], element_ids: p.el.map((e) => T[e]),
    sizes: p.sizes, bead_size: p.beads ? '8mm' : '', origin: p.type === 'Phỉ thúy' ? 'Myanmar' : p.type === 'Ngọc Hòa Điền' ? 'Tân Cương' : 'Brazil',
    weight: p.beads ? '18g' : '45g',
    specs: [{ label: 'Độ trong', value: 'Bán trong' }, { label: 'Độ bóng', value: 'Thủy tinh' }],
    stock_status: p.stock || 'in_stock', is_featured: p.featured || 0, is_customizable: p.custom || 0,
    is_bestseller: [0, 2, 7].includes(i) ? 1 : 0, is_new: [4, 5].includes(i) ? 1 : 0,
    fengshui: `Mang năng lượng ${p.el.join(', ')}, giúp người đeo an yên, cân bằng cảm xúc và thu hút may mắn.`,
    status: 'published', sort_order: i, cover_media_id: cover, image_ids: [cover, alt],
    certificates: [{ issuer: 'Trung tâm Kiểm định Đá quý (mẫu)', code: `LN-${2026000 + i}`, issued_date: '2026-09-01', media_id: cert.id }],
  });
}


// Mẫu giấy kiểm định hiển thị ở trang chủ (thay bằng ảnh giấy thật trong Admin › Cài đặt › Trang chủ)
const centers = ['VGC – Trung tâm Kiểm định Đá quý Việt Nam', 'PNJ Lab', 'LIULAB'];
const certItems = [];
for (const [i, name] of centers.entries()) {
  const m = await saveImage(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="900" height="1200" fill="#fdfbf5"/><rect x="30" y="30" width="840" height="1140" fill="none" stroke="#b08d57" stroke-width="5"/><rect x="50" y="50" width="800" height="1100" fill="none" stroke="#b08d57" stroke-width="1.5"/><text x="450" y="200" font-family="Georgia" font-size="46" text-anchor="middle" fill="#2f5d50">GIẤY KIỂM ĐỊNH</text><text x="450" y="260" font-family="Arial" font-size="26" text-anchor="middle" fill="#555">${name.split(' – ')[0]}</text><circle cx="450" cy="560" r="170" fill="none" stroke="#2f5d50" stroke-width="40" opacity=".8"/><text x="110" y="850" font-family="Arial" font-size="26" fill="#333">Kết luận: Ngọc Jadeite tự nhiên (loại A)</text><text x="110" y="910" font-family="Arial" font-size="26" fill="#333">Số: ${['VGC', 'PNJ', 'LIU'][i]}-2026-00${i + 1}</text><text x="450" y="1080" font-family="Arial" font-size="22" text-anchor="middle" fill="#999">Ảnh minh họa – thay bằng giấy kiểm định thật</text></svg>`), { originalName: `giay-kiem-dinh-${i + 1}.png`, folder: 'certificate', alt: `Giấy kiểm định ${name}` });
  certItems.push({ image: m.id, title: name, description: 'Ảnh minh họa' });
}
saveGroup('home', { cert_items: certItems });
console.log('Đang tạo gallery và bài viết...');
covers.slice(0, 8).forEach((mid, i) => saveGalleryItem(null, { media_id: mid, title: products[i].name, album: i % 2 ? 'Khách hàng' : 'Bộ sưu tập', sort_order: i }));

const blogCover = await image('#cfe7da', '#2f5d50', '#f3efe6', 'Cách bảo quản vòng ngọc');
savePost(null, {
  title: 'Cách bảo quản vòng ngọc luôn sáng bóng', status: 'published', cover_media_id: blogCover,
  excerpt: 'Vài thói quen nhỏ giúp chiếc vòng ngọc của bạn giữ được độ bóng và màu sắc theo năm tháng.',
  content: '<p>Ngọc là chất liệu bền nhưng vẫn cần được chăm sóc đúng cách.</p><h2>1. Tránh va đập mạnh</h2><p>Tháo vòng khi chơi thể thao hoặc làm việc nặng.</p><h2>2. Tránh hóa chất</h2><p>Không để vòng tiếp xúc với nước tẩy rửa, nước hoa, mỹ phẩm.</p><h2>3. Vệ sinh định kỳ</h2><p>Lau bằng khăn mềm và nước sạch, để khô tự nhiên.</p>',
}, null);
savePost(null, {
  title: 'Phân biệt ngọc phỉ thúy loại A, B, C', status: 'published', cover_media_id: covers[0],
  excerpt: 'Hiểu rõ các cấp độ xử lý giúp bạn chọn mua vòng ngọc đúng giá trị.',
  content: '<p><strong>Loại A</strong> là ngọc tự nhiên chưa qua xử lý hóa chất. <strong>Loại B</strong> đã được tẩy axit và bơm keo. <strong>Loại C</strong> đã được nhuộm màu.</p><p>Luôn yêu cầu chứng chỉ kiểm định khi mua ngọc giá trị cao.</p>',
}, null);

console.log(`\n✔ Đã tạo dữ liệu mẫu. Chạy "npm run dev" và mở ${config.baseUrl}\n`);
db.close();
