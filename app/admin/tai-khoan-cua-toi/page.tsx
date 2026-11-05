import { requirePage } from '@/lib/auth';
import { ROLE_LABEL } from '@/lib/permissions';
import { PageContainer, PageHeader } from '@/components/layout/Page';
import PasswordForm from '@/components/PasswordForm';
export const dynamic = 'force-dynamic';

// UC-39 Đổi mật khẩu (nhân sự nội bộ; bắt buộc ở lần đăng nhập đầu – luồng 1a)
export default async function MyAccount() {
  const me = await requirePage('UC-39', '/admin/tai-khoan-cua-toi');
  return (
    <PageContainer width="narrow">
      <PageHeader eyebrow="Tài khoản của tôi" title="Đổi mật khẩu" description={`${me.name} · ${me.email} · ${ROLE_LABEL[me.role]}`} />
      <PasswordForm forced={me.mustChangePw} />
    </PageContainer>
  );
}
