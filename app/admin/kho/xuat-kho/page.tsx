import Link from 'next/link';
import { all, get } from '@/lib/db';
import { listVariants } from '@/lib/inventory';
import { PageHead } from '@/components/admin/Bits';
import { Act } from '@/components/admin/Flash';
import PackPanel from '@/components/admin/PackPanel';
import ReturnForm from '@/components/admin/ReturnForm';
import Barcode from '@/components/admin/Barcode';
import { returnRestock, returnRepair } from '@/app/actions/admin';
import { shelfOf, sizeText } from '@/lib/util';
import { requirePage } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export default async function Outbound({ searchParams }: { searchParams: { o?: string; label?: string } }) {
  const me = await requirePage('UC-32', '/admin/kho/xuat-kho');
  const vs = listVariants();
  const vm = (s: string) => vs.find((v) => v.sku === s);
  const toPack = all<any>('SELECT o.*, u.name uname FROM orders o JOIN users u ON u.id=o.user_id WHERE o.status=1 ORDER BY o.id');
  const sel = toPack.find((o) => o.code === searchParams.o) || toPack[0];
  const lines = sel ? all<any>('SELECT * FROM order_lines WHERE order_id=?', sel.id) : [];
  const pick = lines.map((l) => { const v = vm(l.sku); return { sku: l.sku, qty: l.qty, name: v ? `${v.productName} · ${v.color} · ${sizeText(v.size)}` : l.name, shelf: v ? shelfOf(v.productCode, v.size) : '-', online: v?.online ?? 0 }; }).sort((a, b) => (a.shelf < b.shelf ? -1 : 1));
  const labelOrder = searchParams.label ? get<any>('SELECT o.*, u.name uname FROM orders o JOIN users u ON u.id=o.user_id WHERE o.code=? AND o.tracking != \'\'', searchParams.label) : null;
  const delivered = all<any>('SELECT * FROM orders WHERE status=3 ORDER BY id DESC').map((o) => ({ code: o.code, label: `${o.code} · ${o.recv_name}`, skus: all<any>('SELECT sku, name FROM order_lines WHERE order_id=?', o.id).map((l) => ({ sku: l.sku, label: `${l.sku} · ${l.name}` })) }));
  const rts = all<any>('SELECT r.*, u.name uname FROM return_tickets r JOIN users u ON u.id=r.user_id ORDER BY r.id DESC');
  const repair = vs.filter((v) => v.repair > 0);
  return (
    <>
      <PageHead group="Quản lý kho" title="Xuất kho và đổi trả" />
      <section className="card"><h2 className="h2">Xuất kho bán hàng</h2>
        {!sel ? <span className="note">Chưa có đơn nào chờ nhặt hàng. Xác nhận đơn ở mục Đơn hàng để đơn xuất hiện ở đây.</span> : <>
          <div role="group" aria-label="Chọn đơn cần xuất" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{toPack.map((o) => <Link key={o.id} href={`/admin/kho/xuat-kho?o=${o.code}`} className={'chip' + (o.code === sel.code ? ' on' : '')}>{o.code} · {o.uname}</Link>)}</div>
          <span style={{ fontSize: 14 }}>Đơn <b>{sel.code}</b> · {sel.uname} · {sel.pay_method}</span>
          <div className="scroll"><table className="tb" style={{ minWidth: 760 }}><caption>Danh sách nhặt hàng (Pick-list), sắp theo kệ</caption>
            <thead><tr><th>Kệ</th><th>SKU</th><th>Sản phẩm</th><th>SL nhặt</th><th>Tồn Kho Online</th></tr></thead>
            <tbody>{pick.map((p) => <tr key={p.sku}><td><b>{p.shelf}</b></td><td style={{ whiteSpace: 'nowrap' }}>{p.sku}</td><td style={{ minWidth: 220 }}>{p.name}</td><td>{p.qty}</td><td><span className={'badge' + (p.online >= p.qty ? '' : ' red')}>{p.online >= p.qty ? `Đủ (${p.online})` : `Thiếu (${p.online})`}</span>{p.online < p.qty && <> <Link className="textbtn" href={`/admin/kho/dieu-chuyen?sku=${p.sku}&from=showroom&to=online`}>Điều chuyển từ Showroom</Link></>}</td></tr>)}</tbody></table></div>
          <PackPanel key={sel.code} code={sel.code} /></>}
        {labelOrder && (
          <div style={{ width: 340, maxWidth: '100%', padding: 16, border: '1px dashed var(--ink)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="eb">Tem vận đơn mẫu · {labelOrder.carrier}</span><b>Giao đến: {labelOrder.recv_name}</b><span style={{ fontSize: 13 }}>{labelOrder.recv_phone} · {labelOrder.address}</span><span style={{ fontSize: 13 }}>Đơn {labelOrder.code}</span>
            <Barcode text={labelOrder.tracking} /><b style={{ fontSize: 14, letterSpacing: '.06em' }}>{labelOrder.tracking}</b></div>)}
      </section>
      <section className="card"><h2 className="h2">Tiếp nhận hàng đổi trả</h2>
        <ReturnForm orders={delivered} />
        <div className="scroll"><table className="tb" style={{ minWidth: 900 }}><caption>Phiếu đổi trả</caption>
          <thead><tr><th>Đơn gốc</th><th>Khách hàng</th><th>SKU</th><th>Lý do</th><th>Trạng thái</th><th>Kết quả xử lý</th></tr></thead>
          <tbody>{rts.map((r) => <tr key={r.id}><td style={{ whiteSpace: 'nowrap' }}><b>{r.order_code}</b></td><td>{r.uname}</td><td style={{ whiteSpace: 'nowrap' }}>{r.sku}</td><td>{r.reason}</td><td><span className={'badge ' + (r.status === 'Chờ kiểm tra' ? 'pink' : 'dark')}>{r.status}</span></td>
            <td style={{ whiteSpace: 'nowrap' }}>{r.status === 'Chờ kiểm tra' && <><Act action={returnRestock} args={[r.id]} label={`Còn nguyên tem mác, nhập lại kho ${r.sku}`}>Còn nguyên tem, nhập lại kho</Act> <Act action={returnRepair} args={[r.id]} label={`Sản phẩm lỗi, chuyển sửa chữa ${r.sku}`}>Lỗi, chuyển sửa chữa</Act></>}{r.result}</td></tr>)}</tbody></table></div>
        <div><span className="lbl">Kho thanh lý và sửa chữa ({repair.reduce((n, v) => n + v.repair, 0)} sản phẩm)</span>{!repair.length && <p className="note">Chưa có sản phẩm nào.</p>}
          <ul className="list">{repair.map((v) => <li key={v.sku}>{v.repair} × <b>{v.sku}</b> · {v.productName} · {v.color} · {sizeText(v.size)}</li>)}</ul></div>
      </section>
    </>
  );
}
