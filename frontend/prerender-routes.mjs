// Materialize a REAL page for every routed URL, so GitHub Pages answers 200 instead of 404.
//
// WHY. `spa-404.mjs` copies index.html to 404.html, which makes deep links WORK in a browser: Pages
// serves the shell and BrowserRouter renders the right view. But it serves it with an HTTP **404**
// status. A human sees the page; a link unfurler, a crawler, an uptime check or anything that reads
// status codes sees a broken URL. ADR-0070 requires the scenario focus route to be shareable and
// teachable from, so a 404 on `/focus/<caseId>` is a real gap against that requirement, not cosmetic.
//
// FIX. Pages serves `<path>/index.html` for `<path>` with a 200. Our route set is small and fully known
// at build time (six pages plus one focus route per canonical case), so we simply write the shell to
// each of those paths. The 404.html fallback stays as the safety net for anything unlisted.
//
// Root-absolute asset paths (vite base '/') resolve from any depth, so a straight copy is correct.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, 'dist');
const index = resolve(dist, 'index.html');
if (!existsSync(index)) {
  console.error('[prerender] dist/index.html not found, run after `vite build`');
  process.exit(1);
}

// The six standard pages. Kept as a literal list rather than parsed out of main.tsx: a route appearing
// here without a matching <Route> would 200 on an empty view, which is worse than a 404.
const PAGES = ['introduction', 'methodology', 'implementation', 'experiments', 'benchmark'];

// Case ids come from the engine's own case registry, so a new case gets a shareable focus URL for free
// and this file never drifts from the case list.
const casesSrc = readFileSync(resolve(here, 'src/mill/cases.ts'), 'utf8');
const caseIds = [...casesSrc.matchAll(/^\s*id:\s*'([A-Z0-9-]+)'/gm)].map((m) => m[1]);
if (caseIds.length === 0) {
  console.error('[prerender] no case ids parsed from src/mill/cases.ts; refusing to emit a partial route set');
  process.exit(1);
}

// Real surveyed mills are focusable scenarios too (Focus resolves the route id against BOTH registries),
// so they need shareable 200-status deep links exactly as the synthetic cases do. Omitting them made
// every real-mill focus URL a 404 on a hard refresh or a shared link.
const millsSrc = readFileSync(resolve(here, 'src/mill/realmills.ts'), 'utf8');
const millIds = [...millsSrc.matchAll(/^\s*\{\s*id:\s*'([a-z0-9-]+)'/gm)].map((m) => m[1]);
if (millIds.length === 0) {
  console.error('[prerender] no real-mill ids parsed from src/mill/realmills.ts; refusing to emit a partial route set');
  process.exit(1);
}

const routes = [...PAGES, ...caseIds.map((id) => `focus/${id}`), ...millIds.map((id) => `focus/${id}`)];
for (const route of routes) {
  const dir = resolve(dist, route);
  mkdirSync(dir, { recursive: true });
  copyFileSync(index, resolve(dir, 'index.html'));
}
console.log(`[prerender] materialized ${routes.length} routes (${PAGES.length} pages + ${caseIds.length} synthetic + ${millIds.length} real-mill focus scenarios) -> HTTP 200 deep links`);
