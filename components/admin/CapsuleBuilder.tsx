'use client';
import { useMemo, useState } from 'react';
import { useRun } from './Flash';
import { saveCapsule } from '@/app/actions/admin';

export default function CapsuleBuilder({ options, initial }: { options: { sku: string; label: string }[]; initial: string[] }) {
  const { run, pending } = useRun();
  const [name, setName] = useState('');
  const [comps, setComps] = useState<string[]>(initial);
  const [add, setAdd] = useState(options[0]?.sku || '');
  const [err, setErr] = useState('');
  const optionsMap = useMemo(() => new Map(options.map((o) => [o.sku, o.label])), [options]);
  const label = (s: string) => optionsMap.get(s) || s;
  return (
    <section className="card"><h2 className="h2">Tạo capsule mới</h2>
      <div className="fl" style={{ maxWidth: 420 }}><label className="lbl" htmlFor="cap-name">Tên capsule</label><input id="cap-name" className="fld" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Capsule công tác" /></div>
      <div><span className="lbl">Thành phần ({comps.length} món)</span>
        {comps.length === 0 ? <p className="note">Chưa thêm món nào.</p> : null}
        <ul className="list">{comps.map((s) => <li key={s}><span>{label(s)}</span><button className="textbtn" type="button" onClick={() => setComps((prev) => prev.filter((x) => x !== s))} aria-label={`Bỏ ${s}`}>Bỏ</button></li>)}</ul></div>
      <div className="row">
        <div className="fl" style={{ flex: '1 1 300px' }}><label className="lbl" htmlFor="cap-add" style={{ fontWeight: 500 }}>Thêm SKU vào capsule</label><select id="cap-add" className="fld" value={add} onChange={(e) => setAdd(e.target.value)}>{options.map((o) => <option key={o.sku} value={o.sku}>{o.label}</option>)}</select></div>
        <button type="button" className="ghost" style={{ minHeight: 44 }} onClick={() => { if (comps.includes(add)) setErr('SKU này đã có trong capsule.'); else { setComps((prev) => [...prev, add]); setErr(''); } }}>Thêm món</button>
        <button type="button" className="btn" disabled={pending} onClick={async () => { const r = await run(saveCapsule(name, comps)); setErr(r.error || ''); if (r.ok) { setName(''); setComps([]); } }}>Lưu capsule</button>
      </div>
      {err && <p className="err" role="alert">{err}</p>}
    </section>);
}
