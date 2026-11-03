'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRun } from './Flash';
import { packOrder } from '@/app/actions/admin';

const CHECKLIST_ITEMS = ['Tình trạng tổng thể sạch, không rách, không dính bẩn', 'Cúc đủ và chắc', 'Khóa kéo trơn tru'];

export default function PackPanel({ code }: { code: string }) {
  const { run, pending } = useRun();
  const router = useRouter();
  const [c, setC] = useState([false, false, false]);
  const [carrier, setCarrier] = useState('GHN');
  const [err, setErr] = useState('');
  const tog = (i: number) => setC((prev) => prev.map((x, j) => (j === i ? !x : x)));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <span className="lbl">Kiểm tra trước khi đóng gói</span>
      {CHECKLIST_ITEMS.map((t, i) => <label key={t} style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={c[i]} onChange={() => tog(i)} style={{ width: 22, height: 22, accentColor: '#6B2437' }} />{t}</label>)}
      <div className="row">
        <div className="fl" style={{ maxWidth: 260, flex: '1 1 200px' }}><label className="lbl" htmlFor="out-carrier">Đơn vị vận chuyển</label><select id="out-carrier" className="fld" value={carrier} onChange={(e) => setCarrier(e.target.value)}><option value="GHN">Giao Hàng Nhanh (GHN)</option><option value="GHTK">Giao Hàng Tiết Kiệm (GHTK)</option></select></div>
        <button className="btn" disabled={pending} onClick={async () => { const r = await run(packOrder(code, carrier, c)); if (r.error) setErr(r.error); else { setErr(''); setC([false, false, false]); router.push(`/admin/kho/xuat-kho?label=${code}`); } }}>Đóng gói và trừ kho</button>
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      <span className="note">Chưa kết nối API GHN hoặc GHTK. Mã vận đơn là mã mẫu do hệ thống sinh.</span>
    </div>);
}
