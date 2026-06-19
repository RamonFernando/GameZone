// Genera la tarjeta OG 1200x630 renderizando el LOGO REAL del Header (mismo HTML+CSS)
// con Playwright y capturandolo. Asi sale identico al logo del sitio, no una imitacion.
const path = require("path");
const fs = require("fs");

let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("@playwright/test")); }

const root = path.join(__dirname, "..");
const outPath = path.join(root, "public", "Recursos", "og-card.png");

// Icono play del disco -> data URI (se pinta blanco via filter brightness(0) invert(1))
const iconSvg = fs.readFileSync(path.join(root, "public", "iconos_platforms", "icon-play.svg"), "utf8");
const iconUri = "data:image/svg+xml;base64," + Buffer.from(iconSvg).toString("base64");

const ZOOM = 4; // amplia el logo (re-render nitido, no transform borroso)

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  .stage {
    width:1200px; height:630px;
    background: radial-gradient(55% 55% at 38% 42%, rgba(51,65,85,0.55), transparent),
                linear-gradient(135deg, #243349 0%, #172033 50%, #0d1422 100%);
    display:flex; align-items:center; justify-content:center;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
  }
  .logoWrap { zoom:${ZOOM}; isolation:isolate; }

  .navLogo { display:flex; align-items:center; gap:0.9rem; }
  .navLogoMark { width:36px; height:36px; border-radius:999px; display:flex; align-items:center; justify-content:center; position:relative; }
  .navLogoMark::after {
    content:""; position:absolute; inset:0; border-radius:999px;
    background:linear-gradient(45deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.95) 45%, rgba(51,65,85,0.92) 55%, rgba(15,23,42,0.98) 100%);
    border:1px solid rgba(148,163,184,0.35); z-index:-1;
  }
  .navLogoMark::before {
    content:""; position:absolute; inset:4px;
    background:url("${iconUri}") center/90% no-repeat; opacity:0.8; filter:brightness(0) invert(1);
  }
  .navLogoMark span {
    font-size:0.92rem; font-weight:700; letter-spacing:0.04em; white-space:nowrap; text-align:center; line-height:1;
    position:relative; z-index:1; text-shadow:0 0 3px rgba(59,130,246,0.4), 0 0 6px rgba(37,99,235,0.35);
  }
  .navLogoLetter { display:inline-block; -webkit-text-stroke:0.4px rgba(8,11,23,0.95); font-size:1rem; }
  .navLogoLetterBig { font-size:1.25rem; font-weight:800; }
  .navLogoLetterG, .navLogoLetter:not(.navLogoLetterZ) { color:#ffffff; }
  .navLogoLetterZ { color:#fb923c; }
  .navLogoText { display:flex; flex-direction:column; margin:0 25px; }
  .navLogoText1 {
    font-size:0.78rem; text-transform:uppercase; letter-spacing:0.22em;
    background:linear-gradient(45deg,#9ca3af 0%,#a8acb2 50%,#b5b9be 100%);
    -webkit-background-clip:text; background-clip:text; color:transparent;
  }
  .navLogoText2 {
    font-size:0.9rem; font-weight:600;
    background:linear-gradient(90deg,#1e293b 0%,#475569 25%,#64748b 50%,#475569 75%,#1e293b 100%);
    background-size:200% 100%; background-position:50% 50%;
    -webkit-background-clip:text; background-clip:text; color:transparent;
  }
</style></head><body>
  <div class="stage">
    <div class="logoWrap">
      <div class="navLogo">
        <div class="navLogoMark">
          <span>
            <span class="navLogoLetter navLogoLetterBig navLogoLetterG">G</span><span class="navLogoLetter">ame</span><span class="navLogoLetter navLogoLetterBig navLogoLetterZ">Z</span><span class="navLogoLetter">one</span>
          </span>
        </div>
        <div class="navLogoText">
          <span class="navLogoText1">Digital store</span>
          <span class="navLogoText2">GameZone Edition</span>
        </div>
      </div>
    </div>
  </div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.locator(".stage").screenshot({ path: outPath });
  await browser.close();
  console.log(`og-card creada (logo real renderizado): ${outPath}`);
})();
