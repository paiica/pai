"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/auth-context";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export type CartItem = {
  id: string;
  type: "course" | "certification";
  slug: string;
  title: string;
  price: number;
  level?: string;
};

type AddableItem = {
  id: string;
  type: "course" | "certification";
  slug: string;
  title: string;
  price: number;
  level?: string;
};

type CartContextType = {
  items: CartItem[];
  count: number;
  addItem: (item: AddableItem) => Promise<boolean>;
  hasItem: (id: string) => boolean;
};

const CartContext = createContext<CartContextType>({
  items: [], count: 0, addItem: async () => false, hasItem: () => false,
});

function toLocalItem(i: any): CartItem {
  return {
    id: i.type === "course" ? i.course_id : i.certification_id,
    type: i.type,
    slug: i.slug,
    title: i.title,
    price: i.price,
    level: i.level,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  // Cart is persisted server-side against the logged-in account (not
  // localStorage) so it's shared between this app and the student portal,
  // which run on separate origins. Signing out clears the local view —
  // signing back in re-fetches whatever's actually in the account's cart.
  const { accessToken } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);

  const fetchCart = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${API}/cart`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      const data = json?.data ?? json;
      setItems(Array.isArray(data) ? data.map(toLocalItem) : []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (accessToken) fetchCart(accessToken);
    else setItems([]);
  }, [accessToken, fetchCart]);

  // Returns whether the item actually made it into the account's real
  // (server-side) cart — callers that redirect to the student portal right
  // after adding (EnrollButton, CertCTAButton) must await this first. Firing
  // the POST and immediately navigating away used to abort the in-flight
  // request before it reached the backend, so the marketing site showed
  // "In Cart" while the student portal's cart (a fresh page load on a
  // different origin) came back genuinely empty.
  const addItem = useCallback(async (item: AddableItem): Promise<boolean> => {
    if (!accessToken) return false;
    setItems((prev) => (prev.some((i) => i.id === item.id) ? prev : [...prev, item])); // optimistic
    try {
      const res = await fetch(`${API}/cart/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(
          item.type === "course"
            ? { type: "course", course_id: item.id }
            : { type: "certification", certification_id: item.id },
        ),
      });
      if (!res.ok) throw new Error(`Add to cart failed (${res.status})`);
      const json = await res.json();
      const data = json?.data ?? json;
      if (Array.isArray(data)) setItems(data.map(toLocalItem));
      return true;
    } catch {
      // The optimistic add above never actually made it to the account's
      // real cart — roll it back rather than leaving the UI showing
      // "In Cart" for something the student portal won't have.
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      return false;
    }
  }, [accessToken]);

  const hasItem = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  return (
    <CartContext.Provider value={{ items, count: items.length, addItem, hasItem }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
