'use client';
import { useState } from 'react';
import { useRun } from '../Flash';
import { useConfirm } from '@/components/ui/Confirm';
import { setOrderStatus } from '@/app/actions/admin';
import { ORDER_STATUS } from '@/lib/util';

/**
 * UC-17 bước 5–6: nhân viên chọn trạng thái mới và bấm Lưu.
 * Việc chuyển hợp lệ do server kiểm tra (ngoại lệ 6a–6c hiện bằng Toast lỗi).
 */
export default function OrderStatusForm({ code, status }: { code: string; status: number }) {
  const { run, pending } = useRun();
  const confirm = useConfirm();
  const [v, setV] = useState(status);
  // Trạng thái đổi sau router.refresh(): đặt lại lựa chọn ngay trong lúc render, không cần effect (tránh một lần render thừa).
  const [prevStatus, setPrevStatus] = useState(status);
  if (prevStatus !== status) { setPrevStatus(status); setV(status); }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (v === status) return;
    const ok = await confirm({ title: `Chuyển đơn ${code} sang “${ORDER_STATUS[v]}”?`, message: `Trạng thái hiện tại: ${ORDER_STATUS[status]}.`, confirmLabel: 'Lưu trạng thái' });
    if (ok) run(setOrderStatus(code, v));
  };
  return (
    <form onSubmit={submit} className="row">
      <div className="fl" style={{ flex: '1 1 220px', maxWidth: 300 }}>
        <label className="lbl" htmlFor={`os-${code}`}>Trạng thái mới</label>
        <select id={`os-${code}`} className="fld" value={v} disabled={pending} onChange={(e) => setV(parseInt(e.target.value, 10))}>
          {ORDER_STATUS.map((s, i) => <option key={s} value={i}>{s}{i === status ? ' (hiện tại)' : ''}</option>)}
        </select>
      </div>
      <button className="btn" disabled={pending || v === status} style={{ minHeight: 44 }}>Lưu trạng thái</button>
    </form>
  );
}
