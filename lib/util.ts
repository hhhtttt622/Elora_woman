export const COLOR_CODES: Record<string, string> = { 'Đen': 'DEN', 'Trắng': 'TRG', 'Be': 'BE', 'Xám': 'XAM', 'Xanh navy': 'NVY', 'Hồng phấn': 'HPH', 'Nâu': 'NAU' };
export const COLOR_HEX: Record<string, string> = { 'Đen': '#1E1B1E', 'Trắng': '#FFFFFF', 'Be': '#E8DCCB', 'Xám': '#9A9A9A', 'Xanh navy': '#1F2A44', 'Hồng phấn': '#EBC5CB', 'Nâu': '#7A5A44' };
export const COLORS = Object.keys(COLOR_CODES);
// KHO: Kho Online và Showroom là kho bán (tính vào tồn Thực tế); Kho thanh lý & sửa chữa nhận hàng đổi trả lỗi (BR-16).
export const LOCS: Record<string, string> = { online: 'Kho Online', showroom: 'Showroom', repair: 'Kho thanh lý & sửa chữa' };
export const LOC_KEYS = ['online', 'showroom', 'repair'] as const;
export const SELL_LOCS = ['online', 'showroom'] as const;
export const HOLD_STATUS = { active: 'Đang giữ', bought: 'Đã chốt mua', released: 'Đã nhả', expired: 'Hết hạn tự nhả' } as const;
export const ORDER_STATUS = ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao', 'Đã giao'];
export const PO_STATUS = ['Đã gửi xưởng', 'Xưởng đang may', 'Đã giao đến kho', 'Đã nhập kho'];
export const CATEGORIES = ['Đầm', 'Áo', 'Chân váy', 'Quần', 'Phụ kiện'];
export const SHIPPING_FEE = 30000;

export const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
export const sizeText = (z: string) => (z === 'FS' ? 'Free size' : z);
export const sizesFor = (category: string) => (category === 'Phụ kiện' ? ['FS'] : ['S', 'M', 'L', 'XL']);
export const mkSku = (code: string, color: string, size: string) => `ELR-${code}-${COLOR_CODES[color] || 'XXX'}-${size}`;
export const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
export const norm = (s: string) => slugify(s).replace(/-/g, ' ');
export const pad = (n: number) => String(n).padStart(2, '0');
export const nowIso = () => new Date().toISOString();
export const dmy = (iso: string) => { const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
export const dmyHm = (iso: string) => { const d = new Date(iso); return `${dmy(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const stampDay = () => { const d = new Date(); return String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()); };
export const hoursLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 3600000));
export function barcodeDigits(text: string) {
  let h = 7;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 1000000007;
  return '893' + String(h).padStart(9, '0');
}
export const shelfOf = (code: string, size: string) => (({ BLZ: 'A1', SKT: 'A2', BLS: 'A3', DRS: 'B1', PNT: 'B2', BAG: 'C1', ERG: 'C2', SCF: 'C3' } as Record<string, string>)[code] || 'D1') + '-' + size;
