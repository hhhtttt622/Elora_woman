'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/** Dropdown dựa trên <details>: chạy được không cần JS, tự đóng khi bấm ra ngoài, Esc hoặc đổi trang. */
export default function Menu({ trigger, label, children, className = '' }: { trigger: React.ReactNode; label: string; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const path = usePathname();
  useEffect(() => { if (ref.current) ref.current.open = false; }, [path]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false; };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && ref.current?.open) { ref.current.open = false; ref.current.querySelector('summary')?.focus(); } };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);
  return (
    <details ref={ref} className={'ui-menu ' + className}>
      <summary aria-label={label}>{trigger}</summary>
      <div className="ui-menu-panel">{children}</div>
    </details>
  );
}
