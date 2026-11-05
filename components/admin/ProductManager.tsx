'use client';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useRun, Act } from './Flash';
import { saveProduct, toggleProduct } from '@/app/actions/admin';
import { CATEGORIES, fmt } from '@/lib/util';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { BaseModal } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/layout/Page';

type P = { id: number; name: string; category: string; price: number; salePrice: number | null; material: string; description: string; image: string; active: number; featured: number; isNew: number; stockText: string; warn: boolean };
type Form = { name: string; category: string; price: string; salePrice: string; material: string; description: string; image: string; active: boolean; featured: boolean; isNew: boolean };
const blank: Form = { name: '', category: 'Đầm', price: '', salePrice: '', material: '', description: '', image: '', active: true, featured: false, isNew: false };

/** UC-18 Quản lý sản phẩm: danh sách + Modal Thêm/Sửa (bước 3–5) + Ẩn/Hiện có xác nhận (3a). */
export default function ProductManager({ products, caption, emptyHint, toolbar }: { products: P[]; caption: string; emptyHint?: React.ReactNode; toolbar?: React.ReactNode }) {
  const { run, pending } = useRun();
  const [edit, setEdit] = useState<null | number | 'new'>(null);
  const [f, setF] = useState<Form>(blank);
  const [err, setErr] = useState('');
  const [uploading, setUploading] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const open = useCallback((p?: P) => {
    setErr('');
    if (p) {
      setEdit(p.id);
      setF({ name: p.name, category: p.category, price: String(p.price), salePrice: p.salePrice ? String(p.salePrice) : '', material: p.material, description: p.description, image: p.image || '', active: !!p.active, featured: !!p.featured, isNew: !!p.isNew });
    } else { setEdit('new'); setF(blank); }
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
    const r = await run(saveProduct({ id: typeof edit === 'number' ? edit : undefined, name: f.name, category: f.category, price: parseInt(f.price, 10) || 0, salePrice: f.salePrice ? parseInt(f.salePrice, 10) : null, material: f.material, description: f.description, image: f.image, active: f.active, featured: f.featured, isNew: f.isNew }));
    if (r.error) setErr(r.error); else setEdit(null);
  };

  const columns: Column<P>[] = useMemo(() => [
    { key: 'name', header: 'Sản phẩm', cell: (p) => <b style={{ display: 'inline-block', minWidth: 200 }}>{p.name}</b> },
    { key: 'cat', header: 'Loại', cell: (p) => p.category },
    { key: 'price', header: 'Giá', className: 'nowrap', cell: (p) => (p.salePrice ? <>{fmt(p.salePrice)} <s style={{ color: '#6A6168' }}>{fmt(p.price)}</s></> : fmt(p.price)) },
    { key: 'stock', header: 'Tồn thực tế', cell: (p) => <span style={p.warn ? { color: 'var(--err)', fontWeight: 600 } : undefined}>{p.stockText}</span> },
    { key: 'flags', header: 'Hiển thị', cell: (p) => <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}><StatusBadge domain="product" value={p.active} />{!!p.featured && <span className="badge sand">Nổi bật</span>}{!!p.isNew && <span className="badge pink">Mới</span>}</span> },
    { key: 'act', header: <span className="sr">Thao tác</span>, label: '', className: 'nowrap', cell: (p) => (
      <span style={{ display: 'inline-flex', gap: 8 }}>
        <Button variant="secondary" onClick={() => open(p)} aria-label={`Sửa ${p.name}`}>Sửa</Button>
        <Act action={toggleProduct} args={[p.id]} label={`${p.active ? 'Ẩn' : 'Hiện'} ${p.name}`}
          confirm={p.active
            ? { title: `Ẩn “${p.name}”?`, message: 'Sản phẩm bị ẩn không xuất hiện trên website. Bạn có thể hiện lại bất cứ lúc nào.', confirmLabel: 'Ẩn sản phẩm', tone: 'danger' }
            : { title: `Hiện “${p.name}” trên website?`, confirmLabel: 'Hiện sản phẩm' }}>
          {p.active ? 'Ẩn' : 'Hiện'}
        </Act>
      </span>) },
  ], [open]);

  return (
    <>
      <PageHeader eyebrow="Bán hàng" title="Sản phẩm" description="Quản lý thông tin chung của sản phẩm. Màu, size và tồn kho được tạo ở mục Tồn kho và SKU (UC-21)."
        actions={<Button onClick={() => open()}>Thêm sản phẩm</Button>} />
      {toolbar}

      <DataTable
        rows={products}
        rowKey={(p) => p.id}
        minWidth={820}
        mobile="cards"
        caption={caption}
        empty={{ title: 'Không có sản phẩm phù hợp', description: emptyHint }}
        columns={columns}
      />

      <BaseModal
        open={edit !== null}
        onClose={() => setEdit(null)}
        eyebrow="Sản phẩm"
        title={edit === 'new' ? 'Thêm sản phẩm mới' : 'Sửa sản phẩm'}
        footer={<>
          <Button variant="secondary" size="lg" onClick={() => setEdit(null)}>Hủy</Button>
          <Button type="submit" form="product-form" size="lg" disabled={pending || uploading}>{pending ? 'Đang lưu...' : 'Lưu sản phẩm'}</Button>
        </>}
      >
        <form id="product-form" onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="grid">
            <div className="fl" style={{ gridColumn: '1 / -1' }}><label className="lbl" htmlFor="pe-name">Tên sản phẩm</label><input id="pe-name" className="fld" value={f.name} onChange={set('name')} autoFocus /></div>
            <div className="fl" style={{ gridColumn: '1 / -1' }}><span className="lbl">Ảnh sản phẩm</span>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <Button variant="secondary" onClick={() => imageInput.current?.click()} disabled={uploading}>{uploading ? 'Đang tải ảnh...' : f.image ? 'Đổi ảnh' : 'Tải ảnh'}</Button>
                <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} style={{ display: 'none' }} aria-label="Chọn ảnh sản phẩm" />
                {f.image ? <img src={f.image} alt="Xem trước ảnh sản phẩm" style={{ width: 96, height: 128, objectFit: 'cover', border: '1px solid var(--line)' }} /> : null}
                <span className="note">JPG, PNG hoặc WebP, tối đa 5 MB.</span>
              </div></div>
            <div className="fl"><label className="lbl" htmlFor="pe-cat">Loại</label><select id="pe-cat" className="fld" value={f.category} onChange={(e) => { const category = e.target.value; setF((prev) => ({ ...prev, category })); }}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div className="fl"><label className="lbl" htmlFor="pe-price">Giá bán (đồng)</label><input id="pe-price" type="number" className="fld" value={f.price} onChange={set('price')} /></div>
            <div className="fl"><label className="lbl" htmlFor="pe-sale">Giá khuyến mãi (nếu có)</label><input id="pe-sale" type="number" className="fld" value={f.salePrice} onChange={set('salePrice')} /></div>
            <div className="fl" style={{ gridColumn: '1 / -1' }}><label className="lbl" htmlFor="pe-mat">Chất liệu</label><input id="pe-mat" className="fld" value={f.material} onChange={set('material')} /></div>
            <div className="fl" style={{ gridColumn: '1 / -1' }}><label className="lbl" htmlFor="pe-desc">Mô tả</label><textarea id="pe-desc" className="fld" value={f.description} onChange={set('description')} /></div>
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: 20 }}>
            <legend className="sr">Cờ hiển thị</legend>
            {([['active', 'Đang bán trên website'], ['featured', 'Sản phẩm nổi bật'], ['isNew', 'Bộ sưu tập mới']] as const).map(([k, l]) => <label key={k} style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={f[k]} onChange={setFlag(k)} style={{ width: 22, height: 22, accentColor: '#6B2437' }} />{l}</label>)}
          </fieldset>
          <p className="ui-callout note" style={{ margin: 0 }}>Sản phẩm mới chỉ bán được sau khi nhân viên tạo SKU (màu, size, tồn đầu kỳ) ở mục Tồn kho và SKU. Sản phẩm bị ẩn không hiện trên website.</p>
          {err && <p className="err" role="alert">{err}</p>}
        </form>
      </BaseModal>
    </>
  );
}
