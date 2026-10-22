'use client';
import { useState } from 'react';
import { useRun } from './Flash';
import { createSku } from '@/app/actions/admin';
import { COLORS, mkSku, sizeText } from '@/lib/util';

export default function SkuForm({ products }: { products: { id: number; name: string; code: string; category: string }[] }) {
  const { run, pending } = useRun();
  const [f, setF] = useState({ pid: String(products[0]?.id || ''), color: 'Be', size: 'M', qty: '', min: '3' });
  const p = products.find((x) => String(x.id) === f.pid);
  const sizes = p?.category === 'Phụ kiện' ? ['FS'] : ['S', 'M', 'L', 'XL'];
  const size = sizes.includes(f.size) ? f.size : sizes[0];
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const [err, setErr] = useState('');
  return (
    <section className="card"><h2 className="h2">Tạo SKU cho biến thể mới</h2>
      <form onSubmit={async (e) => { e.preventDefault(); const r = await run(createSku({ productId: parseInt(f.pid, 10), color: f.color, size, qty: f.qty === '' ? 0 : parseInt(f.qty, 10), min: f.min === '' ? 3 : parseInt(f.min, 10) })); setErr(r.error || ''); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="grid">
          <div className="fl"><label className="lbl" htmlFor="nv-pid">Sản phẩm cha</label><select id="nv-pid" className="fld" value={f.pid} onChange={set('pid')}>{products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
          <div className="fl"><label className="lbl" htmlFor="nv-color">Màu</label><select id="nv-color" className="fld" value={f.color} onChange={set('color')}>{COLORS.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="fl"><label className="lbl" htmlFor="nv-size">Size</label><select id="nv-size" className="fld" value={size} onChange={set('size')}>{sizes.map((z) => <option key={z} value={z}>{sizeText(z)}</option>)}</select></div>
          <div className="fl"><label className="lbl" htmlFor="nv-qty">Tồn đầu kỳ (Kho Online)</label><input id="nv-qty" type="number" className="fld" value={f.qty} onChange={set('qty')} placeholder="0" /></div>
          <div className="fl"><label className="lbl" htmlFor="nv-min">Ngưỡng an toàn</label><input id="nv-min" type="number" className="fld" value={f.min} onChange={set('min')} /></div>
        </div>
        <div className="row"><span style={{ fontSize: 14, padding: '10px 14px', background: '#F6EEEF', border: '1px solid var(--line)' }}>Mã SKU sẽ sinh: <b>{p ? mkSku(p.code, f.color, size) : ''}</b></span><button className="btn" disabled={pending}>Tạo SKU</button></div>
        {err && <p className="err" role="alert">{err}</p>}
        <span className="note">Quy tắc mã: ELR, mã sản phẩm, mã màu, size. Ví dụ ELR-BLZ-BE-M là blazer màu Be size M.</span>
      </form></section>);
}
