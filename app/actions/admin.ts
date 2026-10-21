'use server';
import { revalidatePath } from 'next/cache';
import { all, get, run, tx } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { adjust, ensureVariant, listVariants, log, nextCode, takeFrom, availableOf, sweepHolds, capsuleSets } from '@/lib/inventory';
import { CATEGORIES, COLORS, LOCS, PO_STATUS, nowIso, slugify, barcodeDigits, sizeText, sizesFor } from '@/lib/util';

export type R = { ok?: boolean; error?: string; msg?: string; data?: any };
const done = (msg: string, data?: any): R => { revalidatePath('/admin', 'layout'); return { ok: true, msg, data }; };
async function guard<T>(fn: () => T | Promise<T>): Promise<T | R> {
  try { await requireAdmin(); return await fn(); } catch (e: any) { return { error: e.message || 'Có lỗi xảy ra.' } as any; }
}

// ---------- đơn hàng ----------
export async function setOrderStatus(code: string, status: number): Promise<R> {
  return guard(() => {
    const o = get<any>('SELECT * FROM orders WHERE code=?', code);
    if (!o) throw new Error('Không tìm thấy đơn.');
    if (status === o.status) return done('Không đổi.');
    if (status >= 2 && o.status < 2) throw new Error('Đóng gói đơn ở mục Xuất kho và đổi trả để trừ kho trước khi chuyển sang Đang giao.');
    if (status < 2 && o.status >= 2) throw new Error('Đơn đã xuất kho, không chuyển ngược lại.');
    if (status === 3 && o.status !== 2) throw new Error('Chỉ đơn đang giao mới chuyển sang Đã giao.');
    run('UPDATE orders SET status=? WHERE id=?', status, o.id);
    return done(`Đã cập nhật đơn ${code}.`);
  }) as Promise<R>;
}

