const STORAGE_KEY = "gz_recently_viewed";
const MAX_ITEMS = 6;

export type RecentItem = {
  slug: string;
  name: string;
  coverImage: string;
  priceFinal: number;
  discountPercent: number;
};

export function useRecentlyViewed() {
  function push(item: RecentItem) {
    if (typeof window === "undefined") return;
    try {
      const stored = JSON.parse(
        localStorage.getItem(STORAGE_KEY) ?? "[]"
      ) as RecentItem[];
      const filtered = stored.filter((i) => i.slug !== item.slug);
      const next = [item, ...filtered].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage no disponible (SSR o privado)
    }
  }

  function getAll(): RecentItem[] {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(
        localStorage.getItem(STORAGE_KEY) ?? "[]"
      ) as RecentItem[];
    } catch {
      return [];
    }
  }

  return { push, getAll };
}
