import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { get } from '@/lib/db';
import Checkout from '@/components/Checkout';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: { done?: string } }) {
  const u = await getUser();
  if (!u) redirect('/dang-nhap?next=/thanh-toan');
  if (u.role !== 'customer') redirect('/admin');
  const me = get<any>('SELECT name,phone FROM users WHERE id=?', u.id);
  return <Checkout name={me.name} phone={me.phone} done={searchParams.done} />;
}
