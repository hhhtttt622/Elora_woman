'use client';
import ErrorState from '@/components/ui/ErrorState';
export default function ShopError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { return <div className="wrap" style={{ paddingTop: 56 }}><ErrorState error={error} reset={reset} /></div>; }
