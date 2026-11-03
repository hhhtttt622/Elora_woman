// Tầng 2/3 – điều hướng trong trang: Tabs, chip lọc, phân trang, ô tìm kiếm (Server Components, dựa trên URL).
import Link from 'next/link';
import { hrefWith, type Params } from '@/lib/url';

export type TabItem = { key: string; label: string; href: string; count?: number };

/** Tabs dạng liên kết: mỗi tab có URL riêng (?tab=...). */
export function Tabs({ items, current, label }: { items: TabItem[]; current: string; label: string }) {
  return (
    <nav className="ui-tabs" aria-label={label}>
      {items.map((t) => (
        <Link key={t.key} href={t.href} className="ui-tab" aria-current={t.key === current ? 'page' : undefined} scroll={false}>
          {t.label}{t.count ? <span className="bd">{t.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

/** Chip lọc nhanh (một lựa chọn). */
export function FilterChips({ items, current, label }: { items: { key: string; label: string; href: string }[]; current: string; label: string }) {
  return (
    <div className="ui-chips" role="group" aria-label={label}>
      {items.map((c) => <Link key={c.key} href={c.href} className={'chip' + (c.key === current ? ' on' : '')} aria-current={c.key === current ? 'true' : undefined} scroll={false}>{c.label}</Link>)}
    </div>
  );
}

/** Form GET: giữ các tham số khác (`keep`), bỏ `page` để về trang 1. */
export function SearchBar({ name = 'q', label, placeholder, defaultValue, params, keep, id }: { name?: string; label: string; placeholder?: string; defaultValue?: string; params: Params; keep: string[]; id: string }) {
  return (
    <form method="get" className="ui-search" role="search">
      <div className="fl"><label className="lbl" htmlFor={id}>{label}</label><input id={id} name={name} className="fld" type="search" defaultValue={defaultValue} placeholder={placeholder} /></div>
      {keep.map((k) => { const v = params[k]; return typeof v === 'string' && v ? <input key={k} type="hidden" name={k} value={v} /> : null; })}
      <button className="ghost" style={{ minHeight: 44 }}>Tìm</button>
    </form>
  );
}

/** Phân trang theo ?page=, giữ nguyên tham số khác. */
export function Pagination({ base, params, page, pages, total, size }: { base: string; params: Params; page: number; pages: number; total: number; size: number }) {
  if (total <= size) return null;
  const from = (page - 1) * size + 1, to = Math.min(total, page * size);
  const nums: number[] = [];
  for (let n = 1; n <= pages; n++) {
    if (n === 1 || n === pages || Math.abs(n - page) <= 1) {
      nums.push(n);
    }
  }
  const href = (n: number) => hrefWith(base, params, { page: n === 1 ? null : n });
  return (
    <div className="ui-pager">
      <span className="note">Hiển thị {from}–{to} / {total}</span>
      <nav aria-label="Phân trang">
        {page > 1 ? <Link href={href(page - 1)} aria-label="Trang trước" scroll={false}>‹</Link> : <span className="dis cur" style={{ background: '#fff', color: 'inherit', borderColor: 'var(--line-2)' }}>‹</span>}
        {nums.map((n, i) => (
          <span key={n} style={{ display: 'contents' }}>
            {i > 0 && n - nums[i - 1] > 1 && <span aria-hidden style={{ alignSelf: 'center', padding: '0 4px' }}>…</span>}
            {n === page ? <span className="cur" aria-current="page">{n}</span> : <Link href={href(n)} scroll={false}>{n}</Link>}
          </span>
        ))}
        {page < pages ? <Link href={href(page + 1)} aria-label="Trang sau" scroll={false}>›</Link> : <span className="dis cur" style={{ background: '#fff', color: 'inherit', borderColor: 'var(--line-2)' }}>›</span>}
      </nav>
    </div>
  );
}
