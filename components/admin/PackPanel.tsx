"use client";
import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { useRun } from "./Flash";
import { packOrder } from "@/app/actions/admin";

type PackingItem = {
  sku: string;
  qty: number;
  name: string;
  shelf: string;
  online: number;
};
const checks = [
  "Tình trạng sạch, không rách hoặc dính bẩn",
  "Cúc đủ và chắc",
  "Khóa kéo hoạt động trơn tru",
];

export default function PackPanel({
  code,
  items = [],
}: {
  code: string;
  items?: PackingItem[];
}) {
  const { run, pending } = useRun();
  const router = useRouter();
  const [openSku, setOpenSku] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean[]>>({});
  const [carrier, setCarrier] = useState("GHN");
  const [err, setErr] = useState("");
  const toggleCheck = (sku: string, index: number) =>
    setChecked((current) => {
      const itemChecks = current[sku] || [false, false, false];
      return {
        ...current,
        [sku]: itemChecks.map((value, i) => (i === index ? !value : value)),
      };
    });
  const allChecked =
    items.length > 0 &&
    items.every(
      (item) =>
        checked[item.sku]?.length === checks.length &&
        checked[item.sku].every(Boolean),
    );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="scroll">
        <table className="tb" style={{ minWidth: 760 }}>
          <caption>Danh sách nhặt hàng (Pick-list), sắp theo kệ</caption>
          <thead>
            <tr>
              <th>Kệ</th>
              <th>SKU</th>
              <th>Sản phẩm</th>
              <th>SL nhặt</th>
              <th>Tồn Kho Online</th>
              <th>Kiểm tra</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const itemChecks = checked[item.sku] || [false, false, false];
              const complete = itemChecks.every(Boolean);
              const expanded = openSku === item.sku;
              return (
                <Fragment key={item.sku}>
                  <tr key={item.sku}>
                    <td>
                      <b>{item.shelf}</b>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{item.sku}</td>
                    <td style={{ minWidth: 220 }}>
                      <button
                        type="button"
                        className="textbtn"
                        aria-expanded={expanded}
                        onClick={() => setOpenSku(expanded ? null : item.sku)}
                        style={{ textAlign: "left" }}
                      >
                        {item.name}
                      </button>
                    </td>
                    <td>{item.qty}</td>
                    <td>
                      <span
                        className={
                          "badge" + (item.online >= item.qty ? "" : " red")
                        }
                      >
                        {item.online >= item.qty
                          ? `Đủ (${item.online})`
                          : `Thiếu (${item.online})`}
                      </span>
                    </td>
                    <td>
                      <span className={"badge" + (complete ? " dark" : "")}>
                        {complete
                          ? "Đã kiểm"
                          : `${itemChecks.filter(Boolean).length}/${checks.length}`}
                      </span>
                    </td>
                  </tr>
                  {expanded && (
                    <tr key={`${item.sku}-checks`}>
                      <td colSpan={6} style={{ background: "var(--blush)" }}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                            padding: 6,
                          }}
                        >
                          <b>
                            Kiểm tra {item.name} · {item.sku}
                          </b>
                          {checks.map((label, index) => (
                            <label
                              key={label}
                              style={{
                                display: "flex",
                                gap: 12,
                                alignItems: "center",
                                cursor: "pointer",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={itemChecks[index]}
                                onChange={() => toggleCheck(item.sku, index)}
                                style={{
                                  width: 22,
                                  height: 22,
                                  accentColor: "#6B2437",
                                }}
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="row">
        <div className="fl" style={{ maxWidth: 260, flex: "1 1 200px" }}>
          <label className="lbl" htmlFor="out-carrier">
            Đơn vị vận chuyển
          </label>
          <select
            id="out-carrier"
            className="fld"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
          >
            <option value="GHN">Giao Hàng Nhanh (GHN)</option>
            <option value="GHTK">Giao Hàng Tiết Kiệm (GHTK)</option>
          </select>
        </div>
        <button
          className="btn"
          disabled={pending || !allChecked}
          onClick={async () => {
            const r = await run(packOrder(code, carrier, checked));
            if (r.error) setErr(r.error);
            else {
              setErr("");
              setChecked({});
              router.push(`/admin/don-hang/xuat-kho?label=${code}`);
            }
          }}
        >
          Đóng gói và trừ kho
        </button>
      </div>
      {err && (
        <p className="err" role="alert">
          {err}
        </p>
      )}
      <span className="note">
        Chưa kết nối API GHN hoặc GHTK. Mã vận đơn là mã mẫu do hệ thống sinh.
      </span>
    </div>
  );
}
