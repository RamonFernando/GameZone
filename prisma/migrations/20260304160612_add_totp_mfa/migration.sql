-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "pushAuthEnabled" BOOLEAN NOT NULL DEFAULT false,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "totpSecret" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("addressLine1", "avatarUrl", "city", "country", "createdAt", "email", "id", "isVerified", "name", "passwordHash", "phone", "postalCode", "province", "pushAuthEnabled", "role", "twoFactorChannel", "twoFactorCodeExpiresAt", "twoFactorCodeHash", "twoFactorEnabled", "updatedAt", "verificationTokenExpiresAt", "verificationTokenHash") SELECT "addressLine1", "avatarUrl", "city", "country", "createdAt", "email", "id", "isVerified", "name", "passwordHash", "phone", "postalCode", "province", "pushAuthEnabled", "role", "twoFactorChannel", "twoFactorCodeExpiresAt", "twoFactorCodeHash", "twoFactorEnabled", "updatedAt", "verificationTokenExpiresAt", "verificationTokenHash" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_verificationTokenHash_key" ON "User"("verificationTokenHash");
CREATE UNIQUE INDEX "User_twoFactorCodeHash_key" ON "User"("twoFactorCodeHash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
