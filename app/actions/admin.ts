'use server';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { all, get, run, tx } from '@/lib/db';
import { requirePerm, revokeSessions, hash, type SessionUser } from '@/lib/auth';
import { INTERNAL_ROLES, ROLE_LABEL, type Perm, type Role } from '@/lib/permissions';
import { adjust, ensureVariant, log, nextCode, takeFrom, availableOf, sweepHolds, stockAt } from '@/lib/inventory';
import { CATEGORIES, COLORS, LOCS, SELL_LOCS, PO_STATUS, HOLD_STATUS, nowIso, slugify, barcodeDigits, sizeText, sizesFor } from '@/lib/util';

export type R = { ok?: boolean; error?: string; msg?: string; data?: any };
const done = (msg: string, data?: any): R => { revalidatePath('/admin', 'layout'); return { ok: true, msg, data }; };
/** Mọi action kiểm tra quyền theo mã use case ở máy chủ (BR-05). */
async function guard<T>(uc: Perm, fn: (u: SessionUser) => T | Promise<T>): Promise<R> {
  try { const u = await requirePerm(uc); return (await fn(u)) as R; } catch (e: any) { return { error: e.message || 'Có lỗi xảy ra.' }; }
}
const capCode = (id: number) => `ELR-CAP-${String(id).padStart(2, '0')}`;

// ---------- UC-17 Xử lý đơn hàng ----------
export async function setOrderStatus(code: string, status: number): Promise<R> {
  return guard('UC-17', () => {
    const o = get<any>('SELECT * FROM orders WHERE code=?', code);
    if (!o) throw new Error('Không tìm thấy đơn.');
    if (status === o.status) return done('Không đổi.');
    if (status === 2) throw new Error('Đơn chỉ chuyển sang Đang giao khi đóng gói ở mục Xuất kho, để kho được trừ đúng.');
    if (status < 2 && o.status >= 2) throw new Error('Đơn đã xuất kho, không chuyển ngược lại.');
    if (status === 3 && o.status !== 2) throw new Error('Chỉ đơn đang giao mới chuyển sang Đã giao.');
    run('UPDATE orders SET status=?, delivered_at=? WHERE id=?', status, status === 3 ? nowIso() : null, o.id);
    return done(`Đã cập nhật đơn ${code}.`);
  });
}

// ---------- UC-18 Quản lý sản phẩm (sản phẩm cha, chưa gồm tồn kho) ----------
export async function saveProduct(input: { id?: number; name: string; category: string; price: number; salePrice?: number | null; material: string; description: string; active: boolean; featured: boolean; isNew: boolean }): Promise<R> {
  return guard('UC-18', () => {
    if (!input.name.trim()) throw new Error('Nhập tên sản phẩm.');
    if (!CATEGORIES.includes(input.category)) throw new Error('Loại sản phẩm không hợp lệ.');
    if (!(input.price > 0)) throw new Error('Giá bán cần lớn hơn 0.');
    if (input.salePrice != null && input.salePrice > 0 && input.salePrice >= input.price) throw new Error('Giá khuyến mãi cần thấp hơn giá gốc.');
    const vals = [input.name.trim(), input.category, input.price, input.salePrice || null, input.material, input.description, +input.active, +input.featured, +input.isNew];
    if (input.id) {
      const cur = get<any>('SELECT category FROM products WHERE id=?', input.id);
      if (!cur) throw new Error('Không tìm thấy sản phẩm.');
      const hasSku = get('SELECT 1 FROM variants WHERE product_id=?', input.id);
      if (hasSku && (cur.category === 'Phụ kiện') !== (input.category === 'Phụ kiện')) throw new Error('Sản phẩm đã có SKU, không đổi được giữa phụ kiện (Free size) và quần áo có size.');
      run('UPDATE products SET name=?,category=?,price=?,sale_price=?,material=?,description=?,active=?,featured=?,is_new=? WHERE id=?', ...vals, input.id);
    } else {
      const base = slugify(input.name); let slug = base, i = 2;
      while (get('SELECT id FROM products WHERE slug=?', slug)) slug = `${base}-${i++}`;
      const code = ({ 'Đầm': 'DRS', 'Áo': 'TOP', 'Chân váy': 'SKT', 'Quần': 'PNT', 'Phụ kiện': 'ACC' } as any)[input.category] + String((get<any>('SELECT COUNT(*) c FROM products').c || 0) + 1).padStart(2, '0');
      run('INSERT INTO products(slug,code,name,category,price,sale_price,material,description,active,featured,is_new) VALUES(?,?,?,?,?,?,?,?,?,?,?)', slug, code, ...vals);
    }
    revalidatePath('/', 'layout');
    return done(input.id ? 'Đã cập nhật sản phẩm.' : 'Đã tạo sản phẩm. Tạo SKU ở mục Tồn kho và SKU để bắt đầu bán.');
  });
}
export async function toggleProduct(id: number): Promise<R> {
  return guard('UC-18', () => { run('UPDATE products SET active=1-active WHERE id=?', id); revalidatePath('/', 'layout'); return done('Đã đổi trạng thái hiển thị.'); });
}

