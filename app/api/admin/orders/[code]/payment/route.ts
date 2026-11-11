import { revalidatePath } from 'next/cache';
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

  let admin;
  try {
    admin = await requirePerm('UC-17');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không có quyền đối soát thanh toán.';
    return Response.json({ error: message }, { status: 403 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: 'Dữ liệu yêu cầu không hợp lệ.' }, { status: 400 });
  }
  const requestedStatus = input && typeof input === 'object' && 'status' in input
    ? (input as { status?: unknown }).status
    : undefined;
  if (requestedStatus !== PAYMENT_STATUS.paid && requestedStatus !== PAYMENT_STATUS.cancelled) {
    return Response.json({ error: 'Trạng thái đối soát không hợp lệ.' }, { status: 400 });
  }

  const result = tx(() => {
    const order = get<any>(
      'SELECT id, pay_method, payment_status FROM orders WHERE code=?',
      params.code,
    );
    if (!order || order.pay_method !== 'Chuyển khoản') {
      return { status: 404, body: { error: 'Không tìm thấy đơn chuyển khoản.' } };
    }

    const currentStatus = expirePaymentIfNeeded(order.id);
    if (currentStatus === requestedStatus) {
      return { status: 200, body: { paymentStatus: currentStatus } };
    }
    if (currentStatus === PAYMENT_STATUS.cancelled) {
      return { status: 409, body: { error: 'Đơn đã hết hạn hoặc đã bị hủy; không thể xác nhận tiền cho đơn này.', paymentStatus: currentStatus } };
    }
    if (currentStatus !== PAYMENT_STATUS.pending && currentStatus !== PAYMENT_STATUS.waiting) {
      return { status: 409, body: { error: 'Đơn không ở trạng thái có thể đối soát.', paymentStatus: currentStatus } };
    }

    const next = requestedStatus;
    const update = run(
      `UPDATE orders
       SET payment_status=?, payment_confirmed_at=?, payment_confirmed_by=?
       WHERE id=? AND payment_status IN (?,?)`,
      next,
      next === PAYMENT_STATUS.paid ? nowIso() : null,
      next === PAYMENT_STATUS.paid ? admin.id : null,
      order.id,
      PAYMENT_STATUS.pending,
      PAYMENT_STATUS.waiting,
    );
    if (!update.changes) {
      return { status: 409, body: { error: 'Đơn vừa được cập nhật bởi thao tác khác. Tải lại trang để kiểm tra.' } };
    }
    return { status: 200, body: { paymentStatus: next } };
  });

  if (result.status === 200) revalidatePath('/admin/don-hang');
  return Response.json(result.body, { status: result.status });
}
