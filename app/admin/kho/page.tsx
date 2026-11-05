import Link from 'next/link';
import { getVariants, stockStatus, type VariantRow } from '@/lib/inventory';
import { all } from '@/lib/db';
import { PageHead } from '@/components/admin/Bits';
import SkuForm from '@/components/admin/SkuForm';
import Barcode from '@/components/admin/Barcode';
import { norm, sizeText, shelfOf } from '@/lib/util';
import { hrefWith, paginate } from '@/lib/url';
import { requirePage } from '@/lib/auth';
import { FilterChips, Pagination, SearchBar } from '@/components/ui/Navigation';
import { EmptyState } from '@/components/ui/States';
export const dynamic = 'force-dynamic';

type SP = { q?: string; f?: string; tem?: string; page?: string };
type GroupTotal = { count: number; physical: number; available: number };
const BASE = '/admin/kho';
const PAGE_SIZE = 10;
const FILTERS = [['all', 'Tất cả'], ['alert', 'Dưới ngưỡng'], ['out', 'Hết hàng']] as const;

export default async function Stock({ searchParams }: { searchParams: SP }) {
  await requirePage('UC-22', BASE);
  const vs = getVariants();
  const q = norm(searchParams.q || '');
  const f = searchParams.f === 'alert' || searchParams.f === 'out' ? searchParams.f : 'all';
  const rows: VariantRow[] = [];
  // Tổng theo sản phẩm tính trên toàn bộ kết quả lọc, để đúng cả khi một sản phẩm nằm ở hai trang.
  const groupTotals = new Map<number, GroupTotal>();
  let totalPhysical = 0;
  let totalReserved = 0;
  let totalAvailable = 0;
  let alerts = 0;
  for (const v of vs) {
    totalPhysical += v.physical;
    totalReserved += v.reserved;
    totalAvailable += v.available;
    if (v.available < v.minStock) alerts++;
    if (q && !norm(v.sku).includes(q) && !norm(v.productName).includes(q)) continue;
    if (f === 'alert' && v.available >= v.minStock) continue;
    if (f === 'out' && v.available > 0) continue;
    rows.push(v);
    let g = groupTotals.get(v.productId);
    if (!g) groupTotals.set(v.productId, (g = { count: 0, physical: 0, available: 0 }));
    g.count++;
    g.physical += v.physical;
    g.available += v.available;
  }
  const pg = paginate(rows, searchParams.page, PAGE_SIZE);
  const groups = new Map<number, VariantRow[]>();
  for (const v of pg.items) {
    const list = groups.get(v.productId);
    if (list) list.push(v); else groups.set(v.productId, [v]);
  }
  const tem = searchParams.tem ? vs.find((v) => v.sku === searchParams.tem) : null;
  const products = all<any>('SELECT id,name,code,category FROM products ORDER BY id');
  const temHref = (sku: string) => hrefWith(BASE, searchParams, { tem: sku });
  return (
    <>
      <PageHead group="Quản lý kho" title="Tồn kho và SKU" />
      <div className="kpis">
        <div className="kpi"><span className="lbl">Thực tế (Physical)</span><b>{totalPhysical}</b><span className="note">Kho Online và Showroom, không gồm kho thanh lý</span></div>
        <div className="kpi"><span className="lbl">Tạm giữ (Reserved)</span><b>{totalReserved}</b><span className="note">Đơn chờ xuất và hàng giữ cho stylist</span></div>
        <div className="kpi"><span className="lbl">Khả dụng (Available)</span><b>{totalAvailable}</b><span className="note">Khả dụng = Thực tế trừ Tạm giữ</span></div>
        <div className="kpi"><span className="lbl">Số SKU</span><b>{vs.length}</b><span className="note">{alerts} SKU dưới ngưỡng an toàn</span></div>
      </div>
      <SkuForm products={products} />
      <div className="ui-toolbar">
        <FilterChips label="Lọc tồn kho" current={f} items={FILTERS.map(([k, l]) => ({ key: k, label: l, href: hrefWith(BASE, searchParams, { f: k === 'all' ? null : k, page: null, tem: null }) }))} />
        <SearchBar id="sq" label="Tìm theo SKU hoặc tên" placeholder="Ví dụ: BLZ hoặc vest" defaultValue={searchParams.q} params={searchParams} keep={['f']} />
      </div>
      {rows.length === 0 ? <EmptyState title="Không có SKU phù hợp" description="Thử bỏ bộ lọc hoặc đổi từ khóa." action={<Link href={BASE} className="textbtn">Xóa bộ lọc</Link>} /> : <>
      <div className="scroll"><table className="tb" style={{ minWidth: 1160 }}><caption>{rows.length} / {vs.length} SKU</caption>
        <thead><tr><th>SKU</th><th>Biến thể</th><th>Kho Online</th><th>Showroom</th><th>Thanh lý, sửa chữa</th><th>Thực tế</th><th>Tạm giữ</th><th>Khả dụng</th><th>Ngưỡng</th><th>Trạng thái</th><th>Tem</th></tr></thead>
        <tbody>{[...groups].map(([pid, list]) => (<FragmentRows key={pid} list={list} total={groupTotals.get(pid)!} temHref={temHref} />))}</tbody></table></div>
      <Pagination base={BASE} params={{ ...searchParams, tem: undefined }} {...pg} /></>}
      {tem && (
        <section className="card"><h2 className="h2">Tem mác và mã vạch</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
            <div style={{ width: 300, maxWidth: '100%', padding: 16, border: '1px dashed var(--ink)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="logo" style={{ fontSize: 22 }}>ELORA <i>woman</i></span><b style={{ fontSize: 14 }}>{tem.productName}</b><span style={{ fontSize: 13 }}>{tem.color} · size {sizeText(tem.size)}</span>
              <Barcode text={tem.sku} /><b style={{ fontSize: 14 }}>{tem.sku}</b><span className="note">Vị trí kệ: {shelfOf(tem.productCode, tem.size)}</span></div>
            <p className="note" style={{ maxWidth: 360 }}>Mẫu tem để in và gắn khi hàng về. Mã vạch chỉ để minh họa, chưa kết nối máy in hay máy quét.</p>
          </div></section>)}
    </>
  );
}

function FragmentRows({ list, total, temHref }: { list: VariantRow[]; total: GroupTotal; temHref: (sku: string) => string }) {
  return (<>
    <tr className="grp"><td colSpan={11}>{list[0].productName} · {total.count} biến thể · tồn thực tế {total.physical} · khả dụng {total.available}</td></tr>
    {list.map((v) => {
      const st = stockStatus(v); const cls = st === 'Hết hàng' ? 'red' : st === 'Sắp hết' ? 'pink' : '';
      return (<tr key={v.sku}><td style={{ whiteSpace: 'nowrap' }}><b>{v.sku}</b></td><td style={{ whiteSpace: 'nowrap' }}>{v.color} · {sizeText(v.size)}</td><td>{v.online}</td><td>{v.showroom}</td><td>{v.repair}</td><td><b>{v.physical}</b></td><td>{v.reserved}</td><td><b>{v.available}</b></td><td>{v.minStock}</td><td><span className={'badge ' + cls}>{st}</span></td><td><Link className="ghost" href={temHref(v.sku)} aria-label={`Xem tem ${v.sku}`}>Xem tem</Link></td></tr>);
    })}</>);
}
