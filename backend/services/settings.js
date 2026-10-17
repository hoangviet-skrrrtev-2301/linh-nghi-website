// Đọc/ghi cấu hình website theo schema trong config/settings-schema.js
import { db } from '../lib/db.js';
import { SETTINGS_SCHEMA, SCHEMA_BY_KEY } from '../config/settings-schema.js';
import { encrypt, decrypt } from '../lib/security.js';
import { cleanHtml, cleanText } from '../lib/sanitize.js';
import { bool, safeJson, HttpError } from '../lib/utils.js';
import { getMediaMap } from './media.js';

let cache = null;

function defaults(group) {
  return Object.fromEntries(group.fields.map((f) => [f.name, structuredClone(f.default ?? (f.type === 'list' ? [] : f.type === 'toggle' ? false : ''))]));
}

function loadAll() {
  if (cache) return cache;
  const stored = Object.fromEntries(db.prepare('SELECT key, value FROM settings').all().map((r) => [r.key, safeJson(r.value, {})]));
  cache = {};
  for (const group of SETTINGS_SCHEMA) cache[group.key] = { ...defaults(group), ...(stored[group.key] || {}) };
  // Menu đã lưu từ trước chưa có kiểu sổ dọc: mục Sản phẩm mặc định sổ theo loại ngọc, các mục khác không sổ
  cache.navigation.items = (cache.navigation.items || []).map((it) => ({
    dropdown: it.url === '/san-pham' ? 'jade_type' : 'none', dropdown_custom: '', ...it,
  }));
  return cache;
}

// Cấu hình thô (đã gộp giá trị mặc định). Trường secret giữ dạng mã hóa.
export function getRaw(key) {
  return loadAll()[key];
}

// Lấy giá trị đã giải mã của một trường secret (chỉ dùng phía server)
export function getSecret(key, field) {
  return decrypt(getRaw(key)?.[field] || '');
}

// Dữ liệu cho form admin: ẩn secret, chỉ báo có/không
export function getForAdmin(key) {
  const group = SCHEMA_BY_KEY[key];
  const data = { ...getRaw(key) };
  for (const f of group.fields) if (f.type === 'secret') data[f.name] = data[f.name] ? '__SET__' : '';
  return data;
}

function coerce(field, value, previous) {
  switch (field.type) {
    case 'toggle': return bool(value);
    case 'number': {
      const n = Number(value);
      return Number.isFinite(n) ? n : (field.default ?? 0);
    }
    case 'image': {
      const n = Number(value);
      return Number.isInteger(n) && n > 0 ? n : null;
    }
    case 'color': return /^#[0-9a-f]{3,8}$/i.test(value) ? value : (field.default ?? '#000000');
    case 'select': return field.options.some((o) => String(o.value) === String(value)) ? String(value) : field.default;
    case 'richtext': return cleanHtml(value);
    case 'url': {
      const s = cleanText(value, 2000);
      return s === '' || /^https?:\/\//i.test(s) ? s : '';
    }
    case 'secret':
      // Không nhập = giữ nguyên, nhập "__CLEAR__" = xóa
      if (value === '__CLEAR__') return '';
      if (!value || value === '__SET__') return previous || '';
      return encrypt(String(value).trim());
    case 'list': {
      if (!Array.isArray(value)) return [];
      return value.slice(0, 100).map((item) => Object.fromEntries(
        field.fields.map((sub) => [sub.name, coerce(sub, item?.[sub.name], undefined)]),
      ));
    }
    default: return cleanText(value, field.type === 'textarea' ? 20000 : 1000);
  }
}

export function saveGroup(key, input) {
  const group = SCHEMA_BY_KEY[key];
  if (!group) throw new HttpError(404, 'Nhóm cấu hình không tồn tại');
  const prev = getRaw(key);
  const next = {};
  for (const f of group.fields) {
    next[f.name] = Object.hasOwn(input, f.name) ? coerce(f, input[f.name], prev[f.name]) : prev[f.name];
  }
  db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).run(key, JSON.stringify(next));
  invalidateSettings();
  return getForAdmin(key);
}

// Gom id ảnh trong cấu hình để thay bằng đối tượng ảnh có URL
function collectImageIds(fields, data, out) {
  for (const f of fields) {
    if (f.type === 'image' && data?.[f.name]) out.push(data[f.name]);
    if (f.type === 'list') for (const item of data?.[f.name] || []) collectImageIds(f.fields, item, out);
  }
}

function resolveImages(fields, data, map) {
  const res = { ...data };
  for (const f of fields) {
    if (f.type === 'image') res[f.name] = map[data?.[f.name]] || null;
    if (f.type === 'list') res[f.name] = (data?.[f.name] || []).map((item) => resolveImages(f.fields, item, map));
    if (f.type === 'secret') delete res[f.name];
  }
  return res;
}

let publicCache = null;

// Cấu hình dùng cho giao diện khách (không chứa mật khẩu, ảnh đã có URL)
export function getPublicSettings() {
  if (publicCache) return publicCache;
  const all = loadAll();
  const ids = [];
  const groups = SETTINGS_SCHEMA.filter((g) => !g.ownerOnly);
  for (const g of groups) collectImageIds(g.fields, all[g.key], ids);
  const map = getMediaMap(ids);
  publicCache = Object.fromEntries(groups.map((g) => [g.key, resolveImages(g.fields, all[g.key], map)]));
  return publicCache;
}

export function invalidateSettings() {
  cache = null;
  publicCache = null;
}
