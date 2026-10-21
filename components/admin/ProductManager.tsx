'use client';
import { useState } from 'react';
import { useRun, Act } from './Flash';
import { saveProduct, toggleProduct } from '@/app/actions/admin';
import { CATEGORIES, COLORS, fmt, sizesFor, sizeText } from '@/lib/util';

type P = { id: number; name: string; category: string; price: number; salePrice: number | null; material: string; description: string; active: number; featured: number; isNew: number; colors: string[]; sizes: string[]; variantStocks: { color: string; size: string; quantity: number }[]; stockText: string; warn: boolean };
type Form = { name: string; category: string; price: string; salePrice: string; material: string; description: string; active: boolean; featured: boolean; isNew: boolean; colors: string[]; sizes: string[]; quantities: Record<string, string> };
const blank: Form = { name: '', category: 'Đầm', price: '', salePrice: '', material: '', description: '', active: true, featured: false, isNew: false, colors: [], sizes: ['S', 'M', 'L', 'XL'], quantities: {} };
const stockKey = (color: string, size: string) => `${color}::${size}`;

export default function ProductManager({ products }: { products: P[] }) {
  const { run, pending } = useRun();
  const [edit, setEdit] = useState<null | number | 'new'>(null);
  const [f, setF] = useState<Form>(blank);
  const [err, setErr] = useState('');
  const open = (p?: P) => {
    setErr('');
    if (p) {
      setEdit(p.id);
      setF({ name: p.name, category: p.category, price: String(p.price), salePrice: p.salePrice ? String(p.salePrice) : '', material: p.material, description: p.description, active: !!p.active, featured: !!p.featured, isNew: !!p.isNew, colors: p.colors, sizes: p.sizes, quantities: Object.fromEntries(p.variantStocks.map((v) => [stockKey(v.color, v.size), String(v.quantity)])) });
    } else { setEdit('new'); setF(blank); }
  };
  const set = (k: 'name' | 'price' | 'salePrice' | 'material' | 'description') => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const toggle = (key: 'colors' | 'sizes', value: string) => setF({ ...f, [key]: f[key].includes(value) ? f[key].filter((item) => item !== value) : [...f[key], value] });
  const changeCategory = (e: React.ChangeEvent<HTMLSelectElement>) => setF({ ...f, category: e.target.value, sizes: sizesFor(e.target.value) });
  const setFlag = (key: 'active' | 'featured' | 'isNew') => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [key]: e.target.checked });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const variantStocks = f.colors.flatMap((color) => f.sizes.map((size) => ({ color, size, quantity: parseInt(f.quantities[stockKey(color, size)] ?? '0', 10) })));
    const r = await run(saveProduct({ id: typeof edit === 'number' ? edit : undefined, name: f.name, category: f.category, price: parseInt(f.price, 10) || 0, salePrice: f.salePrice ? parseInt(f.salePrice, 10) : null, material: f.material, description: f.description, active: f.active, featured: f.featured, isNew: f.isNew, colors: f.colors, sizes: f.sizes, variantStocks }));
    if (r.error) setErr(r.error); else setEdit(null);
  };
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 14, color: '#3F383D' }}>{products.length} sản phẩm, {products.filter((p) => p.active).length} đang bán</span>
        <button className="btn" onClick={() => open()}>Thêm sản phẩm</button>
      </div>
      {edit !== null && (
        <form onSubmit={save} className="card" style={{ background: '#F6EEEF', gap: 18 }}>
          <h2 className="disp" style={{ fontSize: 30 }}>{edit === 'new' ? 'Thêm sản phẩm mới' : 'Sửa sản phẩm'}</h2>
          <div className="grid">
            <div className="fl" style={{ gridColumn: '1 / -1' }}><label className="lbl" htmlFor="pe-name">Tên sản phẩm</label><input id="pe-name" className="fld" value={f.name} onChange={set('name')} /></div>
            <div className="fl"><label className="lbl" htmlFor="pe-cat">Loại</label><select id="pe-cat" className="fld" value={f.category} onChange={changeCategory}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div className="fl"><label className="lbl" htmlFor="pe-price">Giá bán (đồng)</label><input id="pe-price" type="number" className="fld" value={f.price} onChange={set('price')} /></div>
            <div className="fl"><label className="lbl" htmlFor="pe-sale">Giá khuyến mãi (nếu có)</label><input id="pe-sale" type="number" className="fld" value={f.salePrice} onChange={set('salePrice')} /></div>
            <div className="fl" style={{ gridColumn: '1 / -1' }}><label className="lbl" htmlFor="pe-mat">Chất liệu</label><input id="pe-mat" className="fld" value={f.material} onChange={set('material')} /></div>
            <div className="fl" style={{ gridColumn: '1 / -1' }}><label className="lbl" htmlFor="pe-desc">Mô tả</label><textarea id="pe-desc" className="fld" value={f.description} onChange={set('description')} /></div>
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <legend className="lbl" style={{ marginBottom: 10 }}>Màu sắc</legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {COLORS.map((color) => <label key={color} className="chip" style={{ cursor: 'pointer' }}><input type="checkbox" checked={f.colors.includes(color)} onChange={() => toggle('colors', color)} />{color}</label>)}
            </div>
          </fieldset>
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <legend className="lbl" style={{ marginBottom: 10 }}>Kích cỡ</legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {sizesFor(f.category).map((size) => <label key={size} className="chip" style={{ cursor: 'pointer' }}><input type="checkbox" checked={f.sizes.includes(size)} onChange={() => toggle('sizes', size)} />{sizeText(size)}</label>)}
            </div>
          </fieldset>
          <div className="fl">
            <span className="lbl">Số lượng theo màu và kích cỡ (Kho Online)</span>
            {f.colors.length && f.sizes.length ? <div className="grid">{f.colors.flatMap((color) => f.sizes.map((size) => {
              const key = stockKey(color, size);
              const id = `pe-qty-${f.colors.indexOf(color)}-${f.sizes.indexOf(size)}`;
              return <div className="fl" key={key}><label className="lbl" htmlFor={id}>{color} · {sizeText(size)}</label><input id={id} type="number" min="0" step="1" className="fld" value={f.quantities[key] ?? '0'} onChange={(e) => setF({ ...f, quantities: { ...f.quantities, [key]: e.target.value } })} /></div>;
            }))}</div> : <span className="note">Chọn ít nhất một màu và một kích cỡ để nhập tồn.</span>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
            {([['active', 'Đang bán trên website'], ['featured', 'Sản phẩm nổi bật'], ['isNew', 'Bộ sưu tập mới']] as const).map(([k, l]) => <label key={k} style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={f[k]} onChange={setFlag(k)} style={{ width: 22, height: 22, accentColor: '#6B2437' }} />{l}</label>)}
          </div>
          <span className="note">Mỗi tổ hợp màu/kích cỡ có số lượng riêng ở Kho Online. Khi sửa, số lượng được cập nhật theo giá trị nhập; các SKU cũ không bị xóa nếu bỏ chọn. Không thể giảm tồn xuống thấp hơn số lượng đang được giữ cho đơn hàng.</span>
          {err && <p className="err" role="alert">{err}</p>}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><button className="btn" disabled={pending}>Lưu sản phẩm</button><button type="button" className="ghost" style={{ minHeight: 48 }} onClick={() => setEdit(null)}>Hủy</button></div>
        </form>)}
      <div className="scroll"><table className="tb" style={{ minWidth: 860 }}><caption>Danh sách sản phẩm</caption>
        <thead><tr><th>Sản phẩm</th><th>Loại</th><th>Giá</th><th>Tồn thực tế</th><th>Hiển thị</th><th>Thao tác</th></tr></thead>
        <tbody>{products.map((p) => <tr key={p.id}><td style={{ minWidth: 220 }}><b>{p.name}</b></td><td>{p.category}</td><td style={{ whiteSpace: 'nowrap' }}>{p.salePrice ? <>{fmt(p.salePrice)} <s style={{ color: '#6A6168' }}>{fmt(p.price)}</s></> : fmt(p.price)}</td>
          <td style={p.warn ? { color: 'var(--err)', fontWeight: 600 } : undefined}>{p.stockText}</td>
          <td><span className={'badge' + (p.active ? ' dark' : '')}>{p.active ? 'Đang bán' : 'Đã ẩn'}</span></td>
          <td style={{ whiteSpace: 'nowrap' }}><button className="ghost" onClick={() => open(p)} aria-label={`Sửa ${p.name}`}>Sửa</button> <Act action={toggleProduct} args={[p.id]} label={`${p.active ? 'Ẩn' : 'Hiện'} ${p.name}`}>{p.active ? 'Ẩn' : 'Hiện'}</Act></td></tr>)}</tbody></table></div>
    </>
  );
}
