"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type CartLine = {
  sku: string;
  productId: number;
  slug: string;
  name: string;
  color: string;
  size: string;
  price: number;
  tone: string;
  qty: number;
};
type Ctx = {
  lines: CartLine[];
  add: (l: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (sku: string, qty: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
  count: number;
  ready: boolean;
};
const C = createContext<Ctx>(null as any);
const KEY = "elora_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => { try { const r = localStorage.getItem(KEY); if (r) setLines(JSON.parse(r)); } catch {} setReady(true); }, []);
  useEffect(() => { if (ready) try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch {} }, [lines, ready]);
  const add = useCallback((l: Omit<CartLine, "qty">, qty = 1) => {
    setLines((p) => {
      const ex = p.find((x) => x.sku === l.sku);
      return ex
        ? p.map((x) =>
            x.sku === l.sku ? { ...x, qty: Math.min(10, x.qty + qty) } : x,
          )
        : [...p, { ...l, qty }];
    });
  }, []);
  const setQty = useCallback((sku: string, qty: number) => setLines((p) => qty <= 0 ? p.filter((x) => x.sku !== sku) : p.map((x) => x.sku === sku ? { ...x, qty: Math.min(10, qty) } : x)), []);
  const remove = useCallback((sku: string) => setLines((p) => p.filter((x) => x.sku !== sku)), []);
  const clear = useCallback(() => setLines([]), []);
  return (
    <C.Provider
      value={{
        lines,
        add,
        setQty,
        remove,
        clear,
        count: lines.reduce((n, l) => n + l.qty, 0),
        ready,
      }}
    >
      {children}
    </C.Provider>
  );
}
export const useCart = () => useContext(C);
