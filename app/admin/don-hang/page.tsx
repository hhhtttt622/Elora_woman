import Link from 'next/link';
import { all } from '@/lib/db';
import { PageHead } from '@/components/admin/Bits';
import OrderSelect from '@/components/admin/OrderSelect';
import { ORDER_STATUS, fmt, dmy } from '@/lib/util';
import { requirePage } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export default async function Orders({ searchParams }: { searchParams: { s?: string } }) {
  const me = await requirePage('UC-17', '/admin/don-hang');
  const f = searchParams.s !== undefined && searchParams.s !== '' ? parseInt(searchParams.s, 10) : -1;
  const orders = all<any>('SELECT o.*, u.name uname FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.id DESC').map((o) => ({ ...o, lines: all<any>('SELECT * FROM order_lines WHERE order_id=?', o.id) }));
  const rows = orders.filter((o) => f === -1 || o.status === f);
  const cnt = (k: number) => k === -1 ? orders.length : orders.filter((o) => o.status === k).length;
  return (
    <>
      <PageHead group="Bán hàng" title="Đơn hàng" note='Đơn chỉ chuyển sang "Đang giao" sau khi đóng gói ở mục Xuất kho và đổi trả, để kho được trừ đúng.' />
      <div role="group" aria-label="Lọc theo trạng thái" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {[-1, 0, 1, 2, 3].map((k) => <Link key={k} href={k === -1 ? '/admin/don-hang' : `/admin/don-hang?s=${k}`} className={'chip' + (f === k ? ' on' : '')}>{k === -1 ? 'Tất cả' : ORDER_STATUS[k]} ({cnt(k)})</Link>)}
      </div>
      <div className="scroll"><table className="tb" style={{ minWidth: 960 }}><caption>Hiển thị {rows.length} / {orders.length} đơn hàng</caption>
        <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày</th><th>Sản phẩm</th><th>Tổng</th><th>Thanh toán</th><th>Trạng thái</th></tr></thead>
        <tbody>{rows.map((o) => <tr key={o.id}><td><b>{o.code}</b></td><td>{o.uname}</td><td style={{ whiteSpace: 'nowrap' }}>{dmy(o.created_at)}</td><td style={{ minWidth: 240 }}>{o.lines.map((l: any) => `${l.qty} × ${l.name}`).join('; ')}</td><td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{fmt(o.total)}</td><td>{o.pay_method}</td><td><OrderSelect code={o.code} status={o.status} /></td></tr>)}</tbody></table></div>
    </>
  );
}
