import Link from 'next/link';
import { allProducts, filterProducts, Filters } from '@/lib/shop';
import { ProductCard } from '@/components/Shop';
import { CATEGORIES, COLORS, fmt } from '@/lib/util';
export const dynamic = 'force-dynamic';

const FILTER_SIZES = ['S', 'M', 'L', 'XL', 'FS'] as const;
const MAX_PRICES = [600000, 1000000, 1500000, 2000000] as const;

export default function Catalog({ searchParams }: { searchParams: Filters }) {
  const list = filterProducts(allProducts(), searchParams);
  const f = searchParams;
  const active = Object.values(f).some(Boolean);
  return (
    <div className="wrap" style={{ paddingTop: 48, display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'flex-start' }}>
      <form method="get" style={{ flex: '0 0 250px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <h2 className="h2">Tìm và lọc</h2>
        <div className="fl"><label className="lbl" htmlFor="q">Tìm kiếm</label><input id="q" name="q" className="fld" defaultValue={f.q} placeholder="Ví dụ: blazer" /></div>
        <div className="fl"><label className="lbl" htmlFor="cat">Loại sản phẩm</label>
          <select id="cat" name="cat" className="fld" defaultValue={f.cat || ''}><option value="">Tất cả</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="fl"><label className="lbl" htmlFor="size">Kích thước</label>
          <select id="size" name="size" className="fld" defaultValue={f.size || ''}><option value="">Tất cả</option>{FILTER_SIZES.map((c) => <option key={c} value={c}>{c === 'FS' ? 'Free size' : c}</option>)}</select></div>
        <div className="fl"><label className="lbl" htmlFor="color">Màu sắc</label>
          <select id="color" name="color" className="fld" defaultValue={f.color || ''}><option value="">Tất cả</option>{COLORS.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="fl"><label className="lbl" htmlFor="max">Giá tối đa</label>
          <select id="max" name="max" className="fld" defaultValue={f.max || ''}><option value="">Không giới hạn</option>{MAX_PRICES.map((v) => <option key={v} value={v}>Đến {fmt(v)}</option>)}</select></div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" name="sale" value="1" defaultChecked={!!f.sale} style={{ width: 20, height: 20, accentColor: '#6B2437' }} />Chỉ hàng khuyến mãi</label>
        <button className="btn">Áp dụng</button>
        {active && <Link href="/san-pham" className="textbtn" style={{ display: 'inline-flex', alignItems: 'center' }}>Xóa bộ lọc</Link>}
      </form>
      <section style={{ flex: '1 1 600px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div><span className="eb">Danh mục</span><h1 className="disp" style={{ fontSize: 'clamp(34px,4vw,52px)', lineHeight: 1 }}>{f.cat || 'Tất cả sản phẩm'}</h1><p className="note" style={{ marginTop: 6 }}>{list.length} sản phẩm</p></div>
        {list.length === 0 ? <div className="card" style={{ background: '#F6EEEF' }}><b>Không có sản phẩm phù hợp</b><span className="note">Thử bỏ bớt bộ lọc hoặc đổi từ khóa.</span></div> : <div className="pgrid">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
      </section>
    </div>
  );
}
