'use client';
import { useState } from 'react';
import { useRun } from './Flash';
import { createAccount, setAccountLocked, setAccountRole } from '@/app/actions/admin';
import { INTERNAL_ROLES, ROLE_LABEL, type Role } from '@/lib/permissions';
import { BaseModal } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';

/** UC-38 bước 3–5: nút Tạo tài khoản mở Modal; mật khẩu tạm hiện một lần trong Modal. */
export default function AccountAdmin() {
  const { run, pending } = useRun();
  const blank = { name: '', email: '', phone: '', role: 'staff' as Role };
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank);
  const [err, setErr] = useState('');
  const [issued, setIssued] = useState<{ email: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((prev) => ({ ...prev, [k]: e.target.value }));
  const start = () => { setF(blank); setErr(''); setIssued(null); setCopied(false); setOpen(true); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await run(createAccount(f));
    setErr(r.error || '');
    if (r.ok) setIssued(r.data);
  };
  // Đã cấp mật khẩu thì không đóng bằng Esc/nền để admin không lỡ mất mật khẩu tạm.
  const close = () => { if (!issued) setOpen(false); };
  const copy = async () => { try { await navigator.clipboard.writeText(issued!.tempPassword); setCopied(true); } catch { setCopied(false); } };

  return (
    <>
      <Button onClick={start}>Tạo tài khoản</Button>
      <BaseModal
        open={open}
        onClose={close}
        eyebrow="Tài khoản nhân sự"
        title={issued ? 'Đã tạo tài khoản' : 'Tạo tài khoản'}
        footer={issued
          ? <Button size="lg" onClick={() => setOpen(false)}>Đã lưu mật khẩu, đóng</Button>
          : <><Button variant="secondary" size="lg" onClick={close}>Hủy</Button><Button type="submit" form="account-form" size="lg" disabled={pending}>{pending ? 'Đang tạo...' : 'Lưu'}</Button></>}
      >
        {issued ? (
          <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p>Tài khoản <b>{issued.email}</b> đã được tạo. Gửi mật khẩu tạm này cho người dùng:</p>
            <div className="row" style={{ alignItems: 'center' }}>
              <code style={{ fontFamily: 'monospace', fontSize: 22, letterSpacing: '.08em', padding: '10px 14px', border: '1px dashed var(--ink)', background: 'var(--c-surface-alt)' }}>{issued.tempPassword}</code>
              <Button variant="secondary" onClick={copy}>{copied ? 'Đã sao chép' : 'Sao chép'}</Button>
            </div>
            <p className="ui-callout note" style={{ margin: 0 }}>Mật khẩu chỉ hiện một lần. Người dùng phải đổi mật khẩu ở lần đăng nhập đầu (UC-39).</p>
          </div>
        ) : (
          <form id="account-form" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="grid">
              <div className="fl"><label className="lbl" htmlFor="ac-name">Họ tên</label><input id="ac-name" className="fld" value={f.name} onChange={set('name')} autoFocus /></div>
              <div className="fl"><label className="lbl" htmlFor="ac-email">Email</label><input id="ac-email" type="email" className="fld" value={f.email} onChange={set('email')} /></div>
              <div className="fl"><label className="lbl" htmlFor="ac-phone">Số điện thoại</label><input id="ac-phone" className="fld" value={f.phone} onChange={set('phone')} /></div>
              <div className="fl"><label className="lbl" htmlFor="ac-role">Vai trò</label><select id="ac-role" className="fld" value={f.role} onChange={set('role')}>{INTERNAL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></div>
            </div>
            <span className="note">Khách hàng tự đăng ký; admin chỉ tạo tài khoản stylist, nhân viên hoặc admin.</span>
            {err && <p className="err" role="alert">{err}</p>}
          </form>
        )}
      </BaseModal>
    </>
  );
}

/** UC-38 luồng 3a–3c: đổi vai trò (chỉ tài khoản nội bộ), khóa hoặc mở khóa – đều có xác nhận. */
export function AccountRow({ id, name, role, locked, self, open }: { id: number; name: string; role: Role; locked: boolean; self: boolean; open: number }) {
  const { run, pending } = useRun();
  const confirm = useConfirm();
  const changeRole = async (next: Role) => {
    if (next === role) return;
    const ok = await confirm({ title: `Đổi vai trò của ${name}?`, message: `Từ ${ROLE_LABEL[role]} sang ${ROLE_LABEL[next]}. Quyền mới áp dụng từ thao tác kế tiếp của người dùng.`, confirmLabel: 'Đổi vai trò' });
    if (ok) run(setAccountRole(id, next));
  };
  const toggleLock = async () => {
    const ok = locked
      ? await confirm({ title: `Mở khóa tài khoản ${name}?`, message: 'Người dùng đăng nhập lại được ngay.', confirmLabel: 'Mở khóa' })
      : await confirm({
        title: `Khóa tài khoản ${name}?`, tone: 'danger', confirmLabel: 'Khóa tài khoản',
        message: <>Tài khoản sẽ không đăng nhập được và mất phiên đang mở.{role === 'stylist' && open > 0 && <><br /><br /><b>Stylist này đang phụ trách {open} yêu cầu chưa gửi gợi ý.</b> Hãy phân công lại ở mục Yêu cầu tư vấn.</>}</>,
      });
    if (ok) run(setAccountLocked(id, !locked));
  };
  return (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {role !== 'customer' && <select className="fld" aria-label={`Vai trò của ${name}`} value={role} disabled={pending || self} style={{ minHeight: 36, minWidth: 130, width: 'auto' }} onChange={(e) => changeRole(e.target.value as Role)}>
        {INTERNAL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>}
      {!self && <Button variant={locked ? 'secondary' : 'danger-outline'} disabled={pending} onClick={toggleLock}>{locked ? 'Mở khóa' : 'Khóa'}</Button>}
      {self && <span className="note">Tài khoản của bạn</span>}
    </span>
  );
}
