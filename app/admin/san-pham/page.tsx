import Link from 'next/link';
import { allProducts } from '@/lib/shop';
import { all } from '@/lib/db';
import { requirePage } from '@/lib/auth';
import { CATEGORIES, norm } from '@/lib/util';
import { hrefWith } from '@/lib/url';
import { PageContainer } from '@/components/layout/Page';
import { FilterChips, SearchBar } from '@/components/ui/Navigation';
import ProductManager from '@/components/admin/ProductManager';
import ProductCategoryFilter from '@/components/admin/ProductCategoryFilter';
export const dynamic = 'force-dynamic';

type SP = { q?: string; cat?: string; st?: string };
const BASE = '/admin/san-pham';

// UC-18 Quản lý sản phẩm (sản phẩm cha; SKU và tồn kho ở UC-21)
export default async function Page({ searchParams }: { searchParams: SP }) {
  await requirePage('UC-18', BASE);
  let activeCount = 0;
  const productRows = allProducts({ includeInactive: true }).map((p) => {
    if (p.active) activeCount++;
    let physical = 0;
    let warn = false;
    for (const v of p.variants) {
      physical += v.physical;
      if (v.available < v.minStock) warn = true;
    }
    return {
      id: p.id, name: p.name, category: p.category, price: p.price, salePrice: p.salePrice, material: p.material, collection: p.collection, description: p.description, image: p.image, active: p.active, featured: p.featured, isNew: p.isNew,
      stockText: p.variants.length ? `${physical} (${p.variants.length} SKU)` : 'Chưa có SKU', warn,
    };
  });
  const q = norm(searchParams.q || '');
  const cat = CATEGORIES.includes(searchParams.cat || '') ? searchParams.cat! : '';
  const st = searchParams.st === 'on' || searchParams.st === 'off' ? searchParams.st : '';
  const rows = productRows.filter((p) => (!q || norm(p.name).includes(q)) && (!cat || p.category === cat) && (!st || (st === 'on' ? !!p.active : !p.active)));
  const filtered = !!(q || cat || st);
  const products = allProducts({ includeInactive: true });
  const recommendations = new Map<number, number[]>();
  for (const row of all<any>('SELECT product_id,related_product_id FROM product_recommendations ORDER BY position')) {
    recommendations.set(row.product_id, [...(recommendations.get(row.product_id) || []), row.related_product_id]);
  }
  const skus = new Map<number, string[]>();
  for (const row of all<any>('SELECT product_id,sku FROM variants ORDER BY sku')) skus.set(row.product_id, [...(skus.get(row.product_id) || []), row.sku]);
  const catalog = products.filter((p) => p.active).map((p) => ({ id: p.id, slug: p.slug, name: p.name, category: p.category, sku: (skus.get(p.id) || []).join(' '), price: p.salePrice || p.price, image: p.image }));
  const editRows = rows.map((p) => ({ ...p, relatedIds: recommendations.get(p.id) || [] }));

  return (
    <PageContainer>
      <ProductManager
        products={editRows}
        catalog={catalog}
        caption={`Hiển thị ${rows.length} / ${productRows.length} sản phẩm`}
        emptyHint={filtered ? <>Thử bỏ bộ lọc. <Link href={BASE} className="textbtn" style={{ minHeight: 0 }}>Xóa bộ lọc</Link></> : 'Chưa có sản phẩm nào.'}
        toolbar={<div className="product-filter-card">
          <div className="product-filter-main">
            <SearchBar id="pq" label="Tìm sản phẩm" placeholder="Tìm theo tên sản phẩm" defaultValue={searchParams.q} params={searchParams} keep={['cat', 'st']} />
            <ProductCategoryFilter categories={CATEGORIES} selected={cat} query={searchParams.q || ''} status={st} />
          </div>
          <FilterChips label="Lọc theo trạng thái" current={st} items={[['', `Tất cả (${productRows.length})`], ['on', `Đang bán (${activeCount})`], ['off', `Đã ẩn (${productRows.length - activeCount})`]].map(([k, l]) => ({ key: k, label: l, href: hrefWith(BASE, searchParams, { st: k || null }) }))} />
        </div>}
      />
    </PageContainer>
  );
}
