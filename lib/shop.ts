import { all } from './db';
import { getVariants, type VariantRow } from './inventory';
import { norm } from './util';

export type ProductView = {
  id: number;
  slug: string;
  code: string;
  name: string;
  category: string;
  price: number;
  salePrice: number | null;
  material: string;
  description: string;
  tone: string;
  image: string;
  active: number;
  featured: number;
  isNew: number;
  colors: string[];
  sizes: string[];
  variants: VariantRow[];
  inStock: boolean;
};

/** Chỉ dùng khi render trang (đọc qua getVariants() đã cache theo request). */
export function allProducts(opts: { includeInactive?: boolean } = {}): ProductView[] {
  const vs = getVariants();
  const variantsByProduct = new Map<number, VariantRow[]>();
  for (const v of vs) {
    let list = variantsByProduct.get(v.productId);
    if (!list) {
      list = [];
      variantsByProduct.set(v.productId, list);
    }
    list.push(v);
  }

  const rows = all<any>('SELECT id,slug,code,name,category,price,sale_price salePrice,material,description,tone,image_url image,active,featured,is_new isNew FROM products ORDER BY id');
  return rows.filter((p) => opts.includeInactive || p.active).map((p) => {
    const mine = variantsByProduct.get(p.id) || [];
    const colors = new Set<string>();
    const sizes = new Set<string>();
    let inStock = false;
    for (const v of mine) {
      colors.add(v.color);
      sizes.add(v.size);
      if (v.available > 0) inStock = true;
    }
    return { ...p, variants: mine, colors: [...colors], sizes: [...sizes], inStock };
  });
}
export function productBySlug(slug: string) {
  return allProducts({ includeInactive: true }).find((p) => p.slug === slug);
}

export type Filters = {
  q?: string;
  cat?: string;
  size?: string;
  color?: string;
  max?: string;
  sale?: string;
};
export function filterProducts(list: ProductView[], f: Filters) {
  const q = f.q ? norm(f.q) : "";
  const max = f.max ? parseInt(f.max, 10) : 0;
  return list.filter((p) => {
    if (q && !norm(p.name).includes(q) && !norm(p.category).includes(q))
      return false;
    if (f.cat && p.category !== f.cat) return false;
    if (f.size && !p.variants.some((v) => v.size === f.size && v.available > 0))
      return false;
    if (
      f.color &&
      !p.variants.some((v) => v.color === f.color && v.available > 0)
    )
      return false;
    if (max && (p.salePrice || p.price) > max) return false;
    if (f.sale && !p.salePrice) return false;
    return true;
  });
}

export const SIZE_GUIDE = [
  {
    size: "S",
    height: "150–158",
    weight: "42–48",
    bust: "82",
    waist: "64",
    hip: "88",
  },
  {
    size: "M",
    height: "155–163",
    weight: "47–54",
    bust: "86",
    waist: "68",
    hip: "92",
  },
  {
    size: "L",
    height: "160–168",
    weight: "53–60",
    bust: "90",
    waist: "72",
    hip: "96",
  },
  {
    size: "XL",
    height: "163–172",
    weight: "59–68",
    bust: "94",
    waist: "76",
    hip: "100",
  },
];
export function adviseSize(h: number, w: number) {
  if (!(h > 0) || !(w > 0)) return "";
  const bmi = w / (h / 100) ** 2;
  if (bmi < 19.5 && h < 160) return "S";
  if (bmi < 21.5) return h >= 165 ? "M" : "S";
  if (bmi < 23.5) return h >= 166 ? "L" : "M";
  if (bmi < 25.5) return "L";
  return "XL";
}

const OUTFIT_WANT: Record<string, string[]> = {
  'Đầm': ['Phụ kiện', 'Áo'],
  'Áo': ['Chân váy', 'Quần', 'Phụ kiện'],
  'Chân váy': ['Áo', 'Phụ kiện'],
  'Quần': ['Áo', 'Phụ kiện'],
  'Phụ kiện': ['Áo', 'Đầm', 'Chân váy'],
};

/** Gợi ý phối đồ: món khác nhóm, đang bán, còn hàng. */
export function outfitFor(p: ProductView, list: ProductView[]) {
  const cats = OUTFIT_WANT[p.category] || [];
  const out: ProductView[] = [];
  for (const cat of cats) {
    const m = list.find((x) => x.category === cat && x.active && x.id !== p.id && x.inStock && !out.includes(x));
    if (m) out.push(m);
  }
  return out.slice(0, 3);
}
