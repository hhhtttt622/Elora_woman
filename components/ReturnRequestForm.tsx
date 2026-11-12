'use client';
import { useState } from 'react';
import { requestReturnAction } from '@/app/actions/shop';

const REASONS = [
  'Sản phẩm bị lỗi / hư hỏng',
  'Sản phẩm không đúng mô tả',
  'Giao sai sản phẩm / màu sắc / size',
  'Muốn đổi sang size khác',
  'Muốn đổi sang màu khác',
  'Không còn nhu cầu sử dụng',
];

export default function ReturnRequestForm({ orderCode, skus }: { orderCode: string; skus: { sku: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [sku, setSku] = useState(skus[0]?.sku || '');
  const [reason, setReason] = useState(REASONS[0]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [pending, setPending] = useState(false);

  if (!open) return <button className="textbtn" onClick={() => setOpen(true)}>Yêu cầu đổi trả</button>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px', background: '#F6EEEF', border: '1px solid var(--line)' }}>
      <b style={{ fontSize: 14 }}>Yêu cầu đổi trả — {orderCode}</b>
      <div className="grid">
        <div className="fl">
          <label className="lbl" htmlFor={`rt-sku-${orderCode}`}>Sản phẩm</label>
          <select id={`rt-sku-${orderCode}`} className="fld" value={sku} onChange={(e) => setSku(e.target.value)}>
            {skus.map((s) => <option key={s.sku} value={s.sku}>{s.name}</option>)}
          </select>
        </div>
        <div className="fl">
          <label className="lbl" htmlFor={`rt-reason-${orderCode}`}>Lý do</label>
          <select id={`rt-reason-${orderCode}`} className="fld" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn" disabled={pending} onClick={async () => {
          setPending(true); setErr(''); setMsg('');
          const r = await requestReturnAction(orderCode, sku, reason);
          setPending(false);
          if (r.ok) { setMsg(r.msg || 'Đã gửi yêu cầu.'); setOpen(false); }
          else setErr(r.error || 'Có lỗi xảy ra.');
        }}>Gửi yêu cầu</button>
        <button className="textbtn" onClick={() => setOpen(false)}>Hủy</button>
      </div>
      {err && <p className="err" role="alert">{err}</p>}
    </div>
  );
}
