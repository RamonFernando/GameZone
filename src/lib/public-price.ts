import { formatMoneyWithGeo } from "@/lib/geo-format";

export function formatPublicPrice(value: number, lang: "es" | "en" = "es") {
  if (Number.isFinite(value) && Math.abs(value) < 0.005) {
    return lang === "en" ? "Free" : "Gratis";
  }

  return formatMoneyWithGeo(value);
}
