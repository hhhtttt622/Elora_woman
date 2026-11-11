"use client";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { fmt, sizeText, SHIPPING_FEE } from "@/lib/util";
import { useState, useTransition } from 'react';
import { quotePromotionAction } from '@/app/actions/promotions';

export default function CartPage() {
  const { lines, setQty, remove, ready } = useCart();
  const [promo, setPromo] = useState(''); const [quote, setQuote] = useState<{name:string;discount:number}|null>(null); const [promoError, setPromoError] = useState(''); const [pending, start] = useTransition();
  const sub = lines.reduce((n, l) => n + l.price * l.qty, 0);
  return (
    <div
      className="wrap"
      style={{
        paddingTop: 48,
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <h1 className="disp" style={{ fontSize: "clamp(34px,4vw,52px)" }}>
        Giỏ hàng
      </h1>
      {ready && lines.length === 0 ? (
        <div className="card" style={{ background: "#F6EEEF", maxWidth: 520 }}>
          <b>Giỏ hàng đang trống</b>
          <Link
            href="/san-pham"
            className="btn"
            style={{ alignSelf: "flex-start" }}
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 32,
            alignItems: "flex-start",
          }}
        >
          <div className="scroll" style={{ flex: "2 1 560px" }}>
            <table className="tb">
              <caption>Sản phẩm trong giỏ</caption>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Đơn giá</th>
                  <th>Số lượng</th>
                  <th>Thành tiền</th>
                  <th>
                    <span className="sr">Xóa</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.sku}>
                    <td>
                      <Link href={`/san-pham/${l.slug}`}>
                        <b>{l.name}</b>
                      </Link>
                      <br />
                      <span className="note">
                        {l.color} · {sizeText(l.size)}
                      </span>
                    </td>
                    <td>{fmt(l.price)}</td>
                    <td>
                      <input
                        aria-label={`Số lượng ${l.name}`}
                        type="number"
                        min={1}
                        max={10}
                        className="fld"
                        style={{ width: 80 }}
                        value={l.qty}
                        onChange={(e) =>
                          (setQty(l.sku, parseInt(e.target.value, 10) || 1), setQuote(null), setPromoError(''))
                        }
                      />
                    </td>
                    <td>
                      <b>{fmt(l.price * l.qty)}</b>
                    </td>
                    <td>
                      <button className="textbtn" onClick={() => { remove(l.sku); setQuote(null); setPromoError(''); }}>
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            <aside
            className="card"
            style={{ flex: "1 1 300px", background: "#F6EEEF" }}
          >
            <h2 className="h2">Tóm tắt đơn hàng</h2>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Tạm tính</span>
              <b>{fmt(sub)}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Phí giao hàng</span>
              <b>{fmt(SHIPPING_FEE)}</b>
            </div>
            <div className="fl"><label className="lbl" htmlFor="cart-promo">Mã ưu đãi</label><div style={{display:'flex',gap:8}}><input id="cart-promo" className="fld" value={promo} onChange={(e)=>{setPromo(e.target.value);setQuote(null);setPromoError('');}} placeholder="Nhập mã giảm giá" /><button className="ghost" type="button" disabled={pending||!promo.trim()} onClick={()=>start(async()=>{const r=await quotePromotionAction(promo,lines.map((l)=>({sku:l.sku,qty:l.qty})));if(r.error){setPromoError(r.error);setQuote(null);}else{setPromoError('');setQuote(r.quote!);}})}>{pending?'…':'Áp dụng'}</button></div>{promoError&&<span className="err" role="alert">{promoError}</span>}</div>
            {quote&&<div style={{display:'flex',justifyContent:'space-between'}}><span>{quote.name} ({promo.toUpperCase()})</span><b>−{fmt(quote.discount)}</b></div>}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 18,
                borderTop: "1px solid var(--ink)",
                paddingTop: 12,
              }}
            >
              <span>Tổng cộng</span>
              <b>{fmt(sub + SHIPPING_FEE - (quote?.discount||0))}</b>
            </div>
            <Link href={`/thanh-toan${quote?`?promo=${encodeURIComponent(promo.trim().toUpperCase())}`:''}`} className="btn">Tiến hành thanh toán</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
