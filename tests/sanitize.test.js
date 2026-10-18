// Làm sạch HTML do người dùng soạn (chống XSS) và quy tắc liên kết (tab mới, noopener).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanHtml } from '../backend/lib/sanitize.js';

const EVIL = /<script|<iframe|<object|<embed|<svg|<style|\son(error|load|click|mouseover|focus)\s*=|javascript:|data:text\/html/i;

test('loại script, iframe, svg, thuộc tính on*, javascript:', () => {
  const html = '<p>a</p><script>alert(1)</script><img src=x onerror=alert(2)><a href="javascript:alert(3)" onclick="x()">x</a>'
    + '<iframe src="https://evil.example"></iframe><svg onload=alert(4)></svg><div style="background:url(javascript:alert(5))">y</div>'
    + '<object data="x"></object><embed src="x"><style>*{display:none}</style>';
  const out = cleanHtml(html);
  assert.doesNotMatch(out, EVIL, out);
  assert.match(out, /<p>a<\/p>/, 'giữ nội dung lành');
});

test('liên kết cùng tab: không có target, có noopener', () => {
  const out = cleanHtml('<a href="https://example.com/a">a</a> <a href="/ve-shop">b</a>');
  assert.match(out, /<a href="https:\/\/example.com\/a" rel="noopener nofollow">/);
  assert.match(out, /<a href="\/ve-shop" rel="noopener">/);
  assert.doesNotMatch(out, /target=/);
});

test('liên kết mở tab mới: giữ target và thêm noopener noreferrer', () => {
  const out = cleanHtml('<a href="https://example.com/b" target="_blank">b</a> <a href="/lien-he" target="_blank">c</a>');
  assert.match(out, /<a href="https:\/\/example.com\/b" target="_blank" rel="noopener noreferrer nofollow">/);
  assert.match(out, /<a href="\/lien-he" target="_blank" rel="noopener noreferrer">/);
});

test('target lạ và rel do người dùng tự đặt không được giữ nguyên', () => {
  const out = cleanHtml('<a href="https://example.com" target="_top" rel="opener">x</a>');
  assert.doesNotMatch(out, /target=|rel="opener"/);
});

test('chỉ cho màu chữ / màu nền trong style của span; các kiểu khác bị loại', () => {
  const ok = cleanHtml('<span style="color: #ff0000">a</span>');
  assert.match(ok, /style=/);
  const bad = cleanHtml('<p style="position:fixed;top:0">x</p><span style="position:absolute">y</span>');
  assert.doesNotMatch(bad, /position/);
});

test('ảnh chỉ nhận đường dẫn /uploads hoặc https', () => {
  const out = cleanHtml('<img src="/uploads/2026/10/a.webp"><img src="javascript:alert(1)"><img src="data:image/svg+xml;base64,AAAA"><img src="https://cdn.example/a.jpg">');
  assert.match(out, /\/uploads\/2026\/10\/a\.webp/);
  assert.doesNotMatch(out, /javascript:|data:/);
});
