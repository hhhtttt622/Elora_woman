'use client';
import { useState } from 'react';
import { useRun } from './Flash';
import { requestReturn } from '@/app/actions/admin';

// Tạo yêu cầu đổi trả cho đơn đã giao. Phiếu khởi tạo ở trạng thái "Chờ nhận hàng",
// kho bấm "Xác nhận đã nhận hàng" khi hàng gửi trả về tới nơi rồi mới kiểm định. (Huyền Yan)
export default function ReturnRequestForm({ orders }: { orders: { code: string; label: string; skus: { sku: string; label: string }[] }[] }) {
  const { run, pending } = useRun();
  const [o, setO] = useState(orders[0]?.code || '');
  const cur = orders.find((x) => x.code === o);
  const [sku, setSku] = useState('');
  const [reason, setReason] = useState('Đổi size');
  const [err, setErr] = useState('');
  const useSku = cur?.skus.some((s) => s.sku === sku) ? sku : cur?.skus[0]?.sku || '';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="grid">
        <div className="fl"><label className="lbl" htmlFor="rq-order">Đơn đã giao</label><select id="rq-order" className="fld" value={o} onChange={(e) => setO(e.target.value)}>{orders.map((x) => <option key={x.code} value={x.code}>{x.label}</option>)}</select></div>
        <div className="fl"><label className="lbl" htmlFor="rq-sku">Sản phẩm khách gửi</label><select id="rq-sku" className="fld" value={useSku} onChange={(e) => setSku(e.target.value)}>{cur?.skus.map((s) => <option key={s.sku} value={s.sku}>{s.label}</option>)}</select></div>
        <div className="fl"><label className="lbl" htmlFor="rq-reason">Lý do</label><select id="rq-reason" className="fld" value={reason} onChange={(e) => setReason(e.target.value)}>{['Đổi size', 'Đổi màu', 'Nghi hàng lỗi', 'Khách không ưng'].map((r) => <option key={r}>{r}</option>)}</select></div>
      </div>
      <div className="row"><button className="btn" disabled={pending || !useSku} onClick={async () => { const r = await run(requestReturn(o, useSku, reason)); setErr(r.error || ''); }}>Tạo yêu cầu đổi trả</button></div>
      {err && <p className="err" role="alert">{err}</p>}
    </div>);
}