// ---------- UC-21 Tạo SKU ----------
export async function createSku(input: { productId: number; color: string; size: string; qty: number; min: number }): Promise<R> {
  return guard('UC-21', (u) => tx(() => {
    if (!Number.isInteger(input.qty) || !Number.isInteger(input.min) || input.qty < 0 || input.min < 0) throw new Error('Tồn đầu kỳ và ngưỡng an toàn cần là số nguyên từ 0 trở lên.');
    const p = get<any>('SELECT category FROM products WHERE id=?', input.productId);
    if (!p) throw new Error('Không tìm thấy sản phẩm cha.');
    if (!COLORS.includes(input.color) || !sizesFor(p.category).includes(input.size)) throw new Error('Màu hoặc size không hợp lệ với sản phẩm này.');
    const r = ensureVariant(input.productId, input.color, input.size, input.min);
    if (!r.created) throw new Error(`Mã ${r.sku} đã tồn tại. Chọn màu hoặc size khác.`);
    if (input.qty > 0) { adjust(r.sku, 'online', input.qty); log(r.sku, `+${input.qty}`, 'Tồn đầu kỳ khi tạo SKU', 'online', { actor: u.id }); }
    revalidatePath('/', 'layout');
    return done(`Đã tạo ${r.sku}.`, { sku: r.sku });
  }));
}

// ---------- UC-24, UC-25 Capsule ----------
export async function saveCapsule(name: string, skus: string[]): Promise<R> {
  return guard('UC-24', () => tx(() => {
    if (!name.trim()) throw new Error('Nhập tên capsule.');
    if (new Set(skus).size !== skus.length) throw new Error('Capsule có SKU bị trùng.');
    if (skus.length < 2) throw new Error('Capsule cần ít nhất hai SKU thành phần.');
    for (const s of skus) if (!get('SELECT 1 FROM variants WHERE sku=?', s)) throw new Error(`Không có SKU ${s}.`);
    const c = run('INSERT INTO capsules(name,created_at) VALUES(?,?)', name.trim(), nowIso());
    for (const s of skus) run('INSERT INTO capsule_items(capsule_id,sku) VALUES(?,?)', c.lastInsertRowid, s);
    return done(`Đã tạo capsule ${capCode(Number(c.lastInsertRowid))}.`);
  }));
}
export async function sellCapsule(id: number): Promise<R> {
  return guard('UC-25', (u) => tx(() => {
    sweepHolds();
    const c = get<any>('SELECT * FROM capsules WHERE id=?', id);
    if (!c) throw new Error('Không tìm thấy capsule.');
    const items = all<any>('SELECT sku FROM capsule_items WHERE capsule_id=?', id);
    // Tất cả hoặc không (BR-06): ném lỗi giữa chừng thì transaction hoàn tác mọi món đã trừ.
    for (const it of items) {
      if (availableOf(it.sku) < 1 || stockAt(it.sku, 'online') < 1) throw new Error(`Kho Online không đủ ${it.sku}, chưa trừ món nào.`);
      takeFrom(it.sku, 1, ['online']);
      log(it.sku, '-1', `Bán capsule ${capCode(id)}`, 'online', { actor: u.id, ref: capCode(id) });
      run('UPDATE variants SET last_sold_at=? WHERE sku=?', nowIso(), it.sku);
    }
    return done(`Đã bán 1 set "${c.name}" và trừ kho ${items.length} món thành phần.`);
  }));
}

