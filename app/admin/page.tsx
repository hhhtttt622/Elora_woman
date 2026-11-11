import Link from 'next/link';
import { all } from '@/lib/db';
import { requirePage } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getVariants } from '@/lib/inventory';
import { Act } from '@/components/admin/Flash';
import { setOrderStatus } from '../actions/admin';
import { HOLD_STATUS, fmt, dmy, dmyHm, hoursLeft, nowIso, sizeText } from '@/lib/util';
import { hrefWith } from '@/lib/url';
import { PageContainer, PageHeader } from '@/components/layout/Page';
import { DescriptionList } from '@/components/ui/Display';
import DataTable from '@/components/ui/DataTable';
import { FilterChips } from '@/components/ui/Navigation';
import StatusBadge from '@/components/ui/StatusBadge';
export const dynamic = 'force-dynamic';

type SP = { period?: string; sort?: string };
type Queue = { title: string; note: string; href: string; total: number; danger?: boolean; rows: React.ReactNode };

const BASE = '/admin';
const MAX_ROWS = 5;
const MAX_CASH_ROWS = 10;
const PERIODS = [['week', 'Tuần này'], ['month', 'Tháng này'], ['year', 'Năm nay']] as const;
const PERIOD_LABEL = { week: 'tuần này', month: 'tháng này', year: 'năm nay' } as const;
const SORTS = [['desc', 'Bán nhiều nhất'], ['asc', 'Bán ít nhất']] as const;

function Row({ main, sub, action }: { main: React.ReactNode; sub: React.ReactNode; action: React.ReactNode }) {
  return <li><span className="ov-row-text"><span className="ov-row-main">{main}</span><span className="note">{sub}</span></span>{action}</li>;
}

/** Một hàng trong sổ việc: bấm số hoặc tên để tới màn xử lý, bên phải là các việc cụ thể. */
function QueueRow({ q }: { q: Queue }) {
  return (
    <div className="ov-q">
      <Link href={q.href} className="ov-q-head">
        <b className={'ov-q-num' + (q.danger ? ' danger' : '')}>{q.total}</b>
        <span><h3 className="ov-q-title">{q.title}</h3><span className="note">{q.note}</span></span>
      </Link>
      <div>
        <ul className="ov-rows">{q.rows}</ul>
        {q.total > MAX_ROWS && <Link href={q.href} className="textbtn" style={{ minHeight: 0 }}>Xem tất cả {q.total}</Link>}
      </div>
    </div>
  );
}

/** Nhóm việc. Hàng không có việc thu lại thành một dòng để phần còn việc nổi lên. */
function WorkGroup({ title, queues }: { title: string; queues: Queue[] }) {
  const active = queues.filter((q) => q.total > 0);
  const idle = queues.filter((q) => q.total === 0);
  return (
    <section className="ov-group">
      <h2 className="ov-group-title">{title}</h2>
      <div className="ov-panel">
        {active.map((q) => <QueueRow key={q.title} q={q} />)}
        {idle.length > 0 && <p className="note ov-idle">Không có việc ở: {idle.map((q) => q.title.toLowerCase()).join(', ')}.</p>}
      </div>
    </section>
  );
}