// ---------- sản phẩm ----------
export async function saveProduct(input: { id?: number; name: string; category: string; price: number; salePrice?: number | null; material: string; description: string; active: boolean; featured: boolean; isNew: boolean; colors: string[]; sizes: string[]; variantStocks: { color: string; size: string; quantity: number }[] }): Promise<R> {
  return guard(() => tx(() => {
    if (input.name.trim().length < 2) throw new Error('Nhập tên sản phẩm.');
    if (!CATEGORIES.includes(input.category)) throw new Error('Loại sản phẩm không hợp lệ.');
    if (!(input.price > 0)) throw new Error('Giá bán cần lớn hơn 0.');
    if (input.salePrice != null && input.salePrice > 0 && input.salePrice >= input.price) throw new Error('Giá khuyến mãi cần thấp hơn giá gốc.');
    if (!Array.isArray(input.colors) || !input.colors.length || input.colors.some((color) => !COLORS.includes(color))) throw new Error('Chọn ít nhất một màu hợp lệ.');
    const validSizes = sizesFor(input.category);
    if (!Array.isArray(input.sizes) || !input.sizes.length || input.sizes.some((size) => !validSizes.includes(size))) throw new Error('Chọn ít nhất một kích cỡ hợp lệ.');
    if (!Array.isArray(input.variantStocks)) throw new Error('Thông tin số lượng biến thể không hợp lệ.');
    const colors = [...new Set(input.colors)];
    const sizes = [...new Set(input.sizes)];
    const quantities = new Map<string, number>();
    for (const variantStock of input.variantStocks) {
      if (!colors.includes(variantStock.color) || !sizes.includes(variantStock.size) || !Number.isSafeInteger(variantStock.quantity) || variantStock.quantity < 0)
        throw new Error('Mỗi biến thể cần có số lượng nguyên không âm.');
      const key = `${variantStock.color}::${variantStock.size}`;
      if (quantities.has(key)) throw new Error('Biến thể màu và kích cỡ bị lặp.');
      quantities.set(key, variantStock.quantity);
    }
    if (quantities.size !== colors.length * sizes.length) throw new Error('Thiếu số lượng cho một hoặc nhiều biến thể.');
    for (const color of colors) for (const size of sizes) {
      if (!quantities.has(`${color}::${size}`)) throw new Error('Thiếu số lượng cho một hoặc nhiều biến thể.');
    }
    let productId: number;
    if (input.id) {
      if (!get('SELECT id FROM products WHERE id=?', input.id)) throw new Error('Không tìm thấy sản phẩm.');
      run('UPDATE products SET name=?,category=?,price=?,sale_price=?,material=?,description=?,active=?,featured=?,is_new=? WHERE id=?',
        input.name.trim(), input.category, input.price, input.salePrice || null, input.material, input.description, +input.active, +input.featured, +input.isNew, input.id);
      productId = input.id;
    } else {
      const base = slugify(input.name); let slug = base, i = 2;
      while (get('SELECT id FROM products WHERE slug=?', slug)) slug = `${base}-${i++}`;
      const code = ({ 'Đầm': 'DRS', 'Áo': 'TOP', 'Chân váy': 'SKT', 'Quần': 'PNT', 'Phụ kiện': 'ACC' } as any)[input.category] + String((get<any>('SELECT COUNT(*) c FROM products').c || 0) + 1).padStart(2, '0');
      const result = run('INSERT INTO products(slug,code,name,category,price,sale_price,material,description,active,featured,is_new) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
        slug, code, input.name.trim(), input.category, input.price, input.salePrice || null, input.material, input.description, +input.active, +input.featured, +input.isNew);
      productId = Number(result.lastInsertRowid);
    }
    for (const color of colors) for (const size of sizes) {
      const variant = ensureVariant(productId, color, size);
      const stock = get<any>(`SELECT v.id, COALESCE(SUM(CASE WHEN s.location='online' THEN s.qty END),0) online
        FROM variants v LEFT JOIN stocks s ON s.variant_id=v.id WHERE v.sku=? GROUP BY v.id`, variant.sku);
      const delta = quantities.get(`${color}::${size}`)! - stock.online;
      if (delta < 0 && availableOf(variant.sku) < -delta) throw new Error(`Không thể giảm tồn ${variant.sku} thấp hơn số lượng đang được giữ cho đơn hàng.`);
      if (delta !== 0) {
        adjust(variant.sku, 'online', delta);
        log(variant.sku, delta > 0 ? `+${delta}` : String(delta), 'Điều chỉnh tồn từ màn hình sản phẩm', 'online');
      }
    }
    revalidatePath('/', 'layout');
    return done(input.id ? 'Đã cập nhật sản phẩm, biến thể và số lượng.' : 'Đã tạo sản phẩm cùng các SKU màu, size và số lượng.');
  })) as Promise<R>;
}
export async function toggleProduct(id: number): Promise<R> {
  return guard(() => { run('UPDATE products SET active=1-active WHERE id=?', id); revalidatePath('/', 'layout'); return done('Đã đổi trạng thái hiển thị.'); }) as Promise<R>;
}

// ---------- SKU ----------
export async function createSku(input: { productId: number; color: string; size: string; qty: number; min: number }): Promise<R> {
  return guard(() => tx(() => {
    if (!(input.qty >= 0) || !(input.min >= 0)) throw new Error('Tồn đầu kỳ và ngưỡng an toàn cần là số từ 0 trở lên.');
    const r = ensureVariant(input.productId, input.color, input.size, input.min);
    if (!r.created) throw new Error(`Mã ${r.sku} đã tồn tại. Chọn màu hoặc size khác.`);
    if (input.qty > 0) { adjust(r.sku, 'online', input.qty); log(r.sku, `+${input.qty}`, 'Khởi tạo SKU, nhập tồn đầu kỳ', 'online'); }
    return done(`Đã tạo ${r.sku}.`, { sku: r.sku });
  })) as Promise<R>;
}