// ---------- UC-26 đến UC-29 Đặt may ----------
export async function createPo(input: { workshop: string; productId: number; color: string; cost: number; due: string; lines: Record<string, number> }): Promise<R> {
  return guard('UC-26', () => tx(() => {
    const lines = Object.entries(input.lines).filter(([, q]) => q > 0);
    if (!input.workshop.trim()) throw new Error('Nhập tên xưởng may.');
    if (!(input.cost > 0)) throw new Error('Nhập đơn giá gia công lớn hơn 0.');
    if (!input.due.trim()) throw new Error('Nhập ngày hẹn giao.');
    if (!lines.length) throw new Error('Nhập số lượng cho ít nhất một size.');
    const p = get<any>('SELECT category FROM products WHERE id=?', input.productId);
    if (!p) throw new Error('Không tìm thấy sản phẩm.');
    if (lines.some(([z]) => !sizesFor(p.category).includes(z))) throw new Error('Size không hợp lệ với sản phẩm này.');
    const code = nextCode('PO', 'purchase_orders');
    const r = run('INSERT INTO purchase_orders(code,workshop,product_id,color,cost,due,status,created_at) VALUES(?,?,?,?,?,?,0,?)', code, input.workshop.trim(), input.productId, input.color, input.cost, input.due.trim(), nowIso());
    for (const [z, q] of lines) run('INSERT INTO po_lines(po_id,size,qty) VALUES(?,?,?)', r.lastInsertRowid, z, q);
    return done(`Đã tạo phiếu ${code} gửi ${input.workshop.trim()}.`);
  }));
}
export async function advancePo(code: string): Promise<R> {
  return guard('UC-27', () => {
    const po = get<any>('SELECT * FROM purchase_orders WHERE code=?', code);
    if (!po || po.status >= 2) throw new Error('Không thể chuyển tiến độ phiếu này.');
    run('UPDATE purchase_orders SET status=status+1 WHERE id=?', po.id);
    return done(`${code}: ${PO_STATUS[po.status + 1]}.`);
  });
}
export async function approveQc(code: string, rows: { size: string; recv: number; bad: number }[]): Promise<R> {
  return guard('UC-28', (u) => tx(() => {
    const po = get<any>('SELECT * FROM purchase_orders WHERE code=?', code);
    if (!po || po.status !== 2) throw new Error('Phiếu chưa ở trạng thái đã giao đến kho.');
    let pass = 0, bad = 0; const badItems: string[] = [];
    for (const r of rows) {
      if (!(r.recv >= 0) || !(r.bad >= 0) || r.bad > r.recv) throw new Error(`Kiểm tra lại size ${sizeText(r.size)}: số lỗi không được lớn hơn số nhận và không âm.`);
      const line = get<any>('SELECT id FROM po_lines WHERE po_id=? AND size=?', po.id, r.size);
      if (!line) throw new Error(`Phiếu không có size ${sizeText(r.size)}.`);
      run('UPDATE po_lines SET recv=?, bad=? WHERE id=?', r.recv, r.bad, line.id);
      const v = ensureVariant(po.product_id, po.color, r.size);
      const ok = r.recv - r.bad; pass += ok; bad += r.bad;
      if (ok > 0) { adjust(v.sku, 'online', ok); log(v.sku, `+${ok}`, 'Nhập xưởng (đạt QC)', 'online', { actor: u.id, ref: code }); }
      if (r.bad > 0) { badItems.push(`${r.bad} × ${v.sku}`); log(v.sku, `Lỗi ${r.bad}`, 'Hàng lỗi trả xưởng', '', { actor: u.id, ref: code }); }
    }
    if (bad > 0) run('INSERT INTO workshop_returns(code,po_code,text,qty,created_at) VALUES(?,?,?,?,?)', nextCode('TX', 'workshop_returns'), code, `${badItems.join(', ')} (lỗi đường may hoặc sai size)`, bad, nowIso());
    run('UPDATE purchase_orders SET status=3, received_at=? WHERE id=?', nowIso(), po.id);
    revalidatePath('/', 'layout');
    return done(`Đã duyệt ${code}: nhập ${pass} sản phẩm đạt chuẩn vào Kho Online${bad ? `, ${bad} sản phẩm lỗi đã lập phiếu trả xưởng` : ''}.`);
  }));
}
export async function markWorkshopReturn(id: number): Promise<R> {
  return guard('UC-29', () => {
    const w = get<any>('SELECT * FROM workshop_returns WHERE id=?', id);
    if (!w || w.status === 'Đã trả xưởng') throw new Error('Phiếu đã ở trạng thái Đã trả xưởng.');
    run("UPDATE workshop_returns SET status='Đã trả xưởng', returned_at=? WHERE id=?", nowIso(), id);
    return done('Đã đánh dấu đã trả xưởng.');
  });
}

