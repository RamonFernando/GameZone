export type ProductDraft = {
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  platform: string;
  region: string;
  storeLabel: string;
  cardSubtitle: string;
  priceOriginal: string;
  discountPercent: string;
  cashbackPercent: string;
  likesCount: string;
  stock: string;
  isActive: boolean;
  saleEndsAt: string;
};

export type ToastItem = {
  id: string;
  type: "success" | "error";
  text: string;
};

export type KeyRow = {
  id: string;
  keyCode: string;
  platform: string;
  assignedOrderId: string | null;
  assignedItemId: string | null;
  assignedAt: string | null;
  createdAt: string;
};

export type KeysData = {
  keys: KeyRow[];
  available: number;
};
