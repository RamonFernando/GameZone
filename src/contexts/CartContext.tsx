"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ProductPreview } from "@/types/product";

export type CartItem = {
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
const BROADCAST_CHANNEL_NAME = "gamezone-cart";

type CartScopePayload = {
  authenticated?: boolean;
  cartStorageKey?: string;
};

type PersistedCartPayload = {
  items?: CartItem[];
};

type CartBroadcastMessage = {
  type: "cart-update";
  storageKey: string;
  items: CartItem[];
};

function computeSlug(game: ProductPreview): string {
  return game.slug;
}

function loadInitialCart(storageKey: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.slug === "string" && typeof item.quantity === "number")
      .map((item) => ({ ...item, quantity: item.quantity > 0 ? item.quantity : 1 }));
  } catch {
    return [];
  }
}

function mergeCartItems(...groups: CartItem[][]) {
  const merged = new Map<string, CartItem>();
  for (const group of groups) {
    for (const item of group) {
      if (!item?.slug || !item.game) continue;
      const existing = merged.get(item.slug);
      if (!existing) {
        merged.set(item.slug, { ...item, quantity: Math.max(1, Math.floor(item.quantity)) });
        continue;
      }
      merged.set(item.slug, {
        ...existing,
        quantity: Math.max(1, existing.quantity + Math.floor(item.quantity)),
      });
    }
  }
  return Array.from(merged.values());
}

function cartItemsHaveSameQuantities(left: CartItem[], right: CartItem[]) {
  if (left.length !== right.length) return false;
  const rightQuantityBySlug = new Map(right.map((item) => [item.slug, item.quantity]));
  return left.every((item) => rightQuantityBySlug.get(item.slug) === item.quantity);
}

async function loadPersistedCart() {
  const response = await fetch("/api/cart", { cache: "no-store" });
  if (!response.ok) return [];
  const payload = (await response.json()) as PersistedCartPayload;
  return Array.isArray(payload.items) ? payload.items : [];
}

async function savePersistedCart(items: CartItem[]) {
  await fetch("/api/cart", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: items.map((item) => ({ slug: item.slug, quantity: item.quantity })),
    }),
  });
}

async function clearPersistedCart() {
  await fetch("/api/cart", { method: "DELETE", cache: "no-store" });
}

type ProviderProps = {
  children: ReactNode;
};