// ---------- UC-30, UC-31 Điều chuyển ----------
export async function createTransfer(input: { sku: string; from: string; to: string; qty: number }): Promise<R> {
  return guard('UC-30', (u) => tx(() => {
    const sell = SELL_LOCS as readonly string[];
    if (!sell.includes(input.from) || !sell.includes(input.to)) throw new Error('Chỉ điều chuyển giữa Kho Online và Showroom.');
    if (input.from === input.to) throw new Error('Kho xuất và kho nhận phải khác nhau.');
    if (!(input.qty > 0)) throw new Error('Nhập số lượng lớn hơn 0.');
    if (stockAt(input.sku, input.from) < input.qty) throw new Error(`${LOCS[input.from]} chỉ còn ${stockAt(input.sku, input.from)} sản phẩm ${input.sku}.`);
    adjust(input.sku, input.from, -input.qty);
    const code = nextCode('DC', 'transfers');
    run('INSERT INTO transfers(code,sku,qty,from_loc,to_loc,status,created_at) VALUES(?,?,?,?,?,?,?)', code, input.sku, input.qty, input.from, input.to, 'Đang chuyển', nowIso());
    log(input.sku, `-${input.qty}`, `Chuyển kho, xuất từ ${LOCS[input.from]}`, input.from, { actor: u.id, ref: code });
    return done(`Đã tạo phiếu ${code}. Hàng đang chuyển, chờ kho nhận xác nhận.`);
  }));
}
export async function receiveTransfer(id: number): Promise<R> {
  return guard('UC-31', (u) => tx(() => {
    const t = get<any>('SELECT * FROM transfers WHERE id=?', id);
    if (!t || t.status !== 'Đang chuyển') throw new Error('Phiếu không ở trạng thái đang chuyển.');
    adjust(t.sku, t.to_loc, t.qty);
    run("UPDATE transfers SET status='Hoàn tất', received_at=? WHERE id=?", nowIso(), id);
    log(t.sku, `+${t.qty}`, `Chuyển kho, nhận tại ${LOCS[t.to_loc]}`, t.to_loc, { actor: u.id, ref: t.code });
    return done(`Đã xác nhận nhận hàng phiếu ${t.code}.`);
  }));
}

