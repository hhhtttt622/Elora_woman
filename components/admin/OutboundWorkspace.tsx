"use client";
import { useState } from "react";
import { dmyHm } from "@/lib/util";
import PackPanel from "@/components/admin/PackPanel";

export type OutboundItem = {
  sku: string;
  qty: number;
  name: string;
  shelf: string;
  online: number;
  image: string;
};

export type OutboundOrder = {
  id: number;
  code: string;
  customer: string;
  createdAt: string;
  lineCount: number;
  units: number;
  payMethod: string;
  items: OutboundItem[];
};

type Filter = "all" | "waiting" | "packing";
type Progress = Record<string, Record<string, boolean[]>>;
type Completed = Record<string, string>;

const checksFor = (progress: Progress, code: string, sku: string) =>
  progress[code]?.[sku] || [false, false, false, false];

export default function OutboundWorkspace({
  orders,
  initialCode,
}: {
  orders: OutboundOrder[];
  initialCode?: string;
}) {
  const [selectedCode, setSelectedCode] = useState(
    orders.find((order) => order.code === initialCode)?.code || orders[0]?.code || "",
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [progress, setProgress] = useState<Progress>({});
  const [completed, setCompleted] = useState<Completed>({});
  const selected = orders.find((order) => order.code === selectedCode);
  const started = (order: OutboundOrder) =>
    order.items.some((item) => checksFor(progress, order.code, item.sku).some(Boolean));
  const q = search.trim().toLocaleLowerCase();
  const visible = orders.filter((order) => {
    if (completed[order.code]) return false;
    const matchesSearch = !q || `${order.code} ${order.customer}`.toLocaleLowerCase().includes(q);
    const matchesFilter = filter === "all" || (filter === "packing" ? started(order) : !started(order));
    return matchesSearch && matchesFilter;
  });
  const waitingCount = orders.filter((order) => !completed[order.code] && !started(order)).length;
  const packingCount = orders.filter((order) => !completed[order.code] && started(order)).length;
  const setItemProgress = (code: string, sku: string, index: number, checked: boolean) => {
    setProgress((current) => {
      const before = checksFor(current, code, sku);
      const next = [...before];
      next[index] = checked;
      return { ...current, [code]: { ...current[code], [sku]: next } };
    });
  };

  return (
    <section className="outbound-layout" aria-label="Quản lý xuất kho">
      <aside className="outbound-queue">
        <header className="outbound-queue-head">
          <div>
            <span className="outbound-eyebrow">Khu vực đóng gói</span>
            <h2>Đơn cần xuất</h2>
          </div>
          <span className="outbound-total" aria-label={`${waitingCount + packingCount} đơn chờ xuất`}>
            {waitingCount + packingCount}
          </span>
        </header>

        <label className="outbound-search">
          <span aria-hidden>⌕</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm mã đơn, khách hàng"
            aria-label="Tìm mã đơn hoặc khách hàng"
          />
        </label>

        <div className="outbound-filters" role="group" aria-label="Lọc đơn hàng">
          {([
            ["all", "Tất cả", waitingCount + packingCount],
            ["waiting", "Chờ nhặt", waitingCount],
            ["packing", "Đang đóng gói", packingCount],
          ] as const).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              className={filter === key ? "is-active" : ""}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label}<span>{count}</span>
            </button>
          ))}
        </div>

        <div className="outbound-order-list" aria-label="Danh sách đơn cần xuất">
          {visible.map((order) => {
            const isPacking = started(order);
            const isSelected = selectedCode === order.code;
            return (
              <button
                key={order.code}
                type="button"
                className={`outbound-order-card${isSelected ? " is-selected" : ""}`}
                aria-pressed={isSelected}
                onClick={() => setSelectedCode(order.code)}
              >
                <span className="outbound-card-top">
                  <b>{order.code}</b>
                  <span className={`outbound-status${isPacking ? " is-packing" : ""}`}>
                    {isPacking ? "Đang đóng gói" : "Chờ nhặt"}
                  </span>
                </span>
                <span className="outbound-card-customer">{order.customer}</span>
                <span className="outbound-card-meta">
                  <span>{dmyHm(order.createdAt)}</span>
                  <span>{order.lineCount} mẫu · {order.units} món</span>
                </span>
              </button>
            );
          })}
          {!visible.length && (
            <div className="outbound-empty">
              <span aria-hidden>✓</span>
              <b>{orders.length ? "Không có đơn phù hợp" : "Chưa có đơn cần xuất"}</b>
              <p>{orders.length ? "Thử đổi từ khóa hoặc trạng thái lọc." : "Đơn đã xác nhận sẽ xuất hiện tại đây."}</p>
            </div>
          )}
        </div>
      </aside>

      <div className="outbound-detail">
        {selected ? (
          <>
            <header className="outbound-detail-head">
              <div>
                <span className="outbound-eyebrow">Chi tiết xuất kho</span>
                <h2>{selected.code}</h2>
                <p>{selected.customer} <span>·</span> {selected.payMethod}</p>
              </div>
              <span className="outbound-detail-count">{selected.units} món <i>·</i> {selected.items.length} mẫu</span>
            </header>

            <div className="outbound-stepper" aria-label="Tiến trình xử lý đơn hàng">
              {(["Đã xác nhận", "Đang nhặt hàng", "Đóng gói", "Xuất kho"] as const).map((step, index) => {
                const activeStep = isReady(selected, progress) ? 2 : 1;
                const isDone = !!completed[selected.code] || index < activeStep;
                const isCurrent = !completed[selected.code] && index === activeStep;
                return (
                  <div className={`outbound-step${isDone ? " is-done" : ""}${isCurrent ? " is-current" : ""}`} key={step}>
                    <span className="outbound-step-dot">{isDone ? "✓" : index + 1}</span>
                    <span>{step}</span>
                  </div>
                );
              })}
            </div>

            <PackPanel
              key={selected.code}
              code={selected.code}
              items={selected.items}
              getChecks={(sku) => checksFor(progress, selected.code, sku)}
              setCheck={(sku, index, value) => setItemProgress(selected.code, sku, index, value)}
              completed={completed[selected.code]}
              onComplete={(tracking) => setCompleted((current) => ({ ...current, [selected.code]: tracking }))}
            />
          </>
        ) : (
          <div className="outbound-detail-empty">
            <span aria-hidden>□</span>
            <b>Chọn một đơn hàng</b>
            <p>Thông tin nhặt và đóng gói sẽ hiển thị tại đây.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function isReady(order: OutboundOrder, progress: Progress) {
  return order.items.length > 0 && order.items.every((item) => checksFor(progress, order.code, item.sku).every(Boolean));
}
