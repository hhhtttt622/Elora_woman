import Link from 'next/link';
import { all } from '@/lib/db';
import { getVariants } from '@/lib/inventory';
import { requirePage } from '@/lib/auth';
import { dmy, norm, sizeText } from '@/lib/util';
import { hrefWith, paginate } from '@/lib/url';
import { returnRestock, returnRepair, markReturnReceived } from '@/app/actions/admin';
import { PageContainer, PageHeader } from '@/components/layout/Page';
import DataTable from '@/components/ui/DataTable';
import { FilterChips, Pagination, SearchBar, Tabs } from '@/components/ui/Navigation';
import StatusBadge from '@/components/ui/StatusBadge';
import { Act } from '@/components/admin/Flash';
import ReturnForm from '@/components/admin/ReturnForm';
export const dynamic = 'force-dynamic';

type SP = { tab?: string; s?: string; q?: string; page?: string };
const BASE = '/admin/don-hang/doi-tra';
const WAITING = 'Chờ kiểm tra';
const STATUS_FILTERS = [['', 'Tất cả'], ['wait', WAITING], ['done', 'Đã đóng']] as const;

/** Đơn đã giao kèm các dòng hàng, để chọn trong Modal tiếp nhận. Một truy vấn cho mọi dòng hàng (tránh N+1). */
function deliveredOrders() {
  const skusByOrder = new Map<number, { sku: string; label: string }[]>();
  for (const l of all<any>('SELECT l.order_id, l.sku, l.name FROM order_lines l JOIN orders o ON o.id=l.order_id WHERE o.status=3 ORDER BY l.id')) {
    const item = { sku: l.sku, label: `${l.sku} · ${l.name}` };
    const list = skusByOrder.get(l.order_id);
    if (list) list.push(item); else skusByOrder.set(l.order_id, [item]);
  }
  return all<any>('SELECT id, code, recv_name FROM orders WHERE status=3 ORDER BY id DESC').map((o) => ({
    code: o.code, label: `${o.code} · ${o.recv_name}`, skus: skusByOrder.get(o.id) || [],
  }));
}