// ---------- UC-12 đến UC-16 Tư vấn và giữ hàng ----------
/** Chỉ stylist phụ trách hoặc admin được thao tác trên yêu cầu (BR-19). */
function ownConsult(id: number, u: SessionUser) {
  const c = get<any>('SELECT c.*, u.name uname FROM consults c JOIN users u ON u.id=c.user_id WHERE c.id=?', id);
  if (!c) throw new Error('Không tìm thấy yêu cầu.');
  if (u.role !== 'admin' && c.stylist_id !== u.id) throw new Error('Chỉ stylist phụ trách yêu cầu này (hoặc admin) được thao tác.');
  if (!c.stylist_id) throw new Error('Yêu cầu chưa có stylist phụ trách.');
  return c;
}
function holdOf(id: number, u: SessionUser) {
  const h = get<any>('SELECT h.*, c.stylist_id, u.name uname FROM holds h JOIN consults c ON c.id=h.consult_id JOIN users u ON u.id=c.user_id WHERE h.id=?', id);
  if (!h) throw new Error('Không tìm thấy lệnh giữ.');
  if (u.role !== 'admin' && h.stylist_id !== u.id) throw new Error('Chỉ stylist phụ trách yêu cầu (hoặc admin) được thao tác lệnh giữ này.');
  if (h.status !== HOLD_STATUS.active || h.expires_at <= nowIso()) throw new Error('Lệnh giữ đã hết hạn hoặc đã được xử lý. Kiểm tra lại tồn khả dụng.');
  return h;
}

