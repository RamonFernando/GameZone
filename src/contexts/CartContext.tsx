"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { ProductPreview } from "@/types/product";

export type CartItem = {
  /** Unique id for the item in the cart */
  slug: string;
  game: ProductPreview;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  addToCart: (game: ProductPreview) => void;
  /** Decrease quantity by one; removes the item when it reaches 0 */
  decreaseFromCart: (slug: string) => void;
  /** Remove the item completely from the cart */
  removeFromCart: (slug: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = "next-gaming-cart-v1";

function computeSlug(game: ProductPreview): string {
  return game.slug;
}

function loadInitialCart(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    // Very light validation so we don't crash on malformed data.
    return parsed
      .filter((item) => item && typeof item.slug === "string" && typeof item.quantity === "number")
      .map((item) => ({
        ...item,
        quantity: item.quantity > 0 ? item.quantity : 1,
      }));
  } catch {
    return [];
  }
}

type ProviderProps = {
  children: ReactNode;
};

export function CartProvider({ children }: ProviderProps) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Hydrate from localStorage only on the client.
  useEffect(() => {
    setItems(loadInitialCart());
  }, []);

  // Keep localStorage in sync with state.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Fail silently: carrito sigue funcionando en memoria.
    }
  }, [items]);

  const totalItems = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items]
  );

  const addToCart = (game: ProductPreview) => {
    const slug = computeSlug(game);
    setItems((prev) => {
      const existing = prev.find((item) => item.slug === slug);
      if (!existing) {
        return [...prev, { slug, game, quantity: 1 }];
      }
      return prev.map((item) =>
        item.slug === slug ? { ...item, quantity: item.quantity + 1 } : item
      );
    });
  };

  const decreaseFromCart = (slug: string) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.slug === slug ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (slug: string) => {
    setItems((prev) => prev.filter((item) => item.slug !== slug));
  };

  const clearCart = () => setItems([]);

  const value: CartContextValue = {
    items,
    totalItems,
    addToCart,
    decreaseFromCart,
    removeFromCart,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
