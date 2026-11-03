import Link from "next/link";
import { all } from "@/lib/db";
import { requirePage } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { listVariants } from "@/lib/inventory";
import { PageHead } from "@/components/admin/Bits";
import { Act } from "@/components/admin/Flash";
import { setOrderStatus } from "../actions/admin";
import { HOLD_STATUS, fmt, dmy, dmyHm, hoursLeft, nowIso } from "@/lib/util";
export const dynamic = "force-dynamic";

// UC-20 Xem tổng quan công việc: mỗi vai trò thấy việc cần làm của mình
export default async function Overview({ searchParams }: { searchParams: { period?: string; sort?: string } }) {
  const u = await requirePage("UC-20", "/admin");
  const sales = can(u.role, "UC-17"),
    styling = can(u.role, "UC-12"),
    admin = u.role === "admin";
  const orders = sales
    ? all<any>(
        "SELECT o.*, u.name uname FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.id DESC",
      )
    : [];
  const pending = orders.filter((o) => o.status === 0);
  const toPack = orders.filter((o) => o.status === 1);
  const delivered = orders.filter((o) => o.status === 3);
  const period = searchParams.period === "week" ? "week" : searchParams.period === "year" ? "year" : "month";
  const sort = searchParams.sort === "asc" ? "asc" : "desc";
  const periodStart = new Date();
  periodStart.setHours(0, 0, 0, 0);
  if (period === "week") periodStart.setDate(periodStart.getDate() - ((periodStart.getDay() + 6) % 7));
  else if (period === "month") periodStart.setDate(1);
  else periodStart.setMonth(0, 1);
  const startIso = periodStart.toISOString();
  const endIso = new Date().toISOString();
  const periodDelivered = admin
    ? delivered.filter((o) => o.delivered_at >= startIso && o.delivered_at <= endIso)
    : [];
  const periodRevenue = periodDelivered.reduce((n, o) => n + o.total, 0);
  const periodShipping = periodDelivered.reduce((n, o) => n + o.shipping_fee, 0);
  const periodGoods = periodRevenue - periodShipping;
  const periodLabel = period === "week" ? "tuần này" : period === "month" ? "tháng này" : "năm nay";
  const periodOrderIds = periodDelivered.map((o) => o.id);
  const direction = sort === "asc" ? "ASC" : "DESC";
  const bestProducts = periodOrderIds.length
    ? all<any>(
        `SELECT COALESCE(p.name, ol.name) name, SUM(ol.qty) quantity, SUM(ol.qty * ol.price) amount
         FROM order_lines ol
         LEFT JOIN variants v ON v.sku=ol.sku
         LEFT JOIN products p ON p.id=v.product_id
         WHERE ol.order_id IN (${periodOrderIds.map(() => "?").join(",")})
         GROUP BY COALESCE(p.id, ol.sku), COALESCE(p.name, ol.name)
         ORDER BY quantity ${direction}, amount ${direction}
         LIMIT 10`,
        ...periodOrderIds,
      )
    : [];
  const qc = sales
    ? all<any>(
        "SELECT p.code, pr.name pname, p.color FROM purchase_orders p JOIN products pr ON pr.id=p.product_id WHERE p.status=2",
      )
    : [];
  const low = sales
    ? listVariants().filter((v) => v.available < v.minStock)
    : [];
  const mine = admin ? "" : ` AND c.stylist_id=${u.id}`;
  const fresh = styling
    ? all<any>(
        "SELECT c.*, u.name uname FROM consults c JOIN users u ON u.id=c.user_id WHERE c.status='Mới' AND c.stylist_id IS NULL ORDER BY c.id DESC",
      )
    : [];
  const working = styling
    ? all<any>(
        `SELECT c.*, u.name uname FROM consults c JOIN users u ON u.id=c.user_id WHERE c.status='Đang phối'${mine} ORDER BY c.id DESC`,
      )
    : [];
  const expiring = styling
    ? all<any>(
        `SELECT h.*, u.name uname FROM holds h JOIN consults c ON c.id=h.consult_id JOIN users u ON u.id=c.user_id
    WHERE h.status=? AND h.expires_at > ?${mine} ORDER BY h.expires_at`,
        HOLD_STATUS.active,
        nowIso(),
      ).filter((h) => hoursLeft(h.expires_at) <= 6)
    : [];
  const kpis: [string, string | number, string][] = [
    ...(sales
      ? ([
          ["Đơn chờ xác nhận", pending.length, "Cần xác nhận trong ngày"],
          ["Đơn chờ xuất kho", toPack.length, "Đã xác nhận, chờ đóng gói"],
          ["Phiếu chờ kiểm hàng", qc.length, "Xưởng đã giao đến kho"],
          ["SKU dưới ngưỡng", low.length, "Cần đặt may thêm"],
        ] as [string, number, string][])
      : []),
    ...(styling
      ? ([
          ["Yêu cầu tư vấn mới", fresh.length, "Chưa có stylist nhận"],
          [
            admin ? "Yêu cầu đang phối" : "Yêu cầu bạn đang phối",
            working.length,
            "Cần soạn và gửi set",
          ],
          ["Lệnh giữ sắp hết hạn", expiring.length, "Còn từ 6 giờ trở xuống"],
        ] as [string, number, string][])
      : []),
    ...(admin
      ? ([
          [
            "Doanh thu đơn đã giao",
            fmt(periodRevenue),
            `${periodDelivered.length} đơn đã giao trong ${periodLabel}`,
          ],
        ] as [string, string, string][])
      : []),
  ];
  const card = { flex: "1 1 340px" };
  return (
    <>
      <PageHead group="Tổng quan" title="Việc cần làm" />
      <div className="kpis">
        {kpis.map(([l, v, n]) => (
          <div key={l} className="kpi">
            <span className="lbl">{l}</span>
            <b>{v}</b>
            <span className="note">{n}</span>
          </div>
        ))}
      </div>
      {admin && (
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="eb">Tài chính</span>
              <h2 className="disp" style={{ fontSize: 32, lineHeight: 1 }}>Doanh thu đơn đã giao</h2>
            </div>
            <form method="get" className="row" aria-label="Lọc doanh thu và sản phẩm bán chạy">
              <div className="fl"><label className="lbl" htmlFor="ov-period">Khoảng thời gian</label><select id="ov-period" name="period" className="fld" defaultValue={period}><option value="week">Tuần này</option><option value="month">Tháng này</option><option value="year">Năm nay</option></select></div>
              <div className="fl"><label className="lbl" htmlFor="ov-sort">Xếp hạng bán chạy</label><select id="ov-sort" name="sort" className="fld" defaultValue={sort}><option value="desc">Số lượng bán cao đến thấp</option><option value="asc">Số lượng bán thấp đến cao</option></select></div>
              <button className="btn">Lọc</button>
            </form>
          </div>
          <p className="note">Tính theo ngày giao từ {dmy(startIso)} đến {dmy(endIso)}. Tổng thu gồm tiền hàng và phí giao hàng.</p>
          <div className="kpis">
            <div className="kpi"><span className="lbl">Tiền hàng</span><b>{fmt(periodGoods)}</b><span className="note">Giá trị sản phẩm đã giao</span></div>
            <div className="kpi"><span className="lbl">Phí giao hàng</span><b>{fmt(periodShipping)}</b><span className="note">Thu từ các đơn trong kỳ</span></div>
            <div className="kpi"><span className="lbl">Tổng thu</span><b>{fmt(periodRevenue)}</b><span className="note">{periodDelivered.length} đơn đã giao</span></div>
            <div className="kpi"><span className="lbl">Giá trị đơn trung bình</span><b>{fmt(periodDelivered.length ? periodRevenue / periodDelivered.length : 0)}</b><span className="note">Tổng thu chia số đơn</span></div>
          </div>
          {!periodDelivered.length ? (
            <div className="card" style={{ background: "#F6EEEF" }}>Không có đơn đã giao trong khoảng thời gian này.</div>
          ) : (
            <>
              <div className="scroll"><table className="tb" style={{ minWidth: 960 }}><caption>Dòng tiền theo đơn đã giao</caption>
                <thead><tr><th>Ngày giao</th><th>Mã đơn</th><th>Khách hàng</th><th>Thanh toán</th><th>Tiền hàng</th><th>Phí giao</th><th>Tổng thu</th></tr></thead>
                <tbody>{periodDelivered.map((o) => <tr key={o.id}><td style={{ whiteSpace: "nowrap" }}>{dmyHm(o.delivered_at)}</td><td><b>{o.code}</b></td><td>{o.uname}</td><td>{o.pay_method}</td><td>{fmt(o.total - o.shipping_fee)}</td><td>{fmt(o.shipping_fee)}</td><td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{fmt(o.total)}</td></tr>)}</tbody></table></div>
              <div className="scroll"><table className="tb" style={{ minWidth: 720 }}><caption>Sản phẩm bán chạy · {sort === "desc" ? "số lượng cao đến thấp" : "số lượng thấp đến cao"}</caption>
                <thead><tr><th>Hạng</th><th>Sản phẩm</th><th>Số lượng bán</th><th>Tiền hàng</th></tr></thead>
                <tbody>{bestProducts.map((p, index) => <tr key={p.name}><td>{index + 1}</td><td><b>{p.name}</b></td><td>{p.quantity}</td><td>{fmt(p.amount)}</td></tr>)}</tbody></table></div>
            </>
          )}
        </section>
      )}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        {sales && (
          <>
            <section className="card" style={card}>
              <h2 className="h2">Đơn chờ xác nhận</h2>
              {!pending.length && (
                <span className="note">Không có đơn nào đang chờ.</span>
              )}
              <ul className="list">
                {pending.slice(0, 5).map((o) => (
                  <li key={o.id}>
                    <span>
                      <Link href={`/admin/don-hang?s=0`}>
                        <b>{o.code}</b>
                      </Link>{" "}
                      · {o.uname}
                      <br />
                      <span className="note">
                        {fmt(o.total)} · {o.pay_method}
                      </span>
                    </span>
                    <Act action={setOrderStatus} args={[o.code, 1]}>
                      Xác nhận
                    </Act>
                  </li>
                ))}
              </ul>
            </section>
            <section className="card" style={card}>
              <h2 className="h2">Đơn chờ xuất kho</h2>
              {!toPack.length && (
                <span className="note">Không có đơn nào chờ đóng gói.</span>
              )}
              <ul className="list">
                {toPack.slice(0, 5).map((o) => (
                  <li key={o.id}>
                    <span>
                      <b>{o.code}</b> · {o.uname}
                    </span>
                    <Link
                      href={`/admin/don-hang/xuat-kho?o=${o.code}`}
                      className="ghost"
                    >
                      Xuất kho
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
            <section className="card" style={card}>
              <h2 className="h2">Phiếu đặt may chờ kiểm hàng</h2>
              {!qc.length && (
                <span className="note">Không có phiếu nào chờ kiểm.</span>
              )}
              <ul className="list">
                {qc.map((p) => (
                  <li key={p.code}>
                    <span>
                      <b>{p.code}</b> · {p.pname} · {p.color}
                    </span>
                    <Link
                      href={`/admin/kho/dat-may?qc=${p.code}`}
                      className="ghost"
                    >
                      Kiểm hàng
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
            <section className="card" style={card}>
              <h2 className="h2">Tồn kho dưới ngưỡng an toàn</h2>
              {!low.length && (
                <span className="note">Chưa có SKU nào dưới ngưỡng.</span>
              )}
              <ul className="list">
                {low.slice(0, 5).map((v) => (
                  <li key={v.sku}>
                    <span>
                      <b>{v.productName}</b> · {v.color} · {v.size}
                      <br />
                      <span style={{ color: "var(--err)", fontWeight: 600 }}>
                        Khả dụng {v.available}, ngưỡng {v.minStock}
                      </span>
                    </span>
                    <Link href={`/admin/kho/nhat-ky`} className="ghost">
                      Xem cảnh báo
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
        {styling && (
          <>
            <section className="card" style={card}>
              <h2 className="h2">Yêu cầu tư vấn mới</h2>
              {!fresh.length && (
                <span className="note">Không có yêu cầu mới.</span>
              )}
              <ul className="list">
                {fresh.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <span>
                      <b>{c.uname}</b> · {dmy(c.created_at)}
                      <br />
                      <span className="note">{c.occasions}</span>
                    </span>
                    <Link href={`/admin/tu-van?id=${c.id}`} className="ghost">
                      Xem và nhận
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
            <section className="card" style={card}>
              <h2 className="h2">
                {admin ? "Yêu cầu đang phối" : "Yêu cầu bạn đang phụ trách"}
              </h2>
              {!working.length && (
                <span className="note">Không có yêu cầu nào đang phối.</span>
              )}
              <ul className="list">
                {working.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <span>
                      <b>{c.uname}</b>
                      <br />
                      <span className="note">{c.occasions}</span>
                    </span>
                    <Link href={`/admin/tu-van?id=${c.id}`} className="ghost">
                      Soạn set
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
            <section className="card" style={card}>
              <h2 className="h2">Lệnh giữ sắp hết hạn</h2>
              {!expiring.length && (
                <span className="note">Không có lệnh giữ nào sắp hết hạn.</span>
              )}
              <ul className="list">
                {expiring.map((h) => (
                  <li key={h.id}>
                    <span>
                      <b>{h.sku}</b> · {h.uname}
                      <br />
                      <span style={{ color: "var(--err)", fontWeight: 600 }}>
                        Còn {hoursLeft(h.expires_at)} giờ
                      </span>
                    </span>
                    <Link href="/admin/kho/giu-hang" className="ghost">
                      Xử lý
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </>
  );
}
