// node bio/tools/thumbs.mjs site/demos/*.html → site/thumbs/<name>.jpg (the figure's SVG, ~440 px wide, after its tour has run 2.5 s)
import { createRequire } from "node:module"; import { mkdirSync } from "node:fs"; import { basename, dirname, join, resolve } from "node:path";
const { chromium } = createRequire(import.meta.url)("playwright");
const files = process.argv.slice(2).filter((f) => /\/\d\d-[^/]+\.html$/.test(resolve(f)));
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 820, height: 900 }, deviceScaleFactor: 0.62 }); // 712 px of SVG → ~440 px: sharp on a 2× card, ~15 KB as JPEG
for (const f of files) {
  const out = join(dirname(dirname(resolve(f))), "thumbs"); mkdirSync(out, { recursive: true });
  await p.goto("file://" + resolve(f) + "#embed"); await p.waitForTimeout(2500);
  await (await p.$(".iso-stage svg")).screenshot({ path: join(out, basename(f, ".html") + ".jpg"), type: "jpeg", quality: 78 }); console.log("thumb", basename(f));
}
await b.close();
