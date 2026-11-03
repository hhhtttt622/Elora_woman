'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Props = {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
  children: React.ReactNode;
};

// Ngăn xếp dialog đang mở. Khi có modal, phần còn lại của trang bị inert, nên Toast
// phải được đặt vào trong dialog trên cùng mới bấm và đọc được (xem Toast.tsx).
const stack: HTMLDialogElement[] = [];
export const topDialog = () => stack[stack.length - 1] || null;
const notify = () => window.dispatchEvent(new Event('ui:toplayer'));
const drop = (d: HTMLDialogElement | null) => { const i = d ? stack.indexOf(d) : -1; if (i >= 0) { stack.splice(i, 1); notify(); } };

/**
 * Dùng phần tử <dialog> gốc: showModal() có sẵn khóa focus, phím Esc, lớp nền,
 * và trả focus về nút đã mở khi đóng. Không cần thư viện ngoài.
 */
function Shell({ open, onClose, title, eyebrow, size = 'md', footer, children, kind }: Props & { kind: 'modal' | 'drawer' }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!open) { if (d.open) d.close(); return; }
    if (!d.open) d.showModal();
    if (!stack.includes(d)) stack.push(d);
    notify();
    return () => drop(d); // chạy khi đóng hoặc unmount (an toàn với StrictMode chạy effect 2 lần)
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`ui-dialog ${kind === 'drawer' ? 'ui-drawer' : 'ui-modal'} ${size}`}
      aria-labelledby={id}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onMouseDown={(e) => { if (e.target === ref.current) onClose(); }}
    >
      {open && <>
        <div className="ui-dialog-head">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            {eyebrow && <span className="eb">{eyebrow}</span>}
            <h2 id={id} className="ui-dialog-title">{title}</h2>
          </div>
          <button type="button" className="ui-icon-btn" aria-label="Đóng" onClick={onClose}>×</button>
        </div>
        <div className="ui-dialog-body">{children}</div>
        {footer && <div className="ui-dialog-foot">{footer}</div>}
      </>}
    </dialog>
  );
}

/** Tầng 4 – tạo mới, sửa nhanh. */
export function BaseModal(p: Props) { return <Shell {...p} kind="modal" />; }

/** Tầng 3 – xem nhanh, giữ ngữ cảnh trang. */
export function BaseDrawer(p: Props) { return <Shell {...p} kind="drawer" />; }

/**
 * Drawer điều khiển bằng URL: trang server render khi có `?param=...`.
 * Đóng chỉ xóa `param` (và `alsoRemove`), giữ nguyên tìm kiếm, bộ lọc, trang.
 */
export function UrlDrawer({ param, alsoRemove = [], ...p }: Omit<Props, 'open' | 'onClose'> & { param: string; alsoRemove?: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(true);
  const close = () => {
    setOpen(false);
    const n = new URLSearchParams(sp.toString());
    [param, ...alsoRemove].forEach((k) => n.delete(k));
    const s = n.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };
  return <Shell {...p} open={open} onClose={close} kind="drawer" />;
}

/**
 * Modal tự mở khi trang được gọi kèm tham số điền sẵn (UC-24 1a, UC-26 1a, UC-30 1a).
 * Đóng sẽ xóa các tham số đó khỏi URL.
 */
export function useUrlModal(initialOpen: boolean, params: string[]) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(initialOpen);
  const close = () => {
    setOpen(false);
    if (params.some((k) => sp.has(k))) {
      const n = new URLSearchParams(sp.toString());
      params.forEach((k) => n.delete(k));
      const s = n.toString();
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    }
  };
  return { open, setOpen, close };
}
