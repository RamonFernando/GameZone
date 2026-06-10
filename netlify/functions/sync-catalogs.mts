import type { Config } from "@netlify/functions";

// Netlify URL is injected automatically in production; override locally if needed.
const BASE_URL = process.env.URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

export default async function handler() {
  if (!BASE_URL) {
    console.error("[sync-catalogs] Missing URL env var — skipping run");
    return;
  }

  const secret = process.env.CRON_SECRET ?? "";
  const res = await fetch(`${BASE_URL}/api/cron/sync-catalogs`, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  console.log(`[sync-catalogs] status: ${res.status}`);
}

export const config: Config = {
  schedule: "0 5 * * *",
};
