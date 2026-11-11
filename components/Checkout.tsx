'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { placeOrderAction } from '@/app/actions/shop';
import { fmt, sizeText, SHIPPING_FEE } from '@/lib/util';

const PAY_METHODS = ['Thanh toán khi nhận hàng', 'Chuyển khoản'] as const;

export default function Checkout({ name, phone }: { name: string; phone: string }) {
  const { lines, clear, ready } = useCart();
  const router = useRouter();
  const [f, setF] = useState({ name, phone, address: '', pay: 'Thanh toán khi nhận hàng', note: '' });
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  const sub = lines.reduce((n, l) => n + l.price * l.qty, 0);
  const set = (k: string) => (e: any) => { setF((prev) => ({ ...prev, [k]: e.target.value })); setErr(''); };

  if (ready && lines.length === 0) return <div className="wrap" style={{ paddingTop: 56 }}><div className="card" style={{ maxWidth: 520, background: '#F6EEEF' }}><b>Giỏ hàng đang trống</b><Link href="/san-pham" className="btn" style={{ alignSelf: 'flex-start' }}>Chọn sản phẩm</Link></div></div>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await placeOrderAction({ lines: lines.map((l) => ({ sku: l.sku, qty: l.qty })), ...f });
      if (r.error) setErr(r.error); else if (r.code) { clear(); router.push(`/thanh-toan/${encodeURIComponent(r.code)}`); }
    });
  };
  return (
    <div className="wrap" style={{ paddingTop: 48, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 className="disp" style={{ fontSize: 'clamp(34px,4vw,52px)' }}>Thanh toán</h1>
      <form onSubmit={submit} style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
        <div style={{ flex: '2 1 480px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="grid">
            <div className="fl"><label className="lbl" htmlFor="co-name">Họ tên người nhận</label><input id="co-name" className="fld" value={f.name} onChange={set('name')} /></div>
            <div className="fl"><label className="lbl" htmlFor="co-phone">Số điện thoại</label><input id="co-phone" className="fld" value={f.phone} onChange={set('phone')} /></div>
          </div>
          <div className="fl"><label className="lbl" htmlFor="co-addr">Địa chỉ giao hàng</label><input id="co-addr" className="fld" value={f.address} onChange={set('address')} placeholder="Số nhà, đường, phường, quận, tỉnh/thành" /></div>
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}><legend className="lbl" style={{ marginBottom: 8 }}>Hình thức thanh toán</legend>
            {PAY_METHODS.map((m) => <label key={m} style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}><input type="radio" name="pay" checked={f.pay === m} onChange={() => setF((prev) => ({ ...prev, pay: m }))} style={{ width: 20, height: 20, accentColor: '#6B2437' }} />{m}</label>)}
            {f.pay === 'Chuyển khoản' ? <p className="note">Thông tin tài khoản nhận tiền: [SỐ TÀI KHOẢN] · [NGÂN HÀNG]. Chưa kết nối cổng thanh toán.</p> : null}</fieldset>
          <div className="fl"><label className="lbl" htmlFor="co-note">Ghi chú</label><textarea id="co-note" className="fld" value={f.note} onChange={set('note')} /></div>
          {err && <p className="err" role="alert">{err}</p>}
        </div>
        <aside className="card" style={{ flex: '1 1 300px', background: '#F6EEEF' }}>
          <h2 className="h2">Đơn hàng của bạn</h2>
          <ul className="list">{lines.map((l) => <li key={l.sku}><span>{l.qty} × {l.name}<br /><span className="note">{l.color} · {sizeText(l.size)}</span></span><b>{fmt(l.price * l.qty)}</b></li>)}</ul>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Phí giao hàng</span><b>{fmt(SHIPPING_FEE)}</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18 }}><span>Tổng cộng</span><b>{fmt(sub + SHIPPING_FEE)}</b></div>
          <button className="btn" disabled={pending}>{pending ? 'Đang đặt hàng...' : 'Đặt hàng'}</button>
        </aside>
      </form>
    </div>
  );
}
