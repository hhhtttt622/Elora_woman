'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';
import Menu from '@/components/ui/Menu';

type Nav = { group: string; items: [string, string][] }[];
type User = { name: string; email: string; roleLabel: string };

// Nhãn cho đoạn đường dẫn con không có trong menu (route chi tiết).
const SEGMENT_LABEL: Record<string, string> = { 'kiem-hang': 'Kiểm hàng' };

function crumbsOf(path: string, nav: Nav) {
  const flat = nav.flatMap((g) => g.items.map(([href, label]) => ({ href, label, group: g.group })));
  const hit = flat.filter((i) => path === i.href || (i.href !== '/admin' && path.startsWith(i.href + '/'))).sort((a, b) => b.href.length - a.href.length)[0];
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
  useEffect(() => setOpen(false), [path]);
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
  const crumbs = crumbsOf(path, nav);
  const initials = user.name.split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase();
  const hidden = mobile && !open;

  return (
    <div className="adm">
      <aside id="admin-side" className="side" data-open={open} aria-label="Điều hướng quản trị" {...(hidden ? { inert: '' as any, 'aria-hidden': true } : {})}>
        <div className="side-brand">
          <Link href="/admin" className="logo" style={{ color: '#fff', fontSize: 26 }}>ELORA <i style={{ color: 'var(--on-dark-accent)' }}>woman</i></Link>
          <span className="side-role">Quản trị · {user.roleLabel}</span>
        </div>
        <nav id="admin-nav" aria-label="Menu quản trị" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map((g) => [<span key={g.group} className="nh">{g.group}</span>, ...g.items.map(([href, label]) => {
            const on = path === href || (href !== '/admin' && path.startsWith(href + '/'));
            return <Link key={href} href={href} className={'sn' + (on ? ' on' : '')} aria-current={on ? 'page' : undefined}>{label}{badges[href] > 0 && <span className="bd" aria-label={`${badges[href]} việc đang chờ`}>{badges[href]}</span>}</Link>;
          })])}
        </nav>
      </aside>
      {mobile && open && <div className="side-backdrop" onClick={() => setOpen(false)} aria-hidden />}

      <div className="acol">
        <header className="ahead">
          <button ref={toggle} type="button" className="ui-icon-btn menu-toggle" aria-label={open ? 'Đóng menu' : 'Mở menu'} aria-expanded={open} aria-controls="admin-side" onClick={() => setOpen(!open)}>☰</button>
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
