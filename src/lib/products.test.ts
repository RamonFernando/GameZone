import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      count: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import {
  clampDiscountPercent,
  clampCashbackPercent,
  computeDiscountedPrice,
  resolveStoreLabel,
} from "./products";

describe("clampDiscountPercent", () => {
  it("clampea al máximo de 90", () => {
    expect(clampDiscountPercent(100)).toBe(90);
    expect(clampDiscountPercent(91)).toBe(90);
  });

  it("clampea al mínimo de 0", () => {
    expect(clampDiscountPercent(-1)).toBe(0);
    expect(clampDiscountPercent(-100)).toBe(0);
  });

  it("trunca decimales hacia abajo", () => {
    expect(clampDiscountPercent(15.9)).toBe(15);
    expect(clampDiscountPercent(50.4)).toBe(50);
  });

  it("devuelve 0 para valores no finitos", () => {
    expect(clampDiscountPercent(NaN)).toBe(0);
    expect(clampDiscountPercent(Infinity)).toBe(0);
    expect(clampDiscountPercent(-Infinity)).toBe(0);
  });

  it("pasa valores dentro del rango sin modificar", () => {
    expect(clampDiscountPercent(0)).toBe(0);
    expect(clampDiscountPercent(50)).toBe(50);
    expect(clampDiscountPercent(90)).toBe(90);
  });
});

describe("clampCashbackPercent", () => {
  it("clampea al máximo de 50", () => {
    expect(clampCashbackPercent(51)).toBe(50);
    expect(clampCashbackPercent(100)).toBe(50);
  });

  it("clampea al mínimo de 0", () => {
    expect(clampCashbackPercent(-1)).toBe(0);
  });

  it("devuelve 0 para valores no finitos", () => {
    expect(clampCashbackPercent(NaN)).toBe(0);
    expect(clampCashbackPercent(Infinity)).toBe(0);
  });

  it("pasa valores dentro del rango sin modificar", () => {
    expect(clampCashbackPercent(0)).toBe(0);
    expect(clampCashbackPercent(5)).toBe(5);
    expect(clampCashbackPercent(50)).toBe(50);
  });
});

describe("computeDiscountedPrice", () => {
  it("aplica un 15% de descuento correctamente", () => {
    expect(computeDiscountedPrice(100, 15)).toBe(85);
  });

  it("sin descuento devuelve el precio original", () => {
    expect(computeDiscountedPrice(59.99, 0)).toBe(59.99);
  });

  it("descuento del 90% devuelve el 10% del precio", () => {
    expect(computeDiscountedPrice(100, 90)).toBe(10);
  });

  it("clampea descuentos superiores a 90", () => {
    expect(computeDiscountedPrice(100, 95)).toBe(10);
  });

  it("redondea a 2 decimales", () => {
    // 29.99 * 0.67 = 20.0933 → 20.09
    expect(computeDiscountedPrice(29.99, 33)).toBe(20.09);
  });
});

describe("resolveStoreLabel", () => {
  it("devuelve G2A para metadataSource g2a (insensible a mayúsculas)", () => {
    expect(resolveStoreLabel({ metadataSource: "g2a" })).toBe("G2A");
    expect(resolveStoreLabel({ metadataSource: "G2A" })).toBe("G2A");
  });

  it("devuelve Steam para metadataSource steam", () => {
    expect(resolveStoreLabel({ metadataSource: "steam" })).toBe("Steam");
  });

  it("devuelve RAWG para metadataSource rawg", () => {
    expect(resolveStoreLabel({ metadataSource: "rawg" })).toBe("RAWG");
  });

  it("usa storeLabel cuando no hay metadataSource reconocido", () => {
    expect(resolveStoreLabel({ storeLabel: "PSN" })).toBe("PSN");
  });

  it("devuelve GameZone como fallback final", () => {
    expect(resolveStoreLabel({})).toBe("GameZone");
    expect(resolveStoreLabel({ storeLabel: "   " })).toBe("GameZone");
  });
});
