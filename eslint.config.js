// Kiểm tra mã nguồn: npm run lint. Bắt biến / import thừa, biến chưa khai báo, lỗi cú pháp thường gặp.
// Kết quả build (frontend/public/js, admin/public/js, css), thư viện bên thứ ba và dữ liệu không được kiểm tra.
import js from '@eslint/js';
import globals from 'globals';

const unused = ['error', { args: 'after-used', argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true }];

export default [
  { ignores: ['node_modules/**', 'database/**', 'frontend/public/**', 'admin/public/**', 'api/app.bundle.mjs', '.vercel/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { ecmaVersion: 2025, sourceType: 'module', globals: { ...globals.node } },
    rules: {
      'no-unused-vars': unused,
      'no-empty': ['error', { allowEmptyCatch: true }],
      'prefer-const': 'warn',
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } },
  },
  {
    // JS chạy trên trình duyệt (nguồn trước khi minify): Alpine, PhotoSwipe, Swiper... nạp riêng nên khai báo là biến toàn cục
    files: ['frontend/src/js/**/*.js', 'admin/src/js/**/*.js'],
    languageOptions: { globals: { ...globals.browser, Alpine: 'readonly', Quill: 'readonly', Swiper: 'readonly' } },
  },
  {
    // JS admin là script thường (không phải module): core.js khai báo hàm dùng chung, pages.js dùng lại
    files: ['admin/src/js/**/*.js'],
    languageOptions: { sourceType: 'script' },
    rules: { 'no-unused-vars': ['error', { ...unused[1], vars: 'local' }] },
  },
];
