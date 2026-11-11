import { notFound, redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { get } from '@/lib/db';
import { buildVietQrUrl, expirePaymentIfNeeded, PAYMENT_STATUS } from '@/lib/payment';
import BankTransferPayment from '@/components/BankTransferPayment';

export const dynamic = 'force-dynamic';

export default async function PaymentPage({ params }: { params: { code: string } }) {
  const user = await getUser();
  if (!user) redirect(`/dang-nhap?next=${encodeURIComponent(`/thanh-toan/${params.code}`)}`);
  if (user.role !== 'customer') redirect('/admin');

  const order = get<any>(
    'SELECT * FROM orders WHERE code=? AND user_id=?',
    params.code,
    user.id,
  );
  if (!order) notFound();
  if (order.pay_method !== 'Chuyển khoản') redirect('/tai-khoan?tab=orders');
  if (order.payment_status === PAYMENT_STATUS.notRequired) redirect('/tai-khoan?tab=orders');

  const paymentStatus = expirePaymentIfNeeded(order.id) || order.payment_status;
  const qrUrl = order.payment_bank_bin && order.payment_account_no && order.payment_account_name
    ? buildVietQrUrl(
        {
          bankBin: order.payment_bank_bin,
          accountNo: order.payment_account_no,
          accountName: order.payment_account_name,
        },
        order.total,
        order.code,
      )
    : null;

  return (
    <BankTransferPayment
      code={order.code}
      amount={order.total}
      deadline={order.payment_deadline}
      paymentStatus={paymentStatus}
      qrUrl={qrUrl}
      accountName={order.payment_account_name}
      accountNo={order.payment_account_no}
      bankBin={order.payment_bank_bin}
    />
  );
}
