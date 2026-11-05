// Tầng 5 – trạng thái hiển thị dùng chung (server-safe).

export function EmptyState({ title, description, action }: { title: string; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="ui-empty" role="status">
      <b>{title}</b>
      {description && <span className="note">{description}</span>}
      {action}
    </div>
  );
}

export function Skeleton({ w = '100%', h = 16, style }: { w?: number | string; h?: number | string; style?: React.CSSProperties }) {
  return <span className="ui-skel" aria-hidden style={{ width: w, height: h, ...style }} />;
}

/** Khung chờ cho loading.tsx: tiêu đề, hàng chỉ số và bảng. */
export function LoadingState({ variant = 'table', label = 'Đang tải dữ liệu...' }: { variant?: 'table' | 'cards' | 'form' | 'shop'; label?: string }) {
  return (
    <div className="ui-loading" aria-busy="true" aria-live="polite">
      <span className="sr">{label}</span>
      <Skeleton w={120} h={12} />
      <Skeleton w="min(420px,80%)" h={36} />
      {variant === 'cards' && <div className="kpis">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={96} />)}</div>}
      {variant === 'shop' && <div className="pgrid">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={320} />)}</div>}
      {variant === 'form' && <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={44} />)}</div>}
      {(variant === 'table' || variant === 'cards') && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><Skeleton h={40} />{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} h={44} />)}</div>}
    </div>
  );
}

export function SuccessState({ eyebrow, title, children, actions }: { eyebrow?: string; title: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="ui-success" role="status">
      {eyebrow && <span className="eb">{eyebrow}</span>}
      <h1 className="disp" style={{ fontSize: 48, lineHeight: 1 }}>{title}</h1>
      {children}
      {actions && <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}
