// Ánh xạ trạng thái nghiệp vụ → tông màu badge. Chỉ là hiển thị, không chứa logic nghiệp vụ.
// Tông: '' (sage, trung tính) · dark · red · pink · sand
import { ORDER_STATUS, PO_STATUS } from './util';

export type Tone = '' | 'dark' | 'red' | 'pink' | 'sand';
export type StatusDomain = 'order' | 'po' | 'consult' | 'transfer' | 'return' | 'workshop' | 'stock' | 'account' | 'product' | 'hold';

export function statusTone(domain: StatusDomain, value: string | number): Tone {
  switch (domain) {
    case 'order': return value === 3 ? 'dark' : value === 0 ? 'pink' : 'sand';
    case 'po': return (['pink', 'sand', '', 'dark'] as Tone[])[Number(value)] ?? '';
    case 'consult': return value === 'Mới' ? 'red' : value === 'Đang phối' ? 'sand' : 'dark';
    case 'transfer': return value === 'Hoàn tất' ? 'dark' : 'sand';
    case 'return': return (value === 'Chờ nhận hàng' || value === 'Chờ kiểm tra') ? 'pink' : 'dark';
    case 'workshop': return value === 'Đã trả xưởng' ? 'dark' : 'pink';
    case 'stock': return value === 'Hết hàng' ? 'red' : value === 'Sắp hết' ? 'pink' : '';
    case 'account': return value === 'locked' ? 'red' : 'dark';
    case 'product': return value ? 'dark' : '';
    // UC-15 bước 2: lệnh giữ còn đến 6 giờ được tô đỏ
    case 'hold': return Number(value) <= 6 ? 'red' : '';
  }
}

export function statusLabel(domain: StatusDomain, value: string | number): string {
  if (domain === 'order') return ORDER_STATUS[Number(value)] ?? String(value);
  if (domain === 'po') return PO_STATUS[Number(value)] ?? String(value);
  if (domain === 'account') return value === 'locked' ? 'Bị khóa' : 'Hoạt động';
  if (domain === 'product') return value ? 'Đang bán' : 'Đã ẩn';
  if (domain === 'hold') return `Còn ${value} giờ`;
  return String(value);
}
