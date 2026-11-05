// Ma trận phân quyền, mục 3.2 đặc tả v3.0 (BR-05). Không import module server để dùng được ở cả client.
export type Role = 'customer' | 'stylist' | 'staff' | 'admin';
export const ROLES: Role[] = ['customer', 'stylist', 'staff', 'admin'];
export const INTERNAL_ROLES: Role[] = ['stylist', 'staff', 'admin'];
export const ROLE_LABEL: Record<Role, string> = { customer: 'Khách hàng', stylist: 'Stylist', staff: 'Nhân viên', admin: 'Admin' };
export const STATUS_LABEL: Record<string, string> = { active: 'Hoạt động', locked: 'Bị khóa' };

const MATRIX = {
  'UC-02': ['customer', 'stylist', 'staff'], 'UC-03': ['customer', 'stylist', 'staff'],
  'UC-04': ['customer'], 'UC-08': ['customer'], 'UC-09': ['customer'], 'UC-10': ['customer'], 'UC-11': ['customer'],
  'UC-12': ['stylist'], 'UC-13': ['stylist'], 'UC-14': ['stylist'], 'UC-15': ['stylist'], 'UC-16': ['stylist'],
  'UC-17': ['staff'], 'UC-18': ['admin'], 'UC-19': ['staff', 'stylist'], 'UC-20': ['stylist', 'staff'],
  'UC-21': ['staff'], 'UC-22': ['staff'], 'UC-23': ['staff'], 'UC-24': ['admin'], 'UC-25': ['staff'],
  'UC-26': ['staff'], 'UC-27': ['staff'], 'UC-28': ['staff'], 'UC-29': ['staff'], 'UC-30': ['staff'], 'UC-31': ['staff'],
  'UC-32': ['staff'], 'UC-33': ['staff'], 'UC-34': ['staff'], 'UC-35': ['staff'], 'UC-36': ['admin'], 'UC-37': ['staff'],
  'UC-38': ['admin'], 'UC-39': ['customer', 'stylist', 'staff'], 'UC-40': ['admin'],
} satisfies Record<string, Role[]>;
export type Perm = keyof typeof MATRIX;

/** Admin kế thừa mọi use case của stylist và nhân viên, không kế thừa use case của khách hàng. */
export function can(role: Role | undefined, uc: Perm) {
  if (!role) return false;
  const roles: Role[] = MATRIX[uc];
  return roles.includes(role) || (role === 'admin' && roles.some((r) => r === 'stylist' || r === 'staff'));
}
export const isInternal = (role?: Role) => !!role && INTERNAL_ROLES.includes(role);
export const homeOf = (role: Role) => (role === 'customer' ? '/tai-khoan' : '/admin');
