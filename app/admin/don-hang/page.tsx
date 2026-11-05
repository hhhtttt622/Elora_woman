import Link from 'next/link';
import { all } from '@/lib/db';
import { requirePage } from '@/lib/auth';
import { ORDER_STATUS, fmt, dmy, dmyHm, norm } from '@/lib/util';
import { hrefWith, paginate } from '@/lib/url';
import { PageContainer, PageHeader } from '@/components/layout/Page';
import DataTable from '@/components/ui/DataTable';
import { FilterChips, Pagination, SearchBar } from '@/components/ui/Navigation';
import { DescriptionList, Section, Steps } from '@/components/ui/Display';
import StatusBadge from '@/components/ui/StatusBadge';
import { UrlDrawer } from '@/components/ui/Dialog';
import OrderStatusForm from '@/components/admin/orders/OrderStatusForm';
export const dynamic = 'force-dynamic';

type SP = { s?: string; q?: string; page?: string; order?: string };
const BASE = '/admin/don-hang';

// UC-17 Xử lý đơn hàng
export default async function Orders({ searchParams }: { searchParams: SP }) {
  await requirePage('UC-17', BASE);
  const f = searchParams.s !== undefined && searchParams.s !== '' ? parseInt(searchParams.s, 10) : -1;
  const q = norm(searchParams.q || '');
  const rawOrders = all<any>('SELECT o.*, u.name uname, u.email uemail FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.id DESC');
  const allLines = all<any>('SELECT * FROM order_lines ORDER BY order_id, id');
  const linesByOrderId = new Map<number, any[]>();
  for (const line of allLines) {
    let list = linesByOrderId.get(line.order_id);
    if (!list) {
      list = [];
      linesByOrderId.set(line.order_id, list);
    }
    list.push(line);
  }
  const orders = rawOrders.map((o) => ({ ...o, lines: linesByOrderId.get(o.id) || [] }));
  const found = orders.filter((o) => !q || norm(o.code).includes(q) || norm(o.uname).includes(q) || norm(o.recv_name).includes(q));
  const rows = found.filter((o) => f === -1 || o.status === f);
  const pg = paginate(rows, searchParams.page);

  const statusCounts = new Map<number, number>();
  for (const o of found) {
    statusCounts.set(o.status, (statusCounts.get(o.status) || 0) + 1);
  }
  const cnt = (k: number) => (k === -1 ? found.length : statusCounts.get(k) || 0);
  const sel = searchParams.order ? orders.find((o) => o.code === searchParams.order) : null;
  const open = (code: string) => hrefWith(BASE, searchParams, { order: code });

  return (
    <PageContainer>
      <PageHeader eyebrow="Bán hàng" title="Đơn hàng" description='Đơn chỉ chuyển sang "Đang giao" khi đóng gói ở mục Xuất kho, để kho được trừ đúng.' />

      <div className="ui-toolbar">
        <FilterChips label="Lọc theo trạng thái" current={String(f)} items={[-1, 0, 1, 2, 3].map((k) => ({
          key: String(k), label: `${k === -1 ? 'Tất cả' : ORDER_STATUS[k]} (${cnt(k)})`, href: hrefWith(BASE, searchParams, { s: k === -1 ? null : k, page: null, order: null }),
        }))} />
        <SearchBar id="oq" label="Tìm đơn" placeholder="Mã đơn hoặc tên khách" defaultValue={searchParams.q} params={searchParams} keep={['s']} />
      </div>

      <DataTable
        rows={pg.items}
        rowKey={(o) => o.id}
        minWidth={860}
        mobile="cards"
        caption={`Hiển thị ${rows.length} / ${orders.length} đơn hàng`}
        rowClassName={(o) => (o.code === sel?.code ? 'is-active' : undefined)}
        empty={{ title: 'Không có đơn hàng phù hợp', description: q || f !== -1 ? 'Thử bỏ bộ lọc hoặc đổi từ khóa.' : 'Chưa có đơn nào được đặt.', action: q || f !== -1 ? <Link href={BASE} className="textbtn">Xóa bộ lọc</Link> : undefined }}
        columns={[
          { key: 'code', header: 'Mã đơn', className: 'nowrap', cell: (o) => <Link href={open(o.code)} scroll={false} className="ui-rowlink" aria-label={`Xem chi tiết đơn ${o.code}`}>{o.code}</Link> },
          { key: 'cus', header: 'Khách hàng', cell: (o) => o.uname },
          { key: 'date', header: 'Ngày', className: 'nowrap', cell: (o) => dmy(o.created_at) },
          { key: 'items', header: 'Sản phẩm', cell: (o) => <span style={{ display: 'inline-block', minWidth: 180 }}>{o.lines.map((l: any) => `${l.qty} × ${l.name}`).join('; ')}</span> },
          { key: 'total', header: 'Tổng · thanh toán', label: 'Tổng', cell: (o) => <><b style={{ whiteSpace: 'nowrap' }}>{fmt(o.total)}</b><br /><span className="note">{o.pay_method}</span></> },
          { key: 'st', header: 'Trạng thái', cell: (o) => <StatusBadge domain="order" value={o.status} /> },
          { key: 'act', header: <span className="sr">Thao tác</span>, label: '', className: 'nowrap', cell: (o) => <Link href={open(o.code)} scroll={false} className="ghost ui-sm">Chi tiết</Link> },
        ]}
      />
      <Pagination base={BASE} params={searchParams} {...pg} />

      {sel && (
        <UrlDrawer key={sel.code} param="order" eyebrow={`Đơn hàng · ${dmyHm(sel.created_at)}`} title={sel.code}>
          <Section title="Trạng thái">
            <Steps steps={ORDER_STATUS} current={sel.status} />
            <OrderStatusForm code={sel.code} status={sel.status} />
            {sel.status === 1 && <p className="note">Để chuyển sang Đang giao, đóng gói đơn ở <Link className="textbtn" style={{ minHeight: 0 }} href={`/admin/don-hang/xuat-kho?o=${sel.code}`}>Xuất kho</Link>.</p>}
          </Section>
          <Section title="Sản phẩm">
            <ul className="list">
              {sel.lines.map((l: any) => <li key={l.id}><span>{l.qty} × {l.name}<br /><span className="note">{l.sku}</span></span><b>{fmt(l.qty * l.price)}</b></li>)}
              <li><span>Phí giao hàng</span><span>{fmt(sel.shipping_fee)}</span></li>
              <li style={{ fontSize: 16 }}><b>Tổng cộng</b><b>{fmt(sel.total)}</b></li>
            </ul>
          </Section>
          <Section title="Giao hàng và thanh toán">
            <DescriptionList min={200} items={[
              ['Khách hàng', <>{sel.uname}<br /><span className="note">{sel.uemail}</span></>],
              ['Người nhận', `${sel.recv_name} · ${sel.recv_phone}`],
              ['Địa chỉ', sel.address],
              ['Thanh toán', sel.pay_method],
              ['Vận chuyển', sel.tracking ? `${sel.carrier} · ${sel.tracking}` : 'Chưa xuất kho'],
              ['Ngày giao', sel.delivered_at ? dmyHm(sel.delivered_at) : '—'],
              ['Ghi chú của khách', sel.note || '(không có)'],
            ]} />
          </Section>
        </UrlDrawer>
      )}
      {searchParams.order && !sel && <p className="err" role="alert">Không tìm thấy đơn {searchParams.order}.</p>}
    </PageContainer>
  );
}
