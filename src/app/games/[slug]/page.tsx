import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Product } from "@prisma/client";
import {
  getActiveProductBySlug,
  listActiveProducts,
  computeDiscountedPrice,
  resolveStoreLabel,
} from "@/lib/products";
import GameDetailClient, { type ProductView } from "./GameDetailClient";

function parseJsonList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function createExternalStoreLink(product: { name: string; storeLabel: string }) {
  const store = product.storeLabel.trim().toLowerCase();
  const query = encodeURIComponent(product.name);
  if (store.includes("g2a")) return { label: "G2A", url: `https://www.g2a.com/search?query=${query}` };
  if (store.includes("steam")) return { label: "Steam", url: `https://store.steampowered.com/search/?term=${query}` };
  return null;
}

function buildProductView(product: Product): ProductView {
  const externalStoreLink = createExternalStoreLink(product);
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    coverImage: product.coverImage,
    platform: product.platform,
    region: product.region,
    storeLabel: resolveStoreLabel(product),
    cardSubtitle: product.cardSubtitle,
    longDescription: product.longDescription ?? null,
    releaseDate: product.releaseDate?.toISOString() ?? null,
    developer: product.developer ?? null,
    publisher: product.publisher ?? null,
    genres: parseJsonList(product.genresJson),
    platforms: parseJsonList(product.platformsJson),
    tags: parseJsonList(product.tagsJson),
    stores: parseJsonList(product.storesJson),
    screenshots: parseJsonList(product.screenshotsJson),
    backgroundImage: product.backgroundImage ?? null,
    website: product.website ?? null,
    externalStoreLabel: externalStoreLink?.label ?? null,
    externalStoreUrl: externalStoreLink?.url ?? null,
    esrbRating: product.esrbRating ?? null,
    metacritic: product.metacritic ?? null,
    rating: product.rating ?? null,
    ratingsCount: product.ratingsCount,
    playtimeHours: product.playtimeHours ?? null,
    requirements: product.requirements ?? null,
    metadataSource: product.metadataSource ?? null,
    metadataUpdatedAt: product.metadataUpdatedAt?.toISOString() ?? null,
    priceOriginal: product.priceOriginal,
    discountPercent: product.discountPercent,
    priceFinal: computeDiscountedPrice(product.priceOriginal, product.discountPercent),
    stock: product.stock,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) return { title: "Juego no encontrado — GameZone" };

  const appUrl = process.env.APP_BASE_URL ?? "https://gamezone-digital-store.netlify.app";
  const description = product.description || `Compra digital de ${product.name}.`;
  const ogImage = product.coverImage?.startsWith("http")
    ? product.coverImage
    : `${appUrl}${product.coverImage}`;

  return {
    title: `${product.name} — GameZone`,
    description,
    openGraph: {
      title: product.name,
      description,
      images: ogImage ? [{ url: ogImage, alt: product.name }] : [],
      url: `${appUrl}/games/${product.slug}`,
      type: "website",
    },
    alternates: {
      canonical: `/games/${product.slug}`,
    },
  };
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) return notFound();

  const productView = buildProductView(product);

  const allProducts = await listActiveProducts();
  const suggestions = allProducts
    .filter((p) => p.slug !== slug)
    .slice(0, 3)
    .map(buildProductView);

  // JSON-LD Product schema (8.2)
  const appUrl = process.env.APP_BASE_URL ?? "https://gamezone-digital-store.netlify.app";
  const ogImage = productView.coverImage?.startsWith("http")
    ? productView.coverImage
    : `${appUrl}${productView.coverImage}`;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productView.name,
    image: ogImage,
    description: productView.description,
    offers: {
      "@type": "Offer",
      price: productView.priceFinal.toFixed(2),
      priceCurrency: "EUR",
      availability:
        productView.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "GameZone" },
    },
  };

  if (productView.rating && productView.ratingsCount > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: productView.rating.toFixed(1),
      ratingCount: productView.ratingsCount,
    };
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GameDetailClient product={productView} suggestions={suggestions} />
    </>
  );
}