export function CartProvider({ children }: ProviderProps) {
  const pathname = usePathname();
  const [items, setItems] = useState<CartItem[]>([]);
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [isAuthenticatedCart, setIsAuthenticatedCart] = useState(false);
  const storageKeyRef = useRef<string | null>(null);
  const itemsRef = useRef<CartItem[]>([]);
  const clearRequestedRef = useRef(false);
  const persistedCartWriteRef = useRef<Promise<void>>(Promise.resolve());
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  // true when the items update came from a broadcast (prevents re-broadcasting)
  const skipBroadcastRef = useRef(false);

  const queuePersistedCartWrite = useCallback((operation: () => Promise<void>) => {
    const nextWrite = persistedCartWriteRef.current
      .catch(() => undefined)
      .then(operation)
      .catch(() => undefined);
    persistedCartWriteRef.current = nextWrite;
    return nextWrite;
  }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Initialize BroadcastChannel once on mount for real-time cross-tab sync.
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;

    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    broadcastChannelRef.current = channel;

    channel.onmessage = (event: MessageEvent<CartBroadcastMessage>) => {
      if (event.data?.type !== "cart-update" || !Array.isArray(event.data.items)) return;
      // Only apply if same cart scope (same user / same anonymous session)
      if (event.data.storageKey !== storageKeyRef.current) return;
      skipBroadcastRef.current = true;
      setItems(event.data.items);
    };

    return () => {
      channel.close();
      broadcastChannelRef.current = null;
    };
  }, []);

  // Hydrate from the cart scope assigned by the server for this browser/session.
  // Depends on pathname to detect auth state changes (login/logout) during SPA navigation.
  useEffect(() => {
    let cancelled = false;

    const loadScopedCart = async () => {
      let nextStorageKey = FALLBACK_STORAGE_KEY;
      let nextIsAuthenticatedCart = false;

      try {
        const response = await fetch("/api/cart/scope", { cache: "no-store" });
        const payload = (await response.json()) as CartScopePayload;
        if (response.ok && payload.cartStorageKey) {
          nextStorageKey = payload.cartStorageKey;
          nextIsAuthenticatedCart = Boolean(payload.authenticated);
        }
      } catch {
        // Fallback keeps the cart usable if the API is unavailable.
      }

      if (cancelled) return;

      const previousStorageKey = storageKeyRef.current;

      if (previousStorageKey !== nextStorageKey) {
        if (clearRequestedRef.current) {
          try {
            window.localStorage.removeItem(nextStorageKey);
          } catch {}
          if (nextIsAuthenticatedCart) await queuePersistedCartWrite(clearPersistedCart);
          clearRequestedRef.current = false;
          storageKeyRef.current = nextStorageKey;
          setStorageKey(nextStorageKey);
          setIsAuthenticatedCart(nextIsAuthenticatedCart);
          setItems([]);
          return;
        }

        const scopedItems = loadInitialCart(nextStorageKey);
        let nextItems =
          previousStorageKey === null && itemsRef.current.length > 0 && scopedItems.length === 0
            ? itemsRef.current
            : scopedItems;

        if (nextIsAuthenticatedCart) {
          const persistedItems = await loadPersistedCart();
          const shouldMergeCurrentCart =
            previousStorageKey !== null && previousStorageKey !== nextStorageKey;
          nextItems = mergeCartItems(persistedItems, shouldMergeCurrentCart ? itemsRef.current : []);

          if (!cartItemsHaveSameQuantities(nextItems, persistedItems)) {
            await queuePersistedCartWrite(() => savePersistedCart(nextItems));
          }

          if (shouldMergeCurrentCart && previousStorageKey) {
            try {
              window.localStorage.removeItem(previousStorageKey);
            } catch {}
          }
        }

        storageKeyRef.current = nextStorageKey;
        setStorageKey(nextStorageKey);
        setIsAuthenticatedCart(nextIsAuthenticatedCart);
        setItems(nextItems);
      } else {
        setIsAuthenticatedCart(nextIsAuthenticatedCart);
      }

      try {
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {}
    };

    void loadScopedCart();
    return () => {
      cancelled = true;
    };
  }, [pathname, queuePersistedCartWrite]);

  // Sync items to localStorage and broadcast state to other open tabs.
  useEffect(() => {
    if (typeof window === "undefined" || !storageKey) return;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {}

    if (!skipBroadcastRef.current && broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: "cart-update",
        storageKey,
        items,
      } satisfies CartBroadcastMessage);
    }
    skipBroadcastRef.current = false;
  }, [items, storageKey]);

  const totalItems = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items]
  );

  const addToCart = useCallback(
    (game: ProductPreview) => {
      const slug = computeSlug(game);
      setItems((prev) => {
        const existing = prev.find((item) => item.slug === slug);
        if (!existing) return [...prev, { slug, game, quantity: 1 }];
        return prev.map((item) =>
          item.slug === slug ? { ...item, quantity: item.quantity + 1 } : item
        );
      });
      if (isAuthenticatedCart) {
        void queuePersistedCartWrite(() =>
          fetch("/api/cart/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug }),
          }).then(() => undefined)
        );
      }
    },
    [isAuthenticatedCart, queuePersistedCartWrite]
  );

  const decreaseFromCart = useCallback(
    (slug: string) => {
      setItems((prev) =>
        prev
          .map((item) => (item.slug === slug ? { ...item, quantity: item.quantity - 1 } : item))
          .filter((item) => item.quantity > 0)
      );
      if (isAuthenticatedCart) {
        void queuePersistedCartWrite(() =>
          fetch(`/api/cart/items/${encodeURIComponent(slug)}`, { method: "PATCH" }).then(
            () => undefined
          )
        );
      }
    },
    [isAuthenticatedCart, queuePersistedCartWrite]
  );

  const removeFromCart = useCallback(
    (slug: string) => {
      setItems((prev) => prev.filter((item) => item.slug !== slug));
      if (isAuthenticatedCart) {
        void queuePersistedCartWrite(() =>
          fetch(`/api/cart/items/${encodeURIComponent(slug)}`, { method: "DELETE" }).then(
            () => undefined
          )
        );
      }
    },
    [isAuthenticatedCart, queuePersistedCartWrite]
  );

  const clearCart = useCallback(() => {
    const currentStorageKey = storageKeyRef.current;
    clearRequestedRef.current = currentStorageKey === null;

    if (typeof window !== "undefined" && currentStorageKey) {
      try {
        window.localStorage.removeItem(currentStorageKey);
      } catch {}
    }

    itemsRef.current = [];
    setItems([]);

    if (isAuthenticatedCart) {
      void queuePersistedCartWrite(clearPersistedCart);
    }
  }, [isAuthenticatedCart, queuePersistedCartWrite]);

  // Re-sync from DB when the user returns to this tab/window (cross-device sync).
  useEffect(() => {
    if (!isAuthenticatedCart) return;

    const syncFromServer = async () => {
      try {
        const freshItems = await loadPersistedCart();
        if (!cartItemsHaveSameQuantities(freshItems, itemsRef.current)) {
          setItems(freshItems);
        }
      } catch {
        // Ignore — cart stays as-is if the request fails.
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void syncFromServer();
    };

    window.addEventListener("focus", syncFromServer);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", syncFromServer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isAuthenticatedCart]);

  useEffect(() => {
    const handleExternalCartClear = () => {
      clearCart();
    };
    window.addEventListener("gamezone:cart-cleared", handleExternalCartClear);
    return () => {
      window.removeEventListener("gamezone:cart-cleared", handleExternalCartClear);
    };
  }, [clearCart]);

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
