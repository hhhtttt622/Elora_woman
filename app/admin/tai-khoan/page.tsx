import Link from 'next/link';
import { all } from '@/lib/db';
import { requirePage } from '@/lib/auth';
import { ROLES, ROLE_LABEL, STATUS_LABEL, type Role } from '@/lib/permissions';
import { PageHead } from '@/components/admin/Bits';
import AccountAdmin, { AccountRow } from '@/components/admin/AccountAdmin';
import { dmy } from '@/lib/util';
export const dynamic = 'force-dynamic';

// UC-38 Quản lý tài khoản người dùng
export default async function Accounts({ searchParams }: { searchParams: { role?: string; st?: string } }) {
  const me = await requirePage('UC-38', '/admin/tai-khoan');
  const role = ROLES.includes(searchParams.role as Role) ? searchParams.role : '';
  const st = searchParams.st === 'active' || searchParams.st === 'locked' ? searchParams.st : '';
  const rows = all<any>(`SELECT u.*, (SELECT COUNT(*) FROM consults c WHERE c.stylist_id=u.id AND c.status != 'Đã gửi gợi ý') open FROM users u
    WHERE (?='' OR u.role=?) AND (?='' OR u.status=?) ORDER BY CASE u.role WHEN 'admin' THEN 0 WHEN 'staff' THEN 1 WHEN 'stylist' THEN 2 ELSE 3 END, u.id`, role, role, st, st);
  const qs = (o: Record<string, string>) => '/admin/tai-khoan?' + new URLSearchParams({ ...(role ? { role } : {}), ...(st ? { st } : {}), ...o }).toString();
  return (
    <>
      <PageHead group="Quản trị hệ thống" title="Tài khoản người dùng" note="Admin tạo tài khoản stylist, nhân viên, admin kèm mật khẩu tạm. Khách hàng tự đăng ký; admin chỉ khóa hoặc mở khóa tài khoản khách hàng." />
      <AccountAdmin />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="group" aria-label="Lọc tài khoản">
        <Link href={qs({ role: '' })} className={'chip' + (!role ? ' on' : '')}>Mọi vai trò</Link>
        {ROLES.map((r) => <Link key={r} href={qs({ role: r })} className={'chip' + (role === r ? ' on' : '')}>{ROLE_LABEL[r]}</Link>)}
        <span style={{ width: 16 }} />
        {[['', 'Mọi trạng thái'], ['active', 'Hoạt động'], ['locked', 'Bị khóa']].map(([k, l]) => <Link key={k} href={qs({ st: k })} className={'chip' + (st === k ? ' on' : '')}>{l}</Link>)}
      </div>
      <div className="scroll"><table className="tb" style={{ minWidth: 960 }}><caption>{rows.length} tài khoản</caption>
        <thead><tr><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>
        <tbody>{rows.map((u) => <tr key={u.id}><td><b>{u.name}</b>{u.must_change_pw ? <><br /><span className="note">Chưa đổi mật khẩu tạm</span></> : null}</td><td>{u.email}</td><td>{ROLE_LABEL[u.role as Role]}</td>
          <td><span className={'badge' + (u.status === 'locked' ? ' red' : ' dark')}>{STATUS_LABEL[u.status]}</span></td><td style={{ whiteSpace: 'nowrap' }}>{dmy(u.created_at)}</td>
          <td><AccountRow id={u.id} name={u.name} role={u.role} locked={u.status === 'locked'} self={u.id === me.id} open={u.open} /></td></tr>)}</tbody></table></div>
    </>
  );
}
