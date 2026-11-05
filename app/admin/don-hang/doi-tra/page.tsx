import { all } from "@/lib/db";
import { getVariants } from "@/lib/inventory";
import { PageHead } from "@/components/admin/Bits";
import { Act } from "@/components/admin/Flash";
import ReturnForm from "@/components/admin/ReturnForm";
import { returnRestock, returnRepair } from "@/app/actions/admin";
import { sizeText } from "@/lib/util";
import { requirePage } from "@/lib/auth";
export const dynamic = "force-dynamic";

export default async function Returns() {
  await requirePage("UC-32", "/admin/don-hang/doi-tra");
  const vs = getVariants();
  // Một truy vấn cho mọi dòng hàng của đơn đã giao, gom theo đơn (tránh N+1 truy vấn).
  const skusByOrder = new Map<number, { sku: string; label: string }[]>();
  for (const l of all<any>(
    "SELECT l.order_id, l.sku, l.name FROM order_lines l JOIN orders o ON o.id=l.order_id WHERE o.status=3 ORDER BY l.id",
  )) {
    let list = skusByOrder.get(l.order_id);
    if (!list) skusByOrder.set(l.order_id, (list = []));
    list.push({ sku: l.sku, label: `${l.sku} · ${l.name}` });
  }
  const delivered = all<any>(
    "SELECT id, code, recv_name FROM orders WHERE status=3 ORDER BY id DESC",
  ).map((o) => ({
    code: o.code,
    label: `${o.code} · ${o.recv_name}`,
    skus: skusByOrder.get(o.id) || [],
  }));
  const rts = all<any>(
    "SELECT r.*, u.name uname FROM return_tickets r JOIN users u ON u.id=r.user_id ORDER BY r.id DESC",
  );
  const repair = vs.filter((v) => v.repair > 0);
  return (
    <>
      <PageHead group="Đơn hàng" title="Đổi trả" />
      <section className="card">
        <h2 className="h2">Tiếp nhận hàng đổi trả</h2>
        <ReturnForm orders={delivered} />
        <div className="scroll">
          <table className="tb" style={{ minWidth: 900 }}>
            <caption>Phiếu đổi trả</caption>
            <thead>
              <tr>
                <th>Đơn gốc</th>
                <th>Khách hàng</th>
                <th>SKU</th>
                <th>Lý do</th>
                <th>Trạng thái</th>
                <th>Kết quả xử lý</th>
              </tr>
            </thead>
            <tbody>
              {rts.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <b>{r.order_code}</b>
                  </td>
                  <td>{r.uname}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{r.sku}</td>
                  <td>{r.reason}</td>
                  <td>
                    <span
                      className={
                        "badge " +
                        (r.status === "Chờ kiểm tra" ? "pink" : "dark")
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {r.status === "Chờ kiểm tra" && (
                      <>
                        <Act
                          action={returnRestock}
                          args={[r.id]}
                          label={`Còn nguyên tem mác, nhập lại kho ${r.sku}`}
                        >
                          Còn nguyên tem, nhập lại kho
                        </Act>{" "}
                        <Act
                          action={returnRepair}
                          args={[r.id]}
                          label={`Sản phẩm lỗi, chuyển sửa chữa ${r.sku}`}
                        >
                          Lỗi, chuyển sửa chữa
                        </Act>
                      </>
                    )}
                    {r.result}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <span className="lbl">
            Kho thanh lý và sửa chữa ({repair.reduce((n, v) => n + v.repair, 0)}{" "}
            sản phẩm)
          </span>
          {!repair.length && <p className="note">Chưa có sản phẩm nào.</p>}
          <ul className="list">
            {repair.map((v) => (
              <li key={v.sku}>
                {v.repair} × <b>{v.sku}</b> · {v.productName} · {v.color} ·{" "}
                {sizeText(v.size)}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
