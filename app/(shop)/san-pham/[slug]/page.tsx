import Link from 'next/link';
import { notFound } from 'next/navigation';
import { allProducts, adviseSize, outfitFor, SIZE_GUIDE } from '@/lib/shop';
import { getUser } from '@/lib/auth';
import { all, get } from '@/lib/db';
import { ProductImage, ProductCard } from '@/components/Shop';
import ProductBuy from '@/components/ProductBuy';
import OutfitBundle from '@/components/OutfitBundle';
import SizeAdvisor from '@/components/SizeAdvisor';
import { fmt } from '@/lib/util';
export const dynamic = 'force-dynamic';

export default async function Detail({ params }: { params: { slug: string } }) {
  // Bắt đầu xác thực phiên (async) trước, đọc sản phẩm (sync) trong lúc chờ.
  const userPromise = getUser();
  const list = allProducts({ includeInactive: true });
  const p = list.find((x) => x.slug === params.slug);
  if (!p || !p.active) notFound();
  const relatedRows = all<any>(`SELECT p.id,p.slug,p.name,p.category,p.price,p.sale_price salePrice,p.image_url image,p.tone
    FROM product_recommendations r JOIN products p ON p.id=r.related_product_id
    WHERE r.product_id=? AND p.active=1 ORDER BY r.position`, p.id);
  const related = relatedRows.map((r) => {
    const product = list.find((x) => x.id === r.id);
    return product ? { ...r, price: product.salePrice || product.price, variants: product.variants.filter((v) => v.variantActive).map((v) => ({ sku: v.sku, color: v.color, size: v.size, available: v.available, price: product.salePrice || v.priceOverride || product.price, image: v.image })) } : null;
  }).filter(Boolean) as any[];
  const u = await userPromise;
  const me = u ? get<any>('SELECT height_cm h, weight_kg w FROM users WHERE id=?', u.id) : null;
  const advice = me ? adviseSize(me.h, me.w) : '';
  const outfit = outfitFor(p, list);
  const showGuide = p.category !== 'Phụ kiện';
  return (
    <div className="wrap" style={{ paddingTop: 40, display: 'flex', flexDirection: 'column', gap: 56 }}>
      <nav aria-label="Đường dẫn" className="note"><Link href="/">Trang chủ</Link> / <Link href="/san-pham">Sản phẩm</Link> / <Link href={`/san-pham?cat=${p.category}`}>{p.category}</Link></nav>
      <div className="two" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))' }}>
        <div style={{ maxWidth: 560 }}><ProductImage p={p} label={p.name} /></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div><span className="eb">{p.category}</span><h1 className="disp" style={{ fontSize: 'clamp(34px,4vw,52px)', lineHeight: 1.05 }}>{p.name}</h1></div>
          <div className="price" style={{ fontSize: 22 }}>{p.salePrice ? <><b style={{ color: '#A3162F' }}>{fmt(p.salePrice)}</b><s>{fmt(p.price)}</s></> : <b>{fmt(p.price)}</b>}</div>
          <p style={{ color: '#3F383D' }}>{p.description}</p>
          <ProductBuy p={{ id: p.id, slug: p.slug, name: p.name, price: p.salePrice || p.price, tone: p.tone }} variants={p.variants.filter((v) => v.variantActive).map((v) => ({ sku: v.sku, color: v.color, size: v.size, available: v.available, price: p.salePrice || v.priceOverride || p.price, image: v.image }))} advice={showGuide ? advice : ''} />
          {p.collection && <p className="note">Bộ sưu tập: {p.collection}</p>}
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8, fontSize: 14, borderTop: '1px solid var(--ink)', paddingTop: 16 }}>
            <dt style={{ fontWeight: 600 }}>Chất liệu</dt><dd style={{ margin: 0 }}>{p.material || 'Đang cập nhật'}</dd>
            <dt style={{ fontWeight: 600 }}>Đổi trả</dt><dd style={{ margin: 0 }}>Đổi size trong 7 ngày nếu còn nguyên tem mác</dd>
          </dl>
        </div>
      </div>
      {related.length > 0 && <OutfitBundle products={[{ id: p.id, slug: p.slug, name: p.name, category: p.category, price: p.salePrice || p.price, image: p.image, tone: p.tone, variants: p.variants.filter((v) => v.variantActive).map((v) => ({ sku: v.sku, color: v.color, size: v.size, available: v.available, price: p.salePrice || v.priceOverride || p.price })) }, ...related]} />}
      {showGuide && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h2 className="disp" style={{ fontSize: 36 }}>Hướng dẫn chọn size</h2>
          <SizeAdvisor />
          <div className="scroll"><table className="tb" style={{ minWidth: 560 }}>
            <thead><tr><th>Size</th><th>Chiều cao (cm)</th><th>Cân nặng (kg)</th><th>Ngực (cm)</th><th>Eo (cm)</th><th>Mông (cm)</th></tr></thead>
            <tbody>{SIZE_GUIDE.map((r) => <tr key={r.size}><td><b>{r.size}</b></td><td>{r.height}</td><td>{r.weight}</td><td>{r.bust}</td><td>{r.waist}</td><td>{r.hip}</td></tr>)}</tbody></table></div>
        </section>
      )}
      {outfit.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h2 className="disp" style={{ fontSize: 36 }}>Gợi ý phối đồ</h2>
          <div className="pgrid">{outfit.map((o) => <ProductCard key={o.id} p={o} />)}</div>
        </section>
      )}
    </div>
  );
}
