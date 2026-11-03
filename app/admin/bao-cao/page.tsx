import { all } from '@/lib/db';
import { requirePage } from '@/lib/auth';
import { fmt, pad } from '@/lib/util';
import { PageContainer, PageHeader } from '@/components/layout/Page';
import DataTable from '@/components/ui/DataTable';
import { StatCard } from '@/components/ui/Display';
import { EmptyState } from '@/components/ui/States';
export const dynamic = 'force-dynamic';

const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const vn = (s: string) => s.split('-').reverse().join('/');

// UC-40 Xem báo cáo doanh thu: tính trên các đơn đã giao trong khoảng thời gian (BR-08)
export default async function Revenue({ searchParams }: { searchParams: { from?: string; to?: string; by?: string } }) {
  await requirePage('UC-40', '/admin/bao-cao');
  const valid = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const to = valid(searchParams.to) ? searchParams.to! : ymd(new Date());
  const from = valid(searchParams.from) ? searchParams.from! : ymd(new Date(Date.now() - 89 * 86400000));
  const by = searchParams.by === 'month' ? 'month' : 'day';
  const start = new Date(`${from}T00:00:00`).toISOString(), end = new Date(`${to}T23:59:59.999`).toISOString();
  const orders = all<any>('SELECT id, code, total, delivered_at FROM orders WHERE status=3 AND delivered_at BETWEEN ? AND ? ORDER BY delivered_at', start, end);
  const key = (iso: string) => { const d = new Date(iso); return by === 'month' ? `${pad(d.getMonth() + 1)}/${d.getFullYear()}` : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
  const periodMap = new Map<string, { k: string; rev: number; n: number }>();
  for (const o of orders) {
    const k = key(o.delivered_at);
    let p = periodMap.get(k);
    if (!p) {
      p = { k, rev: 0, n: 0 };
      periodMap.set(k, p);
    }
    p.rev += o.total;
    p.n++;
  }
  const periods = Array.from(periodMap.values());
  const rev = orders.reduce((n, o) => n + o.total, 0);
  const ids = orders.map((o) => o.id);
  const best = ids.length ? all<any>(`SELECT sku, name, SUM(qty) q, SUM(qty*price) amt FROM order_lines WHERE order_id IN (${ids.map(() => '?').join(',')}) GROUP BY sku ORDER BY q DESC, amt DESC LIMIT 10`, ...ids) : [];

  return (
    <PageContainer>
      <PageHeader eyebrow="Quản trị hệ thống" title="Báo cáo doanh thu" description="Chỉ tính đơn ở trạng thái Đã giao, theo ngày giao. Doanh thu là tổng tiền đơn, gồm phí giao hàng." />
      <form method="get" className="ui-section" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }} aria-label="Chọn kỳ báo cáo">
        <div className="fl"><label className="lbl" htmlFor="rp-from">Từ ngày</label><input id="rp-from" name="from" type="date" className="fld" defaultValue={from} /></div>
        <div className="fl"><label className="lbl" htmlFor="rp-to">Đến ngày</label><input id="rp-to" name="to" type="date" className="fld" defaultValue={to} /></div>
        <div className="fl"><label className="lbl" htmlFor="rp-by">Nhóm theo</label><select id="rp-by" name="by" className="fld" defaultValue={by}><option value="day">Ngày</option><option value="month">Tháng</option></select></div>
        <button className="btn">Xem báo cáo</button>
      </form>
      <div className="kpis">
        <StatCard label="Doanh thu" value={fmt(rev)} note={`Đơn đã giao ${vn(from)} – ${vn(to)}`} />
        <StatCard label="Số đơn" value={orders.length} note="Đơn đã giao" />
        <StatCard label="Giá trị đơn trung bình" value={fmt(orders.length ? rev / orders.length : 0)} note="Doanh thu chia số đơn" />
      </div>
      {orders.length === 0 ? (
        <EmptyState title="Không có đơn đã giao trong khoảng thời gian này" description="Các số liệu bằng 0. Thử mở rộng khoảng ngày." />
      ) : <>
        <DataTable rows={periods} rowKey={(p) => p.k} minWidth={520} mobile="cards" caption={`Doanh thu theo ${by === 'month' ? 'tháng' : 'ngày'}`} columns={[
          { key: 'k', header: 'Kỳ', cell: (p) => <b>{p.k}</b> },
          { key: 'rev', header: 'Doanh thu', className: 'strong nowrap', cell: (p) => fmt(p.rev) },
          { key: 'n', header: 'Số đơn', cell: (p) => p.n },
          { key: 'avg', header: 'Giá trị đơn trung bình', className: 'nowrap', cell: (p) => fmt(p.rev / p.n) },
        ]} />
        <DataTable rows={best} rowKey={(b) => b.sku} minWidth={600} mobile="cards" caption="Sản phẩm bán chạy" columns={[
          { key: 'sku', header: 'SKU', className: 'nowrap', cell: (b) => <b>{b.sku}</b> },
          { key: 'name', header: 'Sản phẩm', cell: (b) => b.name },
          { key: 'q', header: 'Số lượng', cell: (b) => b.q },
          { key: 'amt', header: 'Tiền hàng', className: 'nowrap', cell: (b) => fmt(b.amt) },
        ]} />
      </>}
    </PageContainer>
  );
}
