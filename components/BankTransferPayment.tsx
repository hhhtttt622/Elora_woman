'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fmt } from '@/lib/util';

type Props = {
  code: string;
  amount: number;
  deadline: string | null;
  paymentStatus: string;
  qrUrl: string | null;
  accountName: string | null;
  accountNo: string | null;
  bankBin: string | null;
};

const WAITING = 'WAITING_CONFIRMATION';
const PAID = 'PAID';
const CANCELLED = 'CANCELLED';

export default function BankTransferPayment(props: Props) {
  const [status, setStatus] = useState(props.paymentStatus);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => setStatus(props.paymentStatus), [props.paymentStatus]);
  useEffect(() => {
    if (!props.deadline || status !== 'PENDING_PAYMENT') return;
    const update = () => setRemainingSeconds(Math.max(0, Math.ceil((new Date(props.deadline!).getTime() - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [props.deadline, status]);
  useEffect(() => {
    if (status === 'PENDING_PAYMENT' && remainingSeconds === 0) router.refresh();
  }, [remainingSeconds, router, status]);

  const confirmPayment = async () => {
    setPending(true);
    setError('');
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(props.code)}/payment-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.paymentStatus) setStatus(result.paymentStatus);
        throw new Error(result.error || 'Không thể gửi xác nhận thanh toán.');
      }
      setStatus(result.paymentStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể gửi xác nhận thanh toán.');
    } finally {
      setPending(false);
    }
  };

  const remaining = remainingSeconds ?? 15 * 60;
  const expired = status === CANCELLED || (status === 'PENDING_PAYMENT' && remainingSeconds === 0);
  const timeLabel = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;

  return (
    <main className="wrap" style={{ paddingTop: 48, paddingBottom: 64, maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <span className="eb">Thanh toán chuyển khoản</span>
      <h1 className="disp" style={{ fontSize: 'clamp(34px,4vw,48px)', lineHeight: 1 }}>Đơn hàng {props.code}</h1>
      {status === PAID ? (
        <div className="card"><b>Đã nhận thanh toán</b><p className="note">Cửa hàng đã đối soát khoản chuyển khoản của bạn.</p></div>
      ) : status === WAITING ? (
        <div className="card"><b>Đang chờ đối soát</b><p className="note">Cửa hàng sẽ kiểm tra giao dịch và cập nhật trạng thái đơn hàng.</p></div>
      ) : expired ? (
        <div className="card"><b>Đơn thanh toán đã hết hạn</b><p className="note">Đơn hàng đã được hủy để giải phóng sản phẩm. Nếu bạn đã chuyển tiền, vui lòng liên hệ cửa hàng và cung cấp mã đơn.</p></div>
      ) : (
        <>
          <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 24 }}>
            <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              {props.qrUrl ? <img src={props.qrUrl} alt={`Mã VietQR thanh toán đơn ${props.code}`} width={260} height={260} style={{ maxWidth: '100%', height: 'auto', border: '1px solid #E5DADD', borderRadius: 8 }} /> : <p className="err" role="alert">Thiếu thông tin tài khoản nhận tiền, không thể tạo mã QR.</p>}
              <span className="note">Mở ứng dụng ngân hàng và quét mã QR</span>
            </section>
            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><span className="note">Số tiền cần thanh toán</span><div style={{ fontSize: 24, fontWeight: 700 }}>{fmt(props.amount)}</div></div>
              <div><span className="note">Nội dung chuyển khoản</span><div style={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{props.code}</div></div>
              <div><span className="note">Ngân hàng nhận</span><div>{props.bankBin || '—'}</div></div>
              <div><span className="note">Số tài khoản</span><div>{props.accountNo || '—'}</div></div>
              <div><span className="note">Chủ tài khoản</span><div>{props.accountName || '—'}</div></div>
              <div><span className="note">Thời gian thanh toán còn lại</span><div aria-live="polite" style={{ fontSize: 24, fontWeight: 700 }}>{timeLabel}</div></div>
              <button type="button" className="btn" disabled={pending || !props.qrUrl || remaining <= 0} onClick={confirmPayment}>
                {pending ? 'Đang gửi...' : 'Tôi đã thanh toán'}
              </button>
              {error && <p className="err" role="alert">{error}</p>}
            </section>
          </div>
          <p className="note">Chỉ bấm xác nhận sau khi đã chuyển khoản. Việc này thông báo cho nhân viên kiểm tra giao dịch, không tự động xác nhận tiền đã vào.</p>
        </>
      )}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/tai-khoan?tab=track" className="btn">Theo dõi đơn hàng</Link>
        <Link href="/san-pham" className="ghost" style={{ minHeight: 48 }}>Tiếp tục mua sắm</Link>
      </div>
    </main>
  );
}