// UC-20 Xem tổng quan công việc: mỗi vai trò thấy việc cần làm của mình
export default async function Overview({ searchParams }: { searchParams: SP }) {
  const u = await requirePage('UC-20', BASE);
  const sales = can(u.role, 'UC-17'), styling = can(u.role, 'UC-12'), admin = u.role === 'admin';
  const orders = sales ? all<any>('SELECT o.*, u.name uname FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.id DESC') : [];
  const pending: typeof orders = [];
  const toPack: typeof orders = [];
  const delivered: typeof orders = [];
  for (const o of orders) {
    if (o.status === 0) pending.push(o);
    else if (o.status === 1) toPack.push(o);
    else if (o.status === 3) delivered.push(o);
  }
  const qc = sales ? all<any>('SELECT p.code, pr.name pname, p.color FROM purchase_orders p JOIN products pr ON pr.id=p.product_id WHERE p.status=2') : [];
  const low = sales ? getVariants().filter((v) => v.available < v.minStock) : [];
  const mine = admin ? '' : ` AND c.stylist_id=${u.id}`;
  const fresh = styling ? all<any>("SELECT c.*, u.name uname FROM consults c JOIN users u ON u.id=c.user_id WHERE c.status='Mới' AND c.stylist_id IS NULL ORDER BY c.id DESC") : [];
  const working = styling ? all<any>(`SELECT c.*, u.name uname FROM consults c JOIN users u ON u.id=c.user_id WHERE c.status='Đang phối'${mine} ORDER BY c.id DESC`) : [];
  const expiring = styling ? all<any>(`SELECT h.*, u.name uname FROM holds h JOIN consults c ON c.id=h.consult_id JOIN users u ON u.id=c.user_id
    WHERE h.status=? AND h.expires_at > ?${mine} ORDER BY h.expires_at`, HOLD_STATUS.active, nowIso()).filter((h) => hoursLeft(h.expires_at) <= 6) : [];

  // Tài chính (chỉ admin): doanh thu đơn đã giao trong tuần / tháng / năm hiện tại và sản phẩm bán chạy.
  const period = searchParams.period === 'week' || searchParams.period === 'year' ? searchParams.period : 'month';
  const sort = searchParams.sort === 'asc' ? 'asc' : 'desc';
  const periodStart = new Date();
  periodStart.setHours(0, 0, 0, 0);
  if (period === 'week') periodStart.setDate(periodStart.getDate() - ((periodStart.getDay() + 6) % 7));
  else if (period === 'month') periodStart.setDate(1);
  else periodStart.setMonth(0, 1);
  const startIso = periodStart.toISOString();
  const endIso = nowIso();
  const periodDelivered: typeof orders = [];
  let periodRevenue = 0;
  let periodShipping = 0;
  if (admin) {
    for (const o of delivered) {
      if (o.delivered_at < startIso || o.delivered_at > endIso) continue;
      periodDelivered.push(o);
      periodRevenue += o.total;
      periodShipping += o.shipping_fee;
    }
  }
  const periodIds = periodDelivered.map((o) => o.id);
  const direction = sort === 'asc' ? 'ASC' : 'DESC';
  const bestProducts = periodIds.length ? all<any>(
    `SELECT COALESCE(p.name, ol.name) name, SUM(ol.qty) quantity, SUM(ol.qty * ol.price) amount
     FROM order_lines ol LEFT JOIN variants v ON v.sku=ol.sku LEFT JOIN products p ON p.id=v.product_id
     WHERE ol.order_id IN (${periodIds.map(() => '?').join(',')})
     GROUP BY COALESCE(p.id, ol.sku), COALESCE(p.name, ol.name)
     ORDER BY quantity ${direction}, amount ${direction} LIMIT 10`, ...periodIds).map((b, i) => ({ ...b, rank: i + 1 })) : [];

  const orderQueues: Queue[] = [
    { title: 'Đơn chờ xác nhận', note: 'Cần xác nhận trong ngày', href: '/admin/don-hang?s=0', total: pending.length,
      rows: pending.slice(0, MAX_ROWS).map((o) => <Row key={o.id} main={<Link href={`/admin/don-hang?s=0&order=${o.code}`} className="ui-rowlink">{o.code}</Link>} sub={`${o.uname}, ${fmt(o.total)}, ${o.pay_method}`} action={<Act action={setOrderStatus} args={[o.code, 1]} size="sm" label={`Xác nhận đơn ${o.code}`}>Xác nhận</Act>} />) },
    { title: 'Đơn chờ xuất kho', note: 'Đã xác nhận, chờ đóng gói', href: '/admin/don-hang/xuat-kho', total: toPack.length,
      rows: toPack.slice(0, MAX_ROWS).map((o) => <Row key={o.id} main={o.code} sub={o.uname} action={<Link href={`/admin/don-hang/xuat-kho?o=${o.code}`} className="ghost ui-sm">Xuất kho</Link>} />) },
  ];
  const stockQueues: Queue[] = [
    { title: 'Phiếu chờ kiểm hàng', note: 'Xưởng đã giao đến kho', href: '/admin/kho/dat-may', total: qc.length,
      rows: qc.slice(0, MAX_ROWS).map((p) => <Row key={p.code} main={p.code} sub={`${p.pname}, ${p.color}`} action={<Link href={`/admin/kho/dat-may?qc=${p.code}`} className="ghost ui-sm">Kiểm hàng</Link>} />) },
    { title: 'SKU dưới ngưỡng', note: 'Cần đặt may thêm', href: '/admin/kho/nhat-ky', total: low.length, danger: true,
      rows: low.slice(0, MAX_ROWS).map((v) => <Row key={v.sku} main={`${v.productName}, ${v.color}, ${sizeText(v.size)}`} sub={<span className="ov-warn">Khả dụng {v.available}, ngưỡng {v.minStock}</span>} action={<Link href={`/admin/kho/dat-may?sku=${v.sku}`} className="ghost ui-sm" aria-label={`Đặt may ${v.sku}`}>Đặt may</Link>} />) },
  ];
  const styleQueues: Queue[] = [
    { title: 'Yêu cầu tư vấn mới', note: 'Chưa có stylist nhận', href: '/admin/tu-van', total: fresh.length,
      rows: fresh.slice(0, MAX_ROWS).map((c) => <Row key={c.id} main={c.uname} sub={`${dmy(c.created_at)}, ${c.occasions}`} action={<Link href={`/admin/tu-van?id=${c.id}`} className="ghost ui-sm">Xem và nhận</Link>} />) },
    { title: admin ? 'Yêu cầu đang phối' : 'Yêu cầu bạn đang phối', note: 'Cần soạn và gửi set', href: '/admin/tu-van', total: working.length,
      rows: working.slice(0, MAX_ROWS).map((c) => <Row key={c.id} main={c.uname} sub={c.occasions} action={<Link href={`/admin/tu-van?id=${c.id}`} className="ghost ui-sm">Soạn set</Link>} />) },
    { title: 'Lệnh giữ sắp hết hạn', note: 'Còn từ 6 giờ trở xuống', href: '/admin/kho/giu-hang', total: expiring.length, danger: true,
      rows: expiring.slice(0, MAX_ROWS).map((h) => <Row key={h.id} main={h.sku} sub={<>{h.uname} <StatusBadge domain="hold" value={hoursLeft(h.expires_at)} /></>} action={<Link href="/admin/kho/giu-hang" className="ghost ui-sm">Xử lý</Link>} />) },
  ];
  const groups = [
    ...(sales ? [{ title: 'Đơn hàng', queues: orderQueues }, { title: 'Kho', queues: stockQueues }] : []),
    ...(styling ? [{ title: 'Tư vấn', queues: styleQueues }] : []),
  ];
  let waiting = 0;
  for (const g of groups) for (const q of g.queues) waiting += q.total;

  return (
    <PageContainer>
      <PageHeader title={waiting ? `Có ${waiting} việc đang chờ` : 'Không có việc nào đang chờ'} description={`Xin chào ${u.name}. Bấm vào số để xem đầy đủ, hoặc xử lý ngay ở từng dòng.`} />

      {groups.map((g) => <WorkGroup key={g.title} title={g.title} queues={g.queues} />)}

      {admin && (
        <section id="tai-chinh" className="ov-group">
          <div className="ov-group-head">
            <h2 className="ov-group-title">Doanh thu</h2>
            <FilterChips label="Khoảng thời gian" current={period} items={PERIODS.map(([k, l]) => ({ key: k, label: l, href: hrefWith(BASE, searchParams, { period: k === 'month' ? null : k }) }))} />
          </div>
          <div className="ov-panel ov-fin">
            <div className="ov-fin-total">
              <b>{fmt(periodRevenue)}</b>
              <span className="note">{periodDelivered.length ? `${periodDelivered.length} đơn đã giao ${PERIOD_LABEL[period]}` : `Chưa có đơn nào giao ${PERIOD_LABEL[period]}`}, từ {dmy(startIso)} đến {dmy(endIso)}</span>
              <Link href="/admin/bao-cao" className="textbtn" style={{ minHeight: 0 }}>Chọn khoảng ngày khác</Link>
            </div>
            {periodDelivered.length > 0 && <DescriptionList min={150} items={[
              ['Tiền hàng', fmt(periodRevenue - periodShipping)],
              ['Phí giao hàng', fmt(periodShipping)],
              ['Giá trị đơn trung bình', fmt(periodRevenue / periodDelivered.length)],
            ]} />}
          </div>
          {periodDelivered.length > 0 && <>
            <DataTable rows={periodDelivered.slice(0, MAX_CASH_ROWS)} rowKey={(o) => o.id} minWidth={860} mobile="cards" caption={periodDelivered.length > MAX_CASH_ROWS ? `Dòng tiền của ${MAX_CASH_ROWS} đơn mới nhất trong ${periodDelivered.length} đơn` : 'Dòng tiền theo đơn đã giao'} columns={[
              { key: 'date', header: 'Ngày giao', className: 'nowrap', cell: (o) => dmyHm(o.delivered_at) },
              { key: 'code', header: 'Mã đơn', className: 'nowrap', cell: (o) => <Link href={`/admin/don-hang?order=${o.code}`} className="ui-rowlink">{o.code}</Link> },
              { key: 'cus', header: 'Khách hàng', cell: (o) => o.uname },
              { key: 'pay', header: 'Thanh toán', cell: (o) => o.pay_method },
              { key: 'goods', header: 'Tiền hàng', className: 'nowrap', cell: (o) => fmt(o.total - o.shipping_fee) },
              { key: 'ship', header: 'Phí giao', className: 'nowrap', cell: (o) => fmt(o.shipping_fee) },
              { key: 'total', header: 'Tổng thu', className: 'nowrap strong', cell: (o) => fmt(o.total) },
            ]} />
            <FilterChips label="Xếp hạng sản phẩm" current={sort} items={SORTS.map(([k, l]) => ({ key: k, label: l, href: hrefWith(BASE, searchParams, { sort: k === 'desc' ? null : k }) }))} />
            <DataTable rows={bestProducts} rowKey={(b) => b.name} minWidth={640} mobile="cards" caption="Sản phẩm bán chạy" columns={[
              { key: 'rank', header: 'Hạng', cell: (b) => b.rank },
              { key: 'name', header: 'Sản phẩm', cell: (b) => <b>{b.name}</b> },
              { key: 'q', header: 'Số lượng bán', cell: (b) => b.quantity },
              { key: 'amt', header: 'Tiền hàng', className: 'nowrap', cell: (b) => fmt(b.amount) },
            ]} />
          </>}
        </section>
      )}
    </PageContainer>
  );
}
