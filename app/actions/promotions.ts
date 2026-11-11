'use server';
import { revalidatePath } from 'next/cache';
import { all, get, run, tx } from '@/lib/db';
import { requirePerm } from '@/lib/auth';
import { quotePromotion } from '@/lib/promotions';

export async function quotePromotionAction(code: string, lines: { sku: string; qty: number }[]) {
  try {
    const u = await requirePerm('UC-08');
    return { quote: quotePromotion(u.id, code, lines) };
  } catch (e: any) { return { error: e.message || 'Không thể kiểm tra ưu đãi.' }; }
}

export async function savePromotion(input: any) {
  try {
    await requirePerm('UC-40');
    const name = String(input.name || '').trim(); const code = String(input.code || '').trim().toUpperCase();
    const kind = input.kind === 'fixed' ? 'fixed' : 'percent';
    const value = Number(input.value), minOrder = Number(input.minOrder || 0);
    const starts = new Date(`${input.startsAt}:00+07:00`), ends = new Date(`${input.endsAt}:00+07:00`);
    if (!name || !/^[A-Z0-9_-]{3,32}$/.test(code)) throw new Error('Nhập tên chương trình và mã gồm 3–32 ký tự chữ, số, gạch ngang hoặc gạch dưới.');
    if (!Number.isInteger(value) || value <= 0 || (kind === 'percent' && value > 100)) throw new Error('Giá trị ưu đãi không hợp lệ.');
    for (const cap of [input.maxUses, input.maxPerCustomer]) if (cap && (!Number.isInteger(Number(cap)) || Number(cap) < 1)) throw new Error('Giới hạn lượt sử dụng cần là số nguyên lớn hơn 0.');
    if (input.maxDiscount && (!Number.isInteger(Number(input.maxDiscount)) || Number(input.maxDiscount) < 1)) throw new Error('Giảm tối đa cần là số nguyên lớn hơn 0.');
    if (!Number.isInteger(minOrder) || minOrder < 0 || !Number.isFinite(+starts) || !Number.isFinite(+ends) || starts >= ends) throw new Error('Kiểm tra giá trị đơn tối thiểu và thời gian chương trình.');
    if (!['draft','active','paused'].includes(input.status)) throw new Error('Trạng thái chương trình không hợp lệ.');
    const params = [name, code, String(input.description || '').trim(), kind, value, Number(input.maxDiscount) > 0 ? Number(input.maxDiscount) : null, minOrder, starts.toISOString(), ends.toISOString(), Number(input.maxUses) > 0 ? Number(input.maxUses) : null, Number(input.maxPerCustomer) > 0 ? Number(input.maxPerCustomer) : null, input.combinable ? 1 : 0, input.status, input.occasion === 'birthday' ? 'birthday' : 'general', ['day','week','month'].includes(input.birthdayWindow) ? input.birthdayWindow : 'month', input.showHome ? 1 : 0, input.audience === 'birthday' ? 'birthday' : 'all'];
    tx(() => {
      if (input.id) {
        const existing = get<any>('SELECT * FROM promotions WHERE id=?', Number(input.id));
        if (!existing) throw new Error('Không tìm thấy chương trình.');
        const used = get<any>("SELECT COUNT(*) n FROM promotion_redemptions WHERE promotion_id=? AND status!='released'", existing.id)?.n || 0;
        if (used) {
          const same = existing.name === name && existing.code === code && existing.description === String(input.description || '').trim() && existing.kind === kind && existing.value === value && existing.max_discount === (Number(input.maxDiscount) > 0 ? Number(input.maxDiscount) : null) && existing.min_order === minOrder && existing.starts_at === starts.toISOString() && existing.ends_at === ends.toISOString() && existing.max_uses === (Number(input.maxUses) > 0 ? Number(input.maxUses) : null) && existing.max_uses_per_customer === (Number(input.maxPerCustomer) > 0 ? Number(input.maxPerCustomer) : null) && existing.combinable === (input.combinable ? 1 : 0) && existing.occasion === (input.occasion === 'birthday' ? 'birthday' : 'general') && existing.birthday_window === (['day','week','month'].includes(input.birthdayWindow) ? input.birthdayWindow : 'month') && existing.show_home === (input.showHome ? 1 : 0) && existing.audience === (input.audience === 'birthday' ? 'birthday' : 'all');
          const savedRules = all<any>('SELECT rule_type,entity_type,entity_id FROM promotion_rules WHERE promotion_id=? ORDER BY rule_type,entity_type,entity_id', existing.id);
          const submittedRules = (input.rules || []).filter((r:any)=>['include','exclude'].includes(r.ruleType)&&['product','category','collection'].includes(r.entityType)&&String(r.entityId).trim()).map((r:any)=>({rule_type:r.ruleType,entity_type:r.entityType,entity_id:String(r.entityId).trim()})).sort((a:any,b:any)=>`${a.rule_type}:${a.entity_type}:${a.entity_id}`.localeCompare(`${b.rule_type}:${b.entity_type}:${b.entity_id}`));
          if (!same || JSON.stringify(savedRules) !== JSON.stringify(submittedRules)) throw new Error('Chương trình đã phát sinh đơn hàng; chỉ được đổi trạng thái để giữ nguyên lịch sử ưu đãi.');
          run('UPDATE promotions SET status=? WHERE id=?', input.status, existing.id);
          return;
        }
        run(`UPDATE promotions SET name=?,code=?,description=?,kind=?,value=?,max_discount=?,min_order=?,starts_at=?,ends_at=?,max_uses=?,max_uses_per_customer=?,combinable=?,status=?,occasion=?,birthday_window=?,show_home=?,audience=? WHERE id=?`, ...params, existing.id);
        run('DELETE FROM promotion_rules WHERE promotion_id=?', existing.id);
        for (const rule of input.rules || []) if (['include','exclude'].includes(rule.ruleType) && ['product','category','collection'].includes(rule.entityType) && String(rule.entityId).trim()) run('INSERT OR IGNORE INTO promotion_rules(promotion_id,rule_type,entity_type,entity_id) VALUES(?,?,?,?)', existing.id, rule.ruleType, rule.entityType, String(rule.entityId).trim());
      } else {
        const r = run(`INSERT INTO promotions(name,code,description,kind,value,max_discount,min_order,starts_at,ends_at,max_uses,max_uses_per_customer,combinable,status,occasion,birthday_window,show_home,audience) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, ...params);
        for (const rule of input.rules || []) if (['include','exclude'].includes(rule.ruleType) && ['product','category','collection'].includes(rule.entityType) && String(rule.entityId).trim()) run('INSERT OR IGNORE INTO promotion_rules(promotion_id,rule_type,entity_type,entity_id) VALUES(?,?,?,?)', r.lastInsertRowid, rule.ruleType, rule.entityType, String(rule.entityId).trim());
      }
    });
    revalidatePath('/admin/khuyen-mai'); revalidatePath('/');
    return { ok: true, msg: 'Đã lưu chương trình ưu đãi.' };
  } catch (e: any) { return { error: e.message || 'Không thể lưu chương trình.' }; }
}

export async function pausePromotion(id: number) {
  try {
    await requirePerm('UC-40');
    run("UPDATE promotions SET status=CASE WHEN status='paused' THEN 'active' ELSE 'paused' END WHERE id=?", id);
    revalidatePath('/admin/khuyen-mai'); revalidatePath('/');
    return { ok: true, msg: 'Đã cập nhật trạng thái chương trình.' };
  } catch (e: any) { return { error: e.message || 'Không thể cập nhật chương trình.' }; }
}

export async function deletePromotion(id: number) {
  try {
    await requirePerm('UC-40');
    const used = get<any>("SELECT COUNT(*) n FROM promotion_redemptions WHERE promotion_id=?", id)?.n || 0;
    if (used) throw new Error('Không thể xóa chương trình đã phát sinh lượt sử dụng. Hãy tạm dừng chương trình để giữ lịch sử.');
    const exists = get<any>('SELECT id FROM promotions WHERE id=?', id);
    if (!exists) throw new Error('Không tìm thấy chương trình ưu đãi.');
    tx(() => run('DELETE FROM promotions WHERE id=?', id));
    revalidatePath('/admin/khuyen-mai');
    revalidatePath('/');
    return { ok: true, msg: 'Đã xóa chương trình ưu đãi.' };
  } catch (e: any) { return { error: e.message || 'Không thể xóa chương trình.' }; }
}
