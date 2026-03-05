"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <div className="site-shell">
      {!isHome && <Header />}
      {children}
      <Footer />
    </div>
  );
}
