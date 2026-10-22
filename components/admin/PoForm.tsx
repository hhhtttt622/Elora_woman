'use client';
import { useState } from 'react';
import { useRun } from './Flash';
import { createPo } from '@/app/actions/admin';
import { COLORS, fmt, sizeText } from '@/lib/util';

export default function PoForm({ products, init }: { products: { id: number; name: string; category: string }[]; init: { pid: string; color: string; size: string } }) {
  const { run, pending } = useRun();
  const [f, setF] = useState({ workshop: '', pid: init.pid || String(products[0]?.id), color: init.color || 'Be', cost: '', due: '' });
  const [qty, setQty] = useState<Record<string, string>>(init.size ? { [init.size]: '10' } : {});
  const [err, setErr] = useState('');
  const p = products.find((x) => String(x.id) === f.pid);
  const sizes = p?.category === 'Phụ kiện' ? ['FS'] : ['S', 'M', 'L', 'XL'];
  const total = sizes.reduce((n, z) => n + (parseInt(qty[z], 10) > 0 ? parseInt(qty[z], 10) : 0), 0);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  return (
    <section className="card"><h2 className="h2">Tạo phiếu gửi nhà may</h2>
      <form onSubmit={async (e) => { e.preventDefault(); const lines: Record<string, number> = {}; sizes.forEach((z) => { const n = parseInt(qty[z], 10); if (n > 0) lines[z] = n; });
        const r = await run(createPo({ workshop: f.workshop, productId: parseInt(f.pid, 10), color: f.color, cost: parseInt(f.cost, 10) || 0, due: f.due, lines })); setErr(r.error || ''); if (r.ok) { setQty({}); setF({ ...f, workshop: '', cost: '', due: '' }); } }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="grid">
          <div className="fl"><label className="lbl" htmlFor="po-ws">Xưởng may</label><input id="po-ws" className="fld" value={f.workshop} onChange={set('workshop')} placeholder="Tên xưởng" /></div>
          <div className="fl"><label className="lbl" htmlFor="po-pid">Mẫu thiết kế (sản phẩm)</label><select id="po-pid" className="fld" value={f.pid} onChange={(e) => { setF({ ...f, pid: e.target.value }); setQty({}); }}>{products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
          <div className="fl"><label className="lbl" htmlFor="po-color">Màu</label><select id="po-color" className="fld" value={f.color} onChange={set('color')}>{COLORS.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="fl"><label className="lbl" htmlFor="po-cost">Đơn giá gia công (đồng)</label><input id="po-cost" type="number" className="fld" value={f.cost} onChange={set('cost')} /></div>
          <div className="fl"><label className="lbl" htmlFor="po-due">Ngày hẹn giao</label><input id="po-due" className="fld" value={f.due} onChange={set('due')} placeholder="ngày/tháng/năm" /></div>
        </div>
        <span className="lbl">Số lượng theo size</span>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))' }}>{sizes.map((z) => <div key={z} className="fl"><label className="lbl" htmlFor={`poq-${z}`} style={{ fontWeight: 500 }}>Size {sizeText(z)}</label><input id={`poq-${z}`} type="number" className="fld" value={qty[z] || ''} onChange={(e) => setQty({ ...qty, [z]: e.target.value })} placeholder="0" /></div>)}</div>
        <div className="row"><span style={{ fontSize: 14, padding: '10px 14px', background: '#F6EEEF', border: '1px solid var(--line)' }}>Tổng {total} sản phẩm, chi phí gia công {fmt(total * (parseInt(f.cost, 10) || 0))}</span><button className="btn" disabled={pending}>Gửi phiếu cho xưởng</button></div>
        {err && <p className="err" role="alert">{err}</p>}
      </form></section>);
}
