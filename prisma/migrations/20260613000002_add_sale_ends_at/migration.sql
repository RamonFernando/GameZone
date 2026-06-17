-- AlterTable: añade saleEndsAt opcional a Product para la cuenta atrás de ofertas
ALTER TABLE "Product" ADD COLUMN "saleEndsAt" TIMESTAMP(3);
