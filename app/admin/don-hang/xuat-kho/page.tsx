import { all, get } from "@/lib/db";
import { getVariants } from "@/lib/inventory";
import { PageHead } from "@/components/admin/Bits";
import OutboundWorkspace from "@/components/admin/OutboundWorkspace";
import Barcode from "@/components/admin/Barcode";
import { shelfOf, sizeText } from "@/lib/util";
import { requirePage } from "@/lib/auth";
export const dynamic = "force-dynamic";

export default async function Outbound({
  searchParams,
}: {
  searchParams: { o?: string; label?: string };
}) {
  await requirePage("UC-32", "/admin/don-hang/xuat-kho");
  const variants = new Map(getVariants().map((variant) => [variant.sku, variant]));
  const rows = all<any>(
    `SELECT o.*, u.name uname, COUNT(l.id) line_count, COALESCE(SUM(l.qty), 0) units
     FROM orders o JOIN users u ON u.id=o.user_id
     LEFT JOIN order_lines l ON l.order_id=o.id
     WHERE o.status=1 GROUP BY o.id ORDER BY o.created_at, o.id`,
  );
  const lines = rows.length
    ? all<any>(
        `SELECT l.order_id, l.sku, l.name, l.qty,
          COALESCE(NULLIF(v.image_url, ''), p.image_url, '') image
         FROM order_lines l
         LEFT JOIN variants v ON v.sku=l.sku
         LEFT JOIN products p ON p.id=v.product_id
         WHERE l.order_id IN (${rows.map(() => "?").join(",")})
         ORDER BY l.id`,
        ...rows.map((row) => row.id),
      )
    : [];
  const linesByOrder = new Map<number, any[]>();
  for (const line of lines) {
    const variant = variants.get(line.sku);
    const item = {
      sku: line.sku,
      qty: line.qty,
      name: variant
        ? `${variant.productName} · ${variant.color} · ${sizeText(variant.size)}`
        : line.name,
      shelf: variant ? shelfOf(variant.productCode, variant.size) : "—",
      online: variant?.online ?? 0,
      image: line.image || variant?.image || "",
    };
    const orderLines = linesByOrder.get(line.order_id) || [];
    orderLines.push(item);
    linesByOrder.set(line.order_id, orderLines);
  }
  const orders = rows.map((order) => ({
    id: order.id,
    code: order.code,
    customer: order.recv_name || order.uname,
    createdAt: order.created_at,
    lineCount: order.line_count,
    units: order.units,
    payMethod: order.pay_method,
    items: linesByOrder.get(order.id) || [],
  }));
  const labelOrder = searchParams.label
    ? get<any>(
        "SELECT o.*, u.name uname FROM orders o JOIN users u ON u.id=o.user_id WHERE o.code=? AND o.tracking != ''",
        searchParams.label,
      )
    : null;

  return (
    <>
      <PageHead group="Đơn hàng" title="Xuất kho" />
      <OutboundWorkspace orders={orders} initialCode={searchParams.o} />
      {labelOrder && (
        <section className="outbound-label-card">
          <span className="eb">Tem vận đơn mẫu · {labelOrder.carrier}</span>
          <b>Giao đến: {labelOrder.recv_name}</b>
          <span>{labelOrder.recv_phone} · {labelOrder.address}</span>
          <span>Đơn {labelOrder.code}</span>
          <Barcode text={labelOrder.tracking} />
          <b className="outbound-label-tracking">{labelOrder.tracking}</b>
        </section>
      )}
    </>
  );
}
