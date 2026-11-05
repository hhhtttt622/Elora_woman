import Link from 'next/link';
import { all, get } from '@/lib/db';
import { requirePage } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { fmt, dmy, norm } from '@/lib/util';
import { hrefWith, paginate } from '@/lib/url';
import { PageContainer, PageHeader } from '@/components/layout/Page';
import DataTable from '@/components/ui/DataTable';
import { Pagination, SearchBar } from '@/components/ui/Navigation';
import { DescriptionList, Section } from '@/components/ui/Display';
import { EmptyState } from '@/components/ui/States';
import StatusBadge from '@/components/ui/StatusBadge';
import { UrlDrawer } from '@/components/ui/Dialog';
export const dynamic = 'force-dynamic';

type SP = { q?: string; id?: string; page?: string };
const BASE = '/admin/khach-hang';

// UC-19 Tra cứu khách hàng
export default async function Customers({ searchParams }: { searchParams: SP }) {
  const me = await requirePage('UC-19', BASE);
  const q = norm(searchParams.q || '');
  const list = all<any>("SELECT u.*, (SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id) oc, (SELECT COALESCE(SUM(total),0) FROM orders o WHERE o.user_id=u.id) spend FROM users u WHERE role='customer' ORDER BY id");
  const rows = list.filter((u) => !q || norm(u.name).includes(q) || norm(u.email).includes(q));
  const pg = paginate(rows, searchParams.page);
  const sel = searchParams.id ? get<any>("SELECT * FROM users WHERE id=? AND role='customer'", parseInt(searchParams.id, 10)) : null;
  const last = sel ? get<any>('SELECT * FROM consults WHERE user_id=? ORDER BY id DESC LIMIT 1', sel.id) : null;
  const orders = sel ? all<any>('SELECT code, total, status, created_at FROM orders WHERE user_id=? ORDER BY id DESC', sel.id) : [];
  const canOrders = can(me.role, 'UC-17');
  const open = (id: number) => hrefWith(BASE, searchParams, { id });

  return (
    <PageContainer>
      <PageHeader eyebrow="Bán hàng" title="Khách hàng" description="Tìm theo tên hoặc email, chọn một khách để xem hồ sơ phong cách và lịch sử mua." />
      <div className="ui-toolbar">
        <SearchBar id="cq" label="Tìm khách hàng" placeholder="Tên hoặc email" defaultValue={searchParams.q} params={searchParams} keep={[]} />
      </div>

      <DataTable
        rows={pg.items}
        rowKey={(u) => u.id}
        minWidth={780}
        mobile="cards"
        caption={`${rows.length} khách hàng`}
        rowClassName={(u) => (u.id === sel?.id ? 'is-active' : undefined)}
        empty={{ title: 'Không tìm thấy khách hàng nào', description: q ? 'Kiểm tra lại tên hoặc email.' : undefined, action: q ? <Link href={BASE} className="textbtn">Xóa từ khóa</Link> : undefined }}
        columns={[
          { key: 'name', header: 'Khách hàng', cell: (u) => <Link href={open(u.id)} scroll={false} className="ui-rowlink" aria-label={`Xem hồ sơ ${u.name}`}>{u.name}</Link> },
          { key: 'email', header: 'Email', cell: (u) => u.email },
          { key: 'phone', header: 'Số điện thoại', className: 'nowrap', cell: (u) => u.phone },
          { key: 'oc', header: 'Số đơn', cell: (u) => u.oc },
          { key: 'spend', header: 'Chi tiêu', className: 'nowrap strong', cell: (u) => fmt(u.spend) },
          { key: 'act', header: <span className="sr">Thao tác</span>, label: '', cell: (u) => <Link href={open(u.id)} scroll={false} className="ghost ui-sm">Xem hồ sơ</Link> },
        ]}
      />
      <Pagination base={BASE} params={searchParams} {...pg} />

      {sel && (
        <UrlDrawer key={sel.id} param="id" eyebrow="Khách hàng" title={sel.name}>
          <Section title="Liên hệ">
            <DescriptionList items={[['Email', sel.email], ['Số điện thoại', sel.phone], ['Ngày đăng ký', dmy(sel.created_at)], ['Trạng thái', <StatusBadge key="s" domain="account" value={sel.status} />]]} />
          </Section>
          <Section title="Hồ sơ phong cách">
            <DescriptionList items={[
              ['Số đo', sel.height_cm ? `${sel.height_cm} cm, ${sel.weight_kg ?? '?'} kg` : 'Chưa có'],
              ['Size thường mặc', sel.size],
              ['Màu ưa thích', sel.liked_colors || 'Chưa có'],
              ['Môi trường làm việc', sel.work_env || 'Chưa có'],
              ['Dịp cần trang phục', last?.occasions || 'Chưa có'],
              ['Ghi chú', last?.note || 'Chưa có'],
            ]} />
          </Section>
          <Section title={`Lịch sử mua (${orders.length} đơn)`}>
            {orders.length === 0 ? <EmptyState title="Khách chưa có đơn hàng nào" /> : (
              <ul className="list">
                {orders.map((o) => (
                  <li key={o.code}>
                    <span>{canOrders ? <Link className="ui-rowlink" href={`/admin/don-hang?order=${o.code}`}>{o.code}</Link> : <b>{o.code}</b>}<br /><span className="note">{dmy(o.created_at)} · {fmt(o.total)}</span></span>
                    <StatusBadge domain="order" value={o.status} />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </UrlDrawer>
      )}
    </PageContainer>
  );
}
