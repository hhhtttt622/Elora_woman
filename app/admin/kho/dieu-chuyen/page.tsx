import { all } from '@/lib/db';
import { listVariants } from '@/lib/inventory';
import { PageHead } from '@/components/admin/Bits';
import { Act } from '@/components/admin/Flash';
import TransferForm from '@/components/admin/TransferForm';
import { receiveTransfer } from '@/app/actions/admin';
import { LOCS, LOC_KEYS, dmy, sizeText } from '@/lib/util';
import { requirePage } from '@/lib/auth';
export const dynamic = 'force-dynamic';

const DESC: Record<string, [string, string]> = { online: ['Kho bán online', 'Đóng gói đơn đặt qua website và mạng xã hội.'], showroom: ['Kho bán trực tiếp', 'Hàng trưng bày cho khách đến thử đồ và mua trực tiếp.'], repair: ['Kho không bán', 'Hàng đổi trả bị lỗi chờ sửa chữa hoặc thanh lý. Không tính vào tồn Thực tế.'] };

export default async function Locations({ searchParams }: { searchParams: { sku?: string; from?: string; to?: string } }) {
  const me = await requirePage('UC-30', '/admin/kho/dieu-chuyen');
  const vs = listVariants();
  const total = vs.reduce((n, v) => n + v.physical + v.repair, 0);
  const trs = all<any>('SELECT * FROM transfers ORDER BY id DESC');
  return (
    <>
      <PageHead group="Quản lý kho" title="Kho và điều chuyển" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
        {LOC_KEYS.map((k) => { const units = vs.reduce((n, v) => n + v[k], 0); return (
          <div key={k} className="card"><span className="eb">{DESC[k][0]}</span><h2 className="disp" style={{ fontSize: 28, lineHeight: 1.05 }}>{LOCS[k]}</h2><b className="disp" style={{ fontSize: 44, color: 'var(--wine)', lineHeight: 1 }}>{units}</b>
            <span className="note">sản phẩm, {vs.filter((v) => v[k] > 0).length} SKU có hàng, {total ? Math.round((units * 100) / total) : 0}% tổng tồn</span><span className="note">{DESC[k][1]}</span></div>); })}
      </div>
      <TransferForm skus={vs.map((v) => ({ sku: v.sku, label: `${v.sku} · ${v.productName} · ${v.color} · ${sizeText(v.size)}`, online: v.online, showroom: v.showroom }))} init={searchParams} />
      <div className="scroll"><table className="tb" style={{ minWidth: 880 }}><caption>Phiếu điều chuyển</caption>
        <thead><tr><th>Mã phiếu</th><th>Tuyến chuyển</th><th>SKU</th><th>Số lượng</th><th>Ngày tạo</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>{trs.map((t) => <tr key={t.id}><td style={{ whiteSpace: 'nowrap' }}><b>{t.code}</b></td><td style={{ minWidth: 220 }}>{LOCS[t.from_loc]} → {LOCS[t.to_loc]}</td><td style={{ whiteSpace: 'nowrap' }}>{t.sku}</td><td>{t.qty}</td><td style={{ whiteSpace: 'nowrap' }}>{dmy(t.created_at)}</td><td><span className={'badge ' + (t.status === 'Hoàn tất' ? 'dark' : 'sand')}>{t.status}</span></td>
          <td>{t.status === 'Đang chuyển' && <Act action={receiveTransfer} args={[t.id]} label={`Xác nhận nhận hàng ${t.code}`}>Xác nhận nhận hàng</Act>}</td></tr>)}</tbody></table></div>
    </>
  );
}