export async function claimConsult(id: number): Promise<R> {
  return guard('UC-12', (u) => {
    if (u.role !== 'stylist') throw new Error('Admin dùng ô Phân công stylist để gán người phụ trách.');
    // 6a: điều kiện stylist_id IS NULL chặn trường hợp hai stylist nhận cùng lúc
    const r = run("UPDATE consults SET stylist_id=?, status='Đang phối' WHERE id=? AND stylist_id IS NULL", u.id, id);
    if (!r.changes) throw new Error('Yêu cầu đã có người phụ trách. Danh sách đã được làm mới.');
    return done('Đã nhận phụ trách yêu cầu.');
  });
}
export async function assignStylist(id: number, stylistId: number): Promise<R> {
  return guard('UC-12', (u) => {
    if (u.role !== 'admin') throw new Error('Chỉ admin được phân công hoặc đổi stylist.');
    const s = get<any>("SELECT name FROM users WHERE id=? AND role='stylist' AND status='active'", stylistId);
    if (!s) throw new Error('Chọn một stylist đang hoạt động.');
    const c = get<any>('SELECT status FROM consults WHERE id=?', id);
    if (!c) throw new Error('Không tìm thấy yêu cầu.');
    run('UPDATE consults SET stylist_id=?, status=? WHERE id=?', stylistId, c.status === 'Mới' ? 'Đang phối' : c.status, id);
    return done(`Đã phân công ${s.name} phụ trách yêu cầu.`);
  });
}
export async function saveConsult(id: number, patch: { message?: string; picks?: string[] }): Promise<R> {
  return guard('UC-13', (u) => tx(() => {
    const c = ownConsult(id, u);
    const picks = patch.picks ?? String(c.picks).split(',').filter(Boolean);
    for (const s of picks) if (!get('SELECT 1 FROM variants WHERE sku=?', s)) throw new Error(`Không có SKU ${s}.`);
    // bỏ giữ hàng của món bị gỡ khỏi set
    for (const h of all<any>('SELECT * FROM holds WHERE consult_id=? AND status=?', id, HOLD_STATUS.active)) if (!picks.includes(h.sku)) {
      run('UPDATE holds SET status=? WHERE id=?', HOLD_STATUS.released, h.id);
      log(h.sku, `Nhả ${h.qty}`, 'Stylist gỡ món khỏi set gợi ý', '', { actor: u.id, ref: `YC-${id}` });
    }
    run('UPDATE consults SET message=?, picks=? WHERE id=?', patch.message ?? c.message, picks.join(','), id);
    return done('Đã lưu nháp.');
  }));
}
export async function sendConsultSet(id: number, hours: number): Promise<R> {
  return guard('UC-14', (u) => tx(() => {
    sweepHolds();
    const c = ownConsult(id, u);
    const picks = String(c.picks).split(',').filter(Boolean);
    if (!picks.length) throw new Error('Thêm ít nhất một sản phẩm vào set gợi ý.');
    if (![24, 48].includes(hours)) throw new Error('Thời gian giữ hàng là 24 hoặc 48 giờ.');
    const now = nowIso(), expires = new Date(Date.now() + hours * 3600000).toISOString();
    for (const sku of picks) {
      const ex = get<any>('SELECT id FROM holds WHERE consult_id=? AND sku=? AND status=? AND expires_at > ?', id, sku, HOLD_STATUS.active, now);
      // 4a: món đang giữ chỉ gia hạn, không giữ thêm (BR-03)
      if (ex) { run('UPDATE holds SET expires_at=? WHERE id=?', expires, ex.id); log(sku, 'Gia hạn giữ', `Gia hạn giữ hàng cho ${c.uname} (${hours} giờ)`, '', { actor: u.id, ref: `YC-${id}` }); continue; }
      if (availableOf(sku) < 1) throw new Error(`${sku} đã hết hàng khả dụng nên không giữ được. Bỏ món này hoặc chọn món khác.`);
      run('INSERT INTO holds(consult_id,sku,qty,created_at,expires_at,status) VALUES(?,?,1,?,?,?)', id, sku, now, expires, HOLD_STATUS.active);
      log(sku, 'Giữ 1', `Giữ hàng styling cho ${c.uname} (${hours} giờ)`, '', { actor: u.id, ref: `YC-${id}` });
    }
    run("UPDATE consults SET status='Đã gửi gợi ý', hold_hours=?, sent_at=? WHERE id=?", hours, now, id);
    return done(`Đã gửi gợi ý cho ${c.uname} và giữ ${picks.length} món trong ${hours} giờ. Gợi ý hiện chỉ hiển thị trong tài khoản của khách, chưa gửi email.`);
  }));
}
export async function buyHold(id: number): Promise<R> {
  return guard('UC-15', (u) => tx(() => {
    sweepHolds();
    const h = holdOf(id, u);
    takeFrom(h.sku, h.qty, SELL_LOCS);
    run('UPDATE holds SET status=? WHERE id=?', HOLD_STATUS.bought, id);
    run('UPDATE variants SET last_sold_at=? WHERE sku=?', nowIso(), h.sku);
    log(h.sku, `-${h.qty}`, `Khách ${h.uname} chốt mua (giữ hàng styling)`, '', { actor: u.id, ref: `YC-${h.consult_id}` });
    return done(`Đã ghi nhận ${h.uname} chốt mua ${h.sku} và trừ kho.`);
  }));
}
export async function releaseHold(id: number): Promise<R> {
  return guard('UC-16', (u) => tx(() => {
    sweepHolds();
    const h = holdOf(id, u);
    run('UPDATE holds SET status=? WHERE id=?', HOLD_STATUS.released, id);
    log(h.sku, `Nhả ${h.qty}`, 'Stylist nhả giữ hàng', '', { actor: u.id, ref: `YC-${h.consult_id}` });
    return done(`Đã nhả ${h.sku} về kho bán.`);
  }));
}
/** Công cụ thử nghiệm, không thuộc đặc tả (mục 8.2). Chỉ admin dùng. */
export async function simulateHours(h: number): Promise<R> {
  return guard('UC-15', (u) => {
    if (u.role !== 'admin') throw new Error('Chỉ admin dùng công cụ thử nghiệm này.');
    run("UPDATE holds SET expires_at = strftime('%Y-%m-%dT%H:%M:%fZ', expires_at, ?) WHERE status=?", `-${h} hours`, HOLD_STATUS.active);
    const n = sweepHolds();
    return done(n ? `${n} món hết hạn giữ và đã tự nhả về kho bán.` : `Đã trôi ${h} giờ. Chưa có món nào hết hạn.`);
  });
}

