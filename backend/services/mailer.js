// Gửi email qua SMTP (Gmail App Password hoặc SMTP bất kỳ), cấu hình trong Admin > Cài đặt > Email.
import nodemailer from 'nodemailer';
import { getRaw, getSecret, getPublicSettings } from './settings.js';
import { escapeHtml, formatVnd, formatDate } from '../lib/utils.js';
import { config } from '../config/index.js';

function transporter() {
  const m = getRaw('mail');
  if (!m.enabled) return null;
  const pass = getSecret('mail', 'password');
  if (!m.host || !m.user || !pass) return null;
  return nodemailer.createTransport({
    host: m.host,
    port: Number(m.port) || 465,
    secure: !!m.secure,
    auth: { user: m.user, pass },
    connectionTimeout: 15000,
  });
}

export function mailReady() {
  return !!transporter();
}

export async function sendMail({ to, subject, html, replyTo }) {
  const t = transporter();
  if (!t) throw new Error('Email chưa được cấu hình hoặc đang tắt');
  const m = getRaw('mail');
  return t.sendMail({
    from: { name: m.from_name || 'Website', address: m.user },
    to,
    subject,
    html,
    replyTo: replyTo || undefined,
  });
}

export async function verifyConnection() {
  const t = transporter();
  if (!t) throw new Error('Email chưa được bật hoặc thiếu máy chủ / tài khoản / mật khẩu');
  await t.verify();
}

// ---------------- Mẫu email ----------------
const TYPE_LABEL = { order: 'Đơn đặt hàng', custom: 'Yêu cầu thiết kế riêng', contact: 'Lời nhắn liên hệ' };

function layout(title, body) {
  const s = getPublicSettings();
  const t = s.theme;
  return `<!doctype html><html><body style="margin:0;background:#eef2f4;font-family:Arial,Helvetica,sans-serif;color:#222">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0"><tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden">
    <tr><td style="background:${t.color_primary};color:${t.color_primary_contrast};padding:20px 28px;font-size:20px;font-weight:bold">${escapeHtml(s.site.name)}</td></tr>
    <tr><td style="padding:28px">
      <h2 style="margin:0 0 16px;font-size:18px">${escapeHtml(title)}</h2>
      ${body}
    </td></tr>
    <tr><td style="padding:16px 28px;background:#f6f9fa;font-size:12px;color:#777">
      ${escapeHtml(s.site.name)} · ${escapeHtml(s.site.phone)} · ${escapeHtml(s.site.email)}<br>${escapeHtml(config.baseUrl)}
    </td></tr>
  </table></td></tr></table></body></html>`;
}

function rows(pairs) {
  return `<table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">${pairs
    .filter(([, v]) => v !== '' && v != null)
    .map(([k, v]) => `<tr><td style="color:#777;width:38%;border-bottom:1px solid #eee;vertical-align:top">${escapeHtml(k)}</td><td style="border-bottom:1px solid #eee">${escapeHtml(v).replace(/\n/g, '<br>')}</td></tr>`)
    .join('')}</table>`;
}

function itemsTable(items, total) {
  if (!items?.length) return '';
  const body = items.map((i) => `<tr>
    <td style="border-bottom:1px solid #eee">${escapeHtml(i.name)}${i.size ? `<br><small style="color:#777">${escapeHtml(i.size_label || 'Ni')}: ${escapeHtml(i.size)}</small>` : ''}${i.note ? `<br><small style="color:#777">${escapeHtml(i.note)}</small>` : ''}</td>
    <td style="border-bottom:1px solid #eee;text-align:center">${i.qty}</td>
    <td style="border-bottom:1px solid #eee;text-align:right">${i.price != null ? formatVnd(i.price * i.qty) : 'Liên hệ'}</td></tr>`).join('');
  return `<h3 style="font-size:15px;margin:24px 0 8px">Sản phẩm</h3>
  <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">
    <tr style="background:#eef3f5"><th align="left">Sản phẩm</th><th>SL</th><th align="right">Thành tiền</th></tr>${body}
    <tr><td colspan="2" style="text-align:right;font-weight:bold">Tạm tính</td><td style="text-align:right;font-weight:bold">${total != null ? formatVnd(total) : 'Liên hệ'}</td></tr>
  </table>`;
}

