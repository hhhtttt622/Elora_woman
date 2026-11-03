import Link from 'next/link';
import { allProducts } from '@/lib/shop';
import { requirePage } from '@/lib/auth';
import { CATEGORIES, norm } from '@/lib/util';
import { hrefWith } from '@/lib/url';
import { PageContainer } from '@/components/layout/Page';
import { FilterChips, SearchBar } from '@/components/ui/Navigation';
import ProductManager from '@/components/admin/ProductManager';
export const dynamic = 'force-dynamic';

type SP = { q?: string; cat?: string; st?: string };
const BASE = '/admin/san-pham';

// UC-18 Quản lý sản phẩm (sản phẩm cha; SKU và tồn kho ở UC-21)
export default async function Page({ searchParams }: { searchParams: SP }) {
  await requirePage('UC-18', BASE);
  let activeCount = 0;
  const all = allProducts({ includeInactive: true }).map((p) => {
    if (p.active) activeCount++;
    let physical = 0;
    let warn = false;
    for (const v of p.variants) {
      physical += v.physical;
      if (v.available < v.minStock) warn = true;
    }
    return {
      id: p.id, name: p.name, category: p.category, price: p.price, salePrice: p.salePrice, material: p.material, description: p.description, image: p.image, active: p.active, featured: p.featured, isNew: p.isNew,
      stockText: p.variants.length ? `${physical} (${p.variants.length} SKU)` : 'Chưa có SKU', warn,
    };
  });
  const q = norm(searchParams.q || '');
  const cat = CATEGORIES.includes(searchParams.cat || '') ? searchParams.cat! : '';
  const st = searchParams.st === 'on' || searchParams.st === 'off' ? searchParams.st : '';
  const rows = all.filter((p) => (!q || norm(p.name).includes(q)) && (!cat || p.category === cat) && (!st || (st === 'on' ? !!p.active : !p.active)));
  const filtered = !!(q || cat || st);

  return (
    <PageContainer>
      <ProductManager
        products={rows}
        caption={`Hiển thị ${rows.length} / ${all.length} sản phẩm`}
        emptyHint={filtered ? <>Thử bỏ bộ lọc. <Link href={BASE} className="textbtn" style={{ minHeight: 0 }}>Xóa bộ lọc</Link></> : 'Chưa có sản phẩm nào.'}
        toolbar={<div className="ui-toolbar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          <FilterChips label="Lọc theo hiển thị" current={st} items={[['', `Tất cả (${all.length})`], ['on', `Đang bán (${activeCount})`], ['off', `Đã ẩn (${all.length - activeCount})`]].map(([k, l]) => ({ key: k, label: l, href: hrefWith(BASE, searchParams, { st: k || null }) }))} />
          <FilterChips label="Lọc theo loại" current={cat} items={[{ key: '', label: 'Mọi loại', href: hrefWith(BASE, searchParams, { cat: null }) }, ...CATEGORIES.map((c) => ({ key: c, label: c, href: hrefWith(BASE, searchParams, { cat: c }) }))]} />
        </div>
        <SearchBar id="pq" label="Tìm sản phẩm" placeholder="Tên sản phẩm" defaultValue={searchParams.q} params={searchParams} keep={['cat', 'st']} />
      </div>}
      />
    </PageContainer>
  );
}
