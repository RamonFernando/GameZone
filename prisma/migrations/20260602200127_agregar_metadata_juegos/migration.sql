-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverImage" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'PC',
    "region" TEXT NOT NULL DEFAULT 'EUROPA',
    "storeLabel" TEXT NOT NULL DEFAULT 'Steam',
    "cardSubtitle" TEXT NOT NULL DEFAULT 'Código digital oficial',
    "longDescription" TEXT,
    "rawgId" INTEGER,
    "rawgSlug" TEXT,
    "releaseDate" DATETIME,
    "developer" TEXT,
    "publisher" TEXT,
    "genresJson" TEXT NOT NULL DEFAULT '[]',
    "platformsJson" TEXT NOT NULL DEFAULT '[]',
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "storesJson" TEXT NOT NULL DEFAULT '[]',
    "screenshotsJson" TEXT NOT NULL DEFAULT '[]',
    "backgroundImage" TEXT,
    "website" TEXT,
    "esrbRating" TEXT,
    "metacritic" INTEGER,
    "rating" REAL,
    "ratingsCount" INTEGER NOT NULL DEFAULT 0,
    "playtimeHours" INTEGER,
    "requirements" TEXT,
    "metadataSource" TEXT,
    "metadataUpdatedAt" DATETIME,
    "priceOriginal" REAL NOT NULL,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "cashbackPercent" INTEGER NOT NULL DEFAULT 0,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("cardSubtitle", "cashbackPercent", "coverImage", "createdAt", "description", "discountPercent", "id", "isActive", "likesCount", "name", "platform", "priceOriginal", "region", "slug", "stock", "storeLabel", "updatedAt") SELECT "cardSubtitle", "cashbackPercent", "coverImage", "createdAt", "description", "discountPercent", "id", "isActive", "likesCount", "name", "platform", "priceOriginal", "region", "slug", "stock", "storeLabel", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE INDEX "Product_isActive_createdAt_idx" ON "Product"("isActive", "createdAt");
CREATE INDEX "Product_rawgId_idx" ON "Product"("rawgId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