// UC-33 Tiếp nhận đổi trả, UC-34 Xử lý hàng đổi trả
export default async function Returns({ searchParams }: { searchParams: SP }) {
  await requirePage('UC-32', BASE);
  const tab = searchParams.tab === 'repair' ? 'repair' : 'returns';
  const vs = getVariants();
  const repair = vs.filter((v) => v.repair > 0);
  let repairUnits = 0;
  for (const v of repair) repairUnits += v.repair;

  // Phiếu chờ kiểm tra lên đầu vì đó là việc cần xử lý.
  const tickets = all<any>(`SELECT r.*, u.name uname FROM return_tickets r JOIN users u ON u.id=r.user_id ORDER BY r.status='${WAITING}' DESC, r.id DESC`);
  const variantMap = new Map(vs.map((v) => [v.sku, v]));
  const q = norm(searchParams.q || '');
  const s = searchParams.s === 'wait' || searchParams.s === 'done' ? searchParams.s : '';
  const found: any[] = [];
  let waiting = 0;
  let waitingFound = 0;
  for (const r of tickets) {
    const isWaiting = r.status === WAITING;
    if (isWaiting) waiting++;
    if (q && !norm(r.order_code).includes(q) && !norm(r.uname).includes(q) && !norm(r.sku).includes(q) && !norm(variantMap.get(r.sku)?.productName || '').includes(q)) continue;
    if (isWaiting) waitingFound++;
    found.push(r);
  }
  const rows = s ? found.filter((r) => (r.status === WAITING) === (s === 'wait')) : found;
  const pg = paginate(rows, searchParams.page);
  const repairPg = paginate(repair, searchParams.page);
  const filterCount = { '': found.length, wait: waitingFound, done: found.length - waitingFound };
  const filtered = !!(q || s);

  return (
    <PageContainer>
      <PageHeader eyebrow="Bán hàng" title="Đổi trả" description="Tiếp nhận hàng khách gửi lại, kiểm tra rồi nhập lại kho hoặc chuyển sửa chữa."
        actions={tab === 'returns' ? <ReturnForm orders={deliveredOrders()} /> : undefined} />
      <Tabs label="Mục đổi trả" current={tab} items={[
        { key: 'returns', label: 'Phiếu đổi trả', href: BASE, count: waiting },
        { key: 'repair', label: 'Kho sửa chữa', href: `${BASE}?tab=repair`, count: repairUnits },
      ]} />

      {tab === 'returns' ? <>
        <div className="ui-toolbar">
          <FilterChips label="Lọc theo trạng thái" current={s} items={STATUS_FILTERS.map(([k, l]) => ({ key: k, label: `${l} (${filterCount[k]})`, href: hrefWith(BASE, searchParams, { s: k || null, page: null }) }))} />
          <SearchBar id="rq" label="Tìm phiếu" placeholder="Mã đơn, khách hàng, SKU hoặc tên" defaultValue={searchParams.q} params={searchParams} keep={['s']} />
        </div>
        <DataTable
          rows={pg.items}
          rowKey={(r) => r.id}
          minWidth={900}
          mobile="cards"
          caption={`${rows.length} phiếu đổi trả`}
          empty={{ title: filtered ? 'Không có phiếu phù hợp' : 'Chưa có phiếu đổi trả nào', description: filtered ? 'Thử bỏ bộ lọc hoặc đổi từ khóa.' : 'Bấm Tạo phiếu đổi trả khi nhận hàng khách gửi lại.', action: filtered ? <Link href={BASE} className="textbtn">Xóa bộ lọc</Link> : undefined }}
          columns={[
            { key: 'order', header: 'Đơn gốc', className: 'nowrap', cell: (r) => <Link href={`/admin/don-hang?order=${r.order_code}`} className="ui-rowlink">{r.order_code}</Link> },
            { key: 'cus', header: 'Khách hàng', cell: (r) => r.uname },
            { key: 'item', header: 'Sản phẩm', cell: (r) => { const v = variantMap.get(r.sku); return <span>{v ? `${v.productName}, ${v.color}, ${sizeText(v.size)}` : r.sku}{v && <><br /><span className="note">{r.sku}</span></>}</span>; } },
            { key: 'reason', header: 'Lý do', cell: (r) => r.reason },
            { key: 'date', header: 'Ngày nhận', className: 'nowrap', cell: (r) => dmy(r.created_at) },
            { key: 'st', header: 'Trạng thái', cell: (r) => <StatusBadge domain="return" value={r.status} /> },
            { key: 'act', header: 'Xử lý', label: '', cell: (r) => (r.status === 'Chờ nhận hàng' ? (
              <Act action={markReturnReceived} args={[r.id]} size="sm" primary label={`Xác nhận đã nhận hàng ${r.sku} đơn ${r.order_code}`}>Xác nhận đã nhận hàng</Act>
            ) : r.status === WAITING ? (
              <span style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
                <Act action={returnRestock} args={[r.id]} size="sm" label={`Nhập lại kho ${r.sku}`} confirm={{ title: `Nhập lại ${r.sku} vào Kho Online?`, message: 'Chỉ chọn khi sản phẩm còn nguyên tem mác. Hàng được cộng vào Kho Online để bán lại và phiếu sẽ đóng.', confirmLabel: 'Nhập lại kho' }}>Nhập lại kho</Act>
                <Act action={returnRepair} args={[r.id]} size="sm" label={`Chuyển sửa chữa ${r.sku}`} confirm={{ title: `Chuyển ${r.sku} sang kho sửa chữa?`, message: 'Chọn khi sản phẩm bị lỗi. Hàng chuyển sang kho thanh lý và sửa chữa, không tính vào tồn bán được, và phiếu sẽ đóng.', confirmLabel: 'Chuyển sửa chữa' }}>Chuyển sửa chữa</Act>
              </span>
            ) : <span>{r.result}{r.processed_at && <><br /><span className="note">{dmy(r.processed_at)}</span></>}</span>) },
          ]}
        />
        <Pagination base={BASE} params={searchParams} {...pg} />
      </> : <>
        <p className="note" style={{ margin: 0 }}>Hàng đổi trả bị lỗi chờ sửa chữa hoặc thanh lý. Số lượng ở đây không tính vào tồn thực tế.</p>
        <DataTable
          rows={repairPg.items}
          rowKey={(v) => v.sku}
          minWidth={640}
          mobile="cards"
          caption={`${repairUnits} sản phẩm, ${repair.length} SKU`}
          empty={{ title: 'Kho sửa chữa đang trống', description: 'Hàng được chuyển vào đây khi bấm Chuyển sửa chữa ở phiếu đổi trả.' }}
          columns={[
            { key: 'sku', header: 'SKU', className: 'nowrap', cell: (v) => <b>{v.sku}</b> },
            { key: 'name', header: 'Sản phẩm', cell: (v) => v.productName },
            { key: 'var', header: 'Biến thể', className: 'nowrap', cell: (v) => `${v.color}, ${sizeText(v.size)}` },
            { key: 'qty', header: 'Số lượng', cell: (v) => v.repair },
          ]}
        />
        <Pagination base={BASE} params={searchParams} {...repairPg} />
      </>}
    </PageContainer>
  );
}
