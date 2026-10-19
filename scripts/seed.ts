import { getDb, run, get, all, tx } from '../lib/db';
import { hash } from '../lib/auth-hash';
import { ensureVariant } from '../lib/inventory';
import { mkSku, slugify, nowIso, SHIPPING_FEE } from '../lib/util';

const db = getDb();
if (process.argv.includes('--reset')) {
  for (const t of ['inventory_logs','repair_items','workshop_returns','return_tickets','transfers','po_lines','purchase_orders','capsule_items','capsules','holds','consults','order_lines','orders','stocks','variants','products','users'])
    db.exec(`DELETE FROM ${t}`);
  db.exec("DELETE FROM sqlite_sequence");
}

const ago = (h: number) => new Date(Date.now() - h * 3600000).toISOString();
const later = (h: number) => new Date(Date.now() + h * 3600000).toISOString();

type P = [string, string, string, number, number | null, string[], string, string, string, boolean, boolean];
// [code, name, category, price, salePrice, colors, material, description, tone, featured, isNew]
const PRODUCTS: P[] = [
  ['DSM', 'Đầm sơ mi kẻ sọc có đai', 'Đầm', 1690000, null, ['Xanh navy', 'Be', 'Hồng phấn'], 'Cotton pha lanh, lót mềm', 'Đầm sơ mi dáng suông có đai, kẻ sọc nhỏ, phù hợp ngày làm việc dài.', '#1F2A44', false, true],
  ['DRS', 'Đầm bút chì xẻ sau', 'Đầm', 1560000, null, ['Đen', 'Xanh navy', 'Be'], 'Tweed dày, co giãn nhẹ', 'Đầm bút chì ôm vừa, xẻ sau kín đáo, lên dáng gọn trong họp và gặp đối tác.', '#1E1B1E', true, false],
  ['DLU', 'Đầm lụa cổ đức', 'Đầm', 2390000, null, ['Hồng phấn', 'Trắng', 'Đen'], 'Lụa tơ tằm tái chế', 'Đầm lụa cổ đức, tay dài, mềm rủ cho tiệc công ty và sự kiện.', '#EBC5CB', true, true],
  ['BLS', 'Áo sơ mi lụa cổ nơ', 'Áo', 1150000, null, ['Trắng', 'Hồng phấn', 'Xanh navy'], 'Lụa satin, ít nhăn', 'Sơ mi cổ nơ thanh lịch, phối được với chân váy hoặc quần ống suông.', '#F4F1EC', true, false],
  ['BLZ', 'Áo vest dáng suông', 'Áo', 2190000, null, ['Be', 'Đen', 'Xám'], 'Vải tuyết mưa cao cấp', 'Blazer dáng suông, vai nhẹ, hợp đi làm hằng ngày.', '#E8DCCB', true, true],
  ['KNT', 'Áo len mỏng cổ tròn', 'Áo', 890000, null, ['Xám', 'Be', 'Nâu'], 'Len merino pha', 'Áo len mỏng nhẹ cho văn phòng điều hòa lạnh.', '#B9B8B3', false, false],
  ['BLK', 'Áo blazer một cúc', 'Áo', 2450000, null, ['Đen', 'Xanh navy', 'Be'], 'Wool pha polyester', 'Blazer một cúc, đường may sắc nét, mặc dịp quan trọng.', '#2A262A', false, false],
  ['SKT', 'Chân váy bút chì', 'Chân váy', 1290000, 1032000, ['Xám', 'Đen', 'Xanh navy'], 'Vải tuyết mưa', 'Chân váy bút chì cạp cao, dài qua gối.', '#8E8F8A', true, false],
  ['SKP', 'Chân váy xếp ly', 'Chân váy', 1190000, null, ['Nâu', 'Đen', 'Be'], 'Chiffon lót mềm', 'Chân váy xếp ly dài, tạo chuyển động nhẹ khi di chuyển.', '#7A5A44', false, true],
  ['SKA', 'Chân váy chữ A', 'Chân váy', 990000, null, ['Xanh navy', 'Be', 'Đen'], 'Cotton pha', 'Chân váy chữ A gọn, hợp mọi dáng người.', '#1F2A44', false, false],
  ['PNB', 'Quần ống suông cạp cao', 'Quần', 1250000, null, ['Đen', 'Xám', 'Xanh navy'], 'Vải tuyết mưa, co giãn 2 chiều', 'Quần ống suông cạp cao kéo dài chân.', '#1E1B1E', true, false],
  ['PNT', 'Quần tây ống đứng', 'Quần', 1080000, null, ['Be', 'Đen', 'Xám'], 'Polyester pha viscose', 'Quần tây ống đứng, dễ phối cùng trang phục công sở.', '#D9CDB8', false, false],
  ['PNC', 'Quần culottes ống rộng', 'Quần', 1150000, null, ['Trắng', 'Be', 'Xanh navy'], 'Cotton lụa', 'Quần culottes ống rộng, thoáng cho mùa nóng.', '#F4F1EC', false, false],
  ['BAG', 'Túi xách da dáng hộp', 'Phụ kiện', 1890000, null, ['Đen', 'Nâu', 'Be'], 'Da bò thật', 'Túi dáng hộp đựng vừa laptop 13 inch.', '#1E1B1E', true, false],
  ['SCF', 'Khăn lụa vuông', 'Phụ kiện', 590000, null, ['Hồng phấn', 'Xanh navy', 'Trắng'], 'Lụa twill', 'Khăn lụa vuông, quàng cổ hoặc buộc túi.', '#F3DCE1', false, true],
  ['SHO', 'Giày cao gót mũi nhọn', 'Phụ kiện', 1490000, null, ['Be', 'Đen', 'Nâu'], 'Da thật, đế cao 7 cm', 'Giày mũi nhọn, đế cao 7 cm, dễ phối cùng trang phục công sở.', '#D9B9A4', false, false],
  ['ERG', 'Hoa tai ngọc trai', 'Phụ kiện', 450000, null, ['Trắng', 'Be', 'Đen'], 'Ngọc trai nhân tạo, khóa bạc', 'Hoa tai ngọc trai nhỏ, hợp mọi trang phục công sở.', '#F4F1EC', false, false],
  ['BLT', 'Thắt lưng da bản nhỏ', 'Phụ kiện', 690000, null, ['Nâu', 'Đen', 'Be'], 'Da bò', 'Thắt lưng bản nhỏ cho đầm và quần cạp cao.', '#7A5A44', false, false],
];

