'use client';
import { useEffect } from 'react';

/** Dùng trong error.tsx của App Router. */
export default function ErrorState({ error, reset, title = 'Không tải được trang này' }: { error: Error & { digest?: string }; reset: () => void; title?: string }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="ui-error" role="alert">
      <span className="eb" style={{ color: 'var(--c-danger)' }}>Có lỗi xảy ra</span>
      <h1 className="disp" style={{ fontSize: 32, lineHeight: 1.1 }}>{title}</h1>
      <p className="note">Dữ liệu của bạn chưa bị thay đổi. Hãy thử tải lại; nếu vẫn lỗi, báo cho quản trị viên{error.digest ? ` kèm mã ${error.digest}` : ''}.</p>
      <button type="button" className="btn" onClick={reset}>Thử lại</button>
    </div>
  );
}