// ---------- capsule ----------
export async function saveCapsule(name: string, skus: string[]): Promise<R> {
  return guard(() => tx(() => {
    if (!name.trim()) throw new Error('Nhập tên capsule.');
    if (skus.length < 2) throw new Error('Capsule cần ít nhất hai SKU thành phần.');
    const c = run('INSERT INTO capsules(name) VALUES(?)', name.trim());
    for (const s of skus) run('INSERT INTO capsule_items(capsule_id,sku) VALUES(?,?)', c.lastInsertRowid, s);
    return done(`Đã tạo capsule ELR-CAP-${String(c.lastInsertRowid).padStart(2, '0')}.`);
  })) as Promise<R>;
}
export async function sellCapsule(id: number): Promise<R> {
  return guard(() => tx(() => {
    sweepHolds();
    const c = get<any>('SELECT * FROM capsules WHERE id=?', id);
    const items = all<any>('SELECT sku FROM capsule_items WHERE capsule_id=?', id);
    for (const it of items) {
      if (availableOf(it.sku) < 1) throw new Error(`Không đủ hàng khả dụng cho ${it.sku} để bán thêm một set.`);
      takeFrom(it.sku, 1, ['online']);
      log(it.sku, '-1', `Bán capsule ELR-CAP-${String(id).padStart(2, '0')} (mô phỏng)`, 'online');
      run('UPDATE variants SET last_sold_at=? WHERE sku=?', nowIso(), it.sku);
    }
    return done(`Đã bán 1 set "${c.name}" và trừ kho ${items.length} món thành phần.`);
  })) as Promise<R>;
}

// ---------- đặt may ----------
export async function createPo(input: { workshop: string; productId: number; color: string; cost: number; due: string; lines: Record<string, number> }): Promise<R> {
  return guard(() => tx(() => {
    const lines = Object.entries(input.lines).filter(([, q]) => q > 0);
    if (!input.workshop.trim()) throw new Error('Nhập tên xưởng may.');
    if (!(input.cost > 0)) throw new Error('Nhập đơn giá gia công lớn hơn 0.');
    if (!input.due.trim()) throw new Error('Nhập ngày hẹn giao.');
    if (!lines.length) throw new Error('Nhập số lượng cho ít nhất một size.');
    const code = nextCode('PO', 'purchase_orders');
    const r = run('INSERT INTO purchase_orders(code,workshop,product_id,color,cost,due,status,created_at) VALUES(?,?,?,?,?,?,0,?)', code, input.workshop.trim(), input.productId, input.color, input.cost, input.due.trim(), nowIso());
    for (const [z, q] of lines) run('INSERT INTO po_lines(po_id,size,qty) VALUES(?,?,?)', r.lastInsertRowid, z, q);
    return done(`Đã tạo phiếu ${code} gửi ${input.workshop.trim()}.`);
  })) as Promise<R>;
}
export async function advancePo(code: string): Promise<R> {
  return guard(() => {
    const po = get<any>('SELECT * FROM purchase_orders WHERE code=?', code);
    if (!po || po.status >= 2) throw new Error('Không thể chuyển tiến độ phiếu này.');
    run('UPDATE purchase_orders SET status=status+1 WHERE id=?', po.id);
    return done(`${code}: ${PO_STATUS[po.status + 1]}.`);
  }) as Promise<R>;
}
export async function approveQc(code: string, rows: { size: string; recv: number; bad: number }[]): Promise<R> {
  return guard(() => tx(() => {
    const po = get<any>('SELECT p.*, pr.code pcode FROM purchase_orders p JOIN products pr ON pr.id=p.product_id WHERE p.code=?', code);
    if (!po || po.status !== 2) throw new Error('Phiếu chưa ở trạng thái đã giao đến kho.');
    let pass = 0, bad = 0; const badItems: string[] = [];
    for (const r of rows) {
      if (!(r.recv >= 0) || !(r.bad >= 0) || r.bad > r.recv) throw new Error(`Kiểm tra lại size ${sizeText(r.size)}: số lỗi không được lớn hơn số nhận.`);
      const v = ensureVariant(po.product_id, po.color, r.size);
      const ok = r.recv - r.bad; pass += ok; bad += r.bad;
      if (ok > 0) { adjust(v.sku, 'online', ok); log(v.sku, `+${ok}`, `Nhập xưởng ${code} (đạt QC)`, 'online'); }
      if (r.bad > 0) { badItems.push(`${r.bad} × ${v.sku}`); log(v.sku, `Lỗi ${r.bad}`, `Hàng lỗi trả xưởng ${code}`); }
    }
    if (bad > 0) run('INSERT INTO workshop_returns(code,po_code,text) VALUES(?,?,?)', nextCode('TX', 'workshop_returns'), code, `${badItems.join(', ')} (lỗi đường may hoặc sai size)`);
    run('UPDATE purchase_orders SET status=3 WHERE id=?', po.id);
    return done(`Đã duyệt ${code}: nhập ${pass} sản phẩm đạt chuẩn vào Kho Online${bad ? `, ${bad} sản phẩm lỗi đã lập phiếu trả xưởng` : ''}.`);
  })) as Promise<R>;
}
export async function markWorkshopReturn(id: number): Promise<R> {
  return guard(() => { run("UPDATE workshop_returns SET status='Đã trả xưởng' WHERE id=?", id); return done('Đã đánh dấu đã trả xưởng.'); }) as Promise<R>;
}

