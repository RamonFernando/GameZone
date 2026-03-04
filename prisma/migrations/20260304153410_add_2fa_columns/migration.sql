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
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationTokenHash" TEXT,
    "verificationTokenExpiresAt" DATETIME,
    "avatarUrl" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "province" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorChannel" TEXT,
    "twoFactorCodeHash" TEXT,
    "twoFactorCodeExpiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("addressLine1", "avatarUrl", "city", "country", "createdAt", "email", "id", "isVerified", "name", "passwordHash", "phone", "postalCode", "province", "role", "updatedAt", "verificationTokenExpiresAt", "verificationTokenHash") SELECT "addressLine1", "avatarUrl", "city", "country", "createdAt", "email", "id", "isVerified", "name", "passwordHash", "phone", "postalCode", "province", "role", "updatedAt", "verificationTokenExpiresAt", "verificationTokenHash" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_verificationTokenHash_key" ON "User"("verificationTokenHash");
CREATE UNIQUE INDEX "User_twoFactorCodeHash_key" ON "User"("twoFactorCodeHash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
