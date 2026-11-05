import Link from 'next/link';
import { EmptyState } from '@/components/ui/States';
export default function NotFound() {
  return <div className="wrap" style={{ paddingTop: 56, maxWidth: 720 }}><EmptyState title="Không tìm thấy trang hoặc sản phẩm" description="Sản phẩm có thể đã ngừng bán hoặc đường dẫn không đúng." action={<Link href="/san-pham" className="btn">Xem sản phẩm đang bán</Link>} /></div>;
}
