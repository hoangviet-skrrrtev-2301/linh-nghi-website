// Tài khoản quản trị và nhật ký thao tác.
import { db } from '../lib/db.js';
import { hashPassword, passwordProblem, encrypt, decrypt } from '../lib/security.js';
import { destroyUserSessions } from '../lib/session-store.js';
import { HttpError, toInt } from '../lib/utils.js';
import { cleanText } from '../lib/sanitize.js';
import { ALL_PERMISSIONS, DEFAULT_ROLE_ID } from '../config/permissions.js';
import { getRole } from './roles.js';

export const ROLES = { owner: 'Chủ shop', staff: 'Nhân viên' };

const PUBLIC_COLS = 'id, email, name, role, role_id, totp_enabled, active, last_login_at, created_at';

// Thêm quyền thực tế: Chủ shop toàn quyền; nhân viên theo vai trò được gán (chưa gán thì vai trò Nhân viên có sẵn)
function withPermissions(u) {
  if (!u) return u;
  if (u.role === 'owner') return { ...u, role_label: ROLES.owner, permissions: [...ALL_PERMISSIONS] };
  const role = getRole(u.role_id || DEFAULT_ROLE_ID) || getRole(DEFAULT_ROLE_ID);
  return { ...u, role_label: role?.name || ROLES.staff, permissions: role?.permissions || [] };
}

export const listUsers = () => db.prepare(`SELECT ${PUBLIC_COLS} FROM users ORDER BY role, name`).all().map(withPermissions);
export const getUser = (id) => withPermissions(db.prepare(`SELECT ${PUBLIC_COLS} FROM users WHERE id = ?`).get(id));
export const getUserWithSecrets = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);
export const findByEmail = (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').trim());

const validRoleId = (id) => (id && getRole(id) ? Number(id) : null);

export async function createUser({ email, name, password, role = 'staff', role_id }) {
  const e = cleanText(email, 160).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new HttpError(400, 'Email không hợp lệ');
  if (findByEmail(e)) throw new HttpError(400, 'Email đã được sử dụng');
  const problem = passwordProblem(password);
  if (problem) throw new HttpError(400, problem);
  const r = ROLES[role] ? role : 'staff';
  return db.prepare('INSERT INTO users (email, name, password_hash, role, role_id) VALUES (?, ?, ?, ?, ?)')
    .run(e, cleanText(name, 120) || e, await hashPassword(password), r, r === 'staff' ? validRoleId(role_id) : null).lastInsertRowid;
}

function ownerCount(excludeId) {
  return db.prepare(`SELECT COUNT(*) FROM users WHERE role = 'owner' AND active = 1 AND id != ?`).pluck().get(excludeId || 0);
}

export async function updateUser(id, { name, role, role_id, active, password }) {
  const user = getUserWithSecrets(toInt(id));
  if (!user) throw new HttpError(404, 'Không tìm thấy tài khoản');
  const nextRole = ROLES[role] ? role : user.role;
  const nextActive = active === undefined ? user.active : (active ? 1 : 0);
  if (user.role === 'owner' && (nextRole !== 'owner' || !nextActive) && ownerCount(user.id) === 0) {
    throw new HttpError(400, 'Phải còn ít nhất một tài khoản Chủ shop đang hoạt động');
  }
  const nextRoleId = nextRole === 'staff' ? (role_id === undefined ? user.role_id : validRoleId(role_id)) : null;
  db.prepare(`UPDATE users SET name = ?, role = ?, role_id = ?, active = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(cleanText(name, 120) || user.name, nextRole, nextRoleId, nextActive, user.id);
  if (password) await setPassword(user.id, password);
  if (!nextActive) destroyUserSessions(user.id);
  return getUser(user.id);
}

export async function setPassword(id, password, keepSid) {
  const problem = passwordProblem(password);
  if (problem) throw new HttpError(400, problem);
  db.prepare(`UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL, updated_at = datetime('now') WHERE id = ?`)
    .run(await hashPassword(password), id);
  destroyUserSessions(id, keepSid);
}

export function deleteUser(id, currentUserId) {
  if (Number(id) === Number(currentUserId)) throw new HttpError(400, 'Không thể xóa tài khoản đang đăng nhập');
  const user = getUser(id);
  if (!user) throw new HttpError(404, 'Không tìm thấy tài khoản');
  if (user.role === 'owner' && ownerCount(user.id) === 0) throw new HttpError(400, 'Không thể xóa Chủ shop cuối cùng');
  destroyUserSessions(user.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

export function setTotp(id, secret, enabled) {
  db.prepare('UPDATE users SET totp_secret = ?, totp_enabled = ? WHERE id = ?').run(secret ? encrypt(secret) : null, enabled ? 1 : 0, id);
}

export const getTotpSecret = (user) => decrypt(user.totp_secret || '');

// ---------------- Đăng nhập: khóa tạm sau nhiều lần sai ----------------
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

export function isLocked(user) {
  return user.locked_until && new Date(user.locked_until + 'Z') > new Date();
}

export function recordFailure(user) {
  const fails = user.failed_attempts + 1;
  const lock = fails >= MAX_FAILS ? `datetime('now', '+${LOCK_MINUTES} minutes')` : 'NULL';
  db.prepare(`UPDATE users SET failed_attempts = ?, locked_until = ${lock} WHERE id = ?`).run(fails >= MAX_FAILS ? 0 : fails, user.id);
}

export function recordSuccess(user) {
  db.prepare(`UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = datetime('now') WHERE id = ?`).run(user.id);
}

// ---------------- Nhật ký ----------------
export function audit(req, action, entity = '', entityId = '', detail = '') {
  try {
    db.prepare('INSERT INTO audit_logs (user_id, action, entity, entity_id, detail, ip) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.user?.id ?? null, action, entity, String(entityId ?? ''), String(detail).slice(0, 1000), req.ip || '');
  } catch (err) {
    console.error('[audit]', err.message);
  }
}

export function listAudit({ page = 1, perPage = 50 } = {}) {
  const total = db.prepare('SELECT COUNT(*) FROM audit_logs').pluck().get();
  const items = db.prepare(`SELECT a.*, u.name AS user_name FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
    ORDER BY a.id DESC LIMIT ? OFFSET ?`).all(perPage, (Math.max(1, page) - 1) * perPage);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}
