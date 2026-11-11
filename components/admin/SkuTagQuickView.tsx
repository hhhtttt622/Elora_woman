'use client';

import { useRef } from 'react';
import Barcode from '@/components/admin/Barcode';
import { sizeText } from '@/lib/util';

export default function SkuTagQuickView({ productName, color, size, sku, shelf }: {
  productName: string;
  color: string;
  size: string;
  sku: string;
  shelf: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return <>
    <button className="stock-config-link" type="button" onClick={() => dialogRef.current?.showModal()} aria-label={`Xem tem ${sku}`}>
      <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none"><path d="M4 2.8h8l4 4V17H4V2.8Z" stroke="currentColor" strokeWidth="1.4"/><path d="M12 3v4h4M7 11h6M7 14h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
      <span>Xem tem</span>
    </button>
    <dialog ref={dialogRef} className="stock-tag-dialog" aria-label={`Tem SKU ${sku}`} onClick={(event) => {
      if (event.target === event.currentTarget) dialogRef.current?.close();
    }}>
      <div className="stock-tag-modal-head">
        <h2 className="h2">Xem tem sản phẩm</h2>
        <button className="stock-tag-close" type="button" onClick={() => dialogRef.current?.close()} aria-label="Đóng">
          <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18" fill="none"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
        </button>
      </div>
      <div className="stock-tag-preview">
        <span className="logo" style={{ fontSize: 22 }}>ELORA <i>woman</i></span>
        <b>{productName}</b>
        <span>{color} · size {sizeText(size)}</span>
        <Barcode text={sku} />
        <b>{sku}</b>
        <span className="note">Vị trí kệ: {shelf}</span>
      </div>
      <div className="stock-tag-modal-actions">
        <button className="btn" type="button" onClick={() => window.print()}>
          <svg aria-hidden="true" viewBox="0 0 20 20" width="17" height="17" fill="none"><path d="M6 7V3h8v4M6 14H4a1 1 0 0 1-1-1V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4a1 1 0 0 1-1 1h-2M6 11h8v6H6v-6Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M14.5 9.5h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          In tem
        </button>
        <button className="ghost" type="button" onClick={() => dialogRef.current?.close()}>Đóng</button>
      </div>
    </dialog>
  </>;
}
