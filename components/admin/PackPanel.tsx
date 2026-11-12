"use client";
import { useState } from "react";
import { useRun } from "./Flash";
import { packOrder } from "@/app/actions/admin";

type PackingItem = {
  sku: string;
  qty: number;
  name: string;
  shelf: string;
  online: number;
  image: string;
};

const qualityChecks = [
  "Vải sạch, không rách hoặc dính bẩn",
  "Cúc đủ và chắc",
  "Khóa kéo hoạt động trơn tru",
];

export default function PackPanel({
  code,
  items,
  getChecks,
  setCheck,
  completed,
  onComplete,
}: {
  code: string;
  items: PackingItem[];
  getChecks: (sku: string) => boolean[];
  setCheck: (sku: string, index: number, checked: boolean) => void;
  completed?: string;
  onComplete: (tracking: string) => void;
}) {
  const { run, pending } = useRun();
  const [carrier, setCarrier] = useState("GHN");
  const [tracking, setTracking] = useState("");
  const [error, setError] = useState("");
  const allChecked = items.length > 0 && items.every((item) => getChecks(item.sku).every(Boolean));

  return (
    <div className="outbound-process">
      <section className="outbound-picklist outbound-print-area" aria-label="Danh sách nhặt hàng">
        <header className="outbound-section-head">
          <div>
            <span className="outbound-eyebrow">Pick-list · Sắp xếp theo kệ</span>
            <h3>Danh sách nhặt hàng</h3>
          </div>
          <span className="outbound-picklist-count">{items.length} mẫu · {items.reduce((sum, item) => sum + item.qty, 0)} món</span>
        </header>

        {items.length ? (
          <div className="outbound-pick-items">
            {items.map((item) => {
              const checks = getChecks(item.sku);
              const picked = !!checks[0];
              const inStock = item.online >= item.qty;
              return (
                <article className={`outbound-pick-item${picked ? " is-picked" : ""}`} key={item.sku}>
                  <div className="outbound-item-main">
                    <span className="outbound-shelf-tag" aria-label={`Kệ ${item.shelf}`}>{item.shelf}</span>
                    {item.image ? (
                      // Product photos can be uploaded to local storage or external URLs.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="outbound-product-image" src={item.image} alt={item.name} />
                    ) : (
                      <span className="outbound-product-placeholder" aria-hidden>EW</span>
                    )}
                    <div className="outbound-product-copy">
                      <b>{item.name}</b>
                      <span>{item.sku}</span>
                    </div>
                    <div className="outbound-quantity-stock">
                      <b>SL {item.qty}</b>
                      <span className={inStock ? "is-stock-ok" : "is-stock-low"}>
                        {inStock ? `Kho online ${item.online}` : `Thiếu ${item.qty - item.online}`}
                      </span>
                    </div>
                    <label className={`outbound-pick-toggle${picked ? " is-checked" : ""}`}>
                      <input type="checkbox" checked={picked} onChange={(event) => setCheck(item.sku, 0, event.target.checked)} disabled={!!completed} />
                      <span className="outbound-pick-check" aria-hidden>{picked ? "✓" : ""}</span>
                      <span><b>{picked ? "1/1" : "0/1"}</b><small>{picked ? "Đã nhặt" : "Đánh dấu đã nhặt"}</small></span>
                    </label>
                  </div>

                  <div className="outbound-quality">
                    <span className="outbound-quality-title">Kiểm tra chất lượng</span>
                    {qualityChecks.map((label, index) => (
                      <label key={label} className="outbound-quality-check">
                        <input type="checkbox" checked={!!checks[index + 1]} onChange={(event) => setCheck(item.sku, index + 1, event.target.checked)} disabled={!!completed} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="outbound-empty-inline">Đơn hàng chưa có sản phẩm để nhặt.</p>
        )}
      </section>

      <section className="outbound-shipping" aria-label="Thông tin vận chuyển">
        <div className="outbound-shipping-heading">
          <div>
            <span className="outbound-eyebrow">Bước cuối</span>
            <h3>Vận chuyển</h3>
          </div>
          {completed && <span className="outbound-complete-pill">✓ Đã xuất kho</span>}
        </div>

        <fieldset className="outbound-carriers" disabled={!!completed}>
          <legend>Đơn vị vận chuyển</legend>
          {([ ["GHN", "Giao Hàng Nhanh", "G"], ["GHTK", "Giao Hàng Tiết Kiệm", "K"] ] as const).map(([value, name, icon]) => (
            <label key={value} className={`outbound-carrier${carrier === value ? " is-active" : ""}`}>
              <input type="radio" name={`carrier-${code}`} value={value} checked={carrier === value} onChange={() => setCarrier(value)} />
              <span className={`outbound-carrier-logo outbound-carrier-logo--${value.toLowerCase()}`}>{icon}</span>
              <span><b>{value}</b><small>{name}</small></span>
              {carrier === value && <span className="outbound-carrier-selected" aria-label="Đã chọn">✓</span>}
            </label>
          ))}
        </fieldset>

        <label className="outbound-tracking-field">
          <span>Mã vận đơn</span>
          <input
            className="fld"
            type="text"
            value={completed || tracking}
            onChange={(event) => setTracking(event.target.value)}
            placeholder="Nhập mã vận đơn từ đơn vị giao hàng"
            autoComplete="off"
            disabled={!!completed}
            aria-required="true"
          />
        </label>

        {error && <p className="err" role="alert">{error}</p>}
        {completed ? (
          <div className="outbound-shipped-result" role="status">
            <span>Đơn đã được đóng gói và trừ kho.</span>
            <b>{completed}</b>
          </div>
        ) : (
          <button
            className="outbound-pack-button"
            type="button"
            disabled={pending || !allChecked || !tracking.trim()}
            onClick={async () => {
              setError("");
              const result = await run(packOrder(code, carrier, tracking.trim(), Object.fromEntries(items.map((item) => [item.sku, getChecks(item.sku)]))));
              if (result.error) setError(result.error);
              else onComplete(tracking.trim());
            }}
          >
            {pending ? "Đang xử lý…" : "Đóng gói và trừ kho"}
          </button>
        )}

        <button className="outbound-print-button" type="button" onClick={() => window.print()}>
          <span aria-hidden>▤</span> In phiếu nhặt hàng
        </button>
      </section>
    </div>
  );
}
