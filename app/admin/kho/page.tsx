import Link from 'next/link';
import { getVariants, stockStatus, type VariantRow } from '@/lib/inventory';
import { all } from '@/lib/db';
import { PageContainer, PageHeader } from '@/components/layout/Page';
import StockCreateAction from '@/components/admin/StockCreateAction';
import StockFilters from '@/components/admin/StockFilters';
import SkuConfiguration from '@/components/admin/SkuConfiguration';
import SkuTagQuickView from '@/components/admin/SkuTagQuickView';
import { norm, sizeText, shelfOf } from '@/lib/util';
import { hrefWith, paginate } from '@/lib/url';
import { requirePage } from '@/lib/auth';
import { FilterChips, Pagination, SearchBar } from '@/components/ui/Navigation';
import { EmptyState } from '@/components/ui/States';
export const dynamic = 'force-dynamic';

type SP = { q?: string; f?: string; product?: string; color?: string; size?: string; page?: string };
type GroupTotal = { count: number; physical: number; available: number };
const BASE = '/admin/kho';
const PAGE_SIZE = 10;
const FILTERS = [['all', 'Tất cả'], ['alert', 'Dưới ngưỡng'], ['out', 'Hết hàng']] as const;

export default async function Stock({ searchParams }: { searchParams: SP }) {
  await requirePage('UC-22', BASE);
  const vs = getVariants();
  const q = norm(searchParams.q || '');
  const f = searchParams.f === 'alert' || searchParams.f === 'out' ? searchParams.f : 'all';
  const productIds = new Set(vs.map((v) => String(v.productId)));
  const colorValues = [...new Set(vs.map((v) => v.color))].sort((a, b) => a.localeCompare(b, 'vi'));
  const sizeValues = [...new Set(vs.map((v) => v.size))].sort((a, b) => ['S', 'M', 'L', 'XL', 'FS'].indexOf(a) - ['S', 'M', 'L', 'XL', 'FS'].indexOf(b));
  const productFilter = searchParams.product && productIds.has(searchParams.product) ? searchParams.product : '';
  const colorFilter = colorValues.includes(searchParams.color || '') ? searchParams.color! : '';
  const sizeFilter = sizeValues.includes(searchParams.size || '') ? searchParams.size! : '';
  const rows: VariantRow[] = [];
  // Tổng theo sản phẩm tính trên toàn bộ kết quả lọc, để đúng cả khi một sản phẩm nằm ở hai trang.
  const groupTotals = new Map<number, GroupTotal>();
  let totalPhysical = 0;
  let totalReserved = 0;
  let totalAvailable = 0;
  let alerts = 0;
  let outOfStock = 0;
  for (const v of vs) {
    totalPhysical += v.physical;
    totalReserved += v.reserved;
    totalAvailable += v.available;
    if (v.variantActive && v.available < v.minStock) alerts++;
    if (v.variantActive && v.available <= 0) outOfStock++;
    if (q && !norm(v.sku).includes(q) && !norm(v.productName).includes(q)) continue;
    if (f === 'alert' && (!v.variantActive || v.available >= v.minStock)) continue;
    if (f === 'out' && (!v.variantActive || v.available > 0)) continue;
    if (productFilter && String(v.productId) !== productFilter) continue;
    if (colorFilter && v.color !== colorFilter) continue;
    if (sizeFilter && v.size !== sizeFilter) continue;
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
  const products = all<any>('SELECT id,name,code,category FROM products ORDER BY id');
  const productOptions = [...new Map(vs.map((v) => [v.productId, { value: String(v.productId), label: v.productName }])).values()].sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  return (
    <PageContainer>
      <div className="stock-page">
        <PageHeader eyebrow="Quản lý kho" title="Tồn kho và SKU" description="Theo dõi lượng hàng theo từng biến thể và điều chỉnh danh mục SKU." actions={<StockCreateAction products={products} />} />
        <div className="stock-kpis">
          <MetricCard label="Thực tế" detail="Kho Online + Showroom" value={totalPhysical} icon="box" />
          <MetricCard label="Tạm giữ" detail="Đơn chờ xuất và hàng stylist giữ" value={totalReserved} icon="lock" />
          <MetricCard label="Khả dụng" detail="Thực tế trừ lượng đang giữ" value={totalAvailable} icon="check" />
          <MetricCard label="Số SKU" detail={`${alerts} dưới ngưỡng · ${outOfStock} hết hàng`} value={vs.length} icon="tag" />
        </div>
        <div className="stock-toolbar-panel">
          <div className="stock-toolbar-main">
            <SearchBar id="sq" label="Tìm theo SKU hoặc tên sản phẩm" placeholder="Nhập SKU hoặc tên sản phẩm" defaultValue={searchParams.q} params={searchParams} keep={['f', 'product', 'color', 'size']} />
            <FilterChips label="Lọc tồn kho" current={f} items={FILTERS.map(([k, l]) => ({ key: k, label: `${l}${k === 'all' ? ` · ${vs.length}` : k === 'alert' ? ` · ${alerts}` : ` · ${outOfStock}`}`, href: hrefWith(BASE, searchParams, { f: k === 'all' ? null : k, page: null }) }))} />
          </div>
          <StockFilters products={productOptions} colors={colorValues.map((value) => ({ value, label: value }))} sizes={sizeValues.map((value) => ({ value, label: sizeText(value) }))} selected={{ product: productFilter, color: colorFilter, size: sizeFilter }} query={searchParams.q || ''} status={f} />
        </div>
        {rows.length === 0 ? <div className="stock-table-panel"><EmptyState title="Không có SKU phù hợp" description="Thử bỏ bộ lọc hoặc đổi từ khóa." action={<Link href={BASE} className="textbtn">Xóa bộ lọc</Link>} /></div> : <>
          <div className="stock-table-panel">
            <div className="stock-table-scroll"><table className="tb stock-table"><caption>{rows.length} biến thể · {vs.length} SKU toàn kho</caption>
              <thead><tr><th>SKU</th><th>Biến thể</th><th className="num">Kho Online</th><th className="num">Showroom</th><th className="num">Thanh lý</th><th className="num">Thực tế</th><th className="num">Tạm giữ</th><th className="num">Khả dụng</th><th className="num">Ngưỡng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
              <tbody>{[...groups].map(([pid, list]) => (<FragmentRows key={pid} list={list} total={groupTotals.get(pid)!} />))}</tbody></table></div>
          </div>
          <Pagination base={BASE} params={searchParams} {...pg} />
        </>}
      </div>
    </PageContainer>
  );
}

function FragmentRows({ list, total }: { list: VariantRow[]; total: GroupTotal }) {
  return (<>
    <tr className="grp"><td colSpan={11}><span className="stock-group-name">{list[0].productName}</span><span className="stock-group-meta">{total.count} biến thể · thực tế {total.physical} · khả dụng {total.available}</span></td></tr>
    {list.map((v) => {
      const st = !v.variantActive ? 'Ngừng bán' : v.available <= 0 ? 'Hết hàng' : v.available < v.minStock ? 'Dưới ngưỡng' : stockStatus(v);
      const cls = st === 'Ổn định' ? 'stock-good' : st === 'Ngừng bán' ? 'stock-muted' : 'stock-warn';
      return (<tr key={v.sku}><td className="stock-sku"><b>{v.sku}</b>{v.priceOverride ? <small>Giá riêng {v.priceOverride.toLocaleString('vi-VN')}đ</small> : null}</td><td>{v.color}<small className="stock-subline">Size {sizeText(v.size)}</small></td><td className="num">{v.online}</td><td className="num">{v.showroom}</td><td className="num">{v.repair}</td><td className="num stock-emphasis">{v.physical}</td><td className="num stock-emphasis">{v.reserved}</td><td className="num stock-emphasis">{v.available}</td><td className="num">{v.minStock}</td><td><span className={`stock-state ${cls}`}><i aria-hidden="true" />{st}</span></td><td><div className="stock-actions"><SkuConfiguration sku={v.sku} active={v.variantActive} price={v.priceOverride} image={v.image} /><SkuTagQuickView productName={v.productName} color={v.color} size={v.size} sku={v.sku} shelf={shelfOf(v.productCode, v.size)} /></div></td></tr>);
    })}</>);
}

function MetricCard({ label, detail, value, icon }: { label: string; detail: string; value: number; icon: 'box' | 'lock' | 'check' | 'tag' }) {
  const paths = {
    box: <><path d="m3 6 7-3 7 3-7 3-7-3Z"/><path d="M3 6v8l7 3 7-3V6M10 9v8"/></>,
    lock: <><rect x="4" y="8" width="12" height="9" rx="1.5"/><path d="M6.5 8V6a3.5 3.5 0 0 1 7 0v2M10 11v3"/></>,
    check: <><circle cx="10" cy="10" r="7"/><path d="m6.8 10 2.1 2.1 4.4-4.4"/></>,
    tag: <><path d="M3 4h7l7 7-6 6-8-8V4Z"/><circle cx="7" cy="7" r="1"/></>,
  };
  return <article className="stock-stat"><span className="stock-stat-icon" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{paths[icon]}</svg></span><span className="stock-stat-label">{label}</span><strong>{value.toLocaleString('vi-VN')}</strong><span className="stock-stat-detail">{detail}</span></article>;
}
