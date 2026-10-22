import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { logoutAction } from '@/app/actions/auth';
import { get } from '@/lib/db';
import { listVariants, sweepHolds } from '@/lib/inventory';
import { can, isInternal, ROLE_LABEL } from '@/lib/permissions';
import { ADMIN_NAV } from '@/lib/nav';
import { HOLD_STATUS, nowIso } from '@/lib/util';
import { FlashProvider } from '@/components/admin/Flash';
import NavLinks from '@/components/admin/NavLinks';
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await getUser();
  if (!u) redirect('/dang-nhap?next=/admin');
  if (!isInternal(u.role)) redirect('/tai-khoan');
  sweepHolds();
  const vs = listVariants();
  const c = (sql: string, ...p: any[]) => get<any>(sql, ...p).c as number;
  const mine = u.role === 'admin' ? '' : ' AND c.stylist_id=' + u.id;
  // số việc đang chờ trên menu theo vai trò (UC-20)
  const badges: Record<string, number> = {
    '/admin/don-hang': c('SELECT COUNT(*) c FROM orders WHERE status=0'),
    '/admin/tu-van': c("SELECT COUNT(*) c FROM consults WHERE status='Mới' AND stylist_id IS NULL"),
    '/admin/kho': vs.filter((v) => v.available < v.minStock).length,
    '/admin/kho/dat-may': c('SELECT COUNT(*) c FROM purchase_orders WHERE status=2'),
    '/admin/kho/dieu-chuyen': c("SELECT COUNT(*) c FROM transfers WHERE status='Đang chuyển'"),
    '/admin/kho/giu-hang': c(`SELECT COUNT(*) c FROM holds h JOIN consults c ON c.id=h.consult_id WHERE h.status=? AND h.expires_at > ?${mine}`, HOLD_STATUS.active, nowIso()),
    '/admin/kho/xuat-kho': c('SELECT COUNT(*) c FROM orders WHERE status=1') + c("SELECT COUNT(*) c FROM return_tickets WHERE status='Chờ kiểm tra'"),
  };
  const nav = ADMIN_NAV.map((g) => ({ group: g.group, items: g.items.filter(([, , uc]) => can(u.role, uc)).map(([h, l]) => [h, l] as [string, string]) })).filter((g) => g.items.length);
  return (
    <div className="adm">
      <aside className="side">
        <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="logo" style={{ color: '#fff', fontSize: 26 }}>ELORA <i style={{ color: '#E8CBD1' }}>woman</i></span>
          <span style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: '#E8CBD1' }}>Quản trị · {ROLE_LABEL[u.role]}</span>
        </div>
        <NavLinks nav={nav} badges={badges} />
        <div className="side-foot" style={{ marginTop: 'auto', padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
          <span style={{ color: '#E6DEE1' }}>{u.name}<br />{u.email}</span>
          <Link href="/" style={{ color: '#E6DEE1', textDecoration: 'underline' }}>Xem cửa hàng</Link>
          <form action={logoutAction}><button className="textbtn" style={{ color: '#E6DEE1', minHeight: 32 }}>Đăng xuất</button></form>
        </div>
      </aside>
      <main className="amain"><FlashProvider>{children}</FlashProvider></main>
    </div>
  );
}
