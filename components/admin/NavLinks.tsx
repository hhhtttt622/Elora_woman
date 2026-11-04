'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
const NAV: ([string] | [string, string])[] = [
  ['Bán hàng'], ['/admin', 'Tổng quan'], ['/admin/don-hang', 'Đơn hàng'], ['/admin/san-pham', 'Sản phẩm'], ['/admin/khach-hang', 'Khách hàng'], ['/admin/tu-van', 'Tư vấn phối đồ'],
  ['Quản lý kho'], ['/admin/kho', 'Tồn kho và SKU'], ['/admin/kho/capsule', 'Combo capsule'], ['/admin/kho/dat-may', 'Đặt may và nhập kho'], ['/admin/kho/dieu-chuyen', 'Kho và điều chuyển'],
  ['/admin/kho/giu-hang', 'Giữ hàng styling'], ['/admin/kho/xuat-kho', 'Xuất kho bán hàng'], ['/admin/kho/doi-tra', 'Đổi trả'], ['/admin/kho/nhat-ky', 'Cảnh báo và nhật ký'],
];
export default function NavLinks({ badges }: { badges: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav aria-label="Menu quản trị" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {NAV.map((n) => n.length === 1 ? <span key={n[0]} className="nh">{n[0]}</span> : (
        <Link key={n[0]} href={n[0]} className={'sn' + (path === n[0] ? ' on' : '')} aria-current={path === n[0] ? 'page' : undefined}>{n[1]}{badges[n[0]] > 0 && <span className="bd">{badges[n[0]]}</span>}</Link>))}
    </nav>
  );
}
