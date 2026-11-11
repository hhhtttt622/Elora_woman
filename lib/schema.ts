// Cấu trúc database theo ERD mức khái niệm (ERD_ELORA_WOMAN_conceptual.puml) và đặc tả v3.0.
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT DEFAULT '',
  password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer', status TEXT NOT NULL DEFAULT 'active', must_change_pw INTEGER NOT NULL DEFAULT 0,
  height_cm INTEGER, weight_kg INTEGER, size TEXT DEFAULT 'M', liked_colors TEXT DEFAULT '', work_env TEXT DEFAULT '', birthday TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS sessions(
  id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TEXT NOT NULL, expires_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active');
CREATE TABLE IF NOT EXISTS products(
  id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, code TEXT NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL,
  price INTEGER NOT NULL, sale_price INTEGER, material TEXT DEFAULT '', description TEXT DEFAULT '', collection TEXT DEFAULT '', tone TEXT DEFAULT '#E8DCCB', image_url TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1, featured INTEGER NOT NULL DEFAULT 0, is_new INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS variants(
  id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT NOT NULL UNIQUE, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color TEXT NOT NULL, size TEXT NOT NULL, min_stock INTEGER NOT NULL DEFAULT 3, last_sold_at TEXT NOT NULL DEFAULT (datetime('now')),
  active INTEGER NOT NULL DEFAULT 1, price_override INTEGER, image_url TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS stocks(
  variant_id INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE, location TEXT NOT NULL, qty INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(variant_id, location));
CREATE TABLE IF NOT EXISTS orders(
  id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, user_id INTEGER NOT NULL REFERENCES users(id), status INTEGER NOT NULL DEFAULT 0,
  pay_method TEXT NOT NULL, shipping_fee INTEGER NOT NULL DEFAULT 30000, total INTEGER NOT NULL, recv_name TEXT NOT NULL, recv_phone TEXT NOT NULL,
  address TEXT NOT NULL, note TEXT DEFAULT '', carrier TEXT DEFAULT '', tracking TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')),
  shipped_at TEXT, delivered_at TEXT, promotion_id INTEGER REFERENCES promotions(id), promotion_code TEXT DEFAULT '', promotion_name TEXT DEFAULT '', discount_amount INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED', payment_deadline TEXT,
  payment_confirmed_at TEXT, payment_confirmed_by INTEGER REFERENCES users(id), payment_bank_bin TEXT,
  payment_account_no TEXT, payment_account_name TEXT);
CREATE TABLE IF NOT EXISTS order_lines(
  id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sku TEXT NOT NULL, name TEXT NOT NULL, qty INTEGER NOT NULL, price INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS consults(
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id), work_env TEXT NOT NULL, occasions TEXT NOT NULL,
  budget TEXT NOT NULL, height_cm INTEGER, weight_kg INTEGER, note TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'Mới',
  stylist_id INTEGER REFERENCES users(id), message TEXT DEFAULT '', picks TEXT DEFAULT '', hold_hours INTEGER, sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS holds(
  id INTEGER PRIMARY KEY AUTOINCREMENT, consult_id INTEGER NOT NULL REFERENCES consults(id) ON DELETE CASCADE,
  sku TEXT NOT NULL, qty INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')), expires_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Đang giữ');
CREATE TABLE IF NOT EXISTS capsules(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS capsule_items(
  id INTEGER PRIMARY KEY AUTOINCREMENT, capsule_id INTEGER NOT NULL REFERENCES capsules(id) ON DELETE CASCADE, sku TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS purchase_orders(
  id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, workshop TEXT NOT NULL, product_id INTEGER NOT NULL,
  color TEXT NOT NULL, cost INTEGER NOT NULL, due TEXT NOT NULL, status INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')),
  received_at TEXT);
CREATE TABLE IF NOT EXISTS po_lines(
  id INTEGER PRIMARY KEY AUTOINCREMENT, po_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE, size TEXT NOT NULL, qty INTEGER NOT NULL,
  recv INTEGER, bad INTEGER);
CREATE TABLE IF NOT EXISTS transfers(
  id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, sku TEXT NOT NULL, qty INTEGER NOT NULL, from_loc TEXT NOT NULL, to_loc TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Đang chuyển', created_at TEXT NOT NULL DEFAULT (datetime('now')), received_at TEXT);
CREATE TABLE IF NOT EXISTS return_tickets(
  id INTEGER PRIMARY KEY AUTOINCREMENT, order_code TEXT NOT NULL, user_id INTEGER NOT NULL, sku TEXT NOT NULL, reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Chờ kiểm tra', result TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')), processed_at TEXT);
CREATE TABLE IF NOT EXISTS workshop_returns(
  id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, po_code TEXT NOT NULL, text TEXT NOT NULL, qty INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Chờ trả xưởng', created_at TEXT NOT NULL DEFAULT (datetime('now')), returned_at TEXT);
CREATE TABLE IF NOT EXISTS inventory_logs(
  id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')), sku TEXT NOT NULL, delta TEXT NOT NULL,
  reason TEXT NOT NULL, location TEXT NOT NULL DEFAULT '', actor_id INTEGER REFERENCES users(id), ref TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS product_recommendations(
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  related_product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(product_id, related_product_id), CHECK(product_id <> related_product_id));
CREATE TABLE IF NOT EXISTS promotions(
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '', kind TEXT NOT NULL CHECK(kind IN ('percent','fixed')),
  value INTEGER NOT NULL CHECK(value > 0), max_discount INTEGER, min_order INTEGER NOT NULL DEFAULT 0,
  starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, max_uses INTEGER, max_uses_per_customer INTEGER,
  combinable INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft',
  occasion TEXT NOT NULL DEFAULT 'general', birthday_window TEXT NOT NULL DEFAULT 'month',
  show_home INTEGER NOT NULL DEFAULT 0, audience TEXT NOT NULL DEFAULT 'all', created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS promotion_rules(
  id INTEGER PRIMARY KEY AUTOINCREMENT, promotion_id INTEGER NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK(rule_type IN ('include','exclude')),
  entity_type TEXT NOT NULL CHECK(entity_type IN ('product','category','collection')), entity_id TEXT NOT NULL,
  UNIQUE(promotion_id, rule_type, entity_type, entity_id));
CREATE TABLE IF NOT EXISTS promotion_redemptions(
  id INTEGER PRIMARY KEY AUTOINCREMENT, promotion_id INTEGER NOT NULL REFERENCES promotions(id),
  user_id INTEGER NOT NULL REFERENCES users(id), order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id),
  discount_amount INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'reserved', created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT, released_at TEXT);
`;

/** Cột bổ sung ở bản 3.0, thêm vào database tạo từ bản cũ. */
export const MIGRATIONS: [string, string, string][] = [
  ["products", "image_url", "TEXT DEFAULT ''"],
  ["products", "collection", "TEXT DEFAULT ''"],
  ["variants", "active", "INTEGER NOT NULL DEFAULT 1"],
  ["variants", "price_override", "INTEGER"],
  ["variants", "image_url", "TEXT DEFAULT ''"],
  ["users", "birthday", "TEXT"],
  ["users", "status", "TEXT NOT NULL DEFAULT 'active'"],
  ["users", "must_change_pw", "INTEGER NOT NULL DEFAULT 0"],
  ["orders", "shipped_at", "TEXT"],
  ["orders", "delivered_at", "TEXT"],
  ["orders", "promotion_id", "INTEGER REFERENCES promotions(id)"],
  ["orders", "promotion_code", "TEXT DEFAULT ''"],
  ["orders", "promotion_name", "TEXT DEFAULT ''"],
  ["orders", "discount_amount", "INTEGER NOT NULL DEFAULT 0"],
  ["orders", "payment_status", "TEXT NOT NULL DEFAULT 'NOT_REQUIRED'"],
  ["orders", "payment_deadline", "TEXT"],
  ["orders", "payment_confirmed_at", "TEXT"],
  ["orders", "payment_confirmed_by", "INTEGER REFERENCES users(id)"],
  ["orders", "payment_bank_bin", "TEXT"],
  ["orders", "payment_account_no", "TEXT"],
  ["orders", "payment_account_name", "TEXT"],
  ["consults", "stylist_id", "INTEGER REFERENCES users(id)"],
  ["consults", "hold_hours", "INTEGER"],
  ["consults", "sent_at", "TEXT"],
  ["holds", "created_at", "TEXT"],
  ["holds", "status", "TEXT NOT NULL DEFAULT 'Đang giữ'"],
  ["capsules", "created_at", "TEXT"],
  ["purchase_orders", "received_at", "TEXT"],
  ["po_lines", "recv", "INTEGER"],
  ["po_lines", "bad", "INTEGER"],
  ["transfers", "received_at", "TEXT"],
  ["return_tickets", "result", "TEXT DEFAULT ''"],
  ["return_tickets", "processed_at", "TEXT"],
  ["workshop_returns", "qty", "INTEGER NOT NULL DEFAULT 0"],
  ["workshop_returns", "created_at", "TEXT"],
  ["workshop_returns", "returned_at", "TEXT"],
  ["inventory_logs", "actor_id", "INTEGER REFERENCES users(id)"],
  ["inventory_logs", "ref", "TEXT DEFAULT ''"],
];

export const INDEXES = `
CREATE INDEX IF NOT EXISTS idx_holds_sku ON holds(sku);
CREATE INDEX IF NOT EXISTS idx_lines_order ON order_lines(order_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_consults_stylist ON consults(stylist_id);
CREATE INDEX IF NOT EXISTS idx_related_product ON product_recommendations(product_id,position);
CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code);
CREATE INDEX IF NOT EXISTS idx_promotion_rules ON promotion_rules(promotion_id,rule_type);
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions ON promotion_redemptions(promotion_id,user_id,status);
`;
