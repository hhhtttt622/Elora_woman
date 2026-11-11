'use client';
import { useState } from 'react';
import { useRun } from './Flash';
import { createSku } from '@/app/actions/admin';
import { COLORS, mkSku, sizeText } from '@/lib/util';
import { BaseModal } from '@/components/ui/Dialog';

const SIZES_ACCESSORY = ['FS'];
const SIZES_STANDARD = ['S', 'M', 'L', 'XL'];

export default function SkuForm({ products, open, onClose }: { products: { id: number; name: string; code: string; category: string }[]; open: boolean; onClose: () => void }) {
  const { run, pending } = useRun();
  const [f, setF] = useState({ pid: String(products[0]?.id || ''), color: 'Be', size: 'M', qty: '', min: '3' });
  const p = products.find((x) => String(x.id) === f.pid);
  const sizes = p?.category === 'Phụ kiện' ? SIZES_ACCESSORY : SIZES_STANDARD;
  const size = sizes.includes(f.size) ? f.size : sizes[0];
  const set = (k: string) => (e: any) => setF((prev) => ({ ...prev, [k]: e.target.value }));
  const [err, setErr] = useState('');
  return (
    <BaseModal open={open} onClose={onClose} eyebrow="Quản lý kho" title="Tạo SKU mới" size="md" footer={<><button className="ghost" type="button" onClick={onClose}>Đóng</button><button className="btn" type="submit" form="sku-create-form" disabled={pending || !products.length}>{pending ? 'Đang tạo…' : 'Tạo SKU'}</button></>}>
      <form id="sku-create-form" onSubmit={async (e) => { e.preventDefault(); const r = await run(createSku({ productId: parseInt(f.pid, 10), color: f.color, size, qty: f.qty === '' ? 0 : parseInt(f.qty, 10), min: f.min === '' ? 3 : parseInt(f.min, 10) })); setErr(r.error || ''); if (!r.error) { setF({ pid: String(products[0]?.id || ''), color: 'Be', size: 'M', qty: '', min: '3' }); onClose(); } }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!products.length && <p className="note">Cần tạo sản phẩm trước khi thêm SKU.</p>}
        <div className="grid">
          <div className="fl"><label className="lbl" htmlFor="nv-pid">Sản phẩm cha</label><select id="nv-pid" className="fld" value={f.pid} onChange={set('pid')}>{products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
          <div className="fl"><label className="lbl" htmlFor="nv-color">Màu</label><select id="nv-color" className="fld" value={f.color} onChange={set('color')}>{COLORS.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="fl"><label className="lbl" htmlFor="nv-size">Size</label><select id="nv-size" className="fld" value={size} onChange={set('size')}>{sizes.map((z) => <option key={z} value={z}>{sizeText(z)}</option>)}</select></div>
          <div className="fl"><label className="lbl" htmlFor="nv-qty">Tồn đầu kỳ (Kho Online)</label><input id="nv-qty" type="number" className="fld" value={f.qty} onChange={set('qty')} placeholder="0" /></div>
          <div className="fl"><label className="lbl" htmlFor="nv-min">Ngưỡng an toàn</label><input id="nv-min" type="number" className="fld" value={f.min} onChange={set('min')} /></div>
        </div>
        <div className="stock-sku-preview"><span className="note">Mã SKU được tạo tự động</span><b>{p ? mkSku(p.code, f.color, size) : '—'}</b></div>
        {err && <p className="err" role="alert">{err}</p>}
        <span className="note">Quy tắc mã: ELR, mã sản phẩm, mã màu, size. Ví dụ ELR-BLZ-BE-M là blazer màu Be size M.</span>
      </form>
    </BaseModal>);
}
