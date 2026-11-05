'use client';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { BaseModal } from './Dialog';
import { Button } from './Button';

export type ConfirmOptions = {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
};
type Ctx = (o: ConfirmOptions) => Promise<boolean>;
const C = createContext<Ctx>(async () => true);

/** `const confirm = useConfirm(); if (await confirm({...})) ...` – thay cho window.confirm. */
export const useConfirm = () => useContext(C);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(v: boolean) => void>();
  const confirm = useCallback<Ctx>((o) => new Promise<boolean>((res) => { resolver.current = res; setOpts(o); }), []);
  const done = useCallback((v: boolean) => { resolver.current?.(v); resolver.current = undefined; setOpts(null); }, []);
  return (
    <C.Provider value={confirm}>
      {children}
      <BaseModal
        open={!!opts}
        onClose={() => done(false)}
        size="sm"
        title={opts?.title || ''}
        footer={<>
          <Button variant="secondary" size="md" onClick={() => done(false)}>{opts?.cancelLabel || 'Hủy'}</Button>
          <Button variant={opts?.tone === 'danger' ? 'danger' : 'primary'} size="md" onClick={() => done(true)} autoFocus>{opts?.confirmLabel || 'Xác nhận'}</Button>
        </>}
      >
        {opts?.message && <div style={{ fontSize: 15 }}>{opts.message}</div>}
      </BaseModal>
    </C.Provider>
  );
}
