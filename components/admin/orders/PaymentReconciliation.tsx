'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fmt } from '@/lib/util';

const LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ khách chuyển khoản',
  WAITING_CONFIRMATION: 'Khách báo đã chuyển · chờ đối soát',
  PAID: 'Đã nhận tiền',
  CANCELLED: 'Đã hủy / hết hạn',
};

export default function PaymentReconciliation({
  code,
  amount,
  status,
  confirmedAt,
  confirmedBy,
}: {
  code: string;
  amount: number;
  status: string;
  confirmedAt: string | null;
  confirmedBy: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const reconcile = async (nextStatus: 'PAID' | 'CANCELLED') => {
    const prompt = nextStatus === 'PAID'
      ? `Đã kiểm tra tài khoản ngân hàng, đúng ${fmt(amount)} và đúng nội dung đơn ${code}?`
      : `Hủy đơn chuyển khoản ${code}?`;
    if (!window.confirm(prompt)) return;

    setPending(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(code)}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Không thể cập nhật thanh toán.');
      setMessage(nextStatus === 'PAID' ? 'Đã ghi nhận thanh toán.' : 'Đã hủy thanh toán.');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể cập nhật thanh toán.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p><b>Trạng thái thanh toán:</b> {LABELS[status] || status}</p>
      {status === 'PAID' && (
        <p className="note">
          Đối soát lúc {confirmedAt || '—'}{confirmedBy ? ` · bởi ${confirmedBy}` : ''}
        </p>
      )}
      {(status === 'PENDING_PAYMENT' || status === 'WAITING_CONFIRMATION') && (
        <>
          <p className="note">Chỉ xác nhận đã nhận tiền sau khi đối chiếu giao dịch trên tài khoản ngân hàng với số tiền {fmt(amount)} và nội dung {code}.</p>
          <div className="row">
            <button type="button" className="btn" disabled={pending} onClick={() => reconcile('PAID')}>
              {pending ? 'Đang cập nhật...' : 'Xác nhận đã nhận tiền'}
            </button>
            <button type="button" className="ghost" disabled={pending} onClick={() => reconcile('CANCELLED')}>
              Hủy đơn chuyển khoản
            </button>
          </div>
        </>
      )}
      {message && <p role="status">{message}</p>}
      {error && <p className="err" role="alert">{error}</p>}
    </div>
  );
}
