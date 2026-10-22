import Link from 'next/link';
import { all, get } from '@/lib/db';
import { PageHead } from '@/components/admin/Bits';
import { Act } from '@/components/admin/Flash';
import PoForm from '@/components/admin/PoForm';
import QcPanel from '@/components/admin/QcPanel';
import { advancePo, markWorkshopReturn } from '@/app/actions/admin';
import { PO_STATUS, fmt, sizeText, dmy } from '@/lib/util';
import { requirePage } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export default async function Po({ searchParams }: { searchParams: { qc?: string; sku?: string } }) {
  const me = await requirePage('UC-26', '/admin/kho/dat-may');
  const pos = all<any>('SELECT p.*, pr.name pname FROM purchase_orders p JOIN products pr ON pr.id=p.product_id ORDER BY p.id DESC').map((p) => ({ ...p, lines: all<any>('SELECT size, qty FROM po_lines WHERE po_id=? ORDER BY id', p.id) }));
  const qc = searchParams.qc ? pos.find((p) => p.code === searchParams.qc && p.status === 2) : null;
  const products = all<any>('SELECT id,name,category FROM products ORDER BY id');
  const pre = searchParams.sku ? get<any>('SELECT product_id pid, color, size FROM variants WHERE sku=?', searchParams.sku) : null;
  const wr = all<any>('SELECT * FROM workshop_returns ORDER BY id DESC');
  const cls = ['pink', 'sand', '', 'dark'];
  return (
    <>
      <PageHead group="Quản lý kho" title="Đặt may và nhập kho" />
      <div className="scroll"><table className="tb" style={{ minWidth: 1100 }}><caption>Lệnh đặt may (Purchase Orders)</caption>
        <thead><tr><th>Mã PO</th><th>Xưởng may</th><th>Mẫu thiết kế</th><th>Số lượng theo size</th><th>Chi phí gia công</th><th>Hẹn giao</th><th>Tiến độ</th><th>Thao tác</th></tr></thead>
        <tbody>{pos.map((p) => { const total = p.lines.reduce((n: number, l: any) => n + l.qty, 0); return (
          <tr key={p.id}><td style={{ whiteSpace: 'nowrap' }}><b>{p.code}</b></td><td>{p.workshop}</td><td style={{ minWidth: 200 }}>{p.pname} · {p.color}</td><td>{p.lines.map((l: any) => `${sizeText(l.size)}: ${l.qty}`).join(', ')} (tổng {total})</td><td style={{ whiteSpace: 'nowrap' }}>{fmt(p.cost * total)}</td><td style={{ whiteSpace: 'nowrap' }}>{p.due}</td>
            <td><span className={'badge ' + cls[p.status]}>{PO_STATUS[p.status]}</span></td>
            <td style={{ whiteSpace: 'nowrap' }}>{p.status < 2 && <Act action={advancePo} args={[p.code]} label={`Chuyển ${PO_STATUS[p.status + 1]} ${p.code}`}>Chuyển: {PO_STATUS[p.status + 1]}</Act>}
              {p.status === 2 && <Link href={`/admin/kho/dat-may?qc=${p.code}`} className="btn" style={{ minHeight: 40, fontSize: 12 }}>Kiểm hàng nhập</Link>}{p.status === 3 && <span className="note">Đã nhập kho</span>}</td></tr>); })}</tbody></table></div>
      {qc && <QcPanel key={qc.code} code={qc.code} title={`${qc.code} · ${qc.pname} · ${qc.color}`} lines={qc.lines} />}
      <PoForm key={searchParams.sku || 'new'} products={products} init={{ pid: pre ? String(pre.pid) : '', color: pre?.color || '', size: pre?.size || '' }} />
      <section className="card"><h2 className="h2">Phiếu trả xưởng sửa</h2>{!wr.length && <span className="note">Chưa có phiếu nào.</span>}
        <ul className="list">{wr.map((w) => <li key={w.id}><span><b>{w.code}</b> · {w.po_code}<br /><span className="note">{w.text}{w.returned_at ? ` · trả ngày ${dmy(w.returned_at)}` : ''}</span></span><span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span className={'badge ' + (w.status === 'Đã trả xưởng' ? 'dark' : 'pink')}>{w.status}</span>{w.status !== 'Đã trả xưởng' && <Act action={markWorkshopReturn} args={[w.id]}>Đánh dấu đã trả</Act>}</span></li>)}</ul></section>
    </>
  );
}
