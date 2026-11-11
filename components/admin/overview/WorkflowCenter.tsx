'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fmt, dmy, dmyHm, sizeText } from '@/lib/util';
import { useRun } from '@/components/admin/Flash';
import { setOrderStatus } from '@/app/actions/admin';

export type OrderWorkflowItem = {
  id: number;
  code: string;
  uname: string;
  recv_name: string;
  recv_phone: string;
  address: string;
  note: string;
  total: number;
  shipping_fee: number;
  pay_method: string;
  payment_status?: string;
  status: number;
  created_at: string;
  lines: { sku: string; name: string; qty: number; price: number }[];
};

export type StockPoWorkflowItem = {
  code: string;
  workshop: string;
  pname: string;
  color: string;
  cost?: number;
  due?: string;
};

export type LowStockWorkflowItem = {
  sku: string;
  productName: string;
  color: string;
  size: string;
  available: number;
  minStock: number;
};

export type ConsultWorkflowItem = {
  id: number;
  uname: string;
  occasions: string;
  budget: string;
  work_env?: string;
  created_at: string;
  note?: string;
  status: string;
};

type Props = {
  pendingOrders: OrderWorkflowItem[];
  toPackOrders: OrderWorkflowItem[];
  qcPOs: StockPoWorkflowItem[];
  lowStockItems: LowStockWorkflowItem[];
  freshConsults: ConsultWorkflowItem[];
  workingConsults: ConsultWorkflowItem[];
};

