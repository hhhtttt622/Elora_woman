import Link from 'next/link';
import { all } from '@/lib/db';
import { requirePage } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getVariants } from '@/lib/inventory';
import { Act } from '@/components/admin/Flash';
import { setOrderStatus } from '../actions/admin';
import { HOLD_STATUS, fmt, dmy, dmyHm, hoursLeft, nowIso } from '@/lib/util';
import { PageContainer, PageHeader } from '@/components/layout/Page';
import { Section, StatCard } from '@/components/ui/Display';
import DataTable from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/States';
import StatusBadge from '@/components/ui/StatusBadge';
export const dynamic = 'force-dynamic';

/** Một hàng việc cần làm: tối đa 5 dòng, có lối "Xem tất cả" tới màn xử lý. */
function Queue({ title, empty, more, total, children }: { title: string; empty: string; more: string; total: number; children: React.ReactNode }) {
  return (
    <section className="ui-section" style={{ flex: '1 1 340px' }}>
      <div className="ui-section-head"><h2 className="h2">{title}</h2>{total > 0 ? <Link href={more} className="textbtn" style={{ minHeight: 0 }}>Xem tất cả ({total})</Link> : null}</div>
      {total === 0 ? <span className="note">{empty}</span> : <ul className="list">{children}</ul>}
    </section>
  );
}

// UC-20 Xem tổng quan công việc: mỗi vai trò thấy việc cần làm của mình
type SP = { period?: string; sort?: string };
const PERIOD_LABEL = { week: 'tuần này', month: 'tháng này', year: 'năm nay' } as const;

