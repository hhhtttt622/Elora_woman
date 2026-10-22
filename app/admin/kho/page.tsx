import Link from 'next/link';
import { listVariants, stockStatus } from '@/lib/inventory';
import { all } from '@/lib/db';
import { PageHead } from '@/components/admin/Bits';
import SkuForm from '@/components/admin/SkuForm';
import Barcode from '@/components/admin/Barcode';
import { norm, sizeText, shelfOf } from '@/lib/util';
import { requirePage } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export default async function Stock({ searchParams }: { searchParams: { q?: string; f?: string; tem?: string } }) {
  const me = await requirePage('UC-22', '/admin/kho');
  const vs = listVariants();
  const q = norm(searchParams.q || '');
  const f = searchParams.f || 'all';
  const rows = vs.filter((v) => (!q || norm(v.sku).includes(q) || norm(v.productName).includes(q)) && (f === 'alert' ? v.available < v.minStock : f === 'out' ? v.available <= 0 : true));
  const sum = (k: 'physical' | 'reserved' | 'available') => vs.reduce((n, v) => n + v[k], 0);
  const alerts = vs.filter((v) => v.available < v.minStock).length;
  const tem = searchParams.tem ? vs.find((v) => v.sku === searchParams.tem) : null;
  const products = all<any>('SELECT id,name,code,category FROM products ORDER BY id');
  const groups: Record<number, typeof rows> = {}; rows.forEach((v) => (groups[v.productId] ||= []).push(v));
  const qs = (o: Record<string, string>) => '/admin/kho?' + new URLSearchParams({ ...(searchParams.q ? { q: searchParams.q } : {}), ...o }).toString();
  return (
    <>
      <PageHead group="Quản lý kho" title="Tồn kho và SKU" />
      <div className="kpis">
        <div className="kpi"><span className="lbl">Thực tế (Physical)</span><b>{sum('physical')}</b><span className="note">Kho Online và Showroom, không gồm kho thanh lý</span></div>
        <div className="kpi"><span className="lbl">Tạm giữ (Reserved)</span><b>{sum('reserved')}</b><span className="note">Đơn chờ xuất và hàng giữ cho stylist</span></div>
        <div className="kpi"><span className="lbl">Khả dụng (Available)</span><b>{sum('available')}</b><span className="note">Khả dụng = Thực tế trừ Tạm giữ</span></div>
        <div className="kpi"><span className="lbl">Số SKU</span><b>{vs.length}</b><span className="note">{alerts} SKU dưới ngưỡng an toàn</span></div>
      </div>
      <SkuForm products={products} />
      <form method="get" className="row"><div className="fl" style={{ flex: '1 1 280px', maxWidth: 420 }}><label className="lbl" htmlFor="sq">Tìm theo SKU hoặc tên</label><input id="sq" name="q" className="fld" defaultValue={searchParams.q} placeholder="Ví dụ: BLZ hoặc vest" /></div>{f !== 'all' && <input type="hidden" name="f" value={f} />}<button className="ghost" style={{ minHeight: 44 }}>Tìm</button>
        <div role="group" aria-label="Lọc tồn kho" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{[['all', 'Tất cả'], ['alert', 'Dưới ngưỡng'], ['out', 'Hết hàng']].map(([k, l]) => <Link key={k} href={qs(k === 'all' ? {} : { f: k })} className={'chip' + (f === k ? ' on' : '')}>{l}</Link>)}</div></form>
      <div className="scroll tall"><table className="tb" style={{ minWidth: 1160 }}><caption>Hiển thị {rows.length} / {vs.length} SKU</caption>
        <thead><tr><th>SKU</th><th>Biến thể</th><th>Kho Online</th><th>Showroom</th><th>Thanh lý, sửa chữa</th><th>Thực tế</th><th>Tạm giữ</th><th>Khả dụng</th><th>Ngưỡng</th><th>Trạng thái</th><th>Tem</th></tr></thead>
        <tbody>{Object.entries(groups).map(([pid, list]) => (<FragmentRows key={pid} list={list} />))}</tbody></table></div>
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

function FragmentRows({ list }: { list: ReturnType<typeof listVariants> }) {
  const first = list[0];
  return (<>
    <tr className="grp"><td colSpan={11}>{first.productName} · {list.length} biến thể · tồn thực tế {list.reduce((n, v) => n + v.physical, 0)} · khả dụng {list.reduce((n, v) => n + v.available, 0)}</td></tr>
    {list.map((v) => {
      const st = stockStatus(v); const cls = st === 'Hết hàng' ? 'red' : st === 'Sắp hết' ? 'pink' : '';
      return (<tr key={v.sku}><td style={{ whiteSpace: 'nowrap' }}><b>{v.sku}</b></td><td style={{ whiteSpace: 'nowrap' }}>{v.color} · {sizeText(v.size)}</td><td>{v.online}</td><td>{v.showroom}</td><td>{v.repair}</td><td><b>{v.physical}</b></td><td>{v.reserved}</td><td><b>{v.available}</b></td><td>{v.minStock}</td><td><span className={'badge ' + cls}>{st}</span></td><td><Link className="ghost" href={`/admin/kho?tem=${v.sku}`} aria-label={`Xem tem ${v.sku}`}>Xem tem</Link></td></tr>);
    })}</>);
}
