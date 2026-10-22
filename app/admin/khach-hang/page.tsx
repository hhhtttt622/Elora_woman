import Link from 'next/link';
import { all, get } from '@/lib/db';
import { PageHead } from '@/components/admin/Bits';
import { fmt, norm } from '@/lib/util';
import { requirePage } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export default async function Customers({ searchParams }: { searchParams: { q?: string; id?: string } }) {
  const me = await requirePage('UC-19', '/admin/khach-hang');
  const q = norm(searchParams.q || '');
  const rows = all<any>("SELECT u.*, (SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id) oc, (SELECT COALESCE(SUM(total),0) FROM orders o WHERE o.user_id=u.id) spend FROM users u WHERE role='customer' ORDER BY id")
    .filter((u) => !q || norm(u.name).includes(q) || norm(u.email).includes(q));
  const sel = searchParams.id ? get<any>('SELECT * FROM users WHERE id=?', parseInt(searchParams.id, 10)) : null;
  const last = sel ? get<any>('SELECT * FROM consults WHERE user_id=? ORDER BY id DESC LIMIT 1', sel.id) : null;
  return (
    <>
      <PageHead group="Bán hàng" title="Khách hàng" />
      <form method="get" className="fl" style={{ maxWidth: 420 }}><label className="lbl" htmlFor="cq">Tìm khách hàng</label><input id="cq" name="q" className="fld" defaultValue={searchParams.q} placeholder="Tên hoặc email, nhấn Enter" /></form>
      <div className="scroll"><table className="tb" style={{ minWidth: 800 }}><caption>{rows.length} khách hàng</caption>
        <thead><tr><th>Khách hàng</th><th>Email</th><th>Số điện thoại</th><th>Số đơn</th><th>Chi tiêu</th><th>Hồ sơ</th></tr></thead>
        <tbody>{rows.map((u) => <tr key={u.id}><td><b>{u.name}</b></td><td>{u.email}</td><td style={{ whiteSpace: 'nowrap' }}>{u.phone}</td><td>{u.oc}</td><td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{fmt(u.spend)}</td><td><Link className="ghost" href={`/admin/khach-hang?id=${u.id}${searchParams.q ? `&q=${searchParams.q}` : ''}`} aria-label={`Xem hồ sơ ${u.name}`}>Xem hồ sơ</Link></td></tr>)}</tbody></table></div>
      {sel && (
        <section className="card" style={{ background: '#F6EEEF' }}><span className="eb">Hồ sơ phong cách</span><h2 className="disp" style={{ fontSize: 32 }}>{sel.name}</h2>
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '16px 24px', fontSize: 14 }}>
            <div><dt style={{ fontWeight: 600 }}>Số đo</dt><dd style={{ margin: 0 }}>{sel.height_cm ? `${sel.height_cm} cm, ${sel.weight_kg ?? '?'} kg` : 'Chưa có'}</dd></div>
            <div><dt style={{ fontWeight: 600 }}>Size thường mặc</dt><dd style={{ margin: 0 }}>{sel.size}</dd></div>
            <div><dt style={{ fontWeight: 600 }}>Môi trường làm việc</dt><dd style={{ margin: 0 }}>{sel.work_env || 'Chưa có'}</dd></div>
            <div><dt style={{ fontWeight: 600 }}>Màu ưa thích</dt><dd style={{ margin: 0 }}>{sel.liked_colors || 'Chưa có'}</dd></div>
            <div><dt style={{ fontWeight: 600 }}>Dịp cần trang phục</dt><dd style={{ margin: 0 }}>{last?.occasions || 'Chưa có'}</dd></div>
            <div><dt style={{ fontWeight: 600 }}>Ghi chú</dt><dd style={{ margin: 0 }}>{last?.note || 'Chưa có'}</dd></div></dl></section>)}
    </>
  );
}
