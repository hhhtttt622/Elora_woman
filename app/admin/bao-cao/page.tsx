import { all } from '@/lib/db';
import { requirePage } from '@/lib/auth';
import { PageHead } from '@/components/admin/Bits';
import { fmt, pad } from '@/lib/util';
export const dynamic = 'force-dynamic';

const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// UC-40 Xem báo cáo doanh thu: tính trên các đơn đã giao trong khoảng thời gian (BR-08)
export default async function Revenue({ searchParams }: { searchParams: { from?: string; to?: string; by?: string } }) {
  await requirePage('UC-40', '/admin/bao-cao');
  const valid = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const to = valid(searchParams.to) ? searchParams.to! : ymd(new Date());
  const from = valid(searchParams.from) ? searchParams.from! : ymd(new Date(Date.now() - 89 * 86400000));
  const by = searchParams.by === 'month' ? 'month' : 'day';
  const start = new Date(`${from}T00:00:00`).toISOString(), end = new Date(`${to}T23:59:59.999`).toISOString();
  const orders = all<any>('SELECT id, code, total, delivered_at FROM orders WHERE status=3 AND delivered_at BETWEEN ? AND ? ORDER BY delivered_at', start, end);
  const key = (iso: string) => { const d = new Date(iso); return by === 'month' ? `${pad(d.getMonth() + 1)}/${d.getFullYear()}` : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
  const periods: { k: string; rev: number; n: number }[] = [];
  for (const o of orders) { const k = key(o.delivered_at); let p = periods.find((x) => x.k === k); if (!p) periods.push(p = { k, rev: 0, n: 0 }); p.rev += o.total; p.n++; }
  const rev = orders.reduce((n, o) => n + o.total, 0);
  const ids = orders.map((o) => o.id);
  const best = ids.length ? all<any>(`SELECT sku, name, SUM(qty) q, SUM(qty*price) amt FROM order_lines WHERE order_id IN (${ids.map(() => '?').join(',')}) GROUP BY sku ORDER BY q DESC, amt DESC LIMIT 10`, ...ids) : [];
  return (
    <>
      <PageHead group="Quản trị hệ thống" title="Báo cáo doanh thu" note="Chỉ tính đơn ở trạng thái Đã giao, theo ngày giao. Doanh thu là tổng tiền đơn, gồm phí giao hàng." />
      <form method="get" className="row">
        <div className="fl"><label className="lbl" htmlFor="rp-from">Từ ngày</label><input id="rp-from" name="from" type="date" className="fld" defaultValue={from} /></div>
        <div className="fl"><label className="lbl" htmlFor="rp-to">Đến ngày</label><input id="rp-to" name="to" type="date" className="fld" defaultValue={to} /></div>
        <div className="fl"><label className="lbl" htmlFor="rp-by">Nhóm theo</label><select id="rp-by" name="by" className="fld" defaultValue={by}><option value="day">Ngày</option><option value="month">Tháng</option></select></div>
        <button className="btn">Xem báo cáo</button>
      </form>
      <div className="kpis">
        <div className="kpi"><span className="lbl">Doanh thu</span><b>{fmt(rev)}</b><span className="note">Đơn đã giao trong kỳ</span></div>
        <div className="kpi"><span className="lbl">Số đơn</span><b>{orders.length}</b><span className="note">Đơn đã giao</span></div>
        <div className="kpi"><span className="lbl">Giá trị đơn trung bình</span><b>{fmt(orders.length ? rev / orders.length : 0)}</b><span className="note">Doanh thu chia số đơn</span></div>
      </div>
      {!orders.length && <div className="card" style={{ background: '#F6EEEF' }}>Không có đơn đã giao trong khoảng thời gian này. Các số liệu bằng 0.</div>}
      {orders.length > 0 && <>
        <div className="scroll"><table className="tb" style={{ minWidth: 560 }}><caption>Doanh thu theo {by === 'month' ? 'tháng' : 'ngày'}</caption>
          <thead><tr><th>Kỳ</th><th>Doanh thu</th><th>Số đơn</th><th>Giá trị đơn trung bình</th></tr></thead>
          <tbody>{periods.map((p) => <tr key={p.k}><td><b>{p.k}</b></td><td style={{ fontWeight: 600 }}>{fmt(p.rev)}</td><td>{p.n}</td><td>{fmt(p.rev / p.n)}</td></tr>)}</tbody></table></div>
        <div className="scroll"><table className="tb" style={{ minWidth: 640 }}><caption>Sản phẩm bán chạy</caption>
          <thead><tr><th>SKU</th><th>Sản phẩm</th><th>Số lượng</th><th>Tiền hàng</th></tr></thead>
          <tbody>{best.map((b) => <tr key={b.sku}><td style={{ whiteSpace: 'nowrap' }}><b>{b.sku}</b></td><td>{b.name}</td><td>{b.q}</td><td>{fmt(b.amt)}</td></tr>)}</tbody></table></div>
      </>}
    </>
  );
}
