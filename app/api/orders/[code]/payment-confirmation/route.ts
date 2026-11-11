import { requirePerm } from '@/lib/auth';
import { get, run, tx } from '@/lib/db';
import { expirePaymentIfNeeded, PAYMENT_STATUS } from '@/lib/payment';
import { nowIso } from '@/lib/util';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: { code: string } }) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 403 });
  }

  let user;
  try {
    user = await requirePerm('UC-08');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không có quyền thực hiện thao tác.';
    return Response.json({ error: message }, { status: 403 });
  }

  const result = tx(() => {
    const order = get<any>(
      'SELECT id, user_id, pay_method, payment_status, payment_deadline FROM orders WHERE code=?',
      params.code,
    );
    if (!order || order.user_id !== user.id || order.pay_method !== 'Chuyển khoản') {
      return { status: 404, body: { error: 'Không tìm thấy đơn thanh toán.' } };
    }

    const currentStatus = expirePaymentIfNeeded(order.id);
    if (currentStatus === PAYMENT_STATUS.cancelled) {
      return { status: 410, body: { error: 'Đơn thanh toán đã hết hạn.', paymentStatus: PAYMENT_STATUS.cancelled } };
    }
    if (currentStatus === PAYMENT_STATUS.waiting || currentStatus === PAYMENT_STATUS.paid) {
      return { status: 200, body: { paymentStatus: currentStatus } };
    }
    if (currentStatus !== PAYMENT_STATUS.pending || !order.payment_deadline) {
      return { status: 409, body: { error: 'Trạng thái thanh toán không hợp lệ.', paymentStatus: currentStatus } };
    }

    const update = run(
      'UPDATE orders SET payment_status=? WHERE id=? AND user_id=? AND payment_status=? AND payment_deadline>?',
      PAYMENT_STATUS.waiting,
      order.id,
      user.id,
      PAYMENT_STATUS.pending,
      nowIso(),
    );
    if (!update.changes) {
      return { status: 409, body: { error: 'Không thể cập nhật trạng thái thanh toán. Tải lại trang và thử lại.' } };
    }
    return { status: 200, body: { paymentStatus: PAYMENT_STATUS.waiting } };
  });

  return Response.json(result.body, { status: result.status });
}
