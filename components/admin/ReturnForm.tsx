'use client';
import { useState } from 'react';
import { useRun } from './Flash';
import { receiveReturn } from '@/app/actions/admin';
import { BaseModal } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

const RETURN_REASONS = ['Đổi size', 'Đổi màu', 'Nghi hàng lỗi', 'Khách không ưng'];

/** UC-33: nút Tạo phiếu đổi trả mở Modal tiếp nhận hàng khách gửi lại. */
export default function ReturnForm({ orders }: { orders: { code: string; label: string; skus: { sku: string; label: string }[] }[] }) {
  const { run, pending } = useRun();
  const [open, setOpen] = useState(false);
  const [o, setO] = useState('');
  const [sku, setSku] = useState('');
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [err, setErr] = useState('');
  const cur = orders.find((x) => x.code === o);
  const useSku = cur?.skus.some((s) => s.sku === sku) ? sku : cur?.skus[0]?.sku || '';
  const start = () => { setO(orders[0]?.code || ''); setSku(''); setReason(RETURN_REASONS[0]); setErr(''); setOpen(true); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await run(receiveReturn(o, useSku, reason));
    setErr(r.error || '');
    if (!r.error) setOpen(false);
  };
  return (
    <>
      <Button onClick={start} disabled={orders.length === 0} title={orders.length === 0 ? 'Chưa có đơn đã giao để đổi trả' : undefined}>Tạo phiếu đổi trả</Button>
      <BaseModal
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Đổi trả"
        title="Tiếp nhận hàng đổi trả"
        footer={<>
          <Button variant="secondary" size="lg" onClick={() => setOpen(false)}>Hủy</Button>
          <Button type="submit" form="return-form" size="lg" disabled={pending || !useSku}>{pending ? 'Đang lưu...' : 'Tiếp nhận hàng'}</Button>
        </>}
      >
        <form id="return-form" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="fl"><label className="lbl" htmlFor="rt-order">Đơn đã giao</label><select id="rt-order" className="fld" value={o} onChange={(e) => setO(e.target.value)} autoFocus>{orders.map((x) => <option key={x.code} value={x.code}>{x.label}</option>)}</select></div>
          <div className="fl"><label className="lbl" htmlFor="rt-sku">Sản phẩm khách gửi</label><select id="rt-sku" className="fld" value={useSku} onChange={(e) => setSku(e.target.value)}>{cur?.skus.map((s) => <option key={s.sku} value={s.sku}>{s.label}</option>)}</select></div>
          <div className="fl"><label className="lbl" htmlFor="rt-reason">Lý do</label><select id="rt-reason" className="fld" value={reason} onChange={(e) => setReason(e.target.value)}>{RETURN_REASONS.map((r) => <option key={r}>{r}</option>)}</select></div>
          <span className="note">Phiếu mới ở trạng thái Chờ kiểm tra. Tồn kho chỉ thay đổi khi xử lý phiếu.</span>
          {err && <p className="err" role="alert">{err}</p>}
        </form>
      </BaseModal>
    </>
  );
}
