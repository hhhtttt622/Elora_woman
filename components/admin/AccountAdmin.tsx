'use client';
import { useState } from 'react';
import { useRun } from './Flash';
import { createAccount, setAccountLocked, setAccountRole } from '@/app/actions/admin';
import { INTERNAL_ROLES, ROLE_LABEL, type Role } from '@/lib/permissions';

/** UC-38 bước 3–5: tạo tài khoản nội bộ, hiển thị mật khẩu tạm một lần. */
export default function AccountAdmin() {
  const { run, pending } = useRun();
  const blank = { name: '', email: '', phone: '', role: 'staff' as Role };
  const [f, setF] = useState(blank);
  const [err, setErr] = useState('');
  const [issued, setIssued] = useState<{ email: string; tempPassword: string } | null>(null);
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <section className="card"><h2 className="h2">Tạo tài khoản nhân sự</h2>
      <form onSubmit={async (e) => { e.preventDefault(); setIssued(null); const r = await run(createAccount(f)); setErr(r.error || ''); if (r.ok) { setIssued(r.data); setF(blank); } }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="grid">
          <div className="fl"><label className="lbl" htmlFor="ac-name">Họ tên</label><input id="ac-name" className="fld" value={f.name} onChange={set('name')} /></div>
          <div className="fl"><label className="lbl" htmlFor="ac-email">Email</label><input id="ac-email" type="email" className="fld" value={f.email} onChange={set('email')} /></div>
          <div className="fl"><label className="lbl" htmlFor="ac-phone">Số điện thoại</label><input id="ac-phone" className="fld" value={f.phone} onChange={set('phone')} /></div>
          <div className="fl"><label className="lbl" htmlFor="ac-role">Vai trò</label><select id="ac-role" className="fld" value={f.role} onChange={set('role')}>{INTERNAL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></div>
        </div>
        <div className="row"><button className="btn" disabled={pending}>Tạo tài khoản</button></div>
        {err && <p className="err" role="alert">{err}</p>}
        {issued && <p className="ok" role="status">Mật khẩu tạm của <b>{issued.email}</b>: <b style={{ fontFamily: 'monospace', fontSize: 16 }}>{issued.tempPassword}</b>. Mật khẩu chỉ hiện một lần; người dùng phải đổi ở lần đăng nhập đầu.</p>}
      </form>
    </section>);
}

/** UC-38 luồng 3a–3c: đổi vai trò (chỉ tài khoản nội bộ), khóa hoặc mở khóa. */
export function AccountRow({ id, name, role, locked, self, open }: { id: number; name: string; role: Role; locked: boolean; self: boolean; open: number }) {
  const { run, pending } = useRun();
  const lockMsg = `Khóa tài khoản ${name}? Tài khoản sẽ mất phiên đang mở.${role === 'stylist' && open ? ` Stylist này đang phụ trách ${open} yêu cầu chưa gửi gợi ý.` : ''}`;
  return (
    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {role !== 'customer' && <select className="fld" aria-label={`Vai trò của ${name}`} value={role} disabled={pending || self} style={{ minHeight: 40, minWidth: 130 }} onChange={(e) => run(setAccountRole(id, e.target.value as Role))}>
        {INTERNAL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>}
      {!self && <button type="button" className="ghost" disabled={pending} onClick={() => { if (!locked && !window.confirm(lockMsg)) return; run(setAccountLocked(id, !locked)); }}>{locked ? 'Mở khóa' : 'Khóa'}</button>}
      {self && <span className="note">Tài khoản của bạn</span>}
    </span>);
}