if (get<any>('SELECT COUNT(*) c FROM products').c > 0) {
  tx(() => {
    for (const [code, name, category, , , colors, , description] of PRODUCTS) {
      const product = get<any>('SELECT id FROM products WHERE code=?', code);
      if (!product) continue;
      run('UPDATE products SET name=?,description=? WHERE id=?', name, description, product.id);
      const sizes = category === 'Phụ kiện' ? ['FS'] : ['S', 'M', 'L', 'XL'];
      for (const color of colors) for (const size of sizes) ensureVariant(product.id, color, size);
    }
  });
  console.log('Đã cập nhật tên sản phẩm và các biến thể màu. SKU mới có tồn kho bằng 0; hãy nhập tồn trước khi bán.');
  process.exit(0);
}

tx(() => {
  // người dùng
  const pw = hash('elora123');
  run("INSERT INTO users(name,email,phone,password_hash,role,created_at) VALUES('Quản trị ELORA','admin@elora.vn','',?, 'admin',?)", hash('admin123'), nowIso());
  const CUS: [string, string, string, string, number, number, string, string][] = [
    ['Nguyễn Thu Hà', 'ha.nguyen@example.com', '0900 000 000', 'M', 160, 52, 'Be, Xám, Xanh navy', 'Văn phòng'],
    ['Trần Minh Anh', 'minhanh@example.com', '0900 000 001', 'L', 168, 60, 'Đen, Hồng phấn', 'Khách hàng, kinh doanh'],
    ['Lê Phương Thảo', 'phuongthao@example.com', '0900 000 002', 'S', 155, 45, 'Trắng, Xanh navy', 'Giáo dục'],
    ['Phạm Ngọc Lan', 'ngoclan@example.com', '0900 000 003', 'M', 158, 50, 'Hồng phấn, Be', 'Văn phòng'],
    ['Hoàng Bích Ngọc', 'bichngoc@example.com', '0900 000 004', 'M', 165, 56, 'Be, Xám', 'Ngân hàng, tài chính'],
    ['Đỗ Khánh Linh', 'khanhlinh@example.com', '0900 000 005', 'XL', 170, 68, 'Đen, Nâu', 'Văn phòng'],
  ];
  for (const c of CUS) run('INSERT INTO users(name,email,phone,password_hash,size,liked_colors,height_cm,weight_kg,work_env,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)', c[0], c[1], c[2], pw, c[3], c[6], c[4], c[5], c[7], nowIso());

  // sản phẩm + biến thể
  for (const [code, name, cat, price, sale, colors, material, desc, tone, featured, isNew] of PRODUCTS) {
    const r = run('INSERT INTO products(slug,code,name,category,price,sale_price,material,description,tone,active,featured,is_new) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
      slugify(name), code, name, cat, price, sale, material, desc, tone, code === 'PNC' ? 0 : 1, featured ? 1 : 0, isNew ? 1 : 0);
    const pid = Number(r.lastInsertRowid);
    const sizes = cat === 'Phụ kiện' ? ['FS'] : ['S', 'M', 'L', 'XL'];
    for (const color of colors) for (const size of sizes) {
      const sku = mkSku(code, color, size);
      const v = run('INSERT INTO variants(sku,product_id,color,size,min_stock,last_sold_at) VALUES(?,?,?,?,?,?)', sku, pid, color, size, 3, ago(24 * 5));
      // tồn mặc định
      const base = 4 + ((pid * 3 + size.length * 5 + color.length) % 6);
      run("INSERT INTO stocks VALUES(?, 'online', ?)", v.lastInsertRowid, base);
      run("INSERT INTO stocks VALUES(?, 'showroom', ?)", v.lastInsertRowid, Math.floor(base / 3));
      run("INSERT INTO stocks VALUES(?, 'styling', 0)", v.lastInsertRowid);
    }
  }
  // ghi đè tồn kho các SKU mẫu: [sku, online, showroom, styling, min, idleDays]
  const OVR: [string, number, number, number, number, number][] = [
    ['ELR-BLZ-BE-S', 4, 1, 0, 3, 12], ['ELR-BLZ-BE-M', 6, 2, 1, 3, 5], ['ELR-BLZ-BE-L', 3, 1, 0, 3, 20],
    ['ELR-BLZ-DEN-S', 2, 0, 0, 3, 40], ['ELR-BLZ-DEN-M', 5, 1, 0, 3, 18], ['ELR-BLZ-DEN-L', 4, 0, 0, 3, 72],
    ['ELR-SKT-XAM-S', 5, 1, 0, 3, 45], ['ELR-SKT-XAM-M', 6, 2, 0, 3, 8], ['ELR-SKT-XAM-L', 4, 1, 0, 3, 33],
    ['ELR-BLS-TRG-S', 8, 2, 0, 3, 6], ['ELR-BLS-TRG-M', 10, 3, 1, 3, 3], ['ELR-BLS-TRG-L', 7, 2, 0, 3, 9], ['ELR-BLS-TRG-XL', 4, 1, 0, 3, 55],
    ['ELR-DRS-DEN-S', 3, 1, 0, 3, 15], ['ELR-DRS-DEN-M', 5, 2, 0, 3, 11], ['ELR-DRS-DEN-L', 2, 0, 1, 3, 7], ['ELR-DRS-DEN-XL', 1, 0, 0, 3, 28],
    ['ELR-PNT-BE-S', 4, 0, 0, 3, 36], ['ELR-PNT-BE-M', 5, 1, 0, 3, 14], ['ELR-PNT-BE-L', 2, 1, 0, 3, 64],
    ['ELR-BAG-DEN-FS', 7, 2, 2, 3, 4], ['ELR-ERG-TRG-FS', 25, 10, 0, 5, 2], ['ELR-SCF-HPH-FS', 12, 4, 1, 3, 22],
  ];
  for (const [sku, a, b, c, min, idle] of OVR) {
    const v = get<any>('SELECT id FROM variants WHERE sku=?', sku);
    run('UPDATE variants SET min_stock=?, last_sold_at=? WHERE id=?', min, ago(idle * 24), v.id);
    run("UPDATE stocks SET qty=? WHERE variant_id=? AND location='online'", a, v.id);
    run("UPDATE stocks SET qty=? WHERE variant_id=? AND location='showroom'", b, v.id);
    run("UPDATE stocks SET qty=? WHERE variant_id=? AND location='styling'", c, v.id);
  }

  // đơn hàng
  const price = (sku: string) => { const r = get<any>('SELECT p.price pr, p.sale_price sp, p.name nm FROM variants v JOIN products p ON p.id=v.product_id WHERE v.sku=?', sku); return { p: r.sp || r.pr, n: r.nm }; };
  const user = (email: string) => get<any>('SELECT id,name,phone FROM users WHERE email=?', email);
  const ORD: [string, string, number, string, string[], string, number][] = [
    ['ELW-261015-001', 'ngoclan@example.com', 0, 'Thanh toán khi nhận hàng', ['ELR-BLS-TRG-M', 'ELR-SCF-HPH-FS'], '15', 20],
    ['ELW-261014-002', 'minhanh@example.com', 0, 'Chuyển khoản', ['ELR-DRS-DEN-L', 'ELR-ERG-TRG-FS'], '14', 44],
    ['ELW-261013-003', 'bichngoc@example.com', 1, 'Thanh toán khi nhận hàng', ['ELR-SKT-XAM-M', 'ELR-BLS-TRG-M'], '13', 68],
    ['ELW-261012-003', 'ha.nguyen@example.com', 2, 'Thanh toán khi nhận hàng', ['ELR-BLZ-BE-M', 'ELR-PNT-BE-M'], '12', 92],
    ['ELW-261010-001', 'phuongthao@example.com', 3, 'Chuyển khoản', ['ELR-SCF-HPH-FS', 'ELR-ERG-TRG-FS'], '10', 140],
    ['ELW-261008-001', 'khanhlinh@example.com', 3, 'Thanh toán khi nhận hàng', ['ELR-DRS-DEN-XL'], '08', 190],
    ['ELW-260924-002', 'ha.nguyen@example.com', 3, 'Thanh toán khi nhận hàng', ['ELR-DRS-DEN-M', 'ELR-ERG-TRG-FS'], '24', 500],
    ['ELW-260902-001', 'ha.nguyen@example.com', 3, 'Thanh toán khi nhận hàng', ['ELR-BLS-TRG-M', 'ELR-SKT-XAM-M'], '02', 920],
  ];
  for (const [code, email, status, pay, skus, , hAgo] of ORD) {
    const u = user(email);
    const lines = skus.map((s) => ({ sku: s, ...price(s) }));
    const total = lines.reduce((n, l) => n + l.p, 0) + SHIPPING_FEE;
    const o = run('INSERT INTO orders(code,user_id,status,pay_method,shipping_fee,total,recv_name,recv_phone,address,carrier,tracking,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
      code, u.id, status, pay, SHIPPING_FEE, total, u.name, u.phone, '12 Nguyễn Huệ, Quận 1, TP.HCM (địa chỉ mẫu)', status >= 2 ? 'GHN' : '', status >= 2 ? 'GHN' + code.replace(/\D/g, '').slice(0, 9) : '', ago(hAgo));
    for (const l of lines) run('INSERT INTO order_lines(order_id,sku,name,qty,price) VALUES(?,?,?,?,?)', o.lastInsertRowid, l.sku, l.n, 1, l.p);
  }

  // tư vấn + giữ hàng
  const CON: [string, string, string, string, number, number, string, string, string, string, string][] = [
    ['ngoclan@example.com', 'Văn phòng', 'Họp và thuyết trình', '3 đến 6 triệu', 158, 50, 'Văn phòng điều hòa lạnh, cần thêm áo khoác mỏng.', 'Mới', '', '', ''],
    ['bichngoc@example.com', 'Ngân hàng, tài chính', 'Gặp đối tác, Đi làm hằng ngày', '6 đến 10 triệu', 165, 56, 'Thích tông be và xám. Tránh màu neon.', 'Mới', '', '', ''],
    ['minhanh@example.com', 'Khách hàng, kinh doanh', 'Sự kiện công ty', 'Trên 10 triệu', 168, 60, 'Tiệc cuối năm cần đầm nổi bật nhưng kín đáo.', 'Đang phối', 'Stylist 1', '', 'ELR-DRS-DEN-L'],
    ['phuongthao@example.com', 'Giáo dục', 'Đi làm hằng ngày', 'Dưới 3 triệu', 155, 45, 'Cần đồ dễ giặt, ít nhăn.', 'Đã gửi gợi ý', 'Stylist 2', 'Chị thử set sơ mi lụa với hoa tai ngọc trai cho gọn.', 'ELR-BLS-TRG-S,ELR-ERG-TRG-FS'],
    ['ha.nguyen@example.com', 'Văn phòng', 'Họp và thuyết trình, Gặp đối tác', '3 đến 6 triệu', 160, 52, 'Họp giao ban sáng Thứ Hai.', 'Đã gửi gợi ý', 'Stylist 1', 'Set họp giao ban: áo sơ mi lụa, chân váy bút chì xám khói và túi dáng hộp.', 'ELR-BLS-TRG-M,ELR-SKT-XAM-M,ELR-BAG-DEN-FS'],
  ];
  const cids: number[] = [];
  for (const [email, work, occ, budget, h, w, note, st, stylist, msg, picks] of CON) {
    const r = run('INSERT INTO consults(user_id,work_env,occasions,budget,height_cm,weight_kg,note,status,stylist,message,picks,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
      user(email).id, work, occ, budget, h, w, note, st, stylist, msg, picks, ago(30 + cids.length * 20));
    cids.push(Number(r.lastInsertRowid));
  }
  for (const s of ['ELR-BLS-TRG-M', 'ELR-SKT-XAM-M', 'ELR-BAG-DEN-FS']) run('INSERT INTO holds(consult_id,sku,qty,expires_at) VALUES(?,?,1,?)', cids[4], s, later(20));
  for (const s of ['ELR-BLS-TRG-S', 'ELR-ERG-TRG-FS']) run('INSERT INTO holds(consult_id,sku,qty,expires_at) VALUES(?,?,1,?)', cids[3], s, later(5));

  // capsule
  const CAP: [string, string[]][] = [
    ['Capsule họp giao ban', ['ELR-BLS-TRG-M', 'ELR-SKT-XAM-M', 'ELR-BAG-DEN-FS']],
    ['Capsule gặp khách hàng', ['ELR-BLZ-BE-M', 'ELR-PNT-BE-M']],
    ['Capsule tiệc cuối năm', ['ELR-DRS-DEN-M', 'ELR-SCF-HPH-FS', 'ELR-ERG-TRG-FS']],
  ];
  for (const [name, items] of CAP) { const c = run('INSERT INTO capsules(name) VALUES(?)', name); for (const s of items) run('INSERT INTO capsule_items(capsule_id,sku) VALUES(?,?)', c.lastInsertRowid, s); }

  // PO
  const pid = (code: string) => get<any>('SELECT id FROM products WHERE code=?', code).id;
  const PO: [string, string, string, string, number, string, number, Record<string, number>][] = [
    ['PO-261001-01', 'Xưởng may Hoa Mai', 'BLZ', 'Be', 620000, '20/10/2026', 1, { S: 10, M: 20, L: 10 }],
    ['PO-260925-02', 'Xưởng may Hoa Mai', 'SKT', 'Xám', 310000, '15/10/2026', 2, { S: 10, M: 15, L: 10 }],
    ['PO-260910-01', 'Xưởng may Minh Châu', 'BLS', 'Trắng', 280000, '05/10/2026', 3, { S: 15, M: 20, L: 15, XL: 10 }],
    ['PO-261012-03', 'Xưởng may Minh Châu', 'DRS', 'Đen', 450000, '30/10/2026', 0, { S: 10, M: 10, L: 10, XL: 5 }],
  ];
  for (const [code, ws, pc, color, cost, due, st, lines] of PO) {
    const r = run('INSERT INTO purchase_orders(code,workshop,product_id,color,cost,due,status,created_at) VALUES(?,?,?,?,?,?,?,?)', code, ws, pid(pc), color, cost, due, st, nowIso());
    for (const [z, q] of Object.entries(lines)) run('INSERT INTO po_lines(po_id,size,qty) VALUES(?,?,?)', r.lastInsertRowid, z, q);
  }
  run("INSERT INTO workshop_returns(code,po_code,text,status) VALUES('TX-261005-01','PO-260910-01','1 × ELR-BLS-TRG-L (lỗi đường may)','Đã trả xưởng')");
  run("INSERT INTO transfers(code,sku,qty,from_loc,to_loc,status,created_at) VALUES('DC-261014-01','ELR-BLZ-BE-M',2,'online','showroom','Hoàn tất',?)", ago(40));
  run("INSERT INTO return_tickets(order_code,user_id,sku,reason) VALUES('ELW-261008-001',?, 'ELR-DRS-DEN-XL','Đổi size')", user('khanhlinh@example.com').id);
  run("INSERT INTO return_tickets(order_code,user_id,sku,reason) VALUES('ELW-261010-001',?, 'ELR-SCF-HPH-FS','Nghi hàng lỗi')", user('phuongthao@example.com').id);

  const LOG: [number, string, string, string, string][] = [
    [30, 'ELR-ERG-TRG-FS', '+30', 'Kiểm kê, nhập tồn đầu kỳ', 'online'],
    [260, 'ELR-BLS-TRG-XL', '+10', 'Nhập xưởng PO-260910-01 (đạt QC)', 'online'],
    [260, 'ELR-BLS-TRG-L', 'Lỗi 1', 'Hàng lỗi trả xưởng PO-260910-01', ''],
    [92, 'ELR-PNT-BE-M', '-1', 'Bán đơn web ELW-261012-003', 'online'],
    [92, 'ELR-BLZ-BE-M', '-1', 'Bán đơn web ELW-261012-003', 'online'],
    [70, 'ELR-DRS-DEN-L', '-1', 'Đổi size cho khách', 'online'],
    [40, 'ELR-BLZ-BE-M', '+2', 'Chuyển kho DC-261014-01, nhận tại Kho Showroom', 'showroom'],
    [40, 'ELR-BLZ-BE-M', '-2', 'Chuyển kho DC-261014-01, xuất từ Kho Tổng / Kho Online', 'online'],
    [10, 'ELR-BLS-TRG-M', 'Giữ 1', 'Giữ hàng styling cho Nguyễn Thu Hà (24 giờ)', ''],
  ];
  for (const [h, sku, d, r, l] of LOG) run('INSERT INTO inventory_logs(created_at,sku,delta,reason,location) VALUES(?,?,?,?,?)', ago(h), sku, d, r, l);
});
console.log('Đã nạp dữ liệu mẫu.');
