"use client";

import Image from "next/image";
import { useLocale } from "@/hooks/useLocale";

type Props = {
  activePlatform: string | null;
  filterOffer: boolean;
  onSelectPlatform: (platform: string | null) => void;
  onToggleOffer: () => void;
};

const PLATFORMS = [
  { label: "PC", value: "PC", icon: "/iconos_platforms/icon-pc.svg" },
  { label: "PlayStation", value: "PlayStation", icon: "/iconos_platforms/icon-play.svg" },
  { label: "Xbox", value: "Xbox", icon: "/iconos_platforms/icon-xbx.svg" },
  { label: "Nintendo", value: "Nintendo", icon: "/iconos_platforms/icon-swt.svg" },
] as const;

export function PlatformBar({ activePlatform, filterOffer, onSelectPlatform, onToggleOffer }: Props) {
  const lang = useLocale();
  const allActive = !activePlatform && !filterOffer;

  return (
    <nav className="platform-bar" aria-label={lang === "en" ? "Filter by platform" : "Filtrar por plataforma"}>
      <button
        type="button"
        className={`platform-bar-item${allActive ? " platform-bar-item--active" : ""}`}
        onClick={() => onSelectPlatform(null)}
        aria-pressed={allActive}
      >
        <span className="platform-bar-icon platform-bar-icon--all">✦</span>
        <span className="platform-bar-label">{lang === "en" ? "All" : "Todos"}</span>
      </button>

      {PLATFORMS.map((p) => {
        const isActive = activePlatform === p.value;
        return (
          <button
            key={p.value}
            type="button"
            className={`platform-bar-item${isActive ? " platform-bar-item--active" : ""}`}
            onClick={() => onSelectPlatform(isActive ? null : p.value)}
            aria-pressed={isActive}
          >
            <span className="platform-bar-icon">
              <Image src={p.icon} alt="" width={28} height={28} unoptimized />
            </span>
            <span className="platform-bar-label">{p.label}</span>
          </button>
        );
      })}

      <button
        type="button"
        className={`platform-bar-item platform-bar-item--offer${filterOffer ? " platform-bar-item--active" : ""}`}
        onClick={onToggleOffer}
        aria-pressed={filterOffer}
      >
        <span className="platform-bar-icon platform-bar-icon--offer">🔥</span>
        <span className="platform-bar-label">{lang === "en" ? "Deals" : "Ofertas"}</span>
      </button>
    </nav>
  );
}
