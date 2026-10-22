import type { Perm } from './permissions';

/** Menu quản trị. Mỗi mục gắn mã use case để chỉ hiện mục được phân quyền (UC-02 bước 5). */
export const ADMIN_NAV: { group: string; items: [string, string, Perm][] }[] = [
  { group: 'Bán hàng', items: [['/admin', 'Tổng quan', 'UC-20'], ['/admin/don-hang', 'Đơn hàng', 'UC-17'], ['/admin/san-pham', 'Sản phẩm', 'UC-18'], ['/admin/khach-hang', 'Khách hàng', 'UC-19']] },
  { group: 'Tư vấn phối đồ', items: [['/admin/tu-van', 'Yêu cầu tư vấn', 'UC-12'], ['/admin/kho/giu-hang', 'Hàng đang giữ', 'UC-15']] },
  { group: 'Quản lý kho', items: [['/admin/kho', 'Tồn kho và SKU', 'UC-22'], ['/admin/kho/capsule', 'Combo capsule', 'UC-25'], ['/admin/kho/dat-may', 'Đặt may và nhập kho', 'UC-26'],
    ['/admin/kho/dieu-chuyen', 'Kho và điều chuyển', 'UC-30'], ['/admin/kho/xuat-kho', 'Xuất kho và đổi trả', 'UC-32'], ['/admin/kho/nhat-ky', 'Cảnh báo và nhật ký', 'UC-37']] },
  { group: 'Quản trị hệ thống', items: [['/admin/tai-khoan', 'Tài khoản người dùng', 'UC-38'], ['/admin/bao-cao', 'Báo cáo doanh thu', 'UC-40'], ['/admin/tai-khoan-cua-toi', 'Đổi mật khẩu', 'UC-39']] },
];
