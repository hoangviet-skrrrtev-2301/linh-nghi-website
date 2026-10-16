// Lưu phiên đăng nhập vào SQLite, không mất đăng nhập khi khởi động lại server.
import session from 'express-session';
import { db } from './db.js';

export class SqliteStore extends session.Store {
  constructor({ ttlMs }) {
    super();
    this.ttlMs = ttlMs;
    this.q = {
      get: db.prepare('SELECT data FROM sessions WHERE sid = ? AND expires_at > ?'),
      set: db.prepare(`INSERT INTO sessions (sid, data, expires_at) VALUES (?, ?, ?)
        ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at`),
      touch: db.prepare('UPDATE sessions SET expires_at = ? WHERE sid = ?'),
      destroy: db.prepare('DELETE FROM sessions WHERE sid = ?'),
      prune: db.prepare('DELETE FROM sessions WHERE expires_at <= ?'),
    };
    setInterval(() => this.q.prune.run(Date.now()), 60 * 60 * 1000).unref();
  }

  expiry(sess) {
    return sess?.cookie?.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + this.ttlMs;
  }

  get(sid, cb) {
    try {
      const row = this.q.get.get(sid, Date.now());
      cb(null, row ? JSON.parse(row.data) : null);
    } catch (err) {
      cb(err);
    }
  }

  set(sid, sess, cb) {
    try {
      this.q.set.run(sid, JSON.stringify(sess), this.expiry(sess));
      cb?.(null);
    } catch (err) {
      cb?.(err);
    }
  }

  touch(sid, sess, cb) {
    try {
      this.q.touch.run(this.expiry(sess), sid);
      cb?.(null);
    } catch (err) {
      cb?.(err);
    }
  }

  destroy(sid, cb) {
    try {
      this.q.destroy.run(sid);
      cb?.(null);
    } catch (err) {
      cb?.(err);
    }
  }
}

// Đăng xuất toàn bộ phiên của một tài khoản (khi đổi mật khẩu, khóa tài khoản)
export function destroyUserSessions(userId, exceptSid) {
  const rows = db.prepare('SELECT sid, data FROM sessions').all();
  const del = db.prepare('DELETE FROM sessions WHERE sid = ?');
  for (const row of rows) {
    if (row.sid === exceptSid) continue;
    try {
      if (JSON.parse(row.data).userId === userId) del.run(row.sid);
    } catch { /* bỏ qua phiên hỏng */ }
  }
}
