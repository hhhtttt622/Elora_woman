'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { fmt, sizeText } from '@/lib/util';

type V = { sku: string; color: string; size: string; available: number; price: number };
type P = { id: number; slug: string; name: string; category: string; price: number; image: string; tone: string; variants: V[] };
export default function OutfitBundle({ products }: { products: P[] }) {
  const { add } = useCart(); const [selected, setSelected] = useState<number[]>(products.length ? [products[0].id] : []);
  const [choices, setChoices] = useState<Record<number, { color: string; size: string }>>({}); const [message, setMessage] = useState('');
  const total = useMemo(() => products.filter((p) => selected.includes(p.id)).reduce((sum, p) => { const v=p.variants.find((x)=>x.color===choices[p.id]?.color&&x.size===choices[p.id]?.size); return sum+(v?.price||p.price); }, 0), [products, selected, choices]);
  const choose = (p: P, key: 'color'|'size', value: string) => setChoices((prev) => ({ ...prev, [p.id]: { color: key === 'color' ? value : prev[p.id]?.color || '', size: key === 'size' ? value : '' } }));
  const addAll = () => {
    const picked = products.filter((p) => selected.includes(p.id)).map((p) => {
      const color = choices[p.id]?.color || '';
      const size = choices[p.id]?.size || '';
      return { p, v: p.variants.find((v) => v.color === color && v.size === size && v.available > 0) };
    });
    if (!picked.length) { setMessage('Chọn ít nhất một sản phẩm trong bộ.'); return; }
    const missing = picked.find((x) => !x.v);
    if (missing) { setMessage(`Chọn màu và kích thước còn hàng cho ${missing.p.name}.`); return; }
    for (const { p, v } of picked) add({ sku: v!.sku, productId: p.id, slug: p.slug, name: p.name, color: v!.color, size: v!.size, price: v!.price, tone: p.tone });
    setMessage(`Đã thêm ${picked.length} sản phẩm vào giỏ. Giá được xác nhận lại khi thanh toán.`);
  };
  if (!products.length) return null;
  return <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div><span className="eb">Gợi ý từ đội ngũ ELORA</span><h2 className="disp" style={{ fontSize: 34, margin: '6px 0' }}>ELORA gợi ý phối đồ cho bạn</h2></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 14 }}>
      {products.map((p) => {
        const colors = [...new Set(p.variants.map((v) => v.color))];
        const color = choices[p.id]?.color || '';
        const sizes = [...new Set(p.variants.filter((v) => v.color === color && v.available > 0).map((v) => v.size))];
        return <article key={p.id} className="card" style={{ padding: 12, gap: 10 }}>
          {p.image ? <img src={p.image} alt={p.name} style={{ width: '100%', height: 190, objectFit: 'cover' }} /> : <div style={{ height: 190, background: p.tone }} />}
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={selected.includes(p.id)} onChange={(e) => setSelected((ids) => e.target.checked ? [...ids, p.id] : ids.filter((id) => id !== p.id))} /><b>{p.name}</b></label>
          <span className="note">{p.category}</span><b>{fmt(p.variants.find((v)=>v.color===color&&v.size===choices[p.id]?.size)?.price||p.price)}</b>
          <div className="grid" style={{ gap: 8 }}><label className="fl"><span className="lbl">Màu</span><select className="fld" value={color} onChange={(e) => choose(p, 'color', e.target.value)}><option value="">Chọn màu</option>{colors.map((c) => <option key={c}>{c}</option>)}</select></label><label className="fl"><span className="lbl">Kích thước</span><select className="fld" value={choices[p.id]?.size || ''} onChange={(e) => choose(p, 'size', e.target.value)}><option value="">Chọn size</option>{sizes.map((s) => <option key={s} value={s}>{sizeText(s)}</option>)}</select></label></div>
          <Link href={`/san-pham/${p.slug}`} className="textbtn">Xem chi tiết</Link>
        </article>;
      })}
    </div>
    <div className="card" style={{ background: '#F6EEEF', display: 'flex', alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' }}><span>Tổng các món đã chọn <b>{fmt(total)}</b></span><button className="btn" type="button" onClick={addAll}>Mua trọn bộ outfit</button></div>
    {message && <p className="note" role="status">{message}</p>}
  </section>;
}
