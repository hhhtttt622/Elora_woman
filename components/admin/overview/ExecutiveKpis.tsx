import Link from 'next/link';
import { fmt } from '@/lib/util';

type Props = {
  monthRevenue: number;
  lastMonthRevenue: number;
  pendingOrdersCount: number;
  lowStockCount: number;
  pendingConsultsCount: number;
};

export default function ExecutiveKpis({
  monthRevenue,
  lastMonthRevenue,
  pendingOrdersCount,
  lowStockCount,
  pendingConsultsCount,
}: Props) {
  const diffPercent = lastMonthRevenue > 0
    ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : monthRevenue > 0 ? 100 : 0;
  const isPositiveGrowth = diffPercent >= 0;

  return (
    <section aria-label="Chỉ số chính" className="ov-kpi-grid">
      {/* KPI 1: Doanh thu tháng */}
      <div className="ov-kpi-card ov-kpi-card--revenue">
        <div className="ov-kpi-header">
          <span className="ov-kpi-label">Doanh thu tháng</span>
          <span className={`ov-kpi-tag ${isPositiveGrowth ? 'ov-kpi-tag--green' : 'ov-kpi-tag--red'}`}>
            {isPositiveGrowth ? `↗ +${diffPercent}%` : `↘ ${diffPercent}%`}
          </span>
        </div>
        <div className="ov-kpi-value">{fmt(monthRevenue)}</div>
        <div className="ov-kpi-sub">
          <span>{isPositiveGrowth ? 'Tăng trưởng so với tháng trước' : 'So với tháng trước'}</span>
          <Link href="#tai-chinh" className="ov-kpi-link">Xem chi tiết ↓</Link>
        </div>
      </div>

      {/* KPI 2: Đơn hàng mới */}
      <Link href="/admin/don-hang?s=0" className="ov-kpi-card ov-kpi-card--interactive">
        <div className="ov-kpi-header">
          <span className="ov-kpi-label">Đơn hàng mới</span>
          <span className="ov-kpi-tag ov-kpi-tag--amber">
            🟡 Chờ duyệt
          </span>
        </div>
        <div className="ov-kpi-value">
          <b>{pendingOrdersCount}</b> <small>đơn</small>
        </div>
        <div className="ov-kpi-sub">
          <span>Cần xác nhận trong ngày</span>
          <span className="ov-kpi-arrow">→</span>
        </div>
      </Link>

      {/* KPI 3: Tồn kho cảnh báo */}
      <Link href="/admin/kho/nhat-ky" className="ov-kpi-card ov-kpi-card--interactive ov-kpi-card--warning">
        <div className="ov-kpi-header">
          <span className="ov-kpi-label">Tồn kho cảnh báo</span>
          <span className="ov-kpi-tag ov-kpi-tag--red">
            🔴 Cần đặt may
          </span>
        </div>
        <div className="ov-kpi-value ov-kpi-value--danger">
          <b>{lowStockCount}</b> <small>SKU</small>
        </div>
        <div className="ov-kpi-sub">
          <span>Dưới ngưỡng an toàn kho</span>
          <span className="ov-kpi-arrow">→</span>
        </div>
      </Link>

      {/* KPI 4: Tư vấn mới */}
      <Link href="/admin/tu-van" className="ov-kpi-card ov-kpi-card--interactive">
        <div className="ov-kpi-header">
          <span className="ov-kpi-label">Tư vấn Styling</span>
          <span className="ov-kpi-tag ov-kpi-tag--amber">
            🟡 Chờ xử lý
          </span>
        </div>
        <div className="ov-kpi-value">
          <b>{pendingConsultsCount}</b> <small>yêu cầu</small>
        </div>
        <div className="ov-kpi-sub">
          <span>Khách hàng đang chờ phối set</span>
          <span className="ov-kpi-arrow">→</span>
        </div>
      </Link>
    </section>
  );
}

