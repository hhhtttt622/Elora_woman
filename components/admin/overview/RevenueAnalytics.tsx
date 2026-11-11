'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { fmt, dmy } from '@/lib/util';

export type ChartPoint = {
  label: string;
  subLabel?: string;
  amount: number;
  count: number;
};

export type RevenueStats = {
  totalRevenue: number;
  goodsRevenue: number;
  shippingFee: number;
  ordersCount: number;
  aov: number;
  startDate: string;
  endDate: string;
};

type Props = {
  period: 'week' | 'month' | 'year';
  stats: RevenueStats;
  chartData: ChartPoint[];
};

export default function RevenueAnalytics({ period, stats, chartData }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const changePeriod = (newPeriod: 'week' | 'month' | 'year') => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    if (newPeriod === 'month') {
      params.delete('period');
    } else {
      params.set('period', newPeriod);
    }
    const query = params.toString();
    router.push(`/admin${query ? `?${query}` : ''}#tai-chinh`);
  };

  // SVG Chart calculation
  const svgWidth = 680;
  const svgHeight = 220;
  const padding = { top: 24, right: 20, bottom: 36, left: 50 };
  const innerWidth = svgWidth - padding.left - padding.right;
  const innerHeight = svgHeight - padding.top - padding.bottom;

  const maxAmount = Math.max(1, ...chartData.map((d) => d.amount));
  // Round up max to clean threshold
  const yMax = Math.ceil(maxAmount / 1000000) * 1000000 || 5000000;

  const colWidth = innerWidth / (chartData.length || 1);
  const barWidth = Math.min(36, Math.max(16, colWidth * 0.45));

  const points = chartData.map((d, i) => {
    const x = padding.left + i * colWidth + colWidth / 2;
    const y = padding.top + innerHeight - (d.amount / yMax) * innerHeight;
    return { ...d, x, y };
  });

  const pathData = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <section id="tai-chinh" aria-label="Phân tích doanh thu" className="ov-analytics-container">
      {/* Header & Period Filters */}
      <div className="ov-analytics-header">
        <div>
          <span className="ov-section-eyebrow">Phân tích kinh doanh & Dòng tiền</span>
          <h2 className="ov-section-heading">Biểu đồ doanh thu (Revenue Trend)</h2>
          <span className="note">
            Từ {dmy(stats.startDate)} đến {dmy(stats.endDate)} · {stats.ordersCount} đơn đã giao thành công
          </span>
        </div>

        <div className="ov-period-filters" role="group" aria-label="Bộ lọc thời gian">
          <button
            type="button"
            className={`ov-filter-btn ${period === 'week' ? 'ov-filter-btn--active' : ''}`}
            onClick={() => changePeriod('week')}
          >
            Tuần này
          </button>
          <button
            type="button"
            className={`ov-filter-btn ${period === 'month' ? 'ov-filter-btn--active' : ''}`}
            onClick={() => changePeriod('month')}
          >
            Tháng này
          </button>
          <button
            type="button"
            className={`ov-filter-btn ${period === 'year' ? 'ov-filter-btn--active' : ''}`}
            onClick={() => changePeriod('year')}
          >
            Năm nay
          </button>
          <Link href="/admin/bao-cao" className="ov-filter-btn ov-filter-btn--link" title="Xem báo cáo doanh thu tùy chọn theo khoảng ngày">
            Khoảng ngày ↗
          </Link>
        </div>
      </div>

      {/* Financial Metrics Cards */}
      <div className="ov-metrics-row">
        <div className="ov-metric-card">
          <span className="ov-metric-label">Tổng doanh thu thực nhận</span>
          <div className="ov-metric-val">{fmt(stats.totalRevenue)}</div>
          <span className="note">{stats.ordersCount} đơn giao thành công</span>
        </div>

        <div className="ov-metric-card">
          <span className="ov-metric-label">Tiền hàng thuần</span>
          <div className="ov-metric-val">{fmt(stats.goodsRevenue)}</div>
          <span className="note">Không tính phí vận chuyển</span>
        </div>

        <div className="ov-metric-card">
          <span className="ov-metric-label">Phí vận chuyển</span>
          <div className="ov-metric-val">{fmt(stats.shippingFee)}</div>
          <span className="note">Thu hộ cước vận chuyển</span>
        </div>

        <div className="ov-metric-card">
          <span className="ov-metric-label">Giá trị đơn TB (AOV)</span>
          <div className="ov-metric-val">{fmt(stats.aov)}</div>
          <span className="note">Mỗi đơn đặt hàng</span>
        </div>
      </div>

      {/* SVG Interactive Revenue Trend Chart */}
      <div className="ov-chart-wrapper">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="ov-chart-svg"
          preserveAspectRatio="xMidYMid meet"
          aria-label="Biểu đồ doanh thu"
        >
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6B2437" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#9C3B53" stopOpacity="0.65" />
            </linearGradient>
            <linearGradient id="barHoverGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A3162F" stopOpacity="1" />
              <stop offset="100%" stopColor="#BD2E48" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E8DCCB" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#E8DCCB" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines (horizontal) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + innerHeight - ratio * innerHeight;
            const val = ratio * yMax;
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="#EDE5E7"
                  strokeDasharray={ratio === 0 ? 'none' : '3 3'}
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#786F74"
                  fontFamily="inherit"
                >
                  {val >= 1000000 ? `${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1)}tr` : fmt(val)}
                </text>
              </g>
            );
          })}

          {/* Trend Area under line */}
          {points.length > 1 && (
            <path
              d={`${pathData} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`}
              fill="url(#lineAreaGrad)"
            />
          )}

          {/* Revenue Bars */}
          {points.map((p, i) => {
            const barH = padding.top + innerHeight - p.y;
            const isHovered = hoveredIdx === i;
            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Background hover highlight */}
                <rect
                  x={p.x - colWidth / 2}
                  y={padding.top}
                  width={colWidth}
                  height={innerHeight}
                  fill={isHovered ? 'rgba(107, 36, 55, 0.04)' : 'transparent'}
                />

                {/* Column bar */}
                <rect
                  x={p.x - barWidth / 2}
                  y={p.y}
                  width={barWidth}
                  height={Math.max(2, barH)}
                  rx="4"
                  ry="4"
                  fill={isHovered ? 'url(#barHoverGrad)' : 'url(#barGrad)'}
                  style={{ transition: 'all 0.2s ease' }}
                />

                {/* X axis labels */}
                <text
                  x={p.x}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isHovered ? '600' : '400'}
                  fill={isHovered ? '#6B2437' : '#4A4247'}
                  fontFamily="inherit"
                >
                  {p.label}
                </text>
              </g>
            );
          })}

          {/* Trend line */}
          {points.length > 1 && (
            <path
              d={pathData}
              fill="none"
              stroke="#A3162F"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Trend dots */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hoveredIdx === i ? 5 : 3.5}
              fill="#FFFFFF"
              stroke="#A3162F"
              strokeWidth="2"
            />
          ))}
        </svg>

        {/* Hover Tooltip display */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <div
            className="ov-chart-tooltip"
            style={{
              left: `${(points[hoveredIdx].x / svgWidth) * 100}%`,
            }}
          >
            <b>{points[hoveredIdx].label} {points[hoveredIdx].subLabel ? `(${points[hoveredIdx].subLabel})` : ''}</b>
            <div className="ov-tooltip-revenue">{fmt(points[hoveredIdx].amount)}</div>
            <span className="note">{points[hoveredIdx].count} đơn hoàn thành</span>
          </div>
        )}
      </div>
    </section>
  );
}

