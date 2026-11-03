import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { get } from '@/lib/db';
import { getVariants } from '@/lib/inventory';
import { can, isInternal, ROLE_LABEL } from '@/lib/permissions';
import { ADMIN_NAV } from '@/lib/nav';
import { HOLD_STATUS, nowIso } from '@/lib/util';
import { FlashProvider } from '@/components/admin/Flash';
import AdminChrome from '@/components/layout/AdminChrome';
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await getUser();
  if (!u) redirect('/dang-nhap?next=/admin');
  if (!isInternal(u.role)) redirect('/tai-khoan');
  const vs = getVariants();
  const mine = u.role === 'admin' ? '' : ' AND c.stylist_id=' + u.id;
  const counts = get<any>(`
    SELECT
      (SELECT COUNT(*) FROM orders WHERE status=0) AS c_orders,
      (SELECT COUNT(*) FROM consults WHERE status='Mới' AND stylist_id IS NULL) AS c_consults,
      (SELECT COUNT(*) FROM purchase_orders WHERE status=2) AS c_pos,
      (SELECT COUNT(*) FROM transfers WHERE status='Đang chuyển') AS c_transfers,
      (SELECT COUNT(*) FROM holds h JOIN consults c ON c.id=h.consult_id WHERE h.status=? AND h.expires_at > ?${mine}) AS c_holds,
      (SELECT COUNT(*) FROM orders WHERE status=1) AS c_orders_pack,
      (SELECT COUNT(*) FROM return_tickets WHERE status='Chờ kiểm tra') AS c_returns
  `, HOLD_STATUS.active, nowIso()) || {};

  // số việc đang chờ trên menu theo vai trò (UC-20)
  const badges: Record<string, number> = {
    '/admin/don-hang': counts.c_orders || 0,
    '/admin/tu-van': counts.c_consults || 0,
    '/admin/kho': vs.reduce((n, v) => (v.available < v.minStock ? n + 1 : n), 0),
    '/admin/kho/dat-may': counts.c_pos || 0,
    '/admin/kho/dieu-chuyen': counts.c_transfers || 0,
    '/admin/kho/giu-hang': counts.c_holds || 0,
    '/admin/kho/xuat-kho': (counts.c_orders_pack || 0) + (counts.c_returns || 0),
  };
  const nav = ADMIN_NAV.map((g) => ({ group: g.group, items: g.items.filter(([, , uc]) => can(u.role, uc)).map(([h, l]) => [h, l] as [string, string]) })).filter((g) => g.items.length);
  return (
    <AdminChrome nav={nav} badges={badges} user={{ name: u.name, email: u.email, roleLabel: ROLE_LABEL[u.role] }}>
      <FlashProvider>{children}</FlashProvider>
    </AdminChrome>
  );
}
