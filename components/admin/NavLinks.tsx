'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
export default function NavLinks({ nav, badges }: { nav: { group: string; items: [string, string][] }[]; badges: Record<string, number> }) {
  const path = usePathname();
  // trên mobile menu thu gọn sau nút Menu, tự đóng khi chuyển trang
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const current = nav.flatMap((g) => g.items).find(([h]) => h === path)?.[1];
  return (<>
    <button type="button" className="menu-btn" aria-expanded={open} aria-controls="admin-nav" onClick={() => setOpen(!open)}>{open ? 'Đóng menu' : `Menu${current ? ' · ' + current : ''}`}</button>
    <nav id="admin-nav" data-open={open} aria-label="Menu quản trị" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {nav.map((g) => [<span key={g.group} className="nh">{g.group}</span>, ...g.items.map(([href, label]) => (
        <Link key={href} href={href} className={'sn' + (path === href ? ' on' : '')} aria-current={path === href ? 'page' : undefined}>{label}{badges[href] > 0 && <span className="bd">{badges[href]}</span>}</Link>))])}
    </nav>
  </>);
}
