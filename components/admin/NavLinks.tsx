'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Menu quản trị. Chỉ nhóm "Quản lý kho" là dropdown thu gọn, và chỉ bọc 4 mục
// được chỉ định; các mục kho còn lại để riêng bên ngoài. (Huyền Yan)
const SALES: [string, string][] = [['/admin', 'Tổng quan'], ['/admin/don-hang', 'Đơn hàng'], ['/admin/san-pham', 'Sản phẩm'], ['/admin/khach-hang', 'Khách hàng'], ['/admin/tu-van', 'Tư vấn phối đồ']];
const KHO_GROUP: [string, string][] = [['/admin/kho', 'Tồn kho và SKU'], ['/admin/kho/dat-may', 'Đặt may và nhập kho'], ['/admin/kho/dieu-chuyen', 'Kho và điều chuyển'], ['/admin/kho/xuat-kho', 'Xuất kho bán hàng']];
const KHO_OTHERS: [string, string][] = [['/admin/kho/capsule', 'Combo capsule'], ['/admin/kho/giu-hang', 'Giữ hàng styling'], ['/admin/kho/doi-tra', 'Đổi trả'], ['/admin/kho/nhat-ky', 'Cảnh báo và nhật ký']];

export default function NavLinks({ badges }: { badges: Record<string, number> }) {
  const path = usePathname();
  const khoActive = KHO_GROUP.some((l) => l[0] === path);
  const [khoOpen, setKhoOpen] = useState(khoActive);
  // Mở nhóm khi đang ở một trang bên trong nó.
  useEffect(() => {
    if (khoActive) setKhoOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  const khoTotal = KHO_GROUP.reduce((n, l) => n + (badges[l[0]] || 0), 0);
  const navLink = (l: [string, string], child = false) => (
    <Link key={l[0]} href={l[0]} className={'sn' + (path === l[0] ? ' on' : '')} aria-current={path === l[0] ? 'page' : undefined}
      style={child ? { fontSize: 13, fontWeight: 400, minHeight: 40, color: path === l[0] ? '#fff' : '#CBBFC5' } : undefined}>
      {l[1]}{badges[l[0]] > 0 && <span className="bd">{badges[l[0]]}</span>}
    </Link>
  );
  return (
    <nav aria-label="Menu quản trị" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span className="nh">Bán hàng</span>
      {SALES.map((l) => navLink(l))}

      <button type="button" className="nh" aria-expanded={khoOpen} onClick={() => setKhoOpen((o) => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 0, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
        <span>Quản lý kho</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {!khoOpen && khoTotal > 0 && <span className="bd" style={{ margin: 0 }}>{khoTotal}</span>}
          <span aria-hidden style={{ fontSize: 9, transition: 'transform .2s', transform: khoOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
        </span>
      </button>
      {khoOpen && (
        <div style={{ borderLeft: '2px solid rgba(232,203,209,.4)', marginLeft: 20, paddingLeft: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {KHO_GROUP.map((l) => navLink(l, true))}
        </div>
      )}

      <div aria-hidden style={{ height: 1, background: 'rgba(255,255,255,.16)', margin: '16px 14px 6px' }} />
      {KHO_OTHERS.map((l) => navLink(l))}
    </nav>
  );
}
