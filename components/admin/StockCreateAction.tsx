'use client';
import { useState } from 'react';
import SkuForm from './SkuForm';

type Product = { id: number; name: string; code: string; category: string };
export default function StockCreateAction({ products }: { products: Product[] }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="btn stock-create-btn" type="button" onClick={() => setOpen(true)}>
      <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      Tạo SKU mới
    </button>
    <SkuForm products={products} open={open} onClose={() => setOpen(false)} />
  </>;
}
