import type { Metadata } from 'next';
import './styles/tokens.css';
import './styles/base.css';
import './styles/shop.css';
import './styles/admin.css';
import './styles/ui.css';
import { CartProvider } from '@/lib/cart';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/ui/Confirm';
import NavProgress from '@/components/ui/NavProgress';
import { Suspense } from 'react';

export const metadata: Metadata = { title: 'ELORA WOMAN - Thời trang công sở và tư vấn phối đồ', description: 'Thời trang công sở cho phụ nữ hiện đại, kèm dịch vụ tư vấn phối đồ cá nhân hóa.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&display=swap" rel="stylesheet" />
      </head>
      <body><Suspense fallback={null}><NavProgress /></Suspense><ToastProvider><ConfirmProvider><CartProvider>{children}</CartProvider></ConfirmProvider></ToastProvider></body>
    </html>
  );
}