// ---------- UC-32 Xuất kho ----------
export async function packOrder(code: string, carrier: string, checks: boolean[]): Promise<R> {
  return guard('UC-32', (u) => tx(() => {
    if (!['GHN', 'GHTK'].includes(carrier)) throw new Error('Chọn đơn vị vận chuyển.');
    if (checks.length !== 3 || !checks.every(Boolean)) throw new Error('Hoàn tất cả ba bước kiểm tra trước khi đóng gói.');
    const o = get<any>('SELECT * FROM orders WHERE code=?', code);
    if (!o || o.status !== 1) throw new Error('Đơn chưa được xác nhận hoặc đã xuất kho.');
    for (const l of all<any>('SELECT * FROM order_lines WHERE order_id=?', o.id)) {
      if (stockAt(l.sku, 'online') < l.qty) throw new Error(`Kho Online không đủ ${l.sku}, chưa trừ kho. Điều chuyển từ Showroom ra Kho Online rồi xuất lại.`);
      takeFrom(l.sku, l.qty, ['online']);
      log(l.sku, `-${l.qty}`, 'Bán đơn web', 'online', { actor: u.id, ref: code });
      run('UPDATE variants SET last_sold_at=? WHERE sku=?', nowIso(), l.sku);
    }
    const tracking = carrier + barcodeDigits(code + carrier).slice(3);
    run('UPDATE orders SET status=2, carrier=?, tracking=?, shipped_at=? WHERE id=?', carrier, tracking, nowIso(), o.id);
    return done(`Đã đóng gói đơn ${code} và trừ kho. Đơn chuyển sang Đang giao.`, { tracking });
  }));
}

// ---------- UC-33, UC-34 Đổi trả ----------
export async function receiveReturn(orderCode: string, sku: string, reason: string): Promise<R> {
  return guard('UC-33', () => {
    if (!['Đổi size', 'Đổi màu', 'Nghi hàng lỗi', 'Khách không ưng'].includes(reason)) throw new Error('Chọn lý do đổi trả.');
    const o = get<any>('SELECT * FROM orders WHERE code=? AND status=3', orderCode);
    if (!o) throw new Error('Chỉ nhận đổi trả cho đơn đã giao.');
    if (!get('SELECT 1 FROM order_lines WHERE order_id=? AND sku=?', o.id, sku)) throw new Error('Sản phẩm không thuộc đơn này.');
    if (get("SELECT 1 FROM return_tickets WHERE order_code=? AND sku=? AND status='Chờ kiểm tra'", orderCode, sku)) throw new Error('Sản phẩm này đã có phiếu đang chờ kiểm tra.');
    run('INSERT INTO return_tickets(order_code,user_id,sku,reason,created_at) VALUES(?,?,?,?,?)', orderCode, o.user_id, sku, reason, nowIso());
    return done(`Đã tiếp nhận ${sku} từ đơn ${orderCode}.`);
  });
}
function closeReturn(id: number, loc: 'online' | 'repair', result: string, reason: string, actor: number) {
  const r = get<any>("SELECT * FROM return_tickets WHERE id=? AND status='Chờ kiểm tra'", id);
  if (!r) throw new Error('Phiếu không ở trạng thái chờ kiểm tra.');
  adjust(r.sku, loc, 1);
  run("UPDATE return_tickets SET status='Đã đóng', result=?, processed_at=? WHERE id=?", result, nowIso(), id);
  log(r.sku, '+1', reason, loc, { actor, ref: r.order_code });
  return r;
}
export async function returnRestock(id: number): Promise<R> {
  return guard('UC-34', (u) => tx(() => {
    const r = closeReturn(id, 'online', 'Nhập lại Kho Online', 'Đổi trả, nhập lại kho (còn nguyên tem mác)', u.id);
    return done(`Đã nhập lại ${r.sku} vào Kho Online để bán lại.`);
  }));
}
export async function returnRepair(id: number): Promise<R> {
  return guard('UC-34', (u) => tx(() => {
    const r = closeReturn(id, 'repair', 'Chuyển sửa chữa', 'Đổi trả, hàng lỗi chuyển kho thanh lý và sửa chữa', u.id);
    return done(`Đã chuyển ${r.sku} sang kho thanh lý và sửa chữa.`);
  }));
}

