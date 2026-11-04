import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { logoutAction } from '@/app/actions/auth';
import { get } from '@/lib/db';
import { listVariants, sweepHolds } from '@/lib/inventory';
import { FlashProvider } from '@/components/admin/Flash';
import NavLinks from '@/components/admin/NavLinks';
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await getUser();
  if (!u) redirect('/dang-nhap?next=/admin');
  if (u.role !== 'admin') redirect('/tai-khoan');
  sweepHolds();
  const vs = listVariants();
  const c = (sql: string) => get<any>(sql).c as number;
  const badges: Record<string, number> = {
    '/admin/don-hang': c('SELECT COUNT(*) c FROM orders WHERE status=0'),
    '/admin/tu-van': c("SELECT COUNT(*) c FROM consults WHERE status='Mới'"),
    '/admin/kho': vs.filter((v) => v.available < v.minStock).length,
    '/admin/kho/dat-may': c('SELECT COUNT(*) c FROM purchase_orders WHERE status=2'),
    '/admin/kho/dieu-chuyen': c("SELECT COUNT(*) c FROM transfers WHERE status='Đang chuyển'"),
    '/admin/kho/giu-hang': c('SELECT COUNT(*) c FROM holds'),
    '/admin/kho/xuat-kho': c('SELECT COUNT(*) c FROM orders WHERE status=1'),
    '/admin/kho/doi-tra': c("SELECT COUNT(*) c FROM return_tickets WHERE status IN ('Chờ nhận hàng','Chờ kiểm tra')"),
  };
  return (
    <div className="adm">
      <aside className="side">
        <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="logo" style={{ color: '#fff', fontSize: 26 }}>ELORA <i style={{ color: '#E8CBD1' }}>woman</i></span>
          <span style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: '#E8CBD1' }}>Quản trị</span>
        </div>
        <NavLinks badges={badges} />
        <div style={{ marginTop: 'auto', padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
          <span style={{ color: '#E6DEE1' }}>{u.email}</span>
          <Link href="/" style={{ color: '#E6DEE1', textDecoration: 'underline' }}>Xem cửa hàng</Link>
          <form action={logoutAction}><button className="textbtn" style={{ color: '#E6DEE1', minHeight: 32 }}>Đăng xuất</button></form>
        </div>
      </aside>
      <main className="amain"><FlashProvider>{children}</FlashProvider></main>
    </div>
  );
}
