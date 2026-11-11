import { all, get } from './db';

export type PromotionQuote = { id: number; code: string; name: string; discount: number; subtotal: number };
const localParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
};

function birthdayEligible(birthday: string | null, window: string, now = new Date()) {
  if (!birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return false;
  const [by, bm, bd] = birthday.split('-').map(Number);
  const today = localParts(now); const month = Number(today.month); const day = Number(today.day);
  if (window === 'day') return month === bm && day === bd;
  if (window === 'week') {
    const b = new Date(Date.UTC(Number(today.year), bm - 1, bd));
    const t = new Date(Date.UTC(Number(today.year), month - 1, day));
    return Math.abs(t.getTime() - b.getTime()) <= 3 * 86400000;
  }
  return month === bm;
}

export function quotePromotion(userId: number, code: string, lines: { sku: string; qty: number }[], now = new Date()): PromotionQuote {
  const promotion = get<any>("SELECT * FROM promotions WHERE code=?", code.trim().toUpperCase());
  if (!promotion) throw new Error('Mã ưu đãi không tồn tại.');
  if (promotion.status !== 'active') throw new Error('Chương trình chưa hoạt động hoặc đã tạm dừng.');
  if (now < new Date(promotion.starts_at)) throw new Error('Chương trình chưa đến thời gian áp dụng.');
  if (now > new Date(promotion.ends_at)) throw new Error('Chương trình đã hết hạn.');
  const user = get<any>('SELECT birthday FROM users WHERE id=? AND role=?', userId, 'customer');
  if (!user) throw new Error('Tài khoản khách hàng không hợp lệ.');
  if (promotion.occasion === 'birthday' && !birthdayEligible(user.birthday, promotion.birthday_window, now)) throw new Error('Ưu đãi sinh nhật chỉ áp dụng trong kỳ sinh nhật của bạn. Hãy cập nhật ngày sinh trong hồ sơ.');
  if (promotion.audience === 'birthday' && !birthdayEligible(user.birthday, promotion.birthday_window, now)) throw new Error('Chương trình dành cho khách hàng trong kỳ sinh nhật.');

  const uses = get<any>("SELECT COUNT(*) n FROM promotion_redemptions WHERE promotion_id=? AND status!='released'", promotion.id)?.n || 0;
  if (promotion.max_uses != null && uses >= promotion.max_uses) throw new Error('Chương trình đã hết lượt sử dụng.');
  const year = localParts(now).year;
  const yearStart = `${Number(year) - 1}-12-31T17:00:00.000Z`;
  const nextYearStart = `${year}-12-31T17:00:00.000Z`;
  const customerUses = promotion.occasion === 'birthday'
    ? get<any>(`SELECT COUNT(*) n FROM promotion_redemptions r JOIN orders o ON o.id=r.order_id WHERE r.promotion_id=? AND r.user_id=? AND r.status!='released' AND o.created_at>=? AND o.created_at<?`, promotion.id, userId, yearStart, nextYearStart)?.n || 0
    : get<any>("SELECT COUNT(*) n FROM promotion_redemptions WHERE promotion_id=? AND user_id=? AND status!='released'", promotion.id, userId)?.n || 0;
  if (promotion.max_uses_per_customer != null && customerUses >= promotion.max_uses_per_customer) throw new Error('Bạn đã sử dụng hết lượt ưu đãi này.');
  if (promotion.occasion === 'birthday') {
    const usedThisYear = get<any>(`SELECT 1 FROM promotion_redemptions r JOIN orders o ON o.id=r.order_id JOIN promotions birthday ON birthday.id=r.promotion_id
      WHERE birthday.occasion='birthday' AND r.user_id=? AND r.status!='released' AND o.created_at>=? AND o.created_at<? LIMIT 1`, userId, yearStart, nextYearStart);
    if (usedThisYear) throw new Error('Bạn đã nhận ưu đãi sinh nhật trong năm nay.');
  }

  const rules = all<any>('SELECT rule_type,entity_type,entity_id FROM promotion_rules WHERE promotion_id=?', promotion.id);
  const included = rules.filter((r) => r.rule_type === 'include');
  let subtotal = 0;
  for (const line of lines) {
    if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 10) throw new Error('Số lượng sản phẩm không hợp lệ.');
    const product = get<any>(`SELECT p.id,p.category,p.collection,p.price,p.sale_price,p.active,v.active variant_active,v.price_override FROM variants v JOIN products p ON p.id=v.product_id WHERE v.sku=?`, line.sku);
    if (!product || !product.active || !product.variant_active) throw new Error(`Không tìm thấy sản phẩm ${line.sku}.`);
    const matches = (r: any) => r.entity_type === 'product' ? Number(r.entity_id) === product.id : r.entity_type === 'category' ? r.entity_id === product.category : r.entity_id === product.collection;
    if (rules.some((r) => r.rule_type === 'exclude' && matches(r))) continue;
    if (included.length && !included.some(matches)) continue;
    if (product.sale_price && !promotion.combinable) continue;
    subtotal += (product.sale_price || product.price_override || product.price) * line.qty;
  }
  if (subtotal < promotion.min_order) throw new Error(`Đơn hàng cần đạt tối thiểu ${promotion.min_order.toLocaleString('vi-VN')}đ cho sản phẩm áp dụng.`);
  const raw = promotion.kind === 'percent' ? Math.floor(subtotal * promotion.value / 100) : promotion.value;
  const discount = Math.min(subtotal, promotion.max_discount ? Math.min(raw, promotion.max_discount) : raw);
  if (discount <= 0) throw new Error('Đơn hàng chưa có sản phẩm đủ điều kiện áp dụng.');
  return { id: promotion.id, code: promotion.code, name: promotion.name, discount, subtotal };
}

export function customerPromotions(userId: number) {
  const now = new Date().toISOString();
  const user = get<any>('SELECT birthday FROM users WHERE id=?', userId);
  return all<any>(`SELECT p.id,p.name,p.code,p.description,p.kind,p.value,p.max_discount,p.min_order,p.starts_at,p.ends_at,p.occasion,p.birthday_window,p.audience,
    CASE WHEN EXISTS(SELECT 1 FROM promotion_redemptions r WHERE r.promotion_id=p.id AND r.user_id=? AND r.status='completed') THEN 'used'
      WHEN EXISTS(SELECT 1 FROM promotion_redemptions r WHERE r.promotion_id=p.id AND r.user_id=? AND r.status='reserved') THEN 'reserved'
      WHEN p.ends_at < ? THEN 'expired'
      WHEN p.status!='active' OR p.starts_at > ? THEN 'inactive' ELSE 'available' END AS customer_status
    FROM promotions p WHERE p.status='active' OR EXISTS(SELECT 1 FROM promotion_redemptions r WHERE r.promotion_id=p.id AND r.user_id=? AND r.status!='released') ORDER BY p.ends_at`, userId, userId, now, now, userId)
    .map((p: any) => p.customer_status === 'available' && (p.occasion === 'birthday' || p.audience === 'birthday') && !birthdayEligible(user?.birthday, p.birthday_window)
      ? { ...p, customer_status: 'birthday_wait' } : p);
}
