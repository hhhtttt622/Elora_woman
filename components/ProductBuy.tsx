'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { COLOR_HEX, sizeText } from '@/lib/util';

type V = { sku: string; color: string; size: string; available: number };
type P = { id: number; slug: string; name: string; price: number; tone: string };
const ORDER = ['S', 'M', 'L', 'XL', 'FS'];

export default function ProductBuy({ p, variants, advice }: { p: P; variants: V[]; advice: string }) {
  const { add } = useCart();
  const router = useRouter();
  const colors = [...new Set(variants.map((v) => v.color))];
  const sizes = [...new Set(variants.map((v) => v.size))].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  const [color, setColor] = useState(colors.find((c) => variants.some((v) => v.color === c && v.available > 0)) || colors[0]);
  // UC-06 luồng 2a: khách có số đo thì chọn sẵn size gợi ý nếu còn hàng
  const [size, setSize] = useState(() => (advice && variants.some((v) => v.color === color && v.size === advice && v.available > 0) ? advice : ''));
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const cur = useMemo(() => variants.find((v) => v.color === color && v.size === size), [variants, color, size]);
  const avail = (s: string) => variants.find((v) => v.color === color && v.size === s)?.available ?? 0;

  const doAdd = (go: boolean) => {
    setMsg(''); setErr('');
    if (!size) { setErr('Chọn kích thước trước khi thêm vào giỏ.'); return; }
    if (!cur || cur.available < 1) { setErr('Phiên bản này đã hết hàng.'); return; }
    add({ sku: cur.sku, productId: p.id, slug: p.slug, name: p.name, color, size, price: p.price, tone: p.tone });
    if (go) router.push('/gio-hang'); else setMsg('Đã thêm vào giỏ hàng.');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div><div className="lbl" style={{ marginBottom: 10 }}>Màu sắc: {color}</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {colors.map((c) => <button key={c} type="button" aria-label={c} aria-pressed={c === color} onClick={() => { setColor(c); setSize(''); setErr(''); }} className="sw" style={{ width: 40, height: 40, background: COLOR_HEX[c], outline: c === color ? '2px solid #6B2437' : 'none', outlineOffset: 3, cursor: 'pointer' }} />)}
        </div></div>
      <div><div className="lbl" style={{ marginBottom: 10 }}>Kích thước{advice && <span style={{ fontWeight: 400, color: '#6B2437' }}> · gợi ý cho bạn: size {advice}</span>}</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {sizes.map((s) => <button key={s} type="button" className="pill" aria-pressed={size === s} disabled={avail(s) < 1} onClick={() => { setSize(s); setErr(''); }}>{sizeText(s)}</button>)}
        </div>
        {size && cur && <p className="note" style={{ marginTop: 8 }}>{cur.available <= 3 ? `Chỉ còn ${cur.available} sản phẩm` : 'Còn hàng'} · Mã {cur.sku}</p>}</div>
      {err && <p className="err" role="alert">{err}</p>}
      {msg && <p className="ok" role="status">{msg}</p>}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn" type="button" onClick={() => doAdd(false)}>Thêm vào giỏ hàng</button>
        <button className="ghost" type="button" style={{ minHeight: 48 }} onClick={() => doAdd(true)}>Mua ngay</button>
      </div>
    </div>
  );
}
