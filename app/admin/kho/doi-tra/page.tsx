import { all } from '@/lib/db';
import { getVariants } from '@/lib/inventory';
import { PageHead } from '@/components/admin/Bits';
import { Act } from '@/components/admin/Flash';
import ReturnRequestForm from '@/components/admin/ReturnRequestForm';
import { markReturnReceived, returnRestock, returnRepair } from '@/app/actions/admin';
import { requirePage } from '@/lib/auth';
export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<string, string> = {
  'Chờ nhận hàng': 'pink',
  'Chờ kiểm tra': 'pink',
  'Đã đóng': 'dark',
};

export default async function Returns() {
  await requirePage('UC-32', '/admin/kho/doi-tra');
  const delivered = all<any>('SELECT * FROM orders WHERE status=3 ORDER BY id DESC').map((o) => ({ code: o.code, label: `${o.code} · ${o.recv_name}`, skus: all<any>('SELECT sku, name FROM order_lines WHERE order_id=?', o.id).map((l) => ({ sku: l.sku, label: `${l.sku} · ${l.name}` })) }));
  const rts = all<any>('SELECT r.*, u.name uname FROM return_tickets r JOIN users u ON u.id=r.user_id ORDER BY r.id DESC');
  const repair = getVariants().filter((v) => v.repair > 0);
  const waiting = rts.filter((r) => r.status === 'Chờ nhận hàng').length;
  const checking = rts.filter((r) => r.status === 'Chờ kiểm tra').length;
  return (
    <>
      <PageHead group="Quản lý kho" title="Đổi trả" note="Tiếp nhận và xử lý hàng khách gửi trả. Phần xuất kho bán hàng nằm ở mục Xuất kho bán hàng." />

      <section className="card"><h2 className="h2">Tạo yêu cầu đổi trả</h2>
        {!delivered.length ? <span className="note">Chưa có đơn đã giao nào để tạo yêu cầu đổi trả.</span> : <ReturnRequestForm orders={delivered} />}
        <span className="note">Yêu cầu mới sẽ ở trạng thái <b>Chờ nhận hàng</b>. Khi hàng khách gửi về tới kho, bấm <b>Xác nhận đã nhận hàng</b> ở bảng dưới để chuyển sang kiểm định.</span>
      </section>

      <section className="card"><h2 className="h2">Phiếu đổi trả</h2>
        <div role="group" aria-label="Tình trạng phiếu" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span className="chip">Chờ nhận hàng: <b>{waiting}</b></span>
          <span className="chip">Chờ kiểm tra: <b>{checking}</b></span>
        </div>
        {!rts.length ? <p className="note">Chưa có phiếu đổi trả nào.</p> :
        <div className="scroll"><table className="tb" style={{ minWidth: 960 }}><caption>Danh sách phiếu đổi trả</caption>
          <thead><tr><th>Đơn gốc</th><th>Khách hàng</th><th>SKU</th><th>Lý do</th><th>Trạng thái</th><th>Kết quả / thao tác</th></tr></thead>
          <tbody>{rts.map((r) => <tr key={r.id}><td style={{ whiteSpace: 'nowrap' }}><b>{r.order_code}</b></td><td>{r.uname}</td><td style={{ whiteSpace: 'nowrap' }}>{r.sku}</td><td>{r.reason}</td>
            <td><span className={'badge ' + (STATUS_BADGE[r.status] || 'dark')}>{r.status}</span></td>
            <td style={{ whiteSpace: 'nowrap' }}>
              {r.status === 'Chờ nhận hàng' && <Act action={markReturnReceived} args={[r.id]} primary label={`Xác nhận đã nhận hàng ${r.sku} đơn ${r.order_code}`}>Xác nhận đã nhận hàng</Act>}
              {r.status === 'Chờ kiểm tra' && <><Act action={returnRestock} args={[r.id]} label={`Còn nguyên tem mác, nhập lại kho ${r.sku}`}>Còn nguyên tem, nhập lại kho</Act> <Act action={returnRepair} args={[r.id]} label={`Sản phẩm lỗi, chuyển sửa chữa ${r.sku}`}>Lỗi, chuyển sửa chữa</Act></>}
              {r.status === 'Đã đóng' && <span className="note">{r.result || 'Đã xử lý'}</span>}
            </td></tr>)}</tbody></table></div>}
      </section>

      <section className="card"><h2 className="h2">Kho thanh lý và sửa chữa</h2>
        <span className="lbl">{repair.reduce((n, v) => n + v.repair, 0)} sản phẩm</span>
        {!repair.length ? <p className="note">Chưa có sản phẩm nào.</p> :
          <ul className="list">{repair.map((v) => <li key={v.sku}>{v.repair} × <b>{v.sku}</b> · {v.productName} · {v.color} · {v.size}</li>)}</ul>}
      </section>
    </>
  );
}