function detailPairs(inq) {
  const d = inq.details || {};
  return [
    ['Mã', inq.code],
    ['Thời gian', formatDate(inq.created_at, true)],
    ['Họ tên', inq.name],
    ['Điện thoại', inq.phone],
    ['Email', inq.email],
    ['Địa chỉ', inq.address],
    ['Liên hệ qua', inq.contact_via],
    ['Sản phẩm quan tâm', d.product],
    ['Loại ngọc mong muốn', d.jade_type],
    ['Màu sắc', d.color],
    ['Kiểu dáng', d.style],
    ['Ni tay / size', d.size],
    ['Mệnh', d.element],
    ['Dây / mặt / phụ kiện', d.accessory],
    ['Ngân sách', d.budget],
    ['Mục đích', d.purpose],
    ['Thời gian mong muốn', d.deadline],
    ['Mô tả / lời nhắn', inq.message],
  ];
}

export function shopNotification(inq) {
  const label = inq.type === 'contact' && inq.details?.product ? 'Yêu cầu tư vấn sản phẩm' : TYPE_LABEL[inq.type];
  const link = `${config.baseUrl}${config.adminPath}/inquiries/${inq.id}`;
  return {
    subject: `[${label}] ${inq.code} – ${inq.name} – ${inq.phone}`,
    html: layout(`${label} mới`, `${rows(detailPairs(inq))}${itemsTable(inq.items, inq.total)}
      <p style="margin-top:24px"><a href="${escapeHtml(link)}" style="background:${getPublicSettings().theme.color_primary};color:${getPublicSettings().theme.color_primary_contrast};padding:10px 18px;border-radius:6px;text-decoration:none">Mở trong trang quản trị</a></p>`),
  };
}

export function customerConfirmation(inq) {
  const s = getPublicSettings();
  const success = { order: s.forms.order_success, custom: s.forms.custom_success, contact: s.forms.contact_success }[inq.type];
  return {
    subject: `${s.site.name} đã nhận ${TYPE_LABEL[inq.type].toLowerCase()} ${inq.code}`,
    html: layout(`Xin chào ${inq.name},`, `<p style="font-size:14px;line-height:1.6">${escapeHtml(success)}</p>
      ${rows(detailPairs(inq).filter(([k]) => !['Thời gian'].includes(k)))}${itemsTable(inq.items, inq.total)}
      <p style="font-size:14px;line-height:1.6;margin-top:20px">Tra cứu tình trạng tại <a href="${escapeHtml(config.baseUrl)}/tra-cuu-don?ma=${encodeURIComponent(inq.code)}">${escapeHtml(config.baseUrl)}/tra-cuu-don</a> (nhập mã <b>${escapeHtml(inq.code)}</b> và số điện thoại đã đặt).</p>
      <p style="font-size:14px;line-height:1.6;margin-top:20px">Cần hỗ trợ ngay? Gọi/Zalo: <b>${escapeHtml(s.site.phone)}</b></p>`),
  };
}

// Email báo khách khi trạng thái đơn / yêu cầu thay đổi (do admin chọn gửi)
export function customerStatusUpdate(inq) {
  const s = getPublicSettings();
  const note = s.forms[`track_msg_${inq.status}`] || '';
  const ship = ['shipping', 'completed'].includes(inq.status)
    ? rows([['Đơn vị vận chuyển', inq.carrier], ['Mã vận đơn', inq.tracking_code]]) : '';
  return {
    subject: `${s.site.name}: ${TYPE_LABEL[inq.type]} ${inq.code} – ${inq.status_label}`,
    html: layout(`Xin chào ${inq.name},`, `<p style="font-size:14px;line-height:1.6">${TYPE_LABEL[inq.type]} <b>${escapeHtml(inq.code)}</b> của bạn vừa chuyển sang trạng thái:
      <b style="color:${s.theme.color_primary}">${escapeHtml(inq.status_label)}</b></p>
      ${note ? `<p style="font-size:14px;line-height:1.6;background:#f3f7f9;padding:12px 14px;border-radius:6px">${escapeHtml(note).replace(/\n/g, '<br>')}</p>` : ''}
      ${ship}${itemsTable(inq.items, inq.total)}
      <p style="font-size:14px;line-height:1.6;margin-top:20px">Xem chi tiết tại <a href="${escapeHtml(config.baseUrl)}/tra-cuu-don?ma=${encodeURIComponent(inq.code)}">${escapeHtml(config.baseUrl)}/tra-cuu-don</a> (nhập mã đơn và số điện thoại).</p>
      <p style="font-size:14px;line-height:1.6;margin-top:20px">Cần hỗ trợ ngay? Gọi/Zalo: <b>${escapeHtml(s.site.phone)}</b></p>`),
  };
}
