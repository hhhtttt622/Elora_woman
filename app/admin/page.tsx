import Link from 'next/link';
import { all } from '@/lib/db';
import { requirePage } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getVariants } from '@/lib/inventory';
import { Act } from '@/components/admin/Flash';
import { setOrderStatus } from '../actions/admin';
import { HOLD_STATUS, fmt, dmy, hoursLeft, nowIso } from '@/lib/util';
import { PageContainer, PageHeader } from '@/components/layout/Page';
import { StatCard } from '@/components/ui/Display';
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
export default async function Overview() {
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

  return (
    <PageContainer>
      <PageHeader eyebrow="Tổng quan" title="Việc cần làm" description={`Xin chào ${u.name}. Bấm vào một chỉ số hoặc một dòng để đi tới màn xử lý.`} />
      <div className="kpis">
        {sales && <>
          <StatCard label="Đơn chờ xác nhận" value={pending.length} note="Cần xác nhận trong ngày" href="/admin/don-hang?s=0" />
          <StatCard label="Đơn chờ xuất kho" value={toPack.length} note="Đã xác nhận, chờ đóng gói" href="/admin/kho/xuat-kho" />
          <StatCard label="Phiếu chờ kiểm hàng" value={qc.length} note="Xưởng đã giao đến kho" href="/admin/kho/dat-may" />
          <StatCard label="SKU dưới ngưỡng" value={low.length} note="Cần đặt may thêm" href="/admin/kho/nhat-ky" danger={low.length > 0} />
        </>}
        {styling && <>
          <StatCard label="Yêu cầu tư vấn mới" value={fresh.length} note="Chưa có stylist nhận" href="/admin/tu-van" />
          <StatCard label={admin ? 'Yêu cầu đang phối' : 'Yêu cầu bạn đang phối'} value={working.length} note="Cần soạn và gửi set" href="/admin/tu-van" />
          <StatCard label="Lệnh giữ sắp hết hạn" value={expiring.length} note="Còn từ 6 giờ trở xuống" href="/admin/kho/giu-hang" danger={expiring.length > 0} />
        </>}
        {admin && <StatCard label="Doanh thu đơn đã giao" value={fmt(delivered.reduce((n, o) => n + o.total, 0))} note={`${delivered.length} đơn đã giao`} href="/admin/bao-cao" />}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        {sales && <>
          <Queue title="Đơn chờ xác nhận" empty="Không có đơn nào đang chờ." more="/admin/don-hang?s=0" total={pending.length}>
            {pending.slice(0, 5).map((o) => <li key={o.id}><span><Link href={`/admin/don-hang?s=0&order=${o.code}`} className="ui-rowlink">{o.code}</Link> · {o.uname}<br /><span className="note">{fmt(o.total)} · {o.pay_method}</span></span><Act action={setOrderStatus} args={[o.code, 1]} label={`Xác nhận đơn ${o.code}`}>Xác nhận</Act></li>)}
          </Queue>
          <Queue title="Đơn chờ xuất kho" empty="Không có đơn nào chờ đóng gói." more="/admin/kho/xuat-kho" total={toPack.length}>
            {toPack.slice(0, 5).map((o) => <li key={o.id}><span><b>{o.code}</b> · {o.uname}</span><Link href={`/admin/kho/xuat-kho?o=${o.code}`} className="ghost">Xuất kho</Link></li>)}
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
