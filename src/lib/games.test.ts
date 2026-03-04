import { describe, expect, it } from "vitest";
import { games, getGameBySlug, slugify, validateGamesCatalog, type Game } from "@/lib/games";

describe("games helpers", () => {
  it("slugify normaliza acentos y símbolos", () => {
    expect(slugify("Uncharted - Colección Legado de los Ladrones")).toBe(
      "uncharted-coleccion-legado-de-los-ladrones"
    );
  });

  it("getGameBySlug devuelve juego existente", () => {
    const slug = games[0]?.slug ?? "";
    expect(getGameBySlug(slug)?.slug).toBe(slug);
  });

  it("validateGamesCatalog lanza error con slug duplicado", () => {
    const catalog: Game[] = [
      { title: "A", coverImage: "/a.jpg", slug: "duplicado", price: 10 },
      { title: "B", coverImage: "/b.jpg", slug: "duplicado", price: 20 },
    ];
    expect(() => validateGamesCatalog(catalog)).toThrow(/Slug de juego inválido o duplicado/);
  });
});
