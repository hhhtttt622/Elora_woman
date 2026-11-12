'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { loginAction, registerAction, type Res } from '@/app/actions/auth';

function Submit({ label }: { label: string }) { const { pending } = useFormStatus(); return <button className="btn" disabled={pending}>{pending ? 'Đang xử lý...' : label}</button>; }

const DEMO_ACCOUNTS = [
  { label: 'Khách hàng', email: 'ha.nguyen@example.com', password: 'elora123' },
  { label: 'Stylist', email: 'stylist@elora.vn', password: 'stylist123' },
  { label: 'Nhân viên kho', email: 'kho@elora.vn', password: 'nhanvien123' },
  { label: 'Admin', email: 'admin@elora.vn', password: 'admin123' },
];

export default function AuthForm({ mode, next }: { mode: 'login' | 'register'; next?: string }) {
  const [st, action] = useFormState<Res, FormData>(mode === 'login' ? loginAction : registerAction, {});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const L = mode === 'login';
  const fe = st.fields || {};
  const msg = (k: string) => fe[k] ? <span id={`a-${k}-err`} className="err">{fe[k]}</span> : null;
  const inv = (k: string) => ({ 'aria-invalid': !!fe[k], 'aria-describedby': fe[k] ? `a-${k}-err` : undefined });
  return (
    <form action={action} className="card" style={{ maxWidth: 460, margin: '0 auto', gap: 18 }}>
      <div><span className="eb">{L ? 'Chào mừng trở lại' : 'Tạo tài khoản'}</span><h1 className="disp" style={{ fontSize: 44, lineHeight: 1 }}>{L ? 'Đăng nhập' : 'Đăng ký'}</h1></div>
      {next && <input type="hidden" name="next" value={next} />}
      {!L && <div className="fl"><label className="lbl" htmlFor="a-name">Họ tên</label><input id="a-name" name="name" className="fld" autoComplete="name" {...inv('name')} />{msg('name')}</div>}
      <div className="fl"><label className="lbl" htmlFor="a-email">Email</label><input id="a-email" name="email" type="email" className="fld" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} {...inv('email')} />{msg('email')}</div>
      {!L && <div className="fl"><label className="lbl" htmlFor="a-phone">Số điện thoại</label><input id="a-phone" name="phone" className="fld" autoComplete="tel" {...inv('phone')} />{msg('phone')}</div>}
      <div className="fl"><label className="lbl" htmlFor="a-pass">Mật khẩu</label><input id="a-pass" name="password" type="password" className="fld" autoComplete={L ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} {...inv('password')} />{msg('password')}</div>
      {!L && <div className="fl"><label className="lbl" htmlFor="a-pass2">Nhập lại mật khẩu</label><input id="a-pass2" name="password2" type="password" className="fld" autoComplete="new-password" {...inv('password2')} />{msg('password2')}</div>}
      {st.error && <p className="err" role="alert">{st.error}</p>}
      <Submit label={L ? 'Đăng nhập' : 'Tạo tài khoản'} />
      {L ? <p className="note">Chưa có tài khoản? <Link href="/dang-ky" style={{ textDecoration: 'underline', color: 'var(--wine)', fontWeight: 600 }}>Đăng ký</Link></p>
         : <p className="note">Đã có tài khoản? <Link href="/dang-nhap" style={{ textDecoration: 'underline', color: 'var(--wine)', fontWeight: 600 }}>Đăng nhập</Link></p>}
      {L && <div className="note" style={{ background: '#F6EEEF', padding: '10px 12px', border: '1px solid var(--line)' }}>
        <span>Chọn tài khoản mẫu để tự điền thông tin đăng nhập:</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {DEMO_ACCOUNTS.map((account) => <button
            key={account.email}
            type="button"
            className="ghost"
            style={{ minHeight: 36, padding: '6px 10px' }}
            onClick={() => { setEmail(account.email); setPassword(account.password); }}
          >{account.label}</button>)}
        </div>
      </div>}
    </form>
  );
}