export default async function Overview({ searchParams }: { searchParams: SP }) {
  const u = await requirePage('UC-20', '/admin');
  const sales = can(u.role, 'UC-17'), styling = can(u.role, 'UC-12'), admin = u.role === 'admin';
  const orders = sales ? all<any>('SELECT o.*, u.name uname FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.id DESC') : [];
  const pending: typeof orders = [];
  const toPack: typeof orders = [];
  const delivered: typeof orders = [];
  if (sales) {
    for (const o of orders) {
      if (o.status === 0) pending.push(o);
      else if (o.status === 1) toPack.push(o);
      else if (o.status === 3) delivered.push(o);
    }
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

  return (
    <PageContainer>
      <PageHeader eyebrow="Tổng quan" title="Việc cần làm" description={`Xin chào ${u.name}. Bấm vào một chỉ số hoặc một dòng để đi tới màn xử lý.`} />
      <div className="kpis">
        {sales && <>
          <StatCard label="Đơn chờ xác nhận" value={pending.length} note="Cần xác nhận trong ngày" href="/admin/don-hang?s=0" />
          <StatCard label="Đơn chờ xuất kho" value={toPack.length} note="Đã xác nhận, chờ đóng gói" href="/admin/don-hang/xuat-kho" />
          <StatCard label="Phiếu chờ kiểm hàng" value={qc.length} note="Xưởng đã giao đến kho" href="/admin/kho/dat-may" />
          <StatCard label="SKU dưới ngưỡng" value={low.length} note="Cần đặt may thêm" href="/admin/kho/nhat-ky" danger={low.length > 0} />
        </>}
        {styling && <>
          <StatCard label="Yêu cầu tư vấn mới" value={fresh.length} note="Chưa có stylist nhận" href="/admin/tu-van" />
          <StatCard label={admin ? 'Yêu cầu đang phối' : 'Yêu cầu bạn đang phối'} value={working.length} note="Cần soạn và gửi set" href="/admin/tu-van" />
          <StatCard label="Lệnh giữ sắp hết hạn" value={expiring.length} note="Còn từ 6 giờ trở xuống" href="/admin/kho/giu-hang" danger={expiring.length > 0} />
        </>}
        {admin && <StatCard label="Doanh thu đơn đã giao" value={fmt(periodRevenue)} note={`${periodDelivered.length} đơn đã giao trong ${PERIOD_LABEL[period]}`} href="#tai-chinh" />}
      </div>

      {admin && (
        <div id="tai-chinh" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Section title="Doanh thu đơn đã giao" actions={
            <form method="get" className="row" aria-label="Lọc doanh thu và sản phẩm bán chạy" style={{ alignItems: 'flex-end' }}>
              <div className="fl"><label className="lbl" htmlFor="ov-period">Khoảng thời gian</label><select id="ov-period" name="period" className="fld" defaultValue={period}><option value="week">Tuần này</option><option value="month">Tháng này</option><option value="year">Năm nay</option></select></div>
              <div className="fl"><label className="lbl" htmlFor="ov-sort">Xếp hạng bán chạy</label><select id="ov-sort" name="sort" className="fld" defaultValue={sort}><option value="desc">Số lượng bán cao đến thấp</option><option value="asc">Số lượng bán thấp đến cao</option></select></div>
              <button className="btn">Lọc</button>
            </form>}>
            <p className="note" style={{ margin: 0 }}>Tính theo ngày giao từ {dmy(startIso)} đến {dmy(endIso)}. Tổng thu gồm tiền hàng và phí giao hàng. Xem theo khoảng ngày tùy chọn ở <Link href="/admin/bao-cao" className="textbtn" style={{ minHeight: 0 }}>Báo cáo doanh thu</Link>.</p>
            <div className="kpis">
              <StatCard label="Tiền hàng" value={fmt(periodRevenue - periodShipping)} note="Giá trị sản phẩm đã giao" />
              <StatCard label="Phí giao hàng" value={fmt(periodShipping)} note="Thu từ các đơn trong kỳ" />
              <StatCard label="Tổng thu" value={fmt(periodRevenue)} note={`${periodDelivered.length} đơn đã giao`} />
              <StatCard label="Giá trị đơn trung bình" value={fmt(periodDelivered.length ? periodRevenue / periodDelivered.length : 0)} note="Tổng thu chia số đơn" />
            </div>
          </Section>
          {periodDelivered.length === 0 ? <EmptyState title="Không có đơn đã giao trong khoảng thời gian này" /> : <>
            <DataTable rows={periodDelivered} rowKey={(o) => o.id} minWidth={960} mobile="cards" caption="Dòng tiền theo đơn đã giao" columns={[
              { key: 'date', header: 'Ngày giao', className: 'nowrap', cell: (o) => dmyHm(o.delivered_at) },
              { key: 'code', header: 'Mã đơn', cell: (o) => <Link href={`/admin/don-hang?order=${o.code}`} className="ui-rowlink">{o.code}</Link> },
              { key: 'cus', header: 'Khách hàng', cell: (o) => o.uname },
              { key: 'pay', header: 'Thanh toán', cell: (o) => o.pay_method },
              { key: 'goods', header: 'Tiền hàng', className: 'nowrap', cell: (o) => fmt(o.total - o.shipping_fee) },
              { key: 'ship', header: 'Phí giao', className: 'nowrap', cell: (o) => fmt(o.shipping_fee) },
              { key: 'total', header: 'Tổng thu', className: 'nowrap strong', cell: (o) => fmt(o.total) },
            ]} />
            <DataTable rows={bestProducts} rowKey={(b) => b.name} minWidth={720} mobile="cards" caption={`Sản phẩm bán chạy · ${sort === 'desc' ? 'số lượng cao đến thấp' : 'số lượng thấp đến cao'}`} columns={[
              { key: 'rank', header: 'Hạng', cell: (b) => b.rank },
              { key: 'name', header: 'Sản phẩm', cell: (b) => <b>{b.name}</b> },
              { key: 'q', header: 'Số lượng bán', cell: (b) => b.quantity },
              { key: 'amt', header: 'Tiền hàng', className: 'nowrap', cell: (b) => fmt(b.amount) },
            ]} />
          </>}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        {sales && <>
          <Queue title="Đơn chờ xác nhận" empty="Không có đơn nào đang chờ." more="/admin/don-hang?s=0" total={pending.length}>
            {pending.slice(0, 5).map((o) => <li key={o.id}><span><Link href={`/admin/don-hang?s=0&order=${o.code}`} className="ui-rowlink">{o.code}</Link> · {o.uname}<br /><span className="note">{fmt(o.total)} · {o.pay_method}</span></span><Act action={setOrderStatus} args={[o.code, 1]} label={`Xác nhận đơn ${o.code}`}>Xác nhận</Act></li>)}
          </Queue>
          <Queue title="Đơn chờ xuất kho" empty="Không có đơn nào chờ đóng gói." more="/admin/don-hang/xuat-kho" total={toPack.length}>
            {toPack.slice(0, 5).map((o) => <li key={o.id}><span><b>{o.code}</b> · {o.uname}</span><Link href={`/admin/don-hang/xuat-kho?o=${o.code}`} className="ghost">Xuất kho</Link></li>)}
          </Queue>
          <Queue title="Phiếu đặt may chờ kiểm hàng" empty="Không có phiếu nào chờ kiểm." more="/admin/kho/dat-may" total={qc.length}>
            {qc.slice(0, 5).map((p) => <li key={p.code}><span><b>{p.code}</b> · {p.pname} · {p.color}</span><Link href={`/admin/kho/dat-may?qc=${p.code}`} className="ghost">Kiểm hàng</Link></li>)}
          </Queue>
          <Queue title="Tồn kho dưới ngưỡng an toàn" empty="Chưa có SKU nào dưới ngưỡng." more="/admin/kho/nhat-ky" total={low.length}>
            {low.slice(0, 5).map((v) => <li key={v.sku}><span><b>{v.productName}</b> · {v.color} · {v.size}<br /><span style={{ color: 'var(--err)', fontWeight: 600 }}>Khả dụng {v.available}, ngưỡng {v.minStock}</span></span><Link href="/admin/kho/nhat-ky" className="ghost">Xem cảnh báo</Link></li>)}
          </Queue>
        </>}
        {styling && <>
          <Queue title="Yêu cầu tư vấn mới" empty="Không có yêu cầu mới." more="/admin/tu-van" total={fresh.length}>
            {fresh.slice(0, 5).map((c) => <li key={c.id}><span><b>{c.uname}</b> · {dmy(c.created_at)}<br /><span className="note">{c.occasions}</span></span><Link href={`/admin/tu-van?id=${c.id}`} className="ghost">Xem và nhận</Link></li>)}
          </Queue>
          <Queue title={admin ? 'Yêu cầu đang phối' : 'Yêu cầu bạn đang phụ trách'} empty="Không có yêu cầu nào đang phối." more="/admin/tu-van" total={working.length}>
            {working.slice(0, 5).map((c) => <li key={c.id}><span><b>{c.uname}</b><br /><span className="note">{c.occasions}</span></span><Link href={`/admin/tu-van?id=${c.id}`} className="ghost">Soạn set</Link></li>)}
          </Queue>
          <Queue title="Lệnh giữ sắp hết hạn" empty="Không có lệnh giữ nào sắp hết hạn." more="/admin/kho/giu-hang" total={expiring.length}>
            {expiring.slice(0, 5).map((h) => <li key={h.id}><span><b>{h.sku}</b> · {h.uname}<br /><StatusBadge domain="hold" value={hoursLeft(h.expires_at)} /></span><Link href="/admin/kho/giu-hang" className="ghost">Xử lý</Link></li>)}
          </Queue>
        </>}
      </div>
    </PageContainer>
  );
}
