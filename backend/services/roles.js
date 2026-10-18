// Vai trò tùy chỉnh và phân quyền (xem backend/config/permissions.js).
import { db } from '../lib/db.js';
import { HttpError, toInt, safeJson } from '../lib/utils.js';
import { cleanText } from '../lib/sanitize.js';
import { ALL_PERMISSIONS, DEFAULT_ROLE_ID } from '../config/permissions.js';

const present = (r) => (r ? { ...r, permissions: safeJson(r.permissions, []).filter((p) => ALL_PERMISSIONS.includes(p)), is_system: !!r.is_system } : null);

export const getRole = (id) => present(db.prepare('SELECT * FROM roles WHERE id = ?').get(toInt(id)));

export function listRoles() {
  return db.prepare('SELECT * FROM roles ORDER BY is_system DESC, name').all().map((r) => ({
    ...present(r),
    user_count: db.prepare(`SELECT COUNT(*) FROM users WHERE role = 'staff' AND COALESCE(role_id, ?) = ?`).pluck().get(DEFAULT_ROLE_ID, r.id),
  }));
}

function clean(data) {
  const name = cleanText(data.name, 60);
  if (!name) throw new HttpError(400, 'Vui lòng nhập tên vai trò');
  const permissions = [...new Set((Array.isArray(data.permissions) ? data.permissions : []).filter((p) => ALL_PERMISSIONS.includes(p)))];
  return { name, description: cleanText(data.description, 400), permissions: JSON.stringify(permissions) };
}

export function saveRole(id, data) {
  const v = clean(data);
  const dup = db.prepare('SELECT id FROM roles WHERE name = ? COLLATE NOCASE AND id != ?').get(v.name, id || 0);
  if (dup) throw new HttpError(400, 'Đã có vai trò trùng tên');
  if (id) {
    if (!getRole(id)) throw new HttpError(404, 'Không tìm thấy vai trò');
    db.prepare(`UPDATE roles SET name=@name, description=@description, permissions=@permissions, updated_at=datetime('now') WHERE id=@id`).run({ ...v, id });
    return id;
  }
  return db.prepare('INSERT INTO roles (name, description, permissions) VALUES (@name, @description, @permissions)').run(v).lastInsertRowid;
}

export function deleteRole(id) {
  const role = getRole(id);
  if (!role) throw new HttpError(404, 'Không tìm thấy vai trò');
  if (role.is_system) throw new HttpError(400, 'Không xóa được vai trò có sẵn');
  const n = db.prepare(`SELECT COUNT(*) FROM users WHERE role_id = ?`).pluck().get(role.id);
  if (n) throw new HttpError(409, `Còn ${n} tài khoản đang dùng vai trò này. Hãy đổi vai trò của họ trước.`);
  db.prepare('DELETE FROM roles WHERE id = ?').run(role.id);
}
