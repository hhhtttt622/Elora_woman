'use client';
import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { createConsultAction } from '@/app/actions/shop';
import type { Res } from '@/app/actions/auth';

const WORK = ['Văn phòng', 'Ngân hàng, tài chính', 'Khách hàng, kinh doanh', 'Giáo dục', 'Y tế', 'Khác'];
const OCC = ['Đi làm hằng ngày', 'Họp và thuyết trình', 'Gặp đối tác', 'Sự kiện công ty', 'Đi công tác'];
const BUDGET = ['Dưới 3 triệu', '3 đến 6 triệu', '6 đến 10 triệu', 'Trên 10 triệu'];
function Submit() { const { pending } = useFormStatus(); return <button className="btn" disabled={pending}>{pending ? 'Đang gửi...' : 'Gửi yêu cầu cho stylist'}</button>; }

export default function ConsultForm({ loggedIn }: { loggedIn: boolean }) {
  const [st, action] = useFormState<Res, FormData>(createConsultAction, {});
  if (!loggedIn) return <div className="card" style={{ background: '#F6EEEF' }}><p>Hãy <Link href="/dang-nhap?next=/tu-van" style={{ textDecoration: 'underline', fontWeight: 600, color: 'var(--wine)' }}>đăng nhập</Link> để gửi yêu cầu tư vấn, stylist sẽ trả lời ngay trong tài khoản của bạn.</p></div>;
  return (
    <form action={action} className="card" style={{ gap: 18 }}>
      <div className="grid">
        <div className="fl"><label className="lbl" htmlFor="workEnv">Môi trường làm việc</label>
          <select id="workEnv" name="workEnv" className="fld" defaultValue="">{<option value="" disabled>Chọn</option>}{WORK.map((w) => <option key={w}>{w}</option>)}</select></div>
        <div className="fl"><label className="lbl" htmlFor="budget">Ngân sách mỗi bộ</label>
          <select id="budget" name="budget" className="fld" defaultValue=""><option value="" disabled>Chọn</option>{BUDGET.map((w) => <option key={w}>{w}</option>)}</select></div>
        <div className="fl"><label className="lbl" htmlFor="height">Chiều cao (cm)</label><input id="height" name="height" type="number" className="fld" /></div>
        <div className="fl"><label className="lbl" htmlFor="weight">Cân nặng (kg)</label><input id="weight" name="weight" type="number" className="fld" /></div>
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="lbl" style={{ marginBottom: 8 }}>Dịp cần trang phục</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>{OCC.map((o) => (<label key={o} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" name="occasions" value={o} style={{ width: 20, height: 20, accentColor: '#6B2437' }} />{o}</label>))}</div></fieldset>
      <div className="fl"><label className="lbl" htmlFor="note">Mong muốn thêm</label><textarea id="note" name="note" className="fld" placeholder="Ví dụ: văn phòng lạnh, cần áo khoác mỏng; thích tông be và xám" /></div>
      {st.error && <p className="err" role="alert">{st.error}</p>}
      {st.ok && <p className="ok" role="status">{st.msg}</p>}
      <Submit />
    </form>
  );
}
