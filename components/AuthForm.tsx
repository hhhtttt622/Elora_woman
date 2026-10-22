'use client';
import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { loginAction, registerAction, type Res } from '@/app/actions/auth';

function Submit({ label }: { label: string }) { const { pending } = useFormStatus(); return <button className="btn" disabled={pending}>{pending ? 'Đang xử lý...' : label}</button>; }

export default function AuthForm({ mode, next }: { mode: 'login' | 'register'; next?: string }) {
  const [st, action] = useFormState<Res, FormData>(mode === 'login' ? loginAction : registerAction, {});
  const L = mode === 'login';
  const fe = st.fields || {};
  const msg = (k: string) => fe[k] ? <span id={`a-${k}-err`} className="err">{fe[k]}</span> : null;
  const inv = (k: string) => ({ 'aria-invalid': !!fe[k], 'aria-describedby': fe[k] ? `a-${k}-err` : undefined });
  return (
    <form action={action} className="card" style={{ maxWidth: 460, margin: '0 auto', gap: 18 }}>
      <div><span className="eb">{L ? 'Chào mừng trở lại' : 'Tạo tài khoản'}</span><h1 className="disp" style={{ fontSize: 44, lineHeight: 1 }}>{L ? 'Đăng nhập' : 'Đăng ký'}</h1></div>
      {next && <input type="hidden" name="next" value={next} />}
      {!L && <div className="fl"><label className="lbl" htmlFor="a-name">Họ tên</label><input id="a-name" name="name" className="fld" autoComplete="name" {...inv('name')} />{msg('name')}</div>}
      <div className="fl"><label className="lbl" htmlFor="a-email">Email</label><input id="a-email" name="email" type="email" className="fld" autoComplete="email" {...inv('email')} />{msg('email')}</div>
      {!L && <div className="fl"><label className="lbl" htmlFor="a-phone">Số điện thoại</label><input id="a-phone" name="phone" className="fld" autoComplete="tel" {...inv('phone')} />{msg('phone')}</div>}
      <div className="fl"><label className="lbl" htmlFor="a-pass">Mật khẩu</label><input id="a-pass" name="password" type="password" className="fld" autoComplete={L ? 'current-password' : 'new-password'} {...inv('password')} />{msg('password')}</div>
      {!L && <div className="fl"><label className="lbl" htmlFor="a-pass2">Nhập lại mật khẩu</label><input id="a-pass2" name="password2" type="password" className="fld" autoComplete="new-password" {...inv('password2')} />{msg('password2')}</div>}
      {st.error && <p className="err" role="alert">{st.error}</p>}
      <Submit label={L ? 'Đăng nhập' : 'Tạo tài khoản'} />
      {L ? <p className="note">Chưa có tài khoản? <Link href="/dang-ky" style={{ textDecoration: 'underline', color: 'var(--wine)', fontWeight: 600 }}>Đăng ký</Link></p>
         : <p className="note">Đã có tài khoản? <Link href="/dang-nhap" style={{ textDecoration: 'underline', color: 'var(--wine)', fontWeight: 600 }}>Đăng nhập</Link></p>}
      {L && <p className="note" style={{ background: '#F6EEEF', padding: '10px 12px', border: '1px solid var(--line)' }}>Tài khoản mẫu: ha.nguyen@example.com / elora123 (khách hàng), stylist@elora.vn / stylist123 (stylist), kho@elora.vn / nhanvien123 (nhân viên), admin@elora.vn / admin123 (admin).</p>}
    </form>
  );
}
