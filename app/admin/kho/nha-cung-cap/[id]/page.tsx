import Link from 'next/link';
import { notFound } from 'next/navigation';
import { all, get } from '@/lib/db';
import { PageHead } from '@/components/admin/Bits';
import { PO_STATUS, fmt, sizeText } from '@/lib/util';
import { requirePage } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function SupplierDetail({ params }: { params: { id: string } }) {
  await requirePage('UC-26', '/admin/kho/nha-cung-cap');
  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const supplier = get<any>('SELECT * FROM suppliers WHERE id=?', id);
  if (!supplier) notFound();
  const orders = all<any>(`
    SELECT p.*, pr.name product_name, COALESCE(SUM(l.qty),0) quantity
    FROM purchase_orders p JOIN products pr ON pr.id=p.product_id
    LEFT JOIN po_lines l ON l.po_id=p.id
    WHERE p.supplier_id=? GROUP BY p.id ORDER BY p.id DESC
  `, id);
  const allLines = all<any>(
    'SELECT po_id,size,qty FROM po_lines WHERE po_id IN (SELECT id FROM purchase_orders WHERE supplier_id=?) ORDER BY id',
    id,
  );
  const linesByPoId = new Map<number, any[]>();
  for (const line of allLines) {
    const lines = linesByPoId.get(line.po_id) || [];
    lines.push(line);
    linesByPoId.set(line.po_id, lines);
  }
  const totalOrders = orders.length;
  const totalSpend = orders.reduce((sum, p) => sum + p.cost * p.quantity, 0);
  return (
    <>
      <PageHead group="Quản lý kho" title={supplier.name} note="Hồ sơ nhà cung cấp và lịch sử đặt hàng." actions={<Link className="ghost" href="/admin/kho/nha-cung-cap">Danh sách nhà cung cấp</Link>} />
      <section className="card">
        <div className="grid">
          <div><span className="lbl">Người liên hệ</span><p>{supplier.contact_name || 'Chưa cập nhật'}</p></div>
          <div><span className="lbl">Điện thoại</span><p>{supplier.phone || 'Chưa cập nhật'}</p></div>
          <div><span className="lbl">Email</span><p>{supplier.email || 'Chưa cập nhật'}</p></div>
          <div><span className="lbl">Địa chỉ</span><p>{supplier.address || 'Chưa cập nhật'}</p></div>
          <div><span className="lbl">Ghi chú / điều khoản</span><p>{supplier.notes || 'Chưa cập nhật'}</p></div>
          <div><span className="lbl">Trạng thái</span><p><span className={'badge ' + (supplier.active ? 'dark' : 'sand')}>{supplier.active ? 'Đang hoạt động' : 'Ngừng hợp tác'}</span></p></div>
        </div>
      </section>
      <section className="card">
        <h2 className="h2">Lịch sử đặt hàng</h2>
        <p className="note">{totalOrders} phiếu · Tổng giá trị đặt may {fmt(totalSpend)}</p>
        {!orders.length ? <p className="note">Nhà cung cấp này chưa có phiếu đặt hàng.</p> :
          <div className="scroll"><table className="tb" style={{ minWidth: 850 }}>
            <caption>Phiếu đặt hàng gửi {supplier.name}</caption>
            <thead><tr><th>Mã PO</th><th>Sản phẩm</th><th>Màu</th><th>Số lượng</th><th>Giá trị</th><th>Hẹn giao</th><th>Trạng thái</th></tr></thead>
            <tbody>{orders.map((p) => {
              const lines = linesByPoId.get(p.id) || [];
              return <tr key={p.id}>
                <td><Link className="textbtn" href={`/admin/kho/dat-may?qc=${encodeURIComponent(p.code)}`}>{p.code}</Link></td>
                <td>{p.product_name}</td><td>{p.color}</td>
                <td>{lines.map((l) => `${sizeText(l.size)}: ${l.qty}`).join(', ')} (tổng {p.quantity})</td>
                <td>{fmt(p.cost * p.quantity)}</td><td>{p.due}</td><td>{PO_STATUS[p.status]}</td>
              </tr>;
            })}</tbody>
          </table></div>}
      </section>
    </>
  );
}
