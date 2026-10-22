import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { get, run } from './db';
import { can, homeOf, type Perm, type Role } from './permissions';

const COOKIE = 'elora_session';
const TTL_DAYS = 7; // BR-13
const key = () => new TextEncoder().encode(process.env.SESSION_SECRET || 'elora-dev-secret-change-me');

export type SessionUser = { id: number; name: string; email: string; role: Role; mustChangePw: boolean; sid: string };

/** Tạo PHIÊN ĐĂNG NHẬP 7 ngày. Cookie chỉ mang mã phiên, quyền và trạng thái đọc lại từ database mỗi lần. */
export async function createSession(userId: number) {
  const sid = randomUUID();
  const now = new Date();
  run('INSERT INTO sessions(id,user_id,created_at,expires_at,status) VALUES(?,?,?,?,?)', sid, userId, now.toISOString(), new Date(now.getTime() + TTL_DAYS * 86400000).toISOString(), 'active');
  const token = await new SignJWT({ sid }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime(`${TTL_DAYS}d`).sign(key());
  cookies().set(COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: TTL_DAYS * 86400 });
  return sid;
}

export async function destroySession() {
  const u = await getUser();
  if (u) run("UPDATE sessions SET status='logged_out' WHERE id=?", u.sid);
  cookies().delete(COOKIE);
}

/** Hủy các phiên đang mở của tài khoản (khóa tài khoản BR-21, đổi mật khẩu UC-39). */
export function revokeSessions(userId: number, exceptSid?: string) {
  run("UPDATE sessions SET status='revoked' WHERE user_id=? AND status='active' AND id != ?", userId, exceptSid || '');
}

export async function getUser(): Promise<SessionUser | null> {
  const t = cookies().get(COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key());
    const row = get<any>(`SELECT u.id, u.name, u.email, u.role, u.must_change_pw FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE s.id=? AND s.status='active' AND s.expires_at > ? AND u.status='active'`, String(payload.sid), new Date().toISOString());
    return row ? { id: row.id, name: row.name, email: row.email, role: row.role, mustChangePw: !!row.must_change_pw, sid: String(payload.sid) } : null;
  } catch { return null; }
}

/** Kiểm tra quyền cho server action. Máy chủ kiểm tra ở mọi thao tác (BR-05). */
export async function requirePerm(uc: Perm) {
  const u = await getUser();
  if (!u) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
  if (u.mustChangePw && uc !== 'UC-39') throw new Error('Hãy đổi mật khẩu tạm trước khi dùng chức năng khác.');
  if (!can(u.role, uc)) throw new Error('Tài khoản của bạn không có quyền thực hiện thao tác này.');
  return u;
}

/** Kiểm tra quyền cho trang. Ngoài quyền thì chuyển về trang làm việc của vai trò (UC-02, 5a). */
export async function requirePage(uc: Perm, next: string) {
  const u = await getUser();
  if (!u) redirect(`/dang-nhap?next=${encodeURIComponent(next)}`);
  if (u.mustChangePw && uc !== 'UC-39') redirect(u.role === 'customer' ? '/tai-khoan?tab=password' : '/admin/tai-khoan-cua-toi');
  if (!can(u.role, uc)) redirect(homeOf(u.role));
  return u;
}

export const hash = (p: string) => bcrypt.hashSync(p, 10);
export const verify = (p: string, h: string) => bcrypt.compareSync(p, h);
