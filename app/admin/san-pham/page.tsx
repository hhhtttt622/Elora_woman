import { allProducts } from '@/lib/shop';
import { PageHead } from '@/components/admin/Bits';
import ProductManager from '@/components/admin/ProductManager';
export const dynamic = 'force-dynamic';
export default function Page() {
  const list = allProducts({ includeInactive: true }).map((p) => ({
    id: p.id, name: p.name, category: p.category, price: p.price, salePrice: p.salePrice, material: p.material, description: p.description, active: p.active, featured: p.featured, isNew: p.isNew,
    colors: p.colors, sizes: p.sizes, variantStocks: p.variants.map((v) => ({ color: v.color, size: v.size, quantity: v.online })),
    stockText: p.variants.length ? `${p.variants.reduce((n, v) => n + v.physical, 0)} (${p.variants.length} SKU)` : 'Chưa có SKU', warn: p.variants.some((v) => v.available < v.minStock),
  }));
  return (<><PageHead group="Bán hàng" title="Sản phẩm" /><ProductManager products={list} /></>);
}
