import { all } from '@/lib/db';
import { requirePage } from '@/lib/auth';
import { PageHead } from '@/components/admin/Bits';
import { Act } from '@/components/admin/Flash';
import { buyHold, releaseHold, simulateHours } from '@/app/actions/admin';
import { HOLD_STATUS, hoursLeft, nowIso } from '@/lib/util';
export const dynamic = 'force-dynamic';

// UC-15 Chốt mua, UC-16 Nhả hàng: stylist chỉ thấy lệnh giữ của yêu cầu mình phụ trách (BR-19)
export default async function Holds() {
  const me = await requirePage('UC-15', '/admin/kho/giu-hang');
  const admin = me.role === 'admin';
  const rows = all<any>(`SELECT h.*, u.name uname, p.name pname, v.color, v.size, s.name sname FROM holds h JOIN consults c ON c.id=h.consult_id JOIN users u ON u.id=c.user_id
    LEFT JOIN users s ON s.id=c.stylist_id JOIN variants v ON v.sku=h.sku JOIN products p ON p.id=v.product_id
    WHERE h.status=? AND h.expires_at > ? ${admin ? '' : 'AND c.stylist_id=?'} ORDER BY h.expires_at`, HOLD_STATUS.active, nowIso(), ...(admin ? [] : [me.id]));
  return (
    <>
      <PageHead group="Tư vấn phối đồ" title="Hàng đang giữ" note="Lệnh giữ được tạo khi stylist gửi gợi ý outfit (24 hoặc 48 giờ). Hàng đang giữ tính vào Tạm giữ nên không bán cho người khác. Hết hạn mà khách chưa chốt, hệ thống tự nhả về kho bán." />
      {admin && <div className="row"><Act action={simulateHours} args={[12]}>Giả lập trôi 12 giờ</Act><span className="note">Công cụ thử nghiệm cho admin, không thuộc đặc tả.</span></div>}
      {!rows.length && <div className="card" style={{ background: '#F6EEEF' }}><b>Chưa có hàng nào đang được giữ</b><span className="note">Gửi gợi ý cho khách ở mục Yêu cầu tư vấn để tạo lệnh giữ.</span></div>}
      <div className="scroll"><table className="tb" style={{ minWidth: 880 }}><caption>Đang giữ {rows.length} món</caption>
        <thead><tr><th>Khách hàng</th>{admin && <th>Stylist</th>}<th>Sản phẩm</th><th>SKU</th><th>SL</th><th>Còn lại</th><th>Thao tác</th></tr></thead>
        <tbody>{rows.map((h) => { const left = hoursLeft(h.expires_at); return (
          <tr key={h.id}><td><b>{h.uname}</b></td>{admin && <td>{h.sname}</td>}<td style={{ minWidth: 220 }}>{h.pname} · {h.color} · {h.size}</td><td style={{ whiteSpace: 'nowrap' }}>{h.sku}</td><td>{h.qty}</td><td><span className={'badge ' + (left <= 6 ? 'red' : '')}>Còn {left} giờ</span></td>
            <td style={{ whiteSpace: 'nowrap' }}><Act action={buyHold} args={[h.id]} label={`Khách chốt mua ${h.sku}`}>Khách chốt mua</Act> <Act action={releaseHold} args={[h.id]} label={`Nhả giữ hàng ${h.sku}`}>Nhả hàng</Act></td></tr>); })}</tbody></table></div>
    </>
  );
}
