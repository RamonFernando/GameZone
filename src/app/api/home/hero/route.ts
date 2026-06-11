import { NextResponse } from "next/server";
import { getCachedHeroSections } from "@/lib/home-data";

// La lógica de secciones vive en src/lib/home-data.ts (compartida con la home
// server component) y se sirve cacheada con tag "products" + revalidate 5 min.
export async function GET() {
  const sections = await getCachedHeroSections();
  return NextResponse.json({ sections }, { status: 200 });
}
