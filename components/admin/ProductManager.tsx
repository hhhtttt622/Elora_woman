'use client';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useRun, Act } from './Flash';
import { saveProduct, toggleProduct } from '@/app/actions/admin';
import { CATEGORIES, fmt } from '@/lib/util';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { BaseModal } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/Page';

type P = { id: number; name: string; category: string; price: number; salePrice: number | null; material: string; collection: string; description: string; image: string; active: number; featured: number; isNew: number; stockText: string; warn: boolean; relatedIds: number[] };
type C = { id: number; slug: string; name: string; category: string; sku: string; price: number; image: string };
type Form = { name: string; category: string; price: string; salePrice: string; material: string; collection: string; description: string; image: string; active: boolean; featured: boolean; isNew: boolean };
const blank: Form = { name: '', category: 'Đầm', price: '', salePrice: '', material: '', collection: '', description: '', image: '', active: true, featured: false, isNew: false };

/** UC-18 Quản lý sản phẩm: danh sách + Modal Thêm/Sửa (bước 3–5) + Ẩn/Hiện có xác nhận (3a). */
export default function ProductManager({ products, catalog, caption, emptyHint, toolbar }: { products: P[]; catalog: C[]; caption: string; emptyHint?: React.ReactNode; toolbar?: React.ReactNode }) {
  const { run, pending } = useRun();
  const [edit, setEdit] = useState<null | number | 'new'>(null);
  const [f, setF] = useState<Form>(blank);
  const [err, setErr] = useState('');
  const [uploading, setUploading] = useState(false);
  const [relatedIds, setRelatedIds] = useState<number[]>([]);
  const [relatedSearch, setRelatedSearch] = useState('');
  const [relatedCategory, setRelatedCategory] = useState('');
  const imageInput = useRef<HTMLInputElement>(null);
  const open = useCallback((p?: P) => {
    setErr('');
    if (p) {
      setEdit(p.id);
      setF({ name: p.name, category: p.category, price: String(p.price), salePrice: p.salePrice ? String(p.salePrice) : '', material: p.material, collection: p.collection || '', description: p.description, image: p.image || '', active: !!p.active, featured: !!p.featured, isNew: !!p.isNew });
      setRelatedIds(p.relatedIds || []);
    } else { setEdit('new'); setF(blank); setRelatedIds([]); }
  }, []);
  const set = (k: 'name' | 'price' | 'salePrice' | 'material' | 'description') => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((prev) => ({ ...prev, [k]: e.target.value }));
  const setFlag = (key: 'active' | 'featured' | 'isNew') => (e: React.ChangeEvent<HTMLInputElement>) => setF((prev) => ({ ...prev, [key]: e.target.checked }));
  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErr('');
    const body = new FormData();
    body.set('file', file);
    setUploading(true);
    try {
      const response = await fetch('/api/admin/product-image', { method: 'POST', body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Không thể tải ảnh lên.');
      setF((prev) => ({ ...prev, image: result.url }));
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Không thể tải ảnh lên.');
    } finally {
      setUploading(false);
    }
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await run(saveProduct({ id: typeof edit === 'number' ? edit : undefined, name: f.name, category: f.category, price: parseInt(f.price, 10) || 0, salePrice: f.salePrice ? parseInt(f.salePrice, 10) : null, material: f.material, collection: f.collection, description: f.description, image: f.image, active: f.active, featured: f.featured, isNew: f.isNew, relatedIds }));
    if (r.error) setErr(r.error); else setEdit(null);
  };

  const columns: Column<P>[] = useMemo(() => [
    { key: 'name', header: 'Sản phẩm', cell: (p) => <span className="product-name-cell">{p.image ? <img className="product-thumb" src={p.image} alt="" loading="lazy" /> : <span className="product-thumb product-thumb-empty" aria-hidden="true">E</span>}<b>{p.name}</b></span> },
    { key: 'cat', header: 'Loại', cell: (p) => p.category },
    { key: 'price', header: 'Giá', className: 'nowrap', cell: (p) => (p.salePrice ? <>{fmt(p.salePrice)} <s style={{ color: '#6A6168' }}>{fmt(p.price)}</s></> : fmt(p.price)) },
    { key: 'stock', header: 'Tồn thực tế', cell: (p) => <span style={p.warn ? { color: 'var(--err)', fontWeight: 600 } : undefined}>{p.stockText}</span> },
    { key: 'flags', header: 'Hiển thị', cell: (p) => <span className="product-badges"><span className={`product-badge ${p.active ? 'product-badge-active' : 'product-badge-hidden'}`}>{p.active ? 'Đang bán' : 'Đã ẩn'}</span>{!!p.isNew && <span className="product-badge product-badge-new">Mới</span>}{!!p.featured && <span className="product-badge product-badge-featured">Nổi bật</span>}</span> },
    {
      key: 'act', header: <span className="sr">Thao tác</span>, label: '', className: 'nowrap', cell: (p) => (
        <span className="product-actions">
          <Button variant="secondary" size="sm" className="product-action-btn" onClick={() => open(p)} aria-label={`Sửa ${p.name}`}><svg aria-hidden="true" viewBox="0 0 20 20" width="15" height="15" fill="none"><path d="m12.8 3.2 4 4M3 17l3.6-.8L16.5 6.3a1.4 1.4 0 0 0-2-2L4.6 14.2 3 17Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>Sửa</Button>
          <Act action={toggleProduct} args={[p.id]} label={`${p.active ? 'Ẩn' : 'Hiện'} ${p.name}`}
            variant="secondary" size="sm"
            confirm={p.active
              ? { title: `Ẩn “${p.name}”?`, message: 'Sản phẩm bị ẩn không xuất hiện trên website. Bạn có thể hiện lại bất cứ lúc nào.', confirmLabel: 'Ẩn sản phẩm', tone: 'danger' }
              : { title: `Hiện “${p.name}” trên website?`, confirmLabel: 'Hiện sản phẩm' }}>
            <svg aria-hidden="true" viewBox="0 0 20 20" width="15" height="15" fill="none"><path d={p.active ? 'M2.8 10s2.5-4.5 7.2-4.5 7.2 4.5 7.2 4.5-2.5 4.5-7.2 4.5S2.8 10 2.8 10Z' : 'M3 10a7 7 0 0 1 12.2-4.7M17 10a7 7 0 0 1-12.2 4.7M12 3h4v4M8 17H4v-4'} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />{p.active && <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.4" />}</svg>{p.active ? 'Ẩn' : 'Hiện'}
          </Act>
        </span>)
    },
  ], [open]);

  return (
    <>
      <PageHeader eyebrow="Bán hàng" title="Sản phẩm" description="Quản lý thông tin chung của sản phẩm. Màu, size và tồn kho được tạo ở mục Tồn kho và SKU."
        actions={<Button onClick={() => open()}>Thêm sản phẩm</Button>} />
      {toolbar}

      <div className="product-table-card"><DataTable
        rows={products}
        rowKey={(p) => p.id}
        minWidth={1040}
        mobile="cards"
        caption={caption}
        empty={{ title: 'Không có sản phẩm phù hợp', description: emptyHint }}
        columns={columns}
      />
      </div>

      <BaseModal
        open={edit !== null}
        onClose={() => setEdit(null)}
        eyebrow="Sản phẩm"
        title={edit === 'new' ? 'Thêm sản phẩm mới' : 'Sửa sản phẩm'}
        size="lg"
        className="product-edit-modal"
        footer={<>
          <Button variant="secondary" size="lg" onClick={() => setEdit(null)}>Hủy</Button>
          <Button type="submit" form="product-form" size="lg" disabled={pending || uploading}>{pending ? 'Đang lưu...' : 'Lưu sản phẩm'}</Button>
        </>}
      >
        <form id="product-form" onSubmit={save} className="product-edit-form">
          <section className="product-edit-column product-core-column" aria-labelledby="pe-basic-title">
            <h3 className="product-edit-section-title" id="pe-basic-title">Thông tin cơ bản</h3>
            <div className="fl"><label className="lbl" htmlFor="pe-name">Tên sản phẩm</label><input id="pe-name" className="fld" value={f.name} onChange={set('name')} autoFocus /></div>
            <div className="fl"><span className="lbl">Ảnh sản phẩm</span>
              <div className="product-image-edit">
                <Button variant="secondary" onClick={() => imageInput.current?.click()} disabled={uploading}>{uploading ? 'Đang tải ảnh...' : f.image ? 'Đổi ảnh' : 'Tải ảnh'}</Button>
                <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} style={{ display: 'none' }} aria-label="Chọn ảnh sản phẩm" />
                {f.image ? <img src={f.image} alt="Xem trước ảnh sản phẩm" /> : <span className="product-image-empty">Chưa có ảnh</span>}
                <span className="note">JPG, PNG hoặc WebP, tối đa 5 MB.</span>
              </div>
            </div>
            <div className="product-core-fields">
              <div className="fl"><label className="lbl" htmlFor="pe-cat">Loại sản phẩm</label><select id="pe-cat" className="fld" value={f.category} onChange={(e) => { const category = e.target.value; setF((prev) => ({ ...prev, category })); }}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div className="fl"><label className="lbl" htmlFor="pe-price">Giá bán (đồng)</label><input id="pe-price" type="number" className="fld" value={f.price} onChange={set('price')} /></div>
              <div className="fl"><label className="lbl" htmlFor="pe-sale">Giá khuyến mãi (nếu có)</label><input id="pe-sale" type="number" className="fld" value={f.salePrice} onChange={set('salePrice')} /></div>
              <div className="fl"><label className="lbl" htmlFor="pe-mat">Chất liệu</label><input id="pe-mat" className="fld" value={f.material} onChange={set('material')} /></div>
              <div className="fl product-core-wide"><label className="lbl" htmlFor="pe-collection">Bộ sưu tập / thương hiệu</label><input id="pe-collection" className="fld" value={f.collection} onChange={(e) => setF((prev) => ({ ...prev, collection: e.target.value }))} placeholder="Ví dụ: Office Essentials" /></div>
              <div className="fl product-core-wide"><label className="lbl" htmlFor="pe-desc">Mô tả sản phẩm</label><textarea id="pe-desc" className="fld product-description-field" value={f.description} onChange={set('description')} /></div>
            </div>
            <fieldset className="product-visibility-flags">
              <legend className="lbl">Cờ hiển thị</legend>
              {([['active', 'Đang bán'], ['featured', 'Nổi bật'], ['isNew', 'Mới']] as const).map(([k, l]) => <label key={k}><input type="checkbox" checked={f[k]} onChange={setFlag(k)} />{l}</label>)}
            </fieldset>
            <p className="ui-callout note product-edit-callout">Sản phẩm mới chỉ bán được sau khi nhân viên tạo SKU (màu, size, tồn đầu kỳ) ở mục Tồn kho và SKU. Sản phẩm bị ẩn không hiện trên website.</p>
          </section>

          <section className="product-edit-column product-related-column" aria-labelledby="pe-related-title">
            <div className="product-related-heading"><div><span className="eb">Danh mục phối đồ</span><h3 id="pe-related-title">Sản phẩm đi kèm</h3></div><span className="product-related-count">{relatedIds.length} đã chọn</span></div>
            <div className="product-related-filters">
              <input className="fld" aria-label="Tìm sản phẩm đi kèm" placeholder="Tìm theo tên hoặc SKU" value={relatedSearch} onChange={(e) => setRelatedSearch(e.target.value)} />
              <select className="fld" aria-label="Lọc theo danh mục" value={relatedCategory} onChange={(e) => setRelatedCategory(e.target.value)}><option value="">Mọi danh mục</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            </div>
            <div className="product-related-list">
              {catalog.filter((c) => c.id !== edit && (!relatedCategory || c.category === relatedCategory) && (!relatedSearch || `${c.name} ${c.sku}`.toLocaleLowerCase('vi').includes(relatedSearch.toLocaleLowerCase('vi')))).map((c) => {
                const selected = relatedIds.includes(c.id);
                const skuList = c.sku.split(/\s+/).filter(Boolean);
                return <article key={c.id} className={`product-related-card${selected ? ' selected' : ''}`}>
                  <label className="product-related-main">
                    <input type="checkbox" checked={selected} onChange={(e) => setRelatedIds((ids) => e.target.checked ? [...ids, c.id] : ids.filter((id) => id !== c.id))} />
                    {c.image ? <img src={c.image} alt="" loading="lazy" /> : <span className="product-related-thumb-empty" aria-hidden="true">E</span>}
                    <span className="product-related-info"><b>{c.name}</b><small>{c.category} · {fmt(c.price)}</small></span>
                  </label>
                  <details className="product-related-skus">
                    <summary>{skuList.length ? `${skuList.length} SKU` : 'Chưa có SKU'}</summary>
                    {skuList.length > 0 && <span className="product-sku-chips">{skuList.map((sku) => <span key={sku}>SKU: {sku}</span>)}</span>}
                  </details>
                </article>;
              })}
            </div>
            {relatedIds.length > 0 && <div className="product-related-order"><b>Thứ tự hiển thị</b><ol>{relatedIds.map((id, i) => { const c = catalog.find((x) => x.id === id); if (!c) return null; return <li key={id}><span>{c.name}</span><span className="product-order-actions"><a className="textbtn" target="_blank" rel="noreferrer" href={`/san-pham/${c.slug}`}>Xem trước</a><button type="button" className="textbtn" aria-label={`Đưa ${c.name} lên`} disabled={i === 0} onClick={() => setRelatedIds((ids) => { const a = [...ids];[a[i - 1], a[i]] = [a[i], a[i - 1]]; return a; })}>↑</button><button type="button" className="textbtn" aria-label={`Đưa ${c.name} xuống`} disabled={i === relatedIds.length - 1} onClick={() => setRelatedIds((ids) => { const a = [...ids];[a[i], a[i + 1]] = [a[i + 1], a[i]]; return a; })}>↓</button></span></li>; })}</ol></div>}
            <p className="note">Tìm theo tên hoặc SKU, mở chip SKU để xem chi tiết. Giá và tồn kho luôn lấy từ danh mục hiện tại.</p>
          </section>
          {err && <p className="err product-edit-error" role="alert">{err}</p>}
        </form>
      </BaseModal>
    </>
  );
}
