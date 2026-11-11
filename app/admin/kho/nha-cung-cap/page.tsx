import Link from 'next/link';
import { all } from '@/lib/db';
import { PageHead } from '@/components/admin/Bits';
import { Act } from '@/components/admin/Flash';
import SupplierForm from '@/components/admin/SupplierForm';
import { setSupplierActive } from '@/app/actions/admin';
import { requirePage } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Suppliers() {
  await requirePage('UC-26', '/admin/kho/nha-cung-cap');
  const suppliers = all<any>(`
    SELECT s.*, COUNT(p.id) po_count,
      SUM(CASE WHEN p.status < 3 THEN 1 ELSE 0 END) open_po_count
    FROM suppliers s LEFT JOIN purchase_orders p ON p.supplier_id=s.id
    GROUP BY s.id ORDER BY s.active DESC, s.name
  `);
  return (
    <>
      <PageHead group="Quản lý kho" title="Nhà cung cấp" note="Quản lý thông tin đối tác và theo dõi các phiếu đặt may liên quan." />
      <section className="card">
        <h2 className="h2">Thêm nhà cung cấp</h2>
        <SupplierForm />
      </section>
      <section className="card">
        <h2 className="h2">Danh sách nhà cung cấp</h2>
        {!suppliers.length ? <p className="note">Chưa có nhà cung cấp nào. Thêm đối tác để tạo phiếu đặt may.</p> :
          <div className="scroll"><table className="tb" style={{ minWidth: 850 }}>
            <caption>Nhà cung cấp và tình trạng hợp tác</caption>
            <thead><tr><th>Nhà cung cấp</th><th>Liên hệ</th><th>Điện thoại / Email</th><th>Phiếu đặt hàng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>{suppliers.map((s) => <tr key={s.id}>
              <td><Link className="textbtn" href={`/admin/kho/nha-cung-cap/${s.id}`}><b>{s.name}</b></Link></td>
              <td>{s.contact_name || '—'}</td>
              <td>{s.phone || '—'}<br /><span className="note">{s.email || ''}</span></td>
              <td>{s.po_count} tổng · {s.open_po_count || 0} đang xử lý</td>
              <td><span className={'badge ' + (s.active ? 'dark' : 'sand')}>{s.active ? 'Đang hoạt động' : 'Ngừng hợp tác'}</span></td>
              <td style={{ minWidth: 190 }}>
                <details><summary className="textbtn">Sửa thông tin</summary><div style={{ minWidth: 280, padding: 12 }}><SupplierForm supplier={s} /></div></details>
                <Act action={setSupplierActive} args={[s.id, !s.active]} confirm={s.active ? `Ngừng hợp tác với ${s.name}? Các PO cũ vẫn được giữ lại.` : undefined} variant="secondary" size="sm">
                  {s.active ? 'Ngừng hợp tác' : 'Kích hoạt lại'}
                </Act>
              </td>
            </tr>)}</tbody>
          </table></div>}
      </section>
    </>
  );
}
