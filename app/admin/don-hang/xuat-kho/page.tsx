import Link from "next/link";
import { all, get } from "@/lib/db";
import { getVariants } from "@/lib/inventory";
import { PageHead } from "@/components/admin/Bits";
import PackPanel from "@/components/admin/PackPanel";
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
  const vs = getVariants();
  const variantMap = new Map(vs.map((v) => [v.sku, v]));
  const vm = (s: string) => variantMap.get(s);
  const toPack = all<any>(
    "SELECT o.*, u.name uname FROM orders o JOIN users u ON u.id=o.user_id WHERE o.status=1 ORDER BY o.id",
  );
  const sel = toPack.find((o) => o.code === searchParams.o) || toPack[0];
  const lines = sel
    ? all<any>("SELECT * FROM order_lines WHERE order_id=?", sel.id)
    : [];
  const pick = lines
    .map((l) => {
      const v = vm(l.sku);
      return {
        sku: l.sku,
        qty: l.qty,
        name: v
          ? `${v.productName} · ${v.color} · ${sizeText(v.size)}`
          : l.name,
        shelf: v ? shelfOf(v.productCode, v.size) : "-",
        online: v?.online ?? 0,
      };
    })
    .sort((a, b) => (a.shelf < b.shelf ? -1 : 1));
  const labelOrder = searchParams.label
    ? get<any>(
        "SELECT o.*, u.name uname FROM orders o JOIN users u ON u.id=o.user_id WHERE o.code=? AND o.tracking != ''",
        searchParams.label,
      )
    : null;
  return (
    <>
      <PageHead group="Đơn hàng" title="Xuất kho" />
      <section className="card">
        {!sel ? (
          <span className="note">
            Chưa có đơn nào chờ nhặt hàng. Xác nhận đơn ở mục Đơn hàng để đơn
            xuất hiện ở đây.
          </span>
        ) : (
          <>
            <div
              role="group"
              aria-label="Chọn đơn cần xuất"
              style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
            >
              {toPack.map((o) => (
                <Link
                  key={o.id}
                  href={`/admin/don-hang/xuat-kho?o=${o.code}`}
                  className={"chip" + (o.code === sel.code ? " on" : "")}
                >
                  {o.code} · {o.uname}
                </Link>
              ))}
            </div>
            <span style={{ fontSize: 14 }}>
              Đơn <b>{sel.code}</b> · {sel.uname} · {sel.pay_method}
            </span>
            <PackPanel key={sel.code} code={sel.code} items={pick} />
          </>
        )}
        {labelOrder && (
          <div
            style={{
              width: 340,
              maxWidth: "100%",
              padding: 16,
              border: "1px dashed var(--ink)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span className="eb">Tem vận đơn mẫu · {labelOrder.carrier}</span>
            <b>Giao đến: {labelOrder.recv_name}</b>
            <span style={{ fontSize: 13 }}>
              {labelOrder.recv_phone} · {labelOrder.address}
            </span>
            <span style={{ fontSize: 13 }}>Đơn {labelOrder.code}</span>
            <Barcode text={labelOrder.tracking} />
            <b style={{ fontSize: 14, letterSpacing: ".06em" }}>
              {labelOrder.tracking}
            </b>
          </div>
        )}
      </section>
    </>
  );
}
