import Link from 'next/link';
import { all } from '@/lib/db';
import { requirePage } from '@/lib/auth';
import { ROLES, ROLE_LABEL, type Role } from '@/lib/permissions';
import { dmy, norm } from '@/lib/util';
import { hrefWith, paginate } from '@/lib/url';
import { PageContainer, PageHeader } from '@/components/layout/Page';
import DataTable from '@/components/ui/DataTable';
import { FilterChips, Pagination, SearchBar } from '@/components/ui/Navigation';
import StatusBadge from '@/components/ui/StatusBadge';
import AccountAdmin, { AccountRow } from '@/components/admin/AccountAdmin';
export const dynamic = 'force-dynamic';

type SP = { role?: string; st?: string; q?: string; page?: string };
const BASE = '/admin/tai-khoan';

// UC-38 Quản lý tài khoản người dùng
export default async function Accounts({ searchParams }: { searchParams: SP }) {
  const me = await requirePage('UC-38', BASE);
  const role = ROLES.includes(searchParams.role as Role) ? searchParams.role! : '';
  const st = searchParams.st === 'active' || searchParams.st === 'locked' ? searchParams.st : '';
  const q = norm(searchParams.q || '');
  const list = all<any>(`SELECT u.*, (SELECT COUNT(*) FROM consults c WHERE c.stylist_id=u.id AND c.status != 'Đã gửi gợi ý') open FROM users u
    WHERE (?='' OR u.role=?) AND (?='' OR u.status=?) ORDER BY CASE u.role WHEN 'admin' THEN 0 WHEN 'staff' THEN 1 WHEN 'stylist' THEN 2 ELSE 3 END, u.id`, role, role, st, st);
  const rows = list.filter((u) => !q || norm(u.name).includes(q) || norm(u.email).includes(q));
  const pg = paginate(rows, searchParams.page);
  const reset = { page: null };

  return (
    <PageContainer>
      <PageHeader eyebrow="Quản trị hệ thống" title="Tài khoản người dùng"
        description="Admin tạo tài khoản stylist, nhân viên, admin kèm mật khẩu tạm. Khách hàng tự đăng ký; admin chỉ khóa hoặc mở khóa tài khoản khách hàng."
        actions={<AccountAdmin />} />
      <div className="ui-toolbar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          <FilterChips label="Lọc theo vai trò" current={role} items={[{ key: '', label: 'Mọi vai trò', href: hrefWith(BASE, searchParams, { role: null, ...reset }) }, ...ROLES.map((r) => ({ key: r, label: ROLE_LABEL[r], href: hrefWith(BASE, searchParams, { role: r, ...reset }) }))]} />
          <FilterChips label="Lọc theo trạng thái" current={st} items={[['', 'Mọi trạng thái'], ['active', 'Hoạt động'], ['locked', 'Bị khóa']].map(([k, l]) => ({ key: k, label: l, href: hrefWith(BASE, searchParams, { st: k || null, ...reset }) }))} />
        </div>
        <SearchBar id="aq" label="Tìm tài khoản" placeholder="Tên hoặc email" defaultValue={searchParams.q} params={searchParams} keep={['role', 'st']} />
      </div>

      <DataTable
        rows={pg.items}
        rowKey={(u) => u.id}
        minWidth={900}
        mobile="cards"
        caption={`${rows.length} tài khoản`}
        empty={{ title: 'Không có tài khoản phù hợp', action: <Link href={BASE} className="textbtn">Xóa bộ lọc</Link> }}
        columns={[
          { key: 'name', header: 'Họ tên', cell: (u) => <><b>{u.name}</b>{u.must_change_pw ? <><br /><span className="note">Chưa đổi mật khẩu tạm</span></> : null}</> },
          { key: 'email', header: 'Email', cell: (u) => u.email },
          { key: 'role', header: 'Vai trò', cell: (u) => ROLE_LABEL[u.role as Role] },
          { key: 'st', header: 'Trạng thái', cell: (u) => <StatusBadge domain="account" value={u.status} /> },
          { key: 'date', header: 'Ngày tạo', className: 'nowrap', cell: (u) => dmy(u.created_at) },
          { key: 'act', header: 'Thao tác', cell: (u) => <AccountRow id={u.id} name={u.name} role={u.role} locked={u.status === 'locked'} self={u.id === me.id} open={u.open} /> },
        ]}
      />
      <Pagination base={BASE} params={searchParams} {...pg} />
    </PageContainer>
  );
}
