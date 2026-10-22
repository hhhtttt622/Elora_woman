import Link from 'next/link';
import { getUser } from '@/lib/auth';
import { logoutAction } from '@/app/actions/auth';
import { isInternal } from '@/lib/permissions';
import { fmt, COLOR_HEX } from '@/lib/util';
import type { ProductView } from '@/lib/shop';
import CartLink from './CartLink';

export async function ShopHeader() {
  const u = await getUser();
  return (
    <header>
      <div className="topbar">Miễn phí đổi size trong 7 ngày · Tư vấn phối đồ cá nhân hóa miễn phí · Hotline [SỐ HOTLINE]</div>
      <div className="wrap hdr">
        <Link href="/" className="logo">ELORA <i>woman</i></Link>
        <nav className="nav nav-main" aria-label="Menu chính">
          <Link href="/san-pham">Sản phẩm</Link>
          <Link href="/san-pham?cat=Phụ kiện">Phụ kiện</Link>
          <Link href="/#outfit">Outfit</Link>
          <Link href="/tu-van">Tư vấn phối đồ</Link>
          <Link href="/san-pham?sale=1">Khuyến mãi</Link>
        </nav>
        <nav className="nav" aria-label="Tài khoản">
          {u ? (<>
            {isInternal(u.role) ? <Link href="/admin">Quản trị</Link> : <Link href="/tai-khoan" title={u.name}>Tài khoản</Link>}
            <form action={logoutAction}><button className="textbtn" style={{ textTransform: 'uppercase', letterSpacing: '.1em', fontSize: 13, textDecoration: 'none', color: 'inherit' }}>Đăng xuất</button></form>
          </>) : <Link href="/dang-nhap">Đăng nhập</Link>}
          <CartLink />
        </nav>
      </div>
    </header>
  );
}

export function ShopFooter() {
  return (
    <footer className="foot">
      <div className="wrap two" style={{ gap: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="logo" style={{ color: '#fff' }}>ELORA <i style={{ color: '#E8CBD1' }}>woman</i></span>
          <p style={{ color: '#E6DEE1', fontSize: 14, maxWidth: 360 }}>Thời trang công sở và tư vấn phối đồ cá nhân hóa cho phụ nữ 25 đến 40 tuổi. [TÊN CÔNG TY] · [ĐỊA CHỈ] · [MÃ SỐ THUẾ]</p>
        </div>
        <div><Link href="/san-pham">Danh mục sản phẩm</Link><Link href="/tu-van">Tư vấn phối đồ</Link><Link href="/tai-khoan">Tài khoản của tôi</Link><Link href="/admin">Khu vực quản trị</Link></div>
      </div>
    </footer>
  );
}

export function ProductImage({ p, label }: { p: Pick<ProductView, 'tone' | 'category' | 'isNew' | 'salePrice'>; label?: string }) {
  const dark = ['#1E1B1E', '#1F2A44', '#2A262A', '#7A5A44'].includes(p.tone);
  return (
    <div className="pimg" style={{ background: `linear-gradient(160deg, ${p.tone}, ${p.tone}CC 55%, #FFFFFF22)`, color: dark ? '#fff' : '#1E1B1E' }}>
      {p.salePrice ? <span className="tag sale" style={{ background: '#A3162F', color: '#fff' }}>SALE</span> : p.isNew ? <span className="tag" style={{ background: '#1E1B1E', color: '#fff' }}>MỚI</span> : null}
      <span>{label || p.category}</span>
    </div>
  );
}

export function ProductCard({ p }: { p: ProductView }) {
  return (
    <Link href={`/san-pham/${p.slug}`} className="pcard" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ProductImage p={p} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="pname" style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</span>
        <span className="price">{p.salePrice ? <><b style={{ color: '#A3162F' }}>{fmt(p.salePrice)}</b><s>{fmt(p.price)}</s></> : <b>{fmt(p.price)}</b>}</span>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {p.colors.map((c) => <i key={c} className="sw" style={{ background: COLOR_HEX[c], width: 14, height: 14 }} title={c} />)}
          {!p.inStock && <span className="note" style={{ color: '#A3162F', fontWeight: 600 }}>Hết hàng</span>}
        </span>
      </div>
    </Link>
  );
}
