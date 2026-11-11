import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { get } from '@/lib/db';
import Checkout from '@/components/Checkout';
import { customerPromotions } from '@/lib/promotions';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: { done?: string; promo?: string } }) {
  const u = await getUser();
  if (!u) redirect('/dang-nhap?next=/thanh-toan');
  if (u.role !== 'customer') redirect('/admin');
  const me = get<any>('SELECT name,phone FROM users WHERE id=?', u.id);
  const offers = customerPromotions(u.id).filter((p:any) => p.customer_status === 'available').map((p:any) => ({name:p.name,code:p.code}));
  return <Checkout name={me.name} phone={me.phone} done={searchParams?.done} initialPromo={searchParams?.promo || ''} offers={offers} />;
}
