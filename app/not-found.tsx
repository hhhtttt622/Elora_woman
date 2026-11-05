import Link from 'next/link';
import { EmptyState } from '@/components/ui/States';
export default function NotFound() {
  return (
    <main className="wrap" style={{ paddingTop: 80, maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Link href="/" className="logo">ELORA <i>woman</i></Link>
      <EmptyState title="Không tìm thấy trang" description="Đường dẫn không tồn tại hoặc đã thay đổi." action={<Link href="/" className="btn">Về trang chủ</Link>} />
    </main>
  );
}
