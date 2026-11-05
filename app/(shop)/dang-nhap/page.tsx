import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import AuthForm from '@/components/AuthForm';
import { homeOf } from '@/lib/permissions';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: { next?: string } }) {
  const u = await getUser();
  if (u) redirect(homeOf(u.role));
  return <div className="wrap" style={{ paddingTop: 56 }}><AuthForm mode="login" next={searchParams.next} /></div>;
}
