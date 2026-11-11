import Link from 'next/link';
import { all } from '@/lib/db';
import { requirePage } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getVariants } from '@/lib/inventory';
import { fmt, nowIso } from '@/lib/util';
import { PageContainer, PageHeader } from '@/components/layout/Page';
import DataTable from '@/components/ui/DataTable';
import ExecutiveKpis from '@/components/admin/overview/ExecutiveKpis';
import WorkflowCenter from '@/components/admin/overview/WorkflowCenter';
import RevenueAnalytics from '@/components/admin/overview/RevenueAnalytics';
export const dynamic = 'force-dynamic';

type SP = { period?: string };

export default async function Overview({ searchParams }: { searchParams: SP }) {
  const user = await requirePage('UC-20', '/admin');
  const admin = user.role === 'admin';
  const sales = can(user.role, 'UC-17');
  const styling = can(user.role, 'UC-12');
  const orders = sales ? all<any>('SELECT o.*, u.name uname FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.id DESC') : [];
  const pendingOrders = orders.filter((o) => o.status === 0);
  const toPackOrders = orders.filter((o) => o.status === 1);
  const delivered = orders.filter((o) => o.status === 3);
  const orderDetails = (rows: any[]) => rows.map((o) => ({ ...o, lines: all<any>('SELECT sku, name, qty, price FROM order_lines WHERE order_id=?', o.id) }));
  const qc = sales ? all<any>('SELECT p.code, p.workshop, p.due, pr.name pname, p.color FROM purchase_orders p JOIN products pr ON pr.id=p.product_id WHERE p.status=2') : [];
  const low = sales ? getVariants().filter((v) => v.available < v.minStock) : [];
  const mine = admin ? '' : ` AND c.stylist_id=${Number(user.id)}`;
  const fresh = styling ? all<any>("SELECT c.*, u.name uname FROM consults c JOIN users u ON u.id=c.user_id WHERE c.status='Mới' AND c.stylist_id IS NULL ORDER BY c.id DESC") : [];
  const working = styling ? all<any>(`SELECT c.*, u.name uname FROM consults c JOIN users u ON u.id=c.user_id WHERE c.status='Đang phối'${mine} ORDER BY c.id DESC`) : [];
  const period = searchParams.period === 'week' || searchParams.period === 'year' ? searchParams.period : 'month';
  const start = new Date(); start.setHours(0, 0, 0, 0);
  if (period === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  else if (period === 'month') start.setDate(1);
  else start.setMonth(0, 1);
  const startIso = start.toISOString();
  const endIso = nowIso();
  const periodDelivered = admin ? delivered.filter((o) => o.delivered_at >= startIso && o.delivered_at <= endIso) : [];
  const periodRevenue = periodDelivered.reduce((n, o) => n + o.total, 0);
  const periodShipping = periodDelivered.reduce((n, o) => n + o.shipping_fee, 0);
  const ids = periodDelivered.map((o) => o.id);
  const bestProducts = ids.length ? all<any>(
    `SELECT COALESCE(p.name, ol.name) name, p.image_url imageUrl, SUM(ol.qty) quantity, SUM(ol.qty * ol.price) amount
     FROM order_lines ol LEFT JOIN variants v ON v.sku=ol.sku LEFT JOIN products p ON p.id=v.product_id
     WHERE ol.order_id IN (${ids.map(() => '?').join(',')})
     GROUP BY COALESCE(p.id, ol.sku), COALESCE(p.name, ol.name), p.image_url
     ORDER BY quantity DESC, amount DESC LIMIT 10`, ...ids) : [];
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const previousStart = new Date(monthStart); previousStart.setMonth(previousStart.getMonth() - 1);
  const monthOrders = admin ? all<any>('SELECT total FROM orders WHERE status=3 AND delivered_at>=? AND delivered_at<=?', monthStart.toISOString(), endIso) : [];
  const previousOrders = admin ? all<any>('SELECT total FROM orders WHERE status=3 AND delivered_at>=? AND delivered_at<?', previousStart.toISOString(), monthStart.toISOString()) : [];
  const monthRevenue = monthOrders.reduce((n, o) => n + o.total, 0);
  const lastMonthRevenue = previousOrders.reduce((n, o) => n + o.total, 0);
  const bucketCount = period === 'week' ? 7 : period === 'month' ? new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate() : 12;
  const buckets = new Map<string, { label: string; amount: number; count: number }>();
  for (let i = 0; i < bucketCount; i++) {
    const date = new Date(start);
    if (period === 'year') date.setMonth(i); else date.setDate(date.getDate() + i);
    const key = period === 'year' ? `${date.getFullYear()}-${date.getMonth()}` : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    buckets.set(key, { label: period === 'year' ? date.toLocaleDateString('vi-VN', { month: 'short' }) : `${date.getDate()}/${date.getMonth() + 1}`, amount: 0, count: 0 });
  }
  for (const order of periodDelivered) {
    const date = new Date(order.delivered_at);
    const key = period === 'year' ? `${date.getFullYear()}-${date.getMonth()}` : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const bucket = buckets.get(key);
    if (bucket) { bucket.amount += order.total; bucket.count++; }
  }
  const recentOrders = admin ? all<any>('SELECT o.*, u.name uname FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.id DESC LIMIT 6') : [];
  const cashOrderIds = periodDelivered.map((o) => o.id);

  return (
    <PageContainer>
      <PageHeader title="Tổng quan kinh doanh" description={`Xin chào ${user.name}. Đây là các chỉ số và việc cần xử lý hôm nay.`} />
      {admin && <ExecutiveKpis monthRevenue={monthRevenue} lastMonthRevenue={lastMonthRevenue} pendingOrdersCount={pendingOrders.length} lowStockCount={low.length} pendingConsultsCount={fresh.length} />}
      <WorkflowCenter
        pendingOrders={orderDetails(pendingOrders)}
        toPackOrders={orderDetails(toPackOrders)}
        qcPOs={qc}
        lowStockItems={low.map((v) => ({ sku: v.sku, productName: v.productName, color: v.color, size: v.size, available: v.available, minStock: v.minStock }))}
        freshConsults={fresh}
        workingConsults={working}
      />
      {admin && <>
        <RevenueAnalytics period={period} stats={{ totalRevenue: periodRevenue, goodsRevenue: periodRevenue - periodShipping, shippingFee: periodShipping, ordersCount: periodDelivered.length, aov: periodDelivered.length ? periodRevenue / periodDelivered.length : 0, startDate: startIso, endDate: endIso }} chartData={Array.from(buckets.values())} />
        <section className="ov-bottom-grid" aria-label="Sản phẩm bán chạy và giao dịch gần đây">
          <div className="ov-bottom-card">
            <h2 className="ov-section-heading">Sản phẩm bán chạy</h2>
            <DataTable rows={bestProducts} rowKey={(b: any) => b.name} minWidth={420} mobile="cards" caption="Top sản phẩm trong kỳ" columns={[
              { key: 'name', header: 'Sản phẩm', cell: (b: any) => <span className="ov-product-cell">{b.imageUrl ? <img src={b.imageUrl} alt="" /> : <span className="ov-product-placeholder">E</span>}<b>{b.name}</b></span> },
              { key: 'q', header: 'Đã bán', cell: (b: any) => b.quantity },
              { key: 'amt', header: 'Doanh thu', className: 'nowrap', cell: (b: any) => fmt(b.amount) },
            ]} />
          </div>
          <div className="ov-bottom-card">
            <h2 className="ov-section-heading">Giao dịch gần đây</h2>
            <DataTable rows={recentOrders} rowKey={(o: any) => o.id} minWidth={420} mobile="cards" caption="Đơn hàng mới nhất" columns={[
              { key: 'code', header: 'Mã đơn', cell: (o: any) => <Link href={`/admin/don-hang?order=${o.code}`} className="ui-rowlink">{o.code}</Link> },
              { key: 'cus', header: 'Khách hàng', cell: (o: any) => o.uname },
              { key: 'total', header: 'Giá trị', className: 'nowrap', cell: (o: any) => fmt(o.total) },
            ]} />
          </div>
        </section>
      </>}
    </PageContainer>
  );
}