export default function WorkflowCenter({
  pendingOrders,
  toPackOrders,
  qcPOs,
  lowStockItems,
  freshConsults,
  workingConsults,
}: Props) {
  const { run, pending } = useRun();
  const [activeTab, setActiveTab] = useState<'orders' | 'stock' | 'styling'>('orders');
  const [orderSubTab, setOrderSubTab] = useState<'pending' | 'pack'>('pending');
  const [stockSubTab, setStockSubTab] = useState<'low' | 'qc'>('low');
  const [stylingSubTab, setStylingSubTab] = useState<'fresh' | 'working'>('fresh');

  // Slide-over drawer state
  const [selectedOrder, setSelectedOrder] = useState<OrderWorkflowItem | null>(null);

  // Close drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedOrder(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const totalOrders = pendingOrders.length + toPackOrders.length;
  const totalStock = qcPOs.length + lowStockItems.length;
  const totalStyling = freshConsults.length + workingConsults.length;
  const totalWaiting = totalOrders + totalStock + totalStyling;

  const handleConfirmOrder = async (code: string) => {
    await run(setOrderStatus(code, 1));
    if (selectedOrder?.code === code) setSelectedOrder(null);
  };

  return (
    <section aria-label="Trung tâm luồng công việc" className="ov-workflow-container">
      {/* Header layer */}
      <div className="ov-workflow-header">
        <div>
          <span className="ov-section-eyebrow">Luồng công việc ưu tiên</span>
          <h2 className="ov-section-heading">Trung tâm cảnh báo & xử lý</h2>
        </div>
        <div className="ov-workflow-badge">
          <b>{totalWaiting}</b> việc đang chờ xử lý
        </div>
      </div>

      {/* Main Department Tabs */}
      <div className="ov-dept-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'orders'}
          className={`ov-dept-tab ${activeTab === 'orders' ? 'ov-dept-tab--active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <span className="ov-dept-icon">📦</span>
          <span>Đơn hàng</span>
          <span className={`ov-dept-count ${totalOrders > 0 ? 'ov-dept-count--highlight' : ''}`}>{totalOrders}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'stock'}
          className={`ov-dept-tab ${activeTab === 'stock' ? 'ov-dept-tab--active' : ''}`}
          onClick={() => setActiveTab('stock')}
        >
          <span className="ov-dept-icon">🏭</span>
          <span>Kho & Sản xuất</span>
          <span className={`ov-dept-count ${lowStockItems.length > 0 ? 'ov-dept-count--danger' : ''}`}>{totalStock}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'styling'}
          className={`ov-dept-tab ${activeTab === 'styling' ? 'ov-dept-tab--active' : ''}`}
          onClick={() => setActiveTab('styling')}
        >
          <span className="ov-dept-icon">👗</span>
          <span>Tư vấn Stylist</span>
          <span className="ov-dept-count">{totalStyling}</span>
        </button>
      </div>

      {/* Sub-tabs & Content Panels */}
      <div className="ov-workflow-body">
        {/* TAB 1: ĐƠN HÀNG */}
        {activeTab === 'orders' && (
          <div>
            <div className="ov-subtabs">
              <button
                type="button"
                className={`ov-subtab ${orderSubTab === 'pending' ? 'ov-subtab--active' : ''}`}
                onClick={() => setOrderSubTab('pending')}
              >
                Chờ xác nhận ({pendingOrders.length})
              </button>
              <button
                type="button"
                className={`ov-subtab ${orderSubTab === 'pack' ? 'ov-subtab--active' : ''}`}
                onClick={() => setOrderSubTab('pack')}
              >
                Chờ xuất kho ({toPackOrders.length})
              </button>
              <Link href="/admin/don-hang" className="ov-subtab-link">
                Quản lý tất cả đơn hàng →
              </Link>
            </div>

            {orderSubTab === 'pending' ? (
              pendingOrders.length === 0 ? (
                <div className="ov-empty-state">
                  <span className="ov-empty-icon">✓</span>
                  <b>Không có đơn hàng nào chờ xác nhận</b>
                  <p className="note">Mọi đơn hàng mới đã được xử lý kịp thời.</p>
                </div>
              ) : (
                <div className="ov-item-list">
                  {pendingOrders.map((order) => (
                    <div key={order.id} className="ov-item-row">
                      <div className="ov-item-info" onClick={() => setSelectedOrder(order)} role="button" tabIndex={0}>
                        <div className="ov-item-title-row">
                          <span className="ov-item-code">{order.code}</span>
                          <span className="ov-status-pill ov-status-pill--amber">Chờ xác nhận</span>
                          <span className="ov-item-time">{dmyHm(order.created_at)}</span>
                        </div>
                        <div className="ov-item-desc">
                          <span><b>{order.uname}</b> ({order.recv_phone || 'Chưa có SĐT'})</span>
                          <span className="ov-dot">·</span>
                          <span className="ov-item-price">{fmt(order.total)}</span>
                          <span className="ov-dot">·</span>
                          <span className="note">{order.pay_method}</span>
                          {order.lines && order.lines.length > 0 && (
                            <>
                              <span className="ov-dot">·</span>
                              <span className="note">{order.lines.map((l) => `${l.qty}x ${l.name}`).join(', ')}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="ov-item-actions">
                        <button
                          type="button"
                          className="ov-btn ov-btn--sm ov-btn--ghost"
                          onClick={() => setSelectedOrder(order)}
                          title="Xem chi tiết đơn hàng trong slide-over"
                        >
                          Chi tiết
                        </button>
                        <button
                          type="button"
                          className="ov-btn ov-btn--sm ov-btn--primary"
                          disabled={pending}
                          onClick={() => handleConfirmOrder(order.code)}
                          title={`Xác nhận đơn hàng ${order.code}`}
                        >
                          Xác nhận
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              toPackOrders.length === 0 ? (
                <div className="ov-empty-state">
                  <span className="ov-empty-icon">✓</span>
                  <b>Không có đơn chờ đóng gói xuất kho</b>
                  <p className="note">Tất cả đơn đã được xuất kho giao đơn vị vận chuyển.</p>
                </div>
              ) : (
                <div className="ov-item-list">
                  {toPackOrders.map((order) => (
                    <div key={order.id} className="ov-item-row">
                      <div className="ov-item-info" onClick={() => setSelectedOrder(order)} role="button" tabIndex={0}>
                        <div className="ov-item-title-row">
                          <span className="ov-item-code">{order.code}</span>
                          <span className="ov-status-pill ov-status-pill--blue">Đã duyệt</span>
                          <span className="ov-item-time">{dmyHm(order.created_at)}</span>
                        </div>
                        <div className="ov-item-desc">
                          <span><b>{order.uname}</b> · {fmt(order.total)}</span>
                          <span className="ov-dot">·</span>
                          <span className="note">Cần đóng gói gửi đi: {order.address}</span>
                        </div>
                      </div>
                      <div className="ov-item-actions">
                        <Link
                          href={`/admin/don-hang/xuat-kho?o=${order.code}`}
                          className="ov-btn ov-btn--sm ov-btn--primary"
                        >
                          Đóng gói xuất kho →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {/* TAB 2: KHO & SẢN XUẤT */}
        {activeTab === 'stock' && (
          <div>
            <div className="ov-subtabs">
              <button
                type="button"
                className={`ov-subtab ${stockSubTab === 'low' ? 'ov-subtab--active' : ''}`}
                onClick={() => setStockSubTab('low')}
              >
                Cảnh báo hết hàng ({lowStockItems.length})
              </button>
              <button
                type="button"
                className={`ov-subtab ${stockSubTab === 'qc' ? 'ov-subtab--active' : ''}`}
                onClick={() => setStockSubTab('qc')}
              >
                Kiểm hàng xưởng ({qcPOs.length})
              </button>
              <Link href="/admin/kho" className="ov-subtab-link">
                Bảng tồn kho tổng thể →
              </Link>
            </div>

            {stockSubTab === 'low' ? (
              lowStockItems.length === 0 ? (
                <div className="ov-empty-state">
                  <span className="ov-empty-icon">✓</span>
                  <b>Tất cả biến thể SKU đều đạt ngưỡng an toàn</b>
                  <p className="note">Chưa có sản phẩm nào chạm mức báo động hết hàng.</p>
                </div>
              ) : (
                <div className="ov-item-list">
                  {lowStockItems.map((item) => (
                    <div key={item.sku} className="ov-item-row">
                      <div className="ov-item-info">
                        <div className="ov-item-title-row">
                          <span className="ov-item-code">{item.sku}</span>
                          <span className="ov-status-pill ov-status-pill--red">🔴 Dưới ngưỡng</span>
                        </div>
                        <div className="ov-item-desc">
                          <span><b>{item.productName}</b> ({item.color}, {sizeText(item.size)})</span>
                          <span className="ov-dot">·</span>
                          <span className="ov-alert-text">Khả dụng: <b>{item.available}</b> / Ngưỡng an toàn: <b>{item.minStock}</b></span>
                        </div>
                      </div>
                      <div className="ov-item-actions">
                        <Link
                          href={`/admin/kho/dat-may?sku=${encodeURIComponent(item.sku)}`}
                          className="ov-btn ov-btn--sm ov-btn--primary"
                        >
                          Đặt may xưởng →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              qcPOs.length === 0 ? (
                <div className="ov-empty-state">
                  <span className="ov-empty-icon">✓</span>
                  <b>Không có đơn kiểm hàng nào từ xưởng</b>
                  <p className="note">Các đơn đặt may đã được nghiệm thu hoặc chưa giao tới.</p>
                </div>
              ) : (
                <div className="ov-item-list">
                  {qcPOs.map((po) => (
                    <div key={po.code} className="ov-item-row">
                      <div className="ov-item-info">
                        <div className="ov-item-title-row">
                          <span className="ov-item-code">{po.code}</span>
                          <span className="ov-status-pill ov-status-pill--amber">Chờ nghiệm thu</span>
                        </div>
                        <div className="ov-item-desc">
                          <span>Xưởng: <b>{po.workshop}</b></span>
                          <span className="ov-dot">·</span>
                          <span>{po.pname} ({po.color})</span>
                          {po.due && <><span className="ov-dot">·</span><span className="note">Hạn giao: {dmy(po.due)}</span></>}
                        </div>
                      </div>
                      <div className="ov-item-actions">
                        <Link
                          href={`/admin/kho/dat-may?qc=${encodeURIComponent(po.code)}`}
                          className="ov-btn ov-btn--sm ov-btn--primary"
                        >
                          Kiểm hàng & Nhập kho
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {/* TAB 3: TƯ VẤN STYLIST */}
        {activeTab === 'styling' && (
          <div>
            <div className="ov-subtabs">
              <button
                type="button"
                className={`ov-subtab ${stylingSubTab === 'fresh' ? 'ov-subtab--active' : ''}`}
                onClick={() => setStylingSubTab('fresh')}
              >
                Yêu cầu mới ({freshConsults.length})
              </button>
              <button
                type="button"
                className={`ov-subtab ${stylingSubTab === 'working' ? 'ov-subtab--active' : ''}`}
                onClick={() => setStylingSubTab('working')}
              >
                Đang phối set ({workingConsults.length})
              </button>
              <Link href="/admin/tu-van" className="ov-subtab-link">
                Quản lý yêu cầu tư vấn →
              </Link>
            </div>

            {stylingSubTab === 'fresh' ? (
              freshConsults.length === 0 ? (
                <div className="ov-empty-state">
                  <span className="ov-empty-icon">✓</span>
                  <b>Chưa có yêu cầu tư vấn mới nào cần nhận</b>
                  <p className="note">Stylist đã tiếp nhận toàn bộ hồ sơ khách hàng.</p>
                </div>
              ) : (
                <div className="ov-item-list">
                  {freshConsults.map((c) => (
                    <div key={c.id} className="ov-item-row">
                      <div className="ov-item-info">
                        <div className="ov-item-title-row">
                          <span className="ov-item-code">HS #{c.id}</span>
                          <span className="ov-status-pill ov-status-pill--amber">Chưa có Stylist</span>
                          <span className="ov-item-time">{dmy(c.created_at)}</span>
                        </div>
                        <div className="ov-item-desc">
                          <span>Khách hàng: <b>{c.uname}</b></span>
                          <span className="ov-dot">·</span>
                          <span>Dịp: {c.occasions}</span>
                          <span className="ov-dot">·</span>
                          <span className="note">Ngân sách: {c.budget}</span>
                        </div>
                      </div>
                      <div className="ov-item-actions">
                        <Link
                          href={`/admin/tu-van?id=${c.id}`}
                          className="ov-btn ov-btn--sm ov-btn--primary"
                        >
                          Xem hồ sơ & Nhận việc
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              workingConsults.length === 0 ? (
                <div className="ov-empty-state">
                  <span className="ov-empty-icon">✓</span>
                  <b>Không có hồ sơ nào đang dở dang</b>
                  <p className="note">Các set đồ đã được gửi hoàn tất cho khách.</p>
                </div>
              ) : (
                <div className="ov-item-list">
                  {workingConsults.map((c) => (
                    <div key={c.id} className="ov-item-row">
                      <div className="ov-item-info">
                        <div className="ov-item-title-row">
                          <span className="ov-item-code">HS #{c.id}</span>
                          <span className="ov-status-pill ov-status-pill--blue">Đang phối</span>
                        </div>
                        <div className="ov-item-desc">
                          <span>Khách hàng: <b>{c.uname}</b></span>
                          <span className="ov-dot">·</span>
                          <span>Dịp: {c.occasions}</span>
                        </div>
                      </div>
                      <div className="ov-item-actions">
                        <Link
                          href={`/admin/tu-van?id=${c.id}`}
                          className="ov-btn ov-btn--sm ov-btn--primary"
                        >
                          Soạn & Gửi set đồ →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Slide-over (Ngăn kéo bên phải) */}
      {selectedOrder && (
        <div className="ov-drawer-backdrop" onClick={() => setSelectedOrder(null)}>
          <div
            className="ov-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
          >
            <div className="ov-drawer-header">
              <div>
                <span className="ov-section-eyebrow">Chi tiết đơn hàng</span>
                <h3 id="drawer-title" className="ov-drawer-title">{selectedOrder.code}</h3>
              </div>
              <button
                type="button"
                className="ov-drawer-close"
                onClick={() => setSelectedOrder(null)}
                aria-label="Đóng ngăn kéo"
              >
                ✕
              </button>
            </div>

            <div className="ov-drawer-body">
              <div className="ov-drawer-section">
                <span className="ov-drawer-label">Trạng thái</span>
                <div>
                  <span className={`ov-status-pill ${selectedOrder.status === 0 ? 'ov-status-pill--amber' : 'ov-status-pill--green'}`}>
                    {selectedOrder.status === 0 ? 'Chờ xác nhận' : selectedOrder.status === 1 ? 'Chờ đóng gói' : 'Đang xử lý'}
                  </span>
                  {selectedOrder.pay_method === 'Chuyển khoản' && (
                    <span className="note" style={{ marginLeft: 8 }}>
                      VietQR: {selectedOrder.payment_status || 'NOT_REQUIRED'}
                    </span>
                  )}
                </div>
              </div>

              <div className="ov-drawer-section">
                <span className="ov-drawer-label">Khách hàng & Giao hàng</span>
                <div className="ov-drawer-customer">
                  <b>{selectedOrder.recv_name || selectedOrder.uname}</b>
                  <div>SĐT: <a href={`tel:${selectedOrder.recv_phone}`}>{selectedOrder.recv_phone}</a></div>
                  <div className="note">Địa chỉ: {selectedOrder.address}</div>
                  {selectedOrder.note && <div className="note">Ghi chú: {selectedOrder.note}</div>}
                </div>
              </div>

              <div className="ov-drawer-section">
                <span className="ov-drawer-label">Sản phẩm trong đơn</span>
                <ul className="ov-drawer-products">
                  {selectedOrder.lines && selectedOrder.lines.length > 0 ? (
                    selectedOrder.lines.map((l, i) => (
                      <li key={i} className="ov-drawer-item">
                        <div>
                          <b>{l.qty} × {l.name}</b>
                          <div className="note">{l.sku}</div>
                        </div>
                        <span className="ov-item-price">{fmt(l.price * l.qty)}</span>
                      </li>
                    ))
                  ) : (
                    <li className="note">Không có dòng sản phẩm</li>
                  )}
                </ul>
              </div>

              <div className="ov-drawer-summary">
                <div className="ov-drawer-sumrow">
                  <span>Hình thức thanh toán:</span>
                  <b>{selectedOrder.pay_method}</b>
                </div>
                <div className="ov-drawer-sumrow">
                  <span>Phí vận chuyển:</span>
                  <span>{fmt(selectedOrder.shipping_fee || 30000)}</span>
                </div>
                <div className="ov-drawer-sumrow ov-drawer-sumrow--total">
                  <span>Tổng tiền thanh toán:</span>
                  <b>{fmt(selectedOrder.total)}</b>
                </div>
              </div>
            </div>

            <div className="ov-drawer-footer">
              {selectedOrder.status === 0 && (
                <button
                  type="button"
                  className="ov-btn ov-btn--primary"
                  style={{ flex: 1 }}
                  disabled={pending}
                  onClick={() => handleConfirmOrder(selectedOrder.code)}
                >
                  {pending ? 'Đang xác nhận...' : 'Xác nhận đơn ngay'}
                </button>
              )}
              <Link
                href={`/admin/don-hang?order=${encodeURIComponent(selectedOrder.code)}`}
                className="ov-btn ov-btn--ghost"
                onClick={() => setSelectedOrder(null)}
              >
                Mở trang đơn hàng ↗
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