// ---------- điều chuyển ----------
export async function createTransfer(input: { sku: string; from: string; to: string; qty: number }): Promise<R> {
  return guard(() => tx(() => {
    if (!(input.from in LOCS) || !(input.to in LOCS)) throw new Error('Kho không hợp lệ.');
    if (input.from === input.to) throw new Error('Kho xuất và kho nhận phải khác nhau.');
    if (!(input.qty > 0)) throw new Error('Nhập số lượng lớn hơn 0.');
    adjust(input.sku, input.from, -input.qty);
    const code = nextCode('DC', 'transfers');
    run('INSERT INTO transfers(code,sku,qty,from_loc,to_loc,status,created_at) VALUES(?,?,?,?,?,?,?)', code, input.sku, input.qty, input.from, input.to, 'Đang chuyển', nowIso());
    log(input.sku, `-${input.qty}`, `Chuyển kho ${code}, xuất từ ${LOCS[input.from]}`, input.from);
    return done(`Đã tạo phiếu ${code}. Hàng đang chuyển, chờ kho nhận xác nhận.`);
  })) as Promise<R>;
}
export async function receiveTransfer(id: number): Promise<R> {
  return guard(() => tx(() => {
    const t = get<any>('SELECT * FROM transfers WHERE id=?', id);
    if (!t || t.status !== 'Đang chuyển') throw new Error('Phiếu không ở trạng thái đang chuyển.');
    adjust(t.sku, t.to_loc, t.qty);
    run("UPDATE transfers SET status='Hoàn tất' WHERE id=?", id);
    log(t.sku, `+${t.qty}`, `Chuyển kho ${t.code}, nhận tại ${LOCS[t.to_loc]}`, t.to_loc);
    return done(`Đã xác nhận nhận hàng phiếu ${t.code}.`);
  })) as Promise<R>;
}

