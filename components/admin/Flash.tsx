'use client';
import { createContext, useCallback, useContext, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { R } from '@/app/actions/admin';
import { useToast } from '@/components/ui/Toast';
import { useConfirm, type ConfirmOptions } from '@/components/ui/Confirm';
import { buttonClass, type ButtonSize, type ButtonVariant } from '@/components/ui/Button';

type Ctx = { run: (p: Promise<R>) => Promise<R>; pending: boolean };
const C = createContext<Ctx>(null as any);
/** Chạy server action → báo kết quả bằng Toast → làm mới dữ liệu trang. */
export const useRun = () => useContext(C);

/** Giữ tên cũ để các component đang dùng không phải đổi; thông báo nay hiện bằng Toast. */
export function FlashProvider({ children }: { children: React.ReactNode }) {
  const { push } = useToast();
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = useCallback(async (p: Promise<R>) => {
    const r = await p;
    push({ ok: !r.error, text: r.error || r.msg || 'Xong.' });
    start(() => router.refresh());
    return r;
  }, [router, push]);
  const value = useMemo(() => ({ run, pending }), [run, pending]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

/** Nút gọi server action; `confirm` mở ConfirmDialog trước khi chạy. */
export function Act({ action, args = [], children, primary, confirm: ask, label, disabled, variant, size }: {
  action: (...a: any[]) => Promise<R>; args?: any[]; children: React.ReactNode; primary?: boolean;
  confirm?: string | ConfirmOptions; label?: string; disabled?: boolean; variant?: ButtonVariant; size?: ButtonSize;
}) {
  const { run, pending } = useRun();
  const confirm = useConfirm();
  const onClick = async () => {
    if (ask && !(await confirm(typeof ask === 'string' ? { title: ask } : ask))) return;
    run(action(...args));
  };
  return <button type="button" className={buttonClass(variant ?? (primary ? 'primary' : 'secondary'), size)} aria-label={label} disabled={pending || disabled} onClick={onClick}>{children}</button>;
}
