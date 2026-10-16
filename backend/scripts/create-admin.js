// npm run create-admin — tạo tài khoản quản trị (hoặc đặt lại mật khẩu nếu email đã tồn tại)
// Có thể chạy không cần hỏi: npm run create-admin -- email@x.com "Tên" "MatKhau123" owner
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { migrate } from '../lib/db.js';
import { createUser, findByEmail, setPassword, updateUser } from '../services/users.js';

migrate({ log: () => {} });

const [argEmail, argName, argPass, argRole] = process.argv.slice(2);
let email = argEmail, name = argName, password = argPass, role = argRole || 'owner';

if (!email || !password) {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  console.log('\n=== TẠO TÀI KHOẢN QUẢN TRỊ ===\n');
  email = (await rl.question('Email đăng nhập: ')).trim();
  name = (await rl.question('Tên hiển thị: ')).trim();
  password = await rl.question('Mật khẩu (tối thiểu 10 ký tự, có chữ và số): ');
  const r = (await rl.question('Vai trò - 1: Chủ shop, 2: Nhân viên [1]: ')).trim();
  role = r === '2' ? 'staff' : 'owner';
  rl.close();
}

try {
  const existing = findByEmail(email);
  if (existing) {
    await setPassword(existing.id, password);
    await updateUser(existing.id, { name: name || existing.name, role, active: true });
    console.log(`\n✔ Đã đặt lại mật khẩu và mở khóa tài khoản ${email}\n`);
  } else {
    await createUser({ email, name, password, role });
    console.log(`\n✔ Đã tạo tài khoản ${role === 'owner' ? 'Chủ shop' : 'Nhân viên'}: ${email}\n`);
  }
  process.exit(0);
} catch (err) {
  console.error(`\n✘ ${err.message}\n`);
  process.exit(1);
}
