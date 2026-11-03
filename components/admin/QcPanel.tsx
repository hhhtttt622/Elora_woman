'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRun } from './Flash';
import { approveQc } from '@/app/actions/admin';
import { sizeText } from '@/lib/util';

export default function QcPanel({ code, title, lines }: { code: string; title: string; lines: { size: string; qty: number }[] }) {
  const { run, pending } = useRun();
  const [v, setV] = useState<Record<string, { recv: string; bad: string }>>(() => Object.fromEntries(lines.map((l) => [l.size, { recv: String(l.qty), bad: '0' }])));
  const [err, setErr] = useState('');
  const upd = (z: string, k: 'recv' | 'bad', val: string) => setV((prev) => ({ ...prev, [z]: { ...prev[z], [k]: val } }));
  return (
    <section className="card" style={{ background: '#F6EEEF' }}><h2 className="h2">Kiểm định khi nhận hàng: {title}</h2>
      <div className="scroll" style={{ background: '#fff' }}><table className="tb" style={{ minWidth: 640 }}>
        <thead><tr><th>Size</th><th>Số lượng đặt</th><th>Số lượng nhận</th><th>Hàng lỗi</th><th>Đạt chuẩn</th></tr></thead>
        <tbody>{lines.map((l) => { const r = parseInt(v[l.size].recv, 10), b = parseInt(v[l.size].bad || '0', 10); return (
          <tr key={l.size}><td><b>{sizeText(l.size)}</b></td><td>{l.qty}</td>
            <td><input aria-label={`Số lượng nhận size ${l.size}`} type="number" className="fld" style={{ maxWidth: 110 }} value={v[l.size].recv} onChange={(e) => upd(l.size, 'recv', e.target.value)} /></td>
            <td><input aria-label={`Hàng lỗi size ${l.size}`} type="number" className="fld" style={{ maxWidth: 110 }} value={v[l.size].bad} onChange={(e) => upd(l.size, 'bad', e.target.value)} /></td>
            <td><b>{r >= 0 && b >= 0 && b <= r ? r - b : '-'}</b></td></tr>); })}</tbody></table></div>
      <span className="note">Hàng đạt chuẩn được cộng vào Kho Online và hiện trên website. Hàng lỗi đường may hoặc sai size được lập phiếu trả xưởng sửa.</span>
      {err && <p className="err" role="alert">{err}</p>}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn" disabled={pending} onClick={async () => { const r = await run(approveQc(code, lines.map((l) => ({ size: l.size, recv: parseInt(v[l.size].recv, 10) || 0, bad: parseInt(v[l.size].bad, 10) || 0 })))); setErr(r.error || ''); }}>Duyệt phiếu nhập kho</button>
        <Link href="/admin/kho/dat-may" className="ghost" style={{ minHeight: 48 }}>Đóng</Link>
      </div></section>);
}
