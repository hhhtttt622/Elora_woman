'use server';
import { redirect } from 'next/navigation';
import { get, run } from '@/lib/db';
import { createSession, destroySession, hash, verify, getUser, requirePerm, revokeSessions } from '@/lib/auth';
import { homeOf, isInternal } from '@/lib/permissions';
import { nowIso } from '@/lib/util';

export type Res = { ok?: boolean; error?: string; msg?: string; fields?: Record<string, string> };
const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9 +]{9,14}$/;

// UC-02
export async function loginAction(_: Res, f: FormData): Promise<Res> {
  const email = s(f, 'email').toLowerCase(), pass = s(f, 'password');
  const u = email && pass ? get<any>('SELECT * FROM users WHERE email=?', email) : null;
  // 4a: chỉ báo lỗi chung, không nói rõ sai phần nào (BR-13)
  if (!u || !verify(pass, u.password_hash)) return { error: 'Email hoặc mật khẩu chưa đúng.' };
  if (u.status === 'locked') return { error: 'Tài khoản đã bị khóa. Vui lòng liên hệ admin.' };
  await createSession(u.id);
  if (u.must_change_pw) redirect(u.role === 'customer' ? '/tai-khoan?tab=password' : '/admin/tai-khoan-cua-toi');
  const next = s(f, 'next');
  const internalNext = next.startsWith('/admin');
  redirect(next.startsWith('/') && internalNext === isInternal(u.role) ? next : homeOf(u.role));
}

// UC-01
export async function registerAction(_: Res, f: FormData): Promise<Res> {
  const name = s(f, 'name'), email = s(f, 'email').toLowerCase(), pass = s(f, 'password'), phone = s(f, 'phone');
  const fields: Record<string, string> = {};
  if (name.length < 2) fields.name = 'Họ tên cần ít nhất 2 ký tự.';
  if (!EMAIL.test(email)) fields.email = 'Email chưa đúng định dạng.';
  if (phone && !PHONE.test(phone)) fields.phone = 'Số điện thoại chưa đúng định dạng.';
  if (pass.length < 6) fields.password = 'Mật khẩu cần ít nhất 6 ký tự.';
  if (pass !== s(f, 'password2')) fields.password2 = 'Mật khẩu nhập lại chưa khớp.';
  if (Object.keys(fields).length) return { error: 'Kiểm tra lại các trường được đánh dấu.', fields };
  if (get('SELECT id FROM users WHERE email=?', email)) return { error: 'Email này đã được sử dụng.', fields: { email: 'Email này đã được sử dụng.' } };
  const r = run("INSERT INTO users(name,email,phone,password_hash,role,created_at) VALUES(?,?,?,?,'customer',?)", name, email, phone, hash(pass), nowIso());
  await createSession(Number(r.lastInsertRowid));
  redirect('/tai-khoan');
}

// UC-03
export async function logoutAction() { await destroySession(); redirect('/'); }

// UC-04
export async function updateProfileAction(_: Res, f: FormData): Promise<Res> {
  let u;
  try { u = await requirePerm('UC-04'); } catch (e: any) { return { error: e.message }; }
  const name = s(f, 'name'), phone = s(f, 'phone');
  if (name.length < 2) return { error: 'Họ tên cần ít nhất 2 ký tự.', fields: { name: 'Họ tên cần ít nhất 2 ký tự.' } };
  if (phone && !PHONE.test(phone)) return { error: 'Số điện thoại chưa đúng định dạng.', fields: { phone: 'Số điện thoại chưa đúng định dạng.' } };
  const h = parseInt(s(f, 'height'), 10), w = parseInt(s(f, 'weight'), 10);
  const birthday = s(f, 'birthday');
  if (birthday) {
    const [year, month, day] = birthday.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday) || Number.isNaN(+parsed) || parsed.toISOString().slice(0, 10) !== birthday || birthday > today) return { error: 'Ngày sinh không hợp lệ hoặc đang ở tương lai.', fields: { birthday: 'Nhập ngày sinh hợp lệ.' } };
  }
  const currentBirthday = get<any>('SELECT birthday FROM users WHERE id=?', u.id)?.birthday || '';
  if (currentBirthday && currentBirthday !== birthday && get('SELECT 1 FROM promotion_redemptions r JOIN promotions p ON p.id=r.promotion_id WHERE r.user_id=? AND p.occasion=? AND r.status!=? LIMIT 1', u.id, 'birthday', 'released')) {
    return { error: 'Ngày sinh đã được dùng để nhận ưu đãi trong chu kỳ hiện tại và chưa thể thay đổi.', fields: { birthday: 'Liên hệ ELORA để cập nhật ngày sinh.' } };
  }
  run('UPDATE users SET name=?, phone=?, height_cm=?, weight_kg=?, size=?, liked_colors=?, work_env=?, birthday=? WHERE id=?',
    name, phone, h > 0 ? h : null, w > 0 ? w : null, s(f, 'size') || 'M', f.getAll('colors').join(', '), s(f, 'workEnv'), birthday || null, u.id);
  return { ok: true, msg: 'Đã lưu thông tin.' };
}

// UC-39
export async function changePasswordAction(_: Res, f: FormData): Promise<Res> {
  const me = await getUser();
  if (!me) return { error: 'Hãy đăng nhập.' };
  const cur = s(f, 'current'), next = s(f, 'password'), next2 = s(f, 'password2');
  const u = get<any>('SELECT password_hash, must_change_pw FROM users WHERE id=?', me.id);
  if (!verify(cur, u.password_hash)) return { error: 'Mật khẩu hiện tại chưa đúng.', fields: { current: 'Mật khẩu hiện tại chưa đúng.' } };
  if (next.length < 6) return { error: 'Mật khẩu mới cần ít nhất 6 ký tự.', fields: { password: 'Mật khẩu mới cần ít nhất 6 ký tự.' } };
  if (next === cur) return { error: 'Mật khẩu mới phải khác mật khẩu hiện tại.', fields: { password: 'Mật khẩu mới phải khác mật khẩu hiện tại.' } };
  if (next !== next2) return { error: 'Mật khẩu nhập lại chưa khớp.', fields: { password2: 'Mật khẩu nhập lại chưa khớp.' } };
  run('UPDATE users SET password_hash=?, must_change_pw=0 WHERE id=?', hash(next), me.id);
  revokeSessions(me.id, me.sid);
  if (u.must_change_pw) redirect(homeOf(me.role));
  return { ok: true, msg: 'Đã đổi mật khẩu. Các phiên đăng nhập khác đã được đăng xuất.' };
}
