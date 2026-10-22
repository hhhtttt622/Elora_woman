import Link from 'next/link';
import { all } from '@/lib/db';
import { requirePage } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { listVariants } from '@/lib/inventory';
import { PageHead } from '@/components/admin/Bits';
import { Act } from '@/components/admin/Flash';
import { setOrderStatus } from '../actions/admin';
import { HOLD_STATUS, fmt, dmy, hoursLeft, nowIso } from '@/lib/util';
export const dynamic = 'force-dynamic';

// UC-20 Xem tổng quan công việc: mỗi vai trò thấy việc cần làm của mình
export default async function Overview() {
  const u = await requirePage('UC-20', '/admin');
  const sales = can(u.role, 'UC-17'), styling = can(u.role, 'UC-12'), admin = u.role === 'admin';
  const orders = sales ? all<any>('SELECT o.*, u.name uname FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.id DESC') : [];
  const pending = orders.filter((o) => o.status === 0);
  const toPack = orders.filter((o) => o.status === 1);
  const delivered = orders.filter((o) => o.status === 3);
  const qc = sales ? all<any>('SELECT p.code, pr.name pname, p.color FROM purchase_orders p JOIN products pr ON pr.id=p.product_id WHERE p.status=2') : [];
  const low = sales ? listVariants().filter((v) => v.available < v.minStock) : [];
  const mine = admin ? '' : ` AND c.stylist_id=${u.id}`;
  const fresh = styling ? all<any>("SELECT c.*, u.name uname FROM consults c JOIN users u ON u.id=c.user_id WHERE c.status='Mới' AND c.stylist_id IS NULL ORDER BY c.id DESC") : [];
  const working = styling ? all<any>(`SELECT c.*, u.name uname FROM consults c JOIN users u ON u.id=c.user_id WHERE c.status='Đang phối'${mine} ORDER BY c.id DESC`) : [];
  const expiring = styling ? all<any>(`SELECT h.*, u.name uname FROM holds h JOIN consults c ON c.id=h.consult_id JOIN users u ON u.id=c.user_id
    WHERE h.status=? AND h.expires_at > ?${mine} ORDER BY h.expires_at`, HOLD_STATUS.active, nowIso()).filter((h) => hoursLeft(h.expires_at) <= 6) : [];
  const kpis: [string, string | number, string][] = [
    ...(sales ? [['Đơn chờ xác nhận', pending.length, 'Cần xác nhận trong ngày'], ['Đơn chờ xuất kho', toPack.length, 'Đã xác nhận, chờ đóng gói'], ['Phiếu chờ kiểm hàng', qc.length, 'Xưởng đã giao đến kho'], ['SKU dưới ngưỡng', low.length, 'Cần đặt may thêm']] as [string, number, string][] : []),
    ...(styling ? [['Yêu cầu tư vấn mới', fresh.length, 'Chưa có stylist nhận'], [admin ? 'Yêu cầu đang phối' : 'Yêu cầu bạn đang phối', working.length, 'Cần soạn và gửi set'], ['Lệnh giữ sắp hết hạn', expiring.length, 'Còn từ 6 giờ trở xuống']] as [string, number, string][] : []),
    ...(admin ? [['Doanh thu đơn đã giao', fmt(delivered.reduce((n, o) => n + o.total, 0)), `${delivered.length} đơn đã giao`]] as [string, string, string][] : []),
  ];
  const card = { flex: '1 1 340px' };
  return (
    <>
      <PageHead group="Tổng quan" title="Việc cần làm" />
      <div className="kpis">
        {kpis.map(([l, v, n]) => <div key={l} className="kpi"><span className="lbl">{l}</span><b>{v}</b><span className="note">{n}</span></div>)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        {sales && <>
          <section className="card" style={card}><h2 className="h2">Đơn chờ xác nhận</h2>
            {!pending.length && <span className="note">Không có đơn nào đang chờ.</span>}
            <ul className="list">{pending.slice(0, 5).map((o) => <li key={o.id}><span><Link href={`/admin/don-hang?s=0`}><b>{o.code}</b></Link> · {o.uname}<br /><span className="note">{fmt(o.total)} · {o.pay_method}</span></span><Act action={setOrderStatus} args={[o.code, 1]}>Xác nhận</Act></li>)}</ul></section>
          <section className="card" style={card}><h2 className="h2">Đơn chờ xuất kho</h2>
            {!toPack.length && <span className="note">Không có đơn nào chờ đóng gói.</span>}
            <ul className="list">{toPack.slice(0, 5).map((o) => <li key={o.id}><span><b>{o.code}</b> · {o.uname}</span><Link href={`/admin/kho/xuat-kho?o=${o.code}`} className="ghost">Xuất kho</Link></li>)}</ul></section>
          <section className="card" style={card}><h2 className="h2">Phiếu đặt may chờ kiểm hàng</h2>
            {!qc.length && <span className="note">Không có phiếu nào chờ kiểm.</span>}
            <ul className="list">{qc.map((p) => <li key={p.code}><span><b>{p.code}</b> · {p.pname} · {p.color}</span><Link href={`/admin/kho/dat-may?qc=${p.code}`} className="ghost">Kiểm hàng</Link></li>)}</ul></section>
          <section className="card" style={card}><h2 className="h2">Tồn kho dưới ngưỡng an toàn</h2>
            {!low.length && <span className="note">Chưa có SKU nào dưới ngưỡng.</span>}
            <ul className="list">{low.slice(0, 5).map((v) => <li key={v.sku}><span><b>{v.productName}</b> · {v.color} · {v.size}<br /><span style={{ color: 'var(--err)', fontWeight: 600 }}>Khả dụng {v.available}, ngưỡng {v.minStock}</span></span><Link href={`/admin/kho/nhat-ky`} className="ghost">Xem cảnh báo</Link></li>)}</ul></section>
        </>}
        {styling && <>
          <section className="card" style={card}><h2 className="h2">Yêu cầu tư vấn mới</h2>
            {!fresh.length && <span className="note">Không có yêu cầu mới.</span>}
            <ul className="list">{fresh.slice(0, 5).map((c) => <li key={c.id}><span><b>{c.uname}</b> · {dmy(c.created_at)}<br /><span className="note">{c.occasions}</span></span><Link href={`/admin/tu-van?id=${c.id}`} className="ghost">Xem và nhận</Link></li>)}</ul></section>
          <section className="card" style={card}><h2 className="h2">{admin ? 'Yêu cầu đang phối' : 'Yêu cầu bạn đang phụ trách'}</h2>
            {!working.length && <span className="note">Không có yêu cầu nào đang phối.</span>}
            <ul className="list">{working.slice(0, 5).map((c) => <li key={c.id}><span><b>{c.uname}</b><br /><span className="note">{c.occasions}</span></span><Link href={`/admin/tu-van?id=${c.id}`} className="ghost">Soạn set</Link></li>)}</ul></section>
          <section className="card" style={card}><h2 className="h2">Lệnh giữ sắp hết hạn</h2>
            {!expiring.length && <span className="note">Không có lệnh giữ nào sắp hết hạn.</span>}
            <ul className="list">{expiring.map((h) => <li key={h.id}><span><b>{h.sku}</b> · {h.uname}<br /><span style={{ color: 'var(--err)', fontWeight: 600 }}>Còn {hoursLeft(h.expires_at)} giờ</span></span><Link href="/admin/kho/giu-hang" className="ghost">Xử lý</Link></li>)}</ul></section>
        </>}
      </div>
    </>
  );
}
