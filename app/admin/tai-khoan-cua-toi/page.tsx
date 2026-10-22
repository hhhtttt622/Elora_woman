import { requirePage } from '@/lib/auth';
import { ROLE_LABEL } from '@/lib/permissions';
import { PageHead } from '@/components/admin/Bits';
import PasswordForm from '@/components/PasswordForm';
export const dynamic = 'force-dynamic';

export default async function MyAccount() {
  const me = await requirePage('UC-39', '/admin/tai-khoan-cua-toi');
  return (
    <>
      <PageHead group="Quản trị hệ thống" title="Đổi mật khẩu" note={`${me.name} · ${me.email} · ${ROLE_LABEL[me.role]}`} />
      <PasswordForm forced={me.mustChangePw} />
    </>
  );
}
