'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { topDialog } from './Dialog';

type Item = { id: number; ok: boolean; text: string };
type Ctx = { push: (t: { ok: boolean; text: string }) => void };
const C = createContext<Ctx>({ push: () => {} });
export const useToast = () => useContext(C);

let seq = 0;

/**
 * Tầng 5 – thông báo kết quả thao tác. Thành công tự ẩn sau 4 giây, lỗi giữ đến khi đóng.
 * Khi có Modal/Drawer đang mở, khung toast được đưa vào trong dialog trên cùng: phần còn lại
 * của trang lúc đó là inert nên toast nằm ngoài sẽ không bấm được và trình đọc màn hình không đọc.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [host, setHost] = useState<Element | null>(null);
  const remove = useCallback((id: number) => setItems((p) => p.filter((x) => x.id !== id)), []);
  const push = useCallback((t: { ok: boolean; text: string }) => {
    const id = ++seq;
    setItems((p) => [...p.slice(-3), { id, ...t }]);
    if (t.ok) setTimeout(() => remove(id), 4000);
  }, [remove]);

  useEffect(() => {
    const on = () => setHost(topDialog());
    on();
    window.addEventListener('ui:toplayer', on);
    return () => window.removeEventListener('ui:toplayer', on);
  }, []);

  const box = (
    <div className="ui-toasts" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={'ui-toast ' + (t.ok ? 'good' : 'bad')} role={t.ok ? 'status' : 'alert'}>
          <span>{t.text}</span>
          <button type="button" className="textbtn" onClick={() => remove(t.id)} aria-label="Đóng thông báo">Đóng</button>
        </div>
      ))}
    </div>
  );
  return <C.Provider value={{ push }}>{children}{host ? createPortal(box, host) : box}</C.Provider>;
}
