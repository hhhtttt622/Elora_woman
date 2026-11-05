// Khối hiển thị dùng chung (Server Components).
import Link from 'next/link';

export function DescriptionList({ items, min }: { items: [React.ReactNode, React.ReactNode][]; min?: number }) {
  return (
    <dl className="ui-dl" style={min ? ({ '--dl-min': `${min}px` } as React.CSSProperties) : undefined}>
      {items.map(([k, v], i) => <div key={i}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  );
}

export function StatCard({ label, value, note, href, danger }: { label: string; value: React.ReactNode; note?: React.ReactNode; href?: string; danger?: boolean }) {
  const body = <><span className="lbl">{label}</span><b style={danger ? { color: 'var(--c-danger)' } : undefined}>{value}</b>{note && <span className="note">{note}</span>}</>;
  return href ? <Link href={href} className="kpi ui-kpi-link">{body}</Link> : <div className="kpi">{body}</div>;
}

export function Section({ title, actions, children, tone }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; tone?: 'alt' }) {
  return (
    <section className="ui-section" style={tone === 'alt' ? { background: 'var(--c-surface-alt)' } : undefined}>
      {(title || actions) && <div className="ui-section-head">{title && <h2 className="h2">{title}</h2>}{actions}</div>}
      {children}
    </section>
  );
}

/** Ô nhập có nhãn, gợi ý và lỗi gắn aria-describedby. Truyền đúng một phần tử điều khiển làm children. */
export function Field({ id, label, error, hint, children, style }: { id: string; label: React.ReactNode; error?: string; hint?: React.ReactNode; children: React.ReactElement; style?: React.CSSProperties }) {
  return (
    <div className="fl" style={style}>
      <label className="lbl" htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <span id={`${id}-hint`} className="note">{hint}</span>}
      {error && <span id={`${id}-err`} className="err">{error}</span>}
    </div>
  );
}

/** Các bước trạng thái (đơn hàng 4 bước – UC-09, BR-08). */
export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="ui-steps">
      {steps.map((s, i) => (
        <li key={s} className={i <= current ? 'done' : ''} aria-current={i === current ? 'step' : undefined}>
          <span className={'badge' + (i <= current ? ' dark' : '')}>{i + 1}</span>{s}{i === current ? ' (hiện tại)' : ''}
        </li>
      ))}
    </ol>
  );
}
