import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { isInternal } from '@/lib/permissions';
import PasswordForm from '@/components/PasswordForm';
import { all, get } from '@/lib/db';
import { sweepHolds } from '@/lib/inventory';
import ProfileForm from '@/components/ProfileForm';
import { ORDER_STATUS, HOLD_STATUS, fmt, dmy, dmyHm, hoursLeft, nowIso } from '@/lib/util';
export const dynamic = 'force-dynamic';

const TABS = [['info', 'Thông tin cá nhân'], ['orders', 'Lịch sử mua hàng'], ['track', 'Theo dõi đơn hàng'], ['style', 'Hồ sơ phong cách'], ['password', 'Đổi mật khẩu']];

export default async function Account({ searchParams }: { searchParams: { tab?: string } }) {
  const s = await getUser();
  if (!s) redirect('/dang-nhap?next=/tai-khoan');
  // UC-04, UC-09, UC-11 chỉ dành cho khách hàng; nhân sự nội bộ dùng trang quản trị
  if (isInternal(s.role)) redirect(s.mustChangePw ? '/admin/tai-khoan-cua-toi' : '/admin');
  sweepHolds();
  const tab = s.mustChangePw ? 'password' : TABS.some((t) => t[0] === searchParams.tab) ? searchParams.tab! : 'info';
  const u = get<any>('SELECT * FROM users WHERE id=?', s.id);
  const orders = all<any>('SELECT * FROM orders WHERE user_id=? ORDER BY id DESC', s.id).map((o) => ({ ...o, lines: all<any>('SELECT * FROM order_lines WHERE order_id=?', o.id) }));
  const consults = all<any>('SELECT c.*, st.name sname FROM consults c LEFT JOIN users st ON st.id=c.stylist_id WHERE c.user_id=? ORDER BY c.id DESC', s.id).map((c) => ({ ...c, holds: all<any>('SELECT h.*, p.name FROM holds h JOIN variants v ON v.sku=h.sku JOIN products p ON p.id=v.product_id WHERE h.consult_id=? AND h.status=? AND h.expires_at > ?', c.id, HOLD_STATUS.active, nowIso()) }));
  return (
    <div className="wrap" style={{ paddingTop: 48, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div><span className="eb">Tài khoản</span><h1 className="disp" style={{ fontSize: 'clamp(34px,4vw,52px)', lineHeight: 1 }}>Xin chào, {u.name}</h1></div>
      <nav aria-label="Mục tài khoản" className="tabs">{TABS.map(([k, l]) => <Link key={k} href={`/tai-khoan?tab=${k}`} className={'chip' + (tab === k ? ' on' : '')} aria-current={tab === k ? 'page' : undefined}>{l}</Link>)}</nav>

      {tab === 'info' && <ProfileForm u={u} />}

      {tab === 'password' && <PasswordForm forced={s.mustChangePw} />}

      {tab === 'orders' && (orders.length === 0 ? <div className="card" style={{ background: '#F6EEEF' }}>Bạn chưa có đơn hàng nào.</div> :
        <div className="scroll"><table className="tb" style={{ minWidth: 720 }}><caption>Các đơn đã đặt</caption>
          <thead><tr><th>Mã đơn</th><th>Ngày</th><th>Sản phẩm</th><th>Tổng</th><th>Trạng thái</th></tr></thead>
          <tbody>{orders.map((o) => <tr key={o.id}><td><b>{o.code}</b></td><td>{dmy(o.created_at)}</td><td>{o.lines.map((l: any) => `${l.qty} × ${l.name}`).join('; ')}</td><td>{fmt(o.total)}</td><td><span className={'badge' + (o.status === 3 ? ' dark' : o.status === 0 ? ' pink' : ' sand')}>{ORDER_STATUS[o.status]}</span></td></tr>)}</tbody></table></div>)}

      {tab === 'track' && (orders.length === 0 ? <div className="card" style={{ background: '#F6EEEF' }}>Chưa có đơn nào để theo dõi.</div> :
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 20 }}>{orders.filter((o) => o.status < 3).concat(orders.filter((o) => o.status === 3).slice(0, 1)).map((o) => (
          <div key={o.id} className="card"><b>{o.code}</b><span className="note">Đặt ngày {dmy(o.created_at)} · {fmt(o.total)}{o.tracking ? ` · Vận đơn ${o.carrier} ${o.tracking}` : ''}</span>
            <ol className="list" style={{ display: 'flex', flexDirection: 'column' }}>{ORDER_STATUS.map((s, i) => <li key={s} style={{ justifyContent: 'flex-start', gap: 12, fontWeight: i <= o.status ? 600 : 400, color: i <= o.status ? 'var(--ink)' : '#6A6168' }}><span className={'badge' + (i <= o.status ? ' dark' : '')} style={{ minWidth: 28, textAlign: 'center' }}>{i + 1}</span>{s}{i === o.status ? ' (hiện tại)' : ''}</li>)}</ol></div>))}</div>)}

      {tab === 'style' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card" style={{ maxWidth: 720 }}><h2 className="h2">Hồ sơ phong cách của bạn</h2>
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, fontSize: 14 }}>
              <div><dt style={{ fontWeight: 600 }}>Số đo</dt><dd style={{ margin: 0 }}>{u.height_cm ? `${u.height_cm} cm, ${u.weight_kg ?? '?'} kg` : 'Chưa cập nhật'}</dd></div>
              <div><dt style={{ fontWeight: 600 }}>Size thường mặc</dt><dd style={{ margin: 0 }}>{u.size}</dd></div>
              <div><dt style={{ fontWeight: 600 }}>Màu ưa thích</dt><dd style={{ margin: 0 }}>{u.liked_colors || 'Chưa chọn'}</dd></div>
              <div><dt style={{ fontWeight: 600 }}>Môi trường làm việc</dt><dd style={{ margin: 0 }}>{u.work_env || 'Chưa cập nhật'}</dd></div></dl>
            <Link href="/tai-khoan?tab=info" className="textbtn" style={{ display: 'inline-flex', alignItems: 'center' }}>Cập nhật hồ sơ</Link></div>
          <h2 className="disp" style={{ fontSize: 32 }}>Yêu cầu tư vấn của bạn</h2>
          {consults.length === 0 && <div className="card" style={{ background: '#F6EEEF' }}>Bạn chưa gửi yêu cầu nào. <Link href="/tu-van" className="textbtn">Gửi yêu cầu tư vấn</Link></div>}
          {consults.map((c) => (
            <div key={c.id} className="card" style={{ maxWidth: 720 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}><b>{c.occasions}</b><span className={'badge' + (c.status === 'Đã gửi gợi ý' ? ' dark' : c.status === 'Mới' ? ' red' : ' sand')}>{c.status}</span></div>
              <span className="note">Gửi ngày {dmyHm(c.created_at)} · {c.work_env} · ngân sách {c.budget}</span>
              {c.status === 'Đã gửi gợi ý' && <>
                <p style={{ background: '#F6EEEF', border: '1px solid var(--line)', padding: '12px 14px' }}><b>{c.sname || 'Stylist'}:</b> {c.message || 'Stylist đã chọn một số món cho bạn.'}</p>
                <ul className="list">{c.holds.map((h: any) => <li key={h.id}><span>{h.name}<br /><span className="note">{h.sku}</span></span><span className="badge pink">Giữ cho bạn còn {hoursLeft(h.expires_at)} giờ</span></li>)}</ul>
                {c.holds.length === 0 && <p className="note">Thời gian giữ hàng đã hết, hàng đã được nhả về kho bán. Liên hệ stylist nếu bạn vẫn muốn các món này.</p>}
                {c.holds.length > 0 && <p className="note">Muốn mua món đang giữ, hãy báo stylist để chốt mua. Đặt hàng trên website có thể báo thiếu hàng vì món đang được giữ cho chính bạn (giới hạn L-01).</p>}
              </>}
            </div>))}
        </div>)}
    </div>
  );
}
