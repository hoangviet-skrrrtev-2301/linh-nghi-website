// Phân quyền theo vai trò: nhân viên chỉ làm được việc được giao, kể cả khi thử đường dẫn lắt léo (dấu "/" cuối, chữ hoa, "//").
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { boot, OWNER, STAFF } from './helpers.js';

let ctx;
let owner;
let staff;
let order;
let customerId;

before(async () => {
  ctx = await boot({ content: true });
  owner = ctx.session();
  await owner.login(OWNER);
  // Vai trò chỉ có quyền "đơn hàng" (không có xóa / xuất dữ liệu, không có sản phẩm)
  const role = (await owner.api('/roles', 'POST', { name: 'Chỉ đơn hàng', permissions: ['orders'] })).json;
  const staffRow = (await owner.api('/users')).json.find((u) => u.email === STAFF.email);
  await owner.api(`/users/${staffRow.id}`, 'PUT', { name: staffRow.name, role: 'staff', role_id: role.id, active: true });
  order = (await owner.api('/inquiries', 'POST', { type: 'order', customer: { name: 'Khách', phone: '0987654321' }, items: [{ name: 'x', qty: 1, price: 1000 }] })).json;
  customerId = (await owner.api('/customers?q=0987654321')).json.items[0].id;
  staff = ctx.session();
  await staff.login(STAFF);
});
after(() => ctx.close());

test('chưa đăng nhập: API trả 401, trang admin chuyển về đăng nhập', async () => {
  assert.equal((await ctx.raw('/admin/api/dashboard', { headers: { accept: 'application/json' } })).status, 401);
  const page = await ctx.raw('/admin/products');
  assert.equal(page.status, 302);
  assert.match(page.headers.get('location'), /login/);
});

test('nhân viên chỉ có quyền đơn hàng: làm được việc của đơn hàng', async () => {
  assert.equal((await staff.api('/inquiries?type=order')).status, 200);
  assert.equal((await staff.api(`/inquiries/${order.id}`, 'PATCH', { admin_note: 'ghi chú' })).status, 200);
  assert.equal((await staff.api('/products?q=vong&per_page=3')).status, 200, 'tìm sản phẩm để thêm dòng hàng');
  assert.equal((await staff.api('/products/bulk', 'POST', { ids: [1], action: 'delete' })).status, 403, 'không được xóa sản phẩm');
});

test('không né được quyền bằng dấu "/" cuối, chữ hoa hay "//"', async () => {
  const blocked = [
    ['DELETE', `/inquiries/${order.id}/`], ['DELETE', `/INQUIRIES/${order.id}`], ['DELETE', `//inquiries/${order.id}`],
    ['DELETE', `/customers/${customerId}/`], ['DELETE', `/Customers/${customerId}`],
    ['GET', '/customers/export.csv'], ['GET', '/customers/export.csv/'], ['GET', '/Customers/Export.csv'],
    ['GET', '/backup'], ['GET', '/backup/'], ['GET', '/audit'], ['GET', '/Audit'],
    ['GET', '/users'], ['GET', '/users/'], ['GET', '/Users'], ['GET', '/roles'], ['GET', '/roles/'],
    ['GET', '/settings/mail'], ['PUT', '/settings/mail/'], ['GET', '/redirects/'],
  ];
  for (const [method, path] of blocked) {
    const r = await staff.api(path, method, method === 'GET' ? undefined : { name: 'x' });
    assert.ok(r.status === 403 || r.status === 404, `${method} ${path} phải bị chặn, nhận ${r.status}`);
  }
  assert.equal((await owner.api(`/inquiries/${order.id}`)).status, 200, 'đơn vẫn còn sau các lần thử xóa');
  assert.equal((await owner.api(`/customers/${customerId}`)).status, 200, 'khách vẫn còn');
});

test('trang admin ngoài quyền bị chặn (kể cả viết hoa / dấu "/" cuối)', async () => {
  for (const p of ['/admin/products', '/admin/PRODUCTS', '/admin/products/', '/admin/users', '/admin/roles', '/admin/audit', '/admin/redirects/', '/admin/authors']) {
    assert.equal((await staff.get(p)).status, 403, p);
  }
});

test('nhân viên không tự nâng quyền hay sửa vai trò', async () => {
  const me = (await owner.api('/users')).json.find((u) => u.email === STAFF.email);
  assert.equal((await staff.api(`/users/${me.id}`, 'PUT', { name: me.name, role: 'owner', active: true })).status, 403);
  assert.equal((await staff.api('/roles/1', 'PUT', { name: 'x', permissions: ['backup', 'audit'] })).status, 403);
  assert.equal((await staff.api('/roles', 'POST', { name: 'y', permissions: ['backup'] })).status, 403);
});

test('vai trò: quyền lạ bị loại, trùng tên bị từ chối, không xóa vai trò có sẵn hoặc đang dùng', async () => {
  const r = await owner.api('/roles', 'POST', { name: 'Biên tập', permissions: ['posts', 'khong-ton-tai'] });
  assert.deepEqual(r.json.items.find((x) => x.id === r.json.id).permissions, ['posts']);
  assert.equal((await owner.api('/roles', 'POST', { name: 'biên tập', permissions: [] })).status, 400);
  assert.equal((await owner.api('/roles/1', 'DELETE')).status, 400);
  const inUse = (await owner.api('/roles')).json.items.find((x) => x.name === 'Chỉ đơn hàng');
  assert.equal((await owner.api(`/roles/${inUse.id}`, 'DELETE')).status, 409);
});

test('đổi quyền có hiệu lực ngay trên phiên đang đăng nhập', async () => {
  const me = (await owner.api('/users')).json.find((u) => u.email === STAFF.email);
  const role = (await owner.api('/roles', 'POST', { name: 'Chỉ blog', permissions: ['posts'] })).json;
  await owner.api(`/users/${me.id}`, 'PUT', { name: me.name, role: 'staff', role_id: role.id, active: true });
  assert.equal((await staff.api('/inquiries?type=order')).status, 403);
  assert.equal((await staff.api('/posts?per_page=1')).status, 200);
  const home = await staff.get('/admin');
  assert.equal(home.status, 302, 'không có quyền xem Tổng quan thì chuyển tới trang được phép');
  assert.match(home.headers.get('location'), /posts/);
});

test('ghi dữ liệu không có CSRF token bị từ chối', async () => {
  const r = await staff.get(`/admin/api/inquiries/${order.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ admin_note: 'x' }) });
  assert.equal(r.status, 403);
  const bad = await staff.api(`/inquiries/${order.id}`, 'PATCH', { admin_note: 'x' }, { 'x-csrf-token': 'sai' });
  assert.equal(bad.status, 403);
});
