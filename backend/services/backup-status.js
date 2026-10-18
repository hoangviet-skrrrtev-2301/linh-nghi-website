// Trạng thái sao lưu để nhắc ở Admin › Tổng quan (chỉ khi chạy thật): bản sao lưu đêm còn mới không, đã có bản chép ra ngoài server chưa.
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/index.js';
import { db } from '../lib/db.js';

const STAMP = /^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}/;
const mtime = (f) => { try { return fs.statSync(f).mtimeMs; } catch { return 0; } };

export function backupStatus() {
  const dir = config.paths.backups;
  let newest = 0;
  try {
    for (const n of fs.readdirSync(dir)) if (STAMP.test(n)) newest = Math.max(newest, mtime(path.join(dir, n)));
  } catch { /* chưa có thư mục */ }
  // Chép ra ngoài server: lệnh pull-backup trên máy riêng (.last-pull), rclone (.last-offsite), hoặc tải thủ công trong admin (nhật ký)
  const manual = db.prepare("SELECT created_at FROM audit_logs WHERE action = 'backup' ORDER BY id DESC LIMIT 1").pluck().get();
  const outside = Math.max(mtime(path.join(dir, '.last-pull')), mtime(path.join(dir, '.last-offsite')), manual ? new Date(manual.replace(' ', 'T') + 'Z').getTime() : 0);
  return { lastBackupAt: newest || null, lastOutsideAt: outside || null };
}

const HOUR = 3600 * 1000;
export function backupChecks() {
  if (!config.isProd) return []; // máy cá nhân không có cron sao lưu đêm
  const st = backupStatus();
  const out = [];
  const now = Date.now();
  if (!st.lastBackupAt || now - st.lastBackupAt > 36 * HOUR) {
    out.push({ level: 'warn', group: 'backup', text: 'Chưa có bản sao lưu tự động nào trong 36 giờ qua. Kiểm tra lịch sao lưu đêm trên server (file logs/backup.log, lệnh crontab -l).' });
  }
  if (!st.lastOutsideAt || now - st.lastOutsideAt > 3 * 24 * HOUR) {
    const days = st.lastOutsideAt ? Math.floor((now - st.lastOutsideAt) / (24 * HOUR)) : null;
    out.push({ level: 'warn', group: 'backup', text: days === null
      ? 'Chưa có bản sao lưu nào được chép ra NGOÀI server. Nếu ổ đĩa server hỏng, mất cả dữ liệu lẫn bản sao lưu. Đặt lịch tải về máy riêng (npm run pull-backup) hoặc đẩy lên dịch vụ lưu trữ (xem hướng dẫn trong tài liệu bàn giao).'
      : `Đã ${days} ngày chưa có bản sao lưu nào được chép ra ngoài server. Kiểm tra lịch tải về máy riêng hoặc dịch vụ lưu trữ.` });
  }
  return out;
}
