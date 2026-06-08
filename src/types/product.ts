export type ProductPreview = {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  backgroundImage?: string | null;
  platform: string;
  region: string;
  storeLabel: string;
  cardSubtitle: string;
  priceOriginal: number;
  discountPercent: number;
  cashbackPercent: number;
  likesCount: number;
  likedByCurrentUser?: boolean;
  priceFinal: number;
  stock: number;
};

export type HomeHeroSection = {
  id: "featured-offers" | "best-sellers" | "top-discounts";
  title: string;
  titleEn: string;
  products: ProductPreview[];
};
