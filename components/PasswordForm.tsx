'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { changePasswordAction, type Res } from '@/app/actions/auth';

function Submit() { const { pending } = useFormStatus(); return <button className="btn" disabled={pending}>{pending ? 'Đang lưu...' : 'Đổi mật khẩu'}</button>; }

/** UC-39 Đổi mật khẩu, dùng chung cho khách hàng và nhân sự nội bộ. */
export default function PasswordForm({ forced }: { forced?: boolean }) {
  const [st, action] = useFormState<Res, FormData>(changePasswordAction, {});
  const fe = st.fields || {};
  const field = (id: string, name: string, label: string, auto: string) => (
    <div className="fl"><label className="lbl" htmlFor={id}>{label}</label>
      <input id={id} name={name} type="password" className="fld" autoComplete={auto} aria-invalid={!!fe[name]} aria-describedby={fe[name] ? `${id}-err` : undefined} />
      {fe[name] && <span id={`${id}-err`} className="err">{fe[name]}</span>}</div>);
  return (
    <form action={action} className="card" style={{ gap: 18, maxWidth: 520 }}>
      {forced && <p className="note" style={{ background: '#F6EEEF', padding: '10px 12px', border: '1px solid var(--line)' }}>Bạn đang dùng mật khẩu tạm do admin cấp. Hãy đổi mật khẩu trước khi dùng các chức năng khác.</p>}
      {field('pw-cur', 'current', forced ? 'Mật khẩu tạm' : 'Mật khẩu hiện tại', 'current-password')}
      {field('pw-new', 'password', 'Mật khẩu mới (ít nhất 6 ký tự)', 'new-password')}
      {field('pw-new2', 'password2', 'Nhập lại mật khẩu mới', 'new-password')}
      {st.error && !Object.keys(fe).length && <p className="err" role="alert">{st.error}</p>}
      {st.ok && <p className="ok" role="status">{st.msg}</p>}
      <Submit />
    </form>
  );
}
