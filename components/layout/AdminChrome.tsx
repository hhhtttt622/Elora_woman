'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';
import Menu from '@/components/ui/Menu';

type Nav = { group: string; items: [string, string][] }[];
type User = { name: string; email: string; roleLabel: string };

// Nhãn cho đoạn đường dẫn con không có trong menu (route chi tiết).
const SEGMENT_LABEL: Record<string, string> = { 'kiem-hang': 'Kiểm hàng' };
const WS_RE = /\s+/;

const isOn = (path: string, href: string) => path === href || (href !== '/admin' && path.startsWith(href + '/'));

/** Mục menu khớp dài nhất với đường dẫn (vd. /admin/don-hang/xuat-kho thắng /admin/don-hang). */
function activeItem(path: string, nav: Nav) {
  let hit: { href: string; label: string; group: string } | null = null;
  for (const g of nav) {
    for (const [href, label] of g.items) {
      if (isOn(path, href) && (!hit || href.length > hit.href.length)) hit = { href, label, group: g.group };
    }
  }
  return hit;
}

function crumbsOf(path: string, hit: ReturnType<typeof activeItem>) {
  if (!hit) return [{ label: 'Quản trị', href: '/admin' }];
  const out: { label: string; href?: string }[] = [{ label: hit.group }, { label: hit.label, href: path === hit.href ? undefined : hit.href }];
  path.slice(hit.href.length).split('/').filter(Boolean).forEach((s) => out.push({ label: SEGMENT_LABEL[s] || decodeURIComponent(s) }));
  return out;
}

/**
 * Tầng 1 – Application Shell quản trị: Sidebar (lọc theo quyền, badge việc chờ) + Header
 * (Breadcrumb, menu người dùng có Đăng xuất ở đầu trang – UC-03).
 */
export default function AdminChrome({ nav, badges, user, children }: { nav: Nav; badges: Record<string, number>; user: User; children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  // Đổi trang thì đóng menu off-canvas ngay trong lúc render (không cần effect + render lại).
  const [prevPath, setPrevPath] = useState(path);
  if (prevPath !== path) { setPrevPath(path); setOpen(false); }
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 820px)');
    const on = () => setMobile(mq.matches);
    on(); mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); toggle.current?.focus(); } };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [open]);
  const active = useMemo(() => activeItem(path, nav), [path, nav]);
  const crumbs = useMemo(() => crumbsOf(path, active), [path, active]);
  // Menu dài hơn màn hình: luôn đưa mục đang chọn vào vùng nhìn thấy.
  const activeHref = active?.href;
  useEffect(() => { navRef.current?.querySelector('.sn.on')?.scrollIntoView({ block: 'nearest' }); }, [activeHref]);
  const initials = useMemo(() => user.name.split(WS_RE).slice(-2).map((w) => w[0]).join('').toUpperCase(), [user.name]);
  const hidden = mobile && !open;

  return (
    <div className="adm">
      <aside id="admin-side" className="side" data-open={open} aria-label="Điều hướng quản trị" {...(hidden ? { inert: '' as any, 'aria-hidden': true } : {})}>
        <div className="side-brand">
          <Link href="/admin" className="logo" style={{ color: '#fff', fontSize: 26 }}>ELORA <i style={{ color: 'var(--on-dark-accent)' }}>woman</i></Link>
          <span className="side-role">Vai trò: {user.roleLabel}</span>
        </div>
        <nav ref={navRef} id="admin-nav" className="side-nav" aria-label="Menu quản trị">
          {nav.map((g) => [<span key={g.group} className="nh">{g.group}</span>, ...g.items.map(([href, label]) => {
            const on = href === active?.href;
            return <Link key={href} href={href} className={'sn' + (on ? ' on' : '')} aria-current={on ? 'page' : undefined}>{label}{badges[href] > 0 && <span className="bd" aria-label={`${badges[href]} việc đang chờ`}>{badges[href]}</span>}</Link>;
          })])}
        </nav>
      </aside>
      {mobile && open && <div className="side-backdrop" onClick={() => setOpen(false)} aria-hidden />}

      <div className="acol">
        <header className="ahead">
          <button ref={toggle} type="button" className="ui-icon-btn menu-toggle" aria-label={open ? 'Đóng menu' : 'Mở menu'} aria-expanded={open} aria-controls="admin-side" onClick={() => setOpen((o) => !o)}>☰</button>
          <nav aria-label="Đường dẫn" className="ui-crumbs">
            <ol>{crumbs.map((c, i) => <li key={i}>{c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{c.label}</span>}</li>)}</ol>
          </nav>
          <Menu label={`Tài khoản ${user.name}`} className="user-menu" trigger={<span className="user-chip"><span className="avatar" aria-hidden>{initials}</span><span className="user-chip-text"><b>{user.name}</b><span>{user.roleLabel}</span></span><span aria-hidden className="caret">▾</span></span>}>
            <div className="ui-menu-info"><b>{user.name}</b><span>{user.email}</span><span>{user.roleLabel}</span></div>
            <hr />
            <Link href="/admin/tai-khoan-cua-toi">Đổi mật khẩu</Link>
            <Link href="/">Xem cửa hàng</Link>
            <hr />
            <form action={logoutAction}><button type="submit">Đăng xuất</button></form>
          </Menu>
        </header>
        <main className="amain" id="main">{children}</main>
      </div>
    </div>
  );
}