// ---------- UC-38 Quản lý tài khoản người dùng ----------
const activeAdmins = () => get<any>("SELECT COUNT(*) c FROM users WHERE role='admin' AND status='active'").c as number;

export async function createAccount(input: { name: string; email: string; phone: string; role: Role }): Promise<R> {
  return guard('UC-38', () => {
    const email = input.email.trim().toLowerCase();
    if (input.name.trim().length < 2) throw new Error('Họ tên cần ít nhất 2 ký tự.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email chưa đúng định dạng.');
    if (input.phone.trim() && !/^[0-9 +]{9,14}$/.test(input.phone.trim())) throw new Error('Số điện thoại chưa đúng định dạng.');
    if (!INTERNAL_ROLES.includes(input.role)) throw new Error('Chọn vai trò Stylist, Nhân viên hoặc Admin.');
    if (get('SELECT 1 FROM users WHERE email=?', email)) throw new Error('Email này đã tồn tại.');
    const temp = randomBytes(6).toString('base64url');
    run('INSERT INTO users(name,email,phone,password_hash,role,status,must_change_pw,created_at) VALUES(?,?,?,?,?,?,1,?)', input.name.trim(), email, input.phone.trim(), hash(temp), input.role, 'active', nowIso());
    return done(`Đã tạo tài khoản ${ROLE_LABEL[input.role]} cho ${input.name.trim()}.`, { tempPassword: temp, email });
  });
}
export async function setAccountRole(id: number, role: Role): Promise<R> {
  return guard('UC-38', (me) => {
    const u = get<any>('SELECT * FROM users WHERE id=?', id);
    if (!u) throw new Error('Không tìm thấy tài khoản.');
    if (u.role === 'customer') throw new Error('Tài khoản khách hàng chỉ khóa hoặc mở khóa, không đổi vai trò.');
    if (!INTERNAL_ROLES.includes(role)) throw new Error('Vai trò không hợp lệ.');
    if (id === me.id && role !== 'admin') throw new Error('Admin không tự hạ vai trò của mình.');
    if (u.role === 'admin' && role !== 'admin' && u.status === 'active' && activeAdmins() <= 1) throw new Error('Hệ thống phải còn ít nhất một admin đang hoạt động.');
    run('UPDATE users SET role=? WHERE id=?', role, id);
    const open = u.role === 'stylist' && role !== 'stylist' ? openConsults(id) : 0;
    return done(`Đã đổi ${u.name} sang ${ROLE_LABEL[role]}.${open ? ` Lưu ý: ${u.name} đang phụ trách ${open} yêu cầu chưa gửi gợi ý, cần phân công lại.` : ''}`);
  });
}
const openConsults = (stylistId: number) => get<any>("SELECT COUNT(*) c FROM consults WHERE stylist_id=? AND status != 'Đã gửi gợi ý'", stylistId).c as number;
export async function setAccountLocked(id: number, locked: boolean): Promise<R> {
  return guard('UC-38', (me) => {
    const u = get<any>('SELECT * FROM users WHERE id=?', id);
    if (!u) throw new Error('Không tìm thấy tài khoản.');
    if (locked && id === me.id) throw new Error('Admin không tự khóa tài khoản của mình.');
    if (locked && u.role === 'admin' && u.status === 'active' && activeAdmins() <= 1) throw new Error('Hệ thống phải còn ít nhất một admin đang hoạt động.');
    run('UPDATE users SET status=? WHERE id=?', locked ? 'locked' : 'active', id);
    if (locked) revokeSessions(id);
    const open = locked && u.role === 'stylist' ? openConsults(id) : 0;
    return done(`Đã ${locked ? 'khóa' : 'mở khóa'} tài khoản ${u.name}.${open ? ` Cảnh báo: stylist này đang phụ trách ${open} yêu cầu chưa gửi gợi ý, hãy phân công lại ở mục Tư vấn phối đồ.` : ''}`);
  });
}
