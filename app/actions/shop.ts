'use server';
import { revalidatePath } from 'next/cache';
import { get, run, txImmediate } from '@/lib/db';
import { requirePerm } from '@/lib/auth';
import { availableOf, sweepHolds } from '@/lib/inventory';
import { SHIPPING_FEE, nowIso, stampDay, pad } from '@/lib/util';
import type { Res } from './auth';
import { quotePromotion } from '@/lib/promotions';

// UC-08
export async function placeOrderAction(input: { lines: { sku: string; qty: number }[]; name: string; phone: string; address: string; pay: string; note: string; promotionCode?: string }): Promise<Res & { code?: string }> {
  let u;
  try { u = await requirePerm('UC-08'); } catch (e: any) { return { error: e.message }; }
  if (!input.lines.length) return { error: 'Giỏ hàng đang trống.' };
  if (input.name.trim().length < 2) return { error: 'Họ tên người nhận cần ít nhất 2 ký tự.' };
  if (!/^[0-9 +]{9,14}$/.test(input.phone.trim())) return { error: 'Số điện thoại chưa đúng.' };
  if (input.address.trim().length < 8) return { error: 'Địa chỉ giao hàng cần ít nhất 8 ký tự.' };
  if (!['Thanh toán khi nhận hàng', 'Chuyển khoản'].includes(input.pay)) return { error: 'Chọn hình thức thanh toán.' };
  sweepHolds();
  try {
    const code = txImmediate(() => {
      let subtotal = 0; const items: any[] = [];
      const aggregated = new Map<string, number>();
      for (const line of input.lines) {
        if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 10 || typeof line.sku !== 'string') throw new Error('Số lượng mỗi món từ 1 đến 10.');
        aggregated.set(line.sku, (aggregated.get(line.sku) || 0) + line.qty);
      }
      for (const [sku, qty] of aggregated) {
        if (!(qty > 0) || qty > 10) throw new Error('Số lượng mỗi món từ 1 đến 10.');
        const v = get<any>('SELECT v.sku, p.name, p.price, p.sale_price sp, p.active, v.active variant_active, v.price_override, v.color, v.size FROM variants v JOIN products p ON p.id=v.product_id WHERE v.sku=?', sku);
        if (!v || !v.active || !v.variant_active) throw new Error(`Sản phẩm ${sku} hiện không bán.`);
        if (availableOf(sku) < qty) throw new Error(`${v.name} (${v.color}, ${v.size}) chỉ còn ${Math.max(0, availableOf(sku))} sản phẩm.`);
        const price = v.sp || v.price_override || v.price; subtotal += price * qty;
        items.push({ sku: v.sku, name: `${v.name} (${v.color}, ${v.size === 'FS' ? 'Free size' : v.size})`, qty, price });
      }
      const applied = input.promotionCode?.trim() ? quotePromotion(u.id, input.promotionCode, [...aggregated].map(([sku, qty]) => ({ sku, qty }))) : null;
      const discount = applied?.discount || 0;
      const total = SHIPPING_FEE + subtotal - discount;
      const n = (get<any>('SELECT COUNT(*) c FROM orders').c || 0) + 1;
      const code = `ELW-${stampDay()}-${pad(n % 1000)}${n > 999 ? n : ''}`;
      const o = run('INSERT INTO orders(code,user_id,status,pay_method,shipping_fee,total,recv_name,recv_phone,address,note,created_at,promotion_id,promotion_code,promotion_name,discount_amount) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        code, u.id, 0, input.pay, SHIPPING_FEE, total, input.name.trim(), input.phone.trim(), input.address.trim(), input.note.trim(), nowIso(), applied?.id || null, applied?.code || '', applied?.name || '', discount);
      for (const it of items) run('INSERT INTO order_lines(order_id,sku,name,qty,price) VALUES(?,?,?,?,?)', o.lastInsertRowid, it.sku, it.name, it.qty, it.price);
      if (applied) run("INSERT INTO promotion_redemptions(promotion_id,user_id,order_id,discount_amount,status,created_at) VALUES(?,?,?,?, 'reserved',?)", applied.id, u.id, o.lastInsertRowid, discount, nowIso());
      return code;
    });
    revalidatePath('/tai-khoan');
    return { ok: true, code, msg: 'Đặt hàng thành công.' };
  } catch (e: any) { return { error: e.message }; }
}

// UC-10
export async function createConsultAction(_: Res, f: FormData): Promise<Res> {
  let u;
  try { u = await requirePerm('UC-10'); } catch (e: any) { return { error: e.message }; }
  const s = (k: string) => String(f.get(k) ?? '').trim();
  const occ = f.getAll('occasions').join(', ');
  if (!s('workEnv')) return { error: 'Chọn môi trường làm việc.' };
  if (!occ) return { error: 'Chọn ít nhất một dịp cần trang phục.' };
  if (!s('budget')) return { error: 'Chọn ngân sách.' };
  const h = parseInt(s('height'), 10), w = parseInt(s('weight'), 10);
  run('INSERT INTO consults(user_id,work_env,occasions,budget,height_cm,weight_kg,note,created_at) VALUES(?,?,?,?,?,?,?,?)',
    u.id, s('workEnv'), occ, s('budget'), h > 0 ? h : null, w > 0 ? w : null, s('note'), nowIso());
  revalidatePath('/tai-khoan');
  return { ok: true, msg: 'Đã gửi yêu cầu. Stylist sẽ phản hồi trong vòng 24 giờ.' };
}
