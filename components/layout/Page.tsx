// Tầng 2 – khung trang và tiêu đề trang.

export function PageContainer({ children, width = 'default' }: { children: React.ReactNode; width?: 'default' | 'narrow' }) {
  return <div className={'ui-page' + (width === 'narrow' ? ' narrow' : '')}>{children}</div>;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="ui-ph">
      <div className="ui-ph-text">
        {eyebrow && <span className="eb">{eyebrow}</span>}
        <h1 className="ui-ph-title">{title}</h1>
        {description && <p className="note ui-ph-desc">{description}</p>}
      </div>
      {actions && <div className="ui-ph-actions">{actions}</div>}
    </div>
  );
}
