'use client';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Tầng 5 – trạng thái đang tải khi chuyển trang: thanh mỏng ở đầu màn hình.
 * Không dùng loading.tsx ở các route có kiểm tra quyền, vì Suspense làm redirect()
 * của requirePage chạy sau khi đã stream (chậm và nháy khung chờ) thay vì chuyển hướng ngay.
 */
export default function NavProgress() {
  const path = usePathname();
  const sp = useSearchParams();
  const [busy, setBusy] = useState(false);
  // So sánh chuỗi URL (primitive) thay vì object searchParams; tắt thanh tải ngay lúc render khi URL đã đổi.
  const url = path + '?' + sp.toString();
  const [prevUrl, setPrevUrl] = useState(url);
  if (prevUrl !== url) { setPrevUrl(url); setBusy(false); }
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search)) return;
      setBusy(true);
    };
    const onSubmit = (e: SubmitEvent) => { const f = e.target as HTMLFormElement; if ((f.method || 'get').toLowerCase() === 'get' && !e.defaultPrevented) setBusy(true); };
    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit);
    return () => { document.removeEventListener('click', onClick); document.removeEventListener('submit', onSubmit); };
  }, []);
  return <div className={'ui-progress' + (busy ? ' on' : '')} role="progressbar" aria-hidden={!busy} aria-label="Đang tải trang" />;
}
