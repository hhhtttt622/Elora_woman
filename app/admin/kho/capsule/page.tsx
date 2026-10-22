import { all } from '@/lib/db';
import { listVariants, capsuleSets } from '@/lib/inventory';
import { PageHead } from '@/components/admin/Bits';
import { Act } from '@/components/admin/Flash';
import CapsuleBuilder from '@/components/admin/CapsuleBuilder';
import { sellCapsule } from '@/app/actions/admin';
import { fmt, sizeText } from '@/lib/util';
import { can } from '@/lib/permissions';
import { requirePage } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export default async function Capsules({ searchParams }: { searchParams: { add?: string } }) {
  const me = await requirePage('UC-25', '/admin/kho/capsule');
  const vs = listVariants();
  const caps = all<any>('SELECT * FROM capsules ORDER BY id').map((c) => {
    const skus = all<any>('SELECT sku FROM capsule_items WHERE capsule_id=?', c.id).map((r) => r.sku);
    const comps = skus.map((s) => vs.find((v) => v.sku === s)).filter(Boolean) as typeof vs;
    return { ...c, comps, ...capsuleSets(skus), price: comps.reduce((n, v) => n + v.price, 0) };
  });
  const label = (v: (typeof vs)[number]) => `${v.productName} · ${v.color} · ${sizeText(v.size)}`;
  return (
    <>
      <PageHead group="Quản lý kho" title="Combo capsule" note="Capsule là một mã gom nhiều SKU riêng. Khi khách mua cả set, hệ thống trừ kho từng món thành phần. Số set bán được bằng số khả dụng nhỏ nhất ở Kho Online trong các thành phần; thiếu một món thì không trừ món nào." />
      <div className="scroll"><table className="tb" style={{ minWidth: 920 }}><caption>Danh sách capsule</caption>
        <thead><tr><th>Mã</th><th>Tên capsule</th><th>Thành phần</th><th>Set khả dụng</th><th>Giá lẻ cộng lại</th><th>Thao tác</th></tr></thead>
        <tbody>{caps.map((c) => <tr key={c.id}><td style={{ whiteSpace: 'nowrap' }}><b>ELR-CAP-{String(c.id).padStart(2, '0')}</b></td><td style={{ minWidth: 160 }}><b>{c.name}</b></td><td style={{ minWidth: 300, lineHeight: 1.6 }}>{c.comps.map(label).join(' + ')}</td>
          <td><b>{c.sets} set</b><br /><span className="note">{c.limit ? `Món giới hạn: ${c.limit}` : ''}</span></td><td style={{ whiteSpace: 'nowrap' }}>{fmt(c.price)}</td>
          <td><Act action={sellCapsule} args={[c.id]} label={`Bán 1 set ${c.name}`} disabled={c.sets < 1}>Bán 1 set</Act></td></tr>)}</tbody></table></div>
      {can(me.role, 'UC-24') && <CapsuleBuilder options={vs.map((v) => ({ sku: v.sku, label: `${v.sku} · ${label(v)}` }))} initial={searchParams.add ? [searchParams.add] : []} />}
    </>
  );
}
