"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
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

const LEGACY_STORAGE_KEY = "next-gaming-cart-v1";
const FALLBACK_STORAGE_KEY = "next-gaming-cart-v1:anonymous";

function computeSlug(game: ProductPreview): string {
  return game.slug;
}

function loadInitialCart(storageKey: string): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
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
  const pathname = usePathname();
  const [items, setItems] = useState<CartItem[]>([]);
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const storageKeyRef = useRef<string | null>(null);
  const itemsRef = useRef<CartItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Hydrate from the cart scope assigned by the server for this browser/session.
  useEffect(() => {
    let cancelled = false;

    const loadScopedCart = async () => {
      let nextStorageKey = FALLBACK_STORAGE_KEY;

      try {
        const response = await fetch("/api/cart/scope", { cache: "no-store" });
        const payload = (await response.json()) as { cartStorageKey?: string };

        if (response.ok && payload.cartStorageKey) {
          nextStorageKey = payload.cartStorageKey;
        }
      } catch {
        // Fallback keeps the cart usable in memory/localStorage if the API is unavailable.
      }

      if (cancelled) {
        return;
      }

      const previousStorageKey = storageKeyRef.current;

      if (previousStorageKey !== nextStorageKey) {
        const scopedItems = loadInitialCart(nextStorageKey);
        const nextItems =
          previousStorageKey === null && itemsRef.current.length > 0 && scopedItems.length === 0
            ? itemsRef.current
            : scopedItems;

        storageKeyRef.current = nextStorageKey;
        setStorageKey(nextStorageKey);
        setItems(nextItems);
      }

      try {
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        // Ignore storage cleanup failures.
      }
    };

    void loadScopedCart();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Keep localStorage in sync with state.
  useEffect(() => {
    if (typeof window === "undefined" || !storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // Fail silently: carrito sigue funcionando en memoria.
    }
  }, [items, storageKey]);

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
