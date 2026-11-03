// Tài khoản mẫu (scripts/seed.ts) và ma trận truy cập trang theo lib/permissions.ts.
export type RoleKey = 'guest' | 'customer' | 'stylist' | 'staff' | 'admin';

export const ACCOUNTS: Record<Exclude<RoleKey, 'guest'>, { email: string; password: string }> = {
  customer: { email: 'ha.nguyen@example.com', password: 'elora123' },
  stylist: { email: 'stylist@elora.vn', password: 'stylist123' },
  staff: { email: 'kho@elora.vn', password: 'nhanvien123' },
  admin: { email: 'admin@elora.vn', password: 'admin123' },
};

export const authFile = (r: RoleKey) => `tests/.auth/${r}.json`;

export const SHOP_PUBLIC = ['/', '/san-pham', '/san-pham?cat=Phụ kiện', '/san-pham?sale=1', '/gio-hang', '/tu-van'];

/** Trang quản trị và mã UC; vai trò được vào lấy theo ma trận UC-xx. */
export const ADMIN_PAGES: { path: string; roles: RoleKey[] }[] = [
  { path: '/admin', roles: ['stylist', 'staff', 'admin'] },
  { path: '/admin/don-hang', roles: ['staff', 'admin'] },
  { path: '/admin/san-pham', roles: ['admin'] },
  { path: '/admin/khach-hang', roles: ['staff', 'stylist', 'admin'] },
  { path: '/admin/tu-van', roles: ['stylist', 'admin'] },
  { path: '/admin/kho/giu-hang', roles: ['stylist', 'admin'] },
  { path: '/admin/kho', roles: ['staff', 'admin'] },
  { path: '/admin/kho/capsule', roles: ['staff', 'admin'] },
  { path: '/admin/kho/dat-may', roles: ['staff', 'admin'] },
  { path: '/admin/kho/dieu-chuyen', roles: ['staff', 'admin'] },
  { path: '/admin/kho/xuat-kho', roles: ['staff', 'admin'] },
  { path: '/admin/kho/nhat-ky', roles: ['staff', 'admin'] },
  { path: '/admin/tai-khoan', roles: ['admin'] },
  { path: '/admin/bao-cao', roles: ['admin'] },
  { path: '/admin/tai-khoan-cua-toi', roles: ['stylist', 'staff', 'admin'] },
];

/** Trang đích khi không đủ quyền (homeOf / redirect trong layout). */
export const HOME: Record<RoleKey, string> = { guest: '/dang-nhap', customer: '/tai-khoan', stylist: '/admin', staff: '/admin', admin: '/admin' };
