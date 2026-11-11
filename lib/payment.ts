import { get, run } from './db';
import { nowIso } from './util';

export const PAYMENT_STATUS = {
  pending: 'PENDING_PAYMENT',
  waiting: 'WAITING_CONFIRMATION',
  paid: 'PAID',
  cancelled: 'CANCELLED',
  notRequired: 'NOT_REQUIRED',
} as const;

export const PAYMENT_WINDOW_MS = 15 * 60 * 1000;

export type VietQrConfig = {
  bankBin: string;
  accountNo: string;
  accountName: string;
};

export function getVietQrConfig(): VietQrConfig | null {
  const bankBin = process.env.VIETQR_BANK_BIN?.trim() || '';
  const accountNo = process.env.VIETQR_ACCOUNT_NO?.trim() || '';
  const accountName = process.env.VIETQR_ACCOUNT_NAME?.trim() || '';
  if (!/^\d{6}$/.test(bankBin) || !/^\d{6,20}$/.test(accountNo) || !accountName) return null;
  return { bankBin, accountNo, accountName };
}

export function buildVietQrUrl(
  config: VietQrConfig,
  amount: number,
  orderCode: string,
) {
  const addInfo = orderCode.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const accountName = config.accountName.toUpperCase();
  return `https://img.vietqr.io/image/${encodeURIComponent(config.bankBin)}-${encodeURIComponent(config.accountNo)}-compact2.png?amount=${encodeURIComponent(String(amount))}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(accountName)}`;
}

export function expirePendingPayments() {
  return run(
    "UPDATE orders SET payment_status=? WHERE pay_method='Chuyển khoản' AND payment_status=? AND payment_deadline IS NOT NULL AND payment_deadline<=?",
    PAYMENT_STATUS.cancelled,
    PAYMENT_STATUS.pending,
    nowIso(),
  ).changes;
}

export function expirePaymentIfNeeded(orderId: number) {
  const order = get<{ payment_status: string; payment_deadline: string | null }>(
    'SELECT payment_status, payment_deadline FROM orders WHERE id=?',
    orderId,
  );
  if (
    order?.payment_status === PAYMENT_STATUS.pending &&
    order.payment_deadline &&
    order.payment_deadline <= nowIso()
  ) {
    const updated = run(
      'UPDATE orders SET payment_status=? WHERE id=? AND payment_status=? AND payment_deadline<=?',
      PAYMENT_STATUS.cancelled,
      orderId,
      PAYMENT_STATUS.pending,
      nowIso(),
    );
    if (updated.changes) return PAYMENT_STATUS.cancelled;
    return get<{ payment_status: string }>(
      'SELECT payment_status FROM orders WHERE id=?',
      orderId,
    )?.payment_status;
  }
  return order?.payment_status;
}