// ---------- tư vấn và giữ hàng ----------
export async function saveConsult(id: number, patch: { stylist?: string; message?: string; picks?: string[] }): Promise<R> {
  return guard(() => {
    const c = get<any>('SELECT * FROM consults WHERE id=?', id);
    if (!c) throw new Error('Không tìm thấy yêu cầu.');
    const picks = patch.picks ?? String(c.picks).split(',').filter(Boolean);
    const stylist = patch.stylist ?? c.stylist;
    const status = c.status === 'Mới' && (stylist || picks.length) ? 'Đang phối' : c.status;
    // bỏ giữ hàng của món bị gỡ khỏi set
    for (const h of all<any>('SELECT * FROM holds WHERE consult_id=?', id)) if (!picks.includes(h.sku)) { run('DELETE FROM holds WHERE id=?', h.id); log(h.sku, `Nhả ${h.qty}`, 'Stylist gỡ món khỏi set gợi ý'); }
    run('UPDATE consults SET stylist=?, message=?, picks=?, status=? WHERE id=?', stylist, patch.message ?? c.message, picks.join(','), status, id);
    return done('Đã lưu nháp.');
  }) as Promise<R>;
}
export async function sendConsultSet(id: number, hours: number): Promise<R> {
  return guard(() => tx(() => {
    sweepHolds();
    const c = get<any>('SELECT c.*, u.name uname FROM consults c JOIN users u ON u.id=c.user_id WHERE c.id=?', id);
    if (!c.stylist) throw new Error('Chọn stylist phụ trách trước khi gửi.');
    const picks = String(c.picks).split(',').filter(Boolean);
    if (!picks.length) throw new Error('Thêm ít nhất một sản phẩm vào set gợi ý.');
    if (![24, 48].includes(hours)) throw new Error('Thời gian giữ hàng là 24 hoặc 48 giờ.');
    const expires = new Date(Date.now() + hours * 3600000).toISOString();
    let n = 0;
    for (const sku of picks) {
      const ex = get<any>('SELECT id FROM holds WHERE consult_id=? AND sku=?', id, sku);
      if (ex) { run('UPDATE holds SET expires_at=? WHERE id=?', expires, ex.id); continue; }
      if (availableOf(sku) < 1) throw new Error(`${sku} đã hết hàng khả dụng nên không giữ được. Bỏ món này hoặc chọn món khác.`);
      run('INSERT INTO holds(consult_id,sku,qty,expires_at) VALUES(?,?,1,?)', id, sku, expires);
      log(sku, 'Giữ 1', `Giữ hàng styling cho ${c.uname} (${hours} giờ)`);
      n++;
    }
    run("UPDATE consults SET status='Đã gửi gợi ý' WHERE id=?", id);
    return done(`Đã gửi gợi ý cho ${c.uname} và giữ ${picks.length} món trong ${hours} giờ. Tin nhắn gửi khách hiện chỉ hiển thị trong tài khoản của khách, chưa gửi email thật.`);
  })) as Promise<R>;
}
export async function buyHold(id: number): Promise<R> {
  return guard(() => tx(() => {
    const h = get<any>('SELECT h.*, u.name uname FROM holds h JOIN consults c ON c.id=h.consult_id JOIN users u ON u.id=c.user_id WHERE h.id=?', id);
    if (!h) throw new Error('Không tìm thấy hàng giữ.');
    takeFrom(h.sku, h.qty, ['online', 'showroom', 'styling']);
    run('DELETE FROM holds WHERE id=?', id);
    run('UPDATE variants SET last_sold_at=? WHERE sku=?', nowIso(), h.sku);
    log(h.sku, `-${h.qty}`, `Khách ${h.uname} chốt mua (giữ hàng styling)`);
    return done(`Đã ghi nhận ${h.uname} chốt mua ${h.sku} và trừ kho.`);
  })) as Promise<R>;
}
export async function releaseHold(id: number): Promise<R> {
  return guard(() => tx(() => {
    const h = get<any>('SELECT * FROM holds WHERE id=?', id);
    if (!h) throw new Error('Không tìm thấy hàng giữ.');
    run('DELETE FROM holds WHERE id=?', id);
    log(h.sku, `Nhả ${h.qty}`, 'Stylist nhả giữ hàng');
    return done(`Đã nhả ${h.sku} về kho bán.`);
  })) as Promise<R>;
}
export async function simulateHours(h: number): Promise<R> {
  return guard(() => {
    run("UPDATE holds SET expires_at = strftime('%Y-%m-%dT%H:%M:%fZ', expires_at, ?)", `-${h} hours`);
    const n = sweepHolds();
    return done(n ? `${n} món hết hạn giữ và đã tự nhả về kho bán.` : `Đã trôi ${h} giờ. Chưa có món nào hết hạn.`);
  }) as Promise<R>;
}

