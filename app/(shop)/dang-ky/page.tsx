import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import AuthForm from '@/components/AuthForm';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const u = await getUser();
  if (u) redirect(u.role === 'customer' ? '/tai-khoan' : '/admin');
  return <div className="wrap" style={{ paddingTop: 56 }}><AuthForm mode="register" /></div>;
}
