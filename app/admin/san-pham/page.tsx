import { allProducts } from '@/lib/shop';
import { PageHead } from '@/components/admin/Bits';
import ProductManager from '@/components/admin/ProductManager';
import { requirePage } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const me = await requirePage('UC-18', '/admin/san-pham');
  const list = allProducts({ includeInactive: true }).map((p) => ({
    id: p.id, name: p.name, category: p.category, price: p.price, salePrice: p.salePrice, material: p.material, description: p.description, active: p.active, featured: p.featured, isNew: p.isNew,
    stockText: p.variants.length ? `${p.variants.reduce((n, v) => n + v.physical, 0)} (${p.variants.length} SKU)` : 'Chưa có SKU', warn: p.variants.some((v) => v.available < v.minStock),
  }));
  return (<><PageHead group="Bán hàng" title="Sản phẩm" note="Quản lý thông tin chung của sản phẩm. Màu, size và tồn kho được tạo ở mục Tồn kho và SKU (UC-21)." /><ProductManager products={list} /></>);
}
