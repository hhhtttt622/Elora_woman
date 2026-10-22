'use client';
import { useState } from 'react';
import { useRun } from './Flash';
import { assignStylist, saveConsult, sendConsultSet } from '@/app/actions/admin';

type Cand = { sku: string; label: string };
type Pick = { sku: string; label: string; priceText: string; availText: string };

/** UC-12 luồng 5a: admin phân công hoặc đổi stylist. */
export function AssignStylist({ id, current, stylists }: { id: number; current: number | ''; stylists: { id: number; name: string }[] }) {
  const { run, pending } = useRun();
  const [sel, setSel] = useState(String(current || stylists[0]?.id || ''));
  return (
    <div className="row">
      <div className="fl" style={{ maxWidth: 300, flex: '1 1 220px' }}>
        <label className="lbl" htmlFor="cs-stylist">{current ? 'Đổi stylist phụ trách' : 'Phân công stylist'}</label>
        <select id="cs-stylist" className="fld" value={sel} onChange={(e) => setSel(e.target.value)}>{stylists.length ? stylists.map((s) => <option key={s.id} value={s.id}>{s.name}</option>) : <option value="">Chưa có stylist đang hoạt động</option>}</select>
      </div>
      <button type="button" className="ghost" style={{ minHeight: 44 }} disabled={pending || !sel || sel === String(current)} onClick={() => run(assignStylist(id, parseInt(sel, 10)))}>Lưu phân công</button>
    </div>);
}

/** UC-13 soạn set nháp và UC-14 gửi gợi ý. */
export default function ConsultPanel({ id, message: m0, picks: p0, cands, hasHolds }: { id: number; message: string; picks: Pick[]; cands: Cand[]; hasHolds: boolean }) {
  const { run, pending } = useRun();
  const [message, setMessage] = useState(m0);
  const [add, setAdd] = useState(cands[0]?.sku || '');
  const [hours, setHours] = useState('24');
  const skus = p0.map((p) => p.sku);
  const save = (picks = skus) => run(saveConsult(id, { message, picks }));
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="lbl">Sản phẩm trong set gợi ý</span>
        {!p0.length && <span className="note">Chưa chọn sản phẩm nào.</span>}
        <ul className="list">{p0.map((p) => <li key={p.sku}><span>{p.label} · {p.priceText}<br /><span className="note">{p.sku} · {p.availText}</span></span><button type="button" className="textbtn" onClick={() => save(skus.filter((s) => s !== p.sku))} aria-label={`Bỏ ${p.label}`}>Bỏ</button></li>)}</ul>
        <div className="row">
          <div className="fl" style={{ flex: '1 1 260px' }}><label className="lbl" htmlFor="cs-add" style={{ fontWeight: 500 }}>Thêm sản phẩm còn hàng</label>
            <select id="cs-add" className="fld" value={add} onChange={(e) => setAdd(e.target.value)}>{cands.length ? cands.map((c) => <option key={c.sku} value={c.sku}>{c.label}</option>) : <option value="">Không có sản phẩm phù hợp còn hàng</option>}</select></div>
          <button type="button" className="ghost" style={{ minHeight: 44 }} disabled={!add || pending} onClick={() => save([...skus, add])}>Thêm vào set</button>
        </div>
      </div>
      <div className="fl"><label className="lbl" htmlFor="cs-msg">Lời nhắn gửi khách</label><textarea id="cs-msg" className="fld" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ví dụ: Với buổi họp sáng Thứ Hai, chị thử set này..." /></div>
      <div className="fl" style={{ maxWidth: 300 }}><label className="lbl" htmlFor="cs-hours">Giữ hàng cho khách</label><select id="cs-hours" className="fld" value={hours} onChange={(e) => setHours(e.target.value)}><option value="24">24 giờ</option><option value="48">48 giờ</option></select></div>
      <span className="note">Khi gửi gợi ý, mỗi món trong set được giữ 1 sản phẩm. Hết thời hạn mà khách chưa chốt, hệ thống tự nhả hàng về kho bán.{hasHolds ? ' Gửi lại chỉ gia hạn thời gian giữ, không giữ thêm.' : ''}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <button type="button" className="ghost" style={{ minHeight: 48 }} disabled={pending} onClick={() => save()}>Lưu nháp</button>
        <button type="button" className="btn" disabled={pending || !p0.length} onClick={async () => { const r = await run(saveConsult(id, { message, picks: skus })); if (!r.error) await run(sendConsultSet(id, parseInt(hours, 10))); }}>Gửi gợi ý và giữ hàng</button>
      </div>
    </>
  );
}