// ---------- xuất kho ----------
export async function packOrder(code: string, carrier: string, checks: boolean[]): Promise<R> {
  return guard(() => tx(() => {
    if (!['GHN', 'GHTK'].includes(carrier)) throw new Error('Chọn đơn vị vận chuyển.');
    if (checks.length !== 3 || !checks.every(Boolean)) throw new Error('Hoàn tất cả ba bước kiểm tra trước khi đóng gói.');
    const o = get<any>('SELECT * FROM orders WHERE code=?', code);
    if (!o || o.status !== 1) throw new Error('Đơn chưa được xác nhận hoặc đã xuất kho.');
    for (const l of all<any>('SELECT * FROM order_lines WHERE order_id=?', o.id)) {
      try { takeFrom(l.sku, l.qty, ['online']); }
      catch { throw new Error(`Kho Online không đủ ${l.sku}. Điều chuyển hàng từ Showroom ở mục Kho và điều chuyển.`); }
      log(l.sku, `-${l.qty}`, `Bán đơn web ${code}`, 'online');
      run('UPDATE variants SET last_sold_at=? WHERE sku=?', nowIso(), l.sku);
    }
    const tracking = carrier + barcodeDigits(code + carrier).slice(3);
    run('UPDATE orders SET status=2, carrier=?, tracking=? WHERE id=?', carrier, tracking, o.id);
    return done(`Đã đóng gói đơn ${code} và trừ kho. Đơn chuyển sang Đang giao.`, { tracking });
  })) as Promise<R>;
}

// ---------- đổi trả ----------
export async function receiveReturn(orderCode: string, sku: string, reason: string): Promise<R> {
  return guard(() => {
    const o = get<any>('SELECT * FROM orders WHERE code=? AND status=3', orderCode);
    if (!o) throw new Error('Chỉ nhận đổi trả cho đơn đã giao.');
    if (!get('SELECT 1 FROM order_lines WHERE order_id=? AND sku=?', o.id, sku)) throw new Error('Sản phẩm không thuộc đơn này.');
    if (get("SELECT 1 FROM return_tickets WHERE order_code=? AND sku=? AND status='Chờ kiểm tra'", orderCode, sku)) throw new Error('Sản phẩm này đã có phiếu đang chờ kiểm tra.');
    run('INSERT INTO return_tickets(order_code,user_id,sku,reason,created_at) VALUES(?,?,?,?,?)', orderCode, o.user_id, sku, reason, nowIso());
    return done(`Đã tiếp nhận ${sku} từ đơn ${orderCode}.`);
  }) as Promise<R>;
}
export async function returnRestock(id: number): Promise<R> {
  return guard(() => tx(() => {
    const r = get<any>("SELECT * FROM return_tickets WHERE id=? AND status='Chờ kiểm tra'", id);
    if (!r) throw new Error('Phiếu không ở trạng thái chờ kiểm tra.');
    adjust(r.sku, 'online', 1);
    run("UPDATE return_tickets SET status='Đã nhập lại kho' WHERE id=?", id);
    log(r.sku, '+1', `Nhập lại kho hàng đổi trả đơn ${r.order_code} (còn nguyên tem mác)`, 'online');
    return done(`Đã nhập lại ${r.sku} vào Kho Online để bán lại.`);
  })) as Promise<R>;
}
export async function returnRepair(id: number): Promise<R> {
  return guard(() => tx(() => {
    const r = get<any>("SELECT * FROM return_tickets WHERE id=? AND status='Chờ kiểm tra'", id);
    if (!r) throw new Error('Phiếu không ở trạng thái chờ kiểm tra.');
    run('INSERT INTO repair_items(sku,qty,source) VALUES(?,1,?)', r.sku, `Đổi trả đơn ${r.order_code} (${r.reason})`);
    run("UPDATE return_tickets SET status='Đã chuyển kho sửa chữa' WHERE id=?", id);
    log(r.sku, 'Chuyển sửa 1', `Hàng lỗi từ đơn ${r.order_code} chuyển kho thanh lý, sửa chữa`);
    return done(`Đã chuyển ${r.sku} sang kho thanh lý và sửa chữa.`);
  })) as Promise<R>;
}
