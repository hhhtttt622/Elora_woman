import Link from 'next/link';
import { allProducts } from '@/lib/shop';
import { getUser } from '@/lib/auth';
import { ProductCard } from '@/components/Shop';
import ConsultForm from '@/components/ConsultForm';
import { fmt } from '@/lib/util';

export const dynamic = 'force-dynamic';

const TIPS = [
  { t: 'Ba bộ trang phục cho tuần họp dày', d: 'Một blazer be, một chân váy bút chì và hai áo lụa có thể ghép thành năm ngày khác nhau.' },
  { t: 'Chọn màu theo ánh sáng văn phòng', d: 'Đèn trắng làm da xỉn đi. Tông hồng phấn và be giúp gương mặt tươi hơn.' },
  { t: 'Phụ kiện nhỏ, hiệu quả lớn', d: 'Hoa tai ngọc trai và khăn lụa đổi hẳn tinh thần của một bộ đồ quen thuộc.' },
];

const OUTFIT_CONFIGS = [
  { name: 'Họp giao ban', items: ['BLS', 'SKT', 'BAG'] },
  { name: 'Gặp khách hàng', items: ['BLZ', 'PNT', 'ERG'] },
  { name: 'Tiệc cuối năm', items: ['DRS', 'SCF', 'ERG'] },
] as const;

export default async function Home() {
  const u = await getUser();
  const list = allProducts();

  const news: typeof list = [];
  const featured: typeof list = [];
  const sale: typeof list = [];
  for (const p of list) {
    if (p.isNew && news.length < 4) news.push(p);
    if (p.featured && featured.length < 4) featured.push(p);
    if (p.salePrice && sale.length < 3) sale.push(p);
  }

  const productByCode = new Map(list.map((p) => [p.code, p]));
  const outfits = OUTFIT_CONFIGS.map((o) => ({
    ...o,
    products: o.items.map((code) => productByCode.get(code)).filter(Boolean) as typeof list,
  }));
  return (
    <>
      <section style={{ background: '#E3E4DE' }}>
        <div className="wrap" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 32, alignItems: 'center', padding: '56px clamp(16px,4vw,64px)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <span className="eb">Thu Đông 2026</span>
            <h1 className="disp" style={{ fontSize: 'clamp(44px,6vw,84px)', lineHeight: 1 }}>Thanh lịch,<br />tự tin mỗi ngày làm việc</h1>
            <p style={{ maxWidth: 480, color: '#3F383D' }}>Trang phục công sở cho phụ nữ hiện đại, kèm stylist phối đồ riêng theo công việc và dáng người của bạn.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><Link href="/san-pham" className="btn">Mua sắm ngay</Link><Link href="/tu-van" className="ghost" style={{ minHeight: 48 }}>Nhận tư vấn phối đồ</Link></div>
          </div>
          <div style={{ aspectRatio: '4/5', background: 'linear-gradient(160deg,#EBC5CB,#E8DCCB 60%,#F6EEEF)', display: 'flex', alignItems: 'flex-end', padding: 20 }}><span style={{ background: 'rgba(255,255,255,.9)', padding: '6px 10px', fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 600 }}>Ảnh chiến dịch (chỗ trống)</span></div>
        </div>
      </section>

      <Section id="moi" eyebrow="Bộ sưu tập mới" title="Mới về tuần này" href="/san-pham"><div className="pgrid">{news.map((p) => <ProductCard key={p.id} p={p} />)}</div></Section>
      <Section eyebrow="Sản phẩm nổi bật" title="Được chọn nhiều nhất" href="/san-pham"><div className="pgrid">{featured.map((p) => <ProductCard key={p.id} p={p} />)}</div></Section>

      <Section id="outfit" eyebrow="Outfit nổi bật" title="Phối sẵn theo dịp">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 24 }}>
          {outfits.map((o) => (
            <div key={o.name} className="card" style={{ background: '#F6EEEF' }}>
              <h3 className="disp" style={{ fontSize: 28 }}>{o.name}</h3>
              <ul className="list">{o.products.map((p) => <li key={p.id}><Link href={`/san-pham/${p.slug}`}>{p.name}</Link><span>{fmt(p.salePrice || p.price)}</span></li>)}</ul>
              <span className="note">Tổng {fmt(o.products.reduce((n, p) => n + (p.salePrice || p.price), 0))}</span>
            </div>))}
        </div>
      </Section>

      <section style={{ background: 'var(--wine)', color: '#fff', marginTop: 72 }}>
        <div className="wrap" style={{ padding: '56px clamp(16px,4vw,64px)', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <span className="eb" style={{ color: '#F3DCE1' }}>Chương trình khuyến mãi</span>
          <h2 className="disp" style={{ fontSize: 'clamp(32px,4vw,52px)' }}>Giảm đến 20% cho set công sở cuối năm</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
            {sale.map((p) => <Link key={p.id} href={`/san-pham/${p.slug}`} style={{ background: '#fff', color: 'var(--ink)', padding: 18, display: 'flex', flexDirection: 'column', gap: 6 }}><b>{p.name}</b><span className="price"><b style={{ color: '#A3162F' }}>{fmt(p.salePrice!)}</b><s>{fmt(p.price)}</s></span></Link>)}
          </div>
          <Link href="/san-pham?sale=1" className="btn" style={{ background: '#fff', color: 'var(--wine)', alignSelf: 'flex-start' }}>Xem sản phẩm khuyến mãi</Link>
        </div>
      </section>

      <Section eyebrow="Góc tư vấn" title="Gợi ý từ stylist">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 24 }}>
          {TIPS.map((t) => <article key={t.t} className="card"><h3 className="disp" style={{ fontSize: 26, lineHeight: 1.1 }}>{t.t}</h3><p className="note">{t.d}</p></article>)}
        </div>
      </Section>

      <Section eyebrow="Tư vấn phối đồ cá nhân" title="Nhận set đồ từ stylist">
        <div className="two"><p style={{ color: '#3F383D', maxWidth: 440 }}>Cho chúng tôi biết công việc, dịp mặc và số đo. Stylist sẽ chọn set từ hàng đang có sẵn đúng size của bạn và giữ hàng cho bạn trong 24 đến 48 giờ.</p><ConsultForm loggedIn={!!u} /></div>
      </Section>
    </>
  );
}

function Section({ id, eyebrow, title, href, children }: { id?: string; eyebrow: string; title: string; href?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="wrap" style={{ paddingTop: 72, display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span className="eb">{eyebrow}</span><h2 className="disp" style={{ fontSize: 'clamp(32px,4vw,48px)', lineHeight: 1 }}>{title}</h2></div>
        {href && <Link href={href} style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', borderBottom: '1px solid var(--ink)', padding: '8px 0' }}>Xem tất cả</Link>}
      </div>
      {children}
    </section>
  );
}
