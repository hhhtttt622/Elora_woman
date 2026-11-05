import { getUser } from '@/lib/auth';
import ConsultForm from '@/components/ConsultForm';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const u = await getUser();
  return (
    <div className="wrap" style={{ paddingTop: 56, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 860 }}>
      <span className="eb">Tư vấn phối đồ cá nhân</span>
      <h1 className="disp" style={{ fontSize: 'clamp(36px,5vw,60px)', lineHeight: 1 }}>Nhận set đồ từ stylist</h1>
      <p className="note">Giai đoạn đầu, stylist phối thủ công dựa trên thông tin bạn cung cấp. Bạn sẽ nhận gợi ý trong tài khoản của mình.</p>
      {u && u.role !== 'customer' ? <div className="card" style={{ background: '#F6EEEF' }}>Yêu cầu tư vấn chỉ dành cho tài khoản khách hàng.</div> : <ConsultForm loggedIn={!!u} />}
    </div>
  );
}
