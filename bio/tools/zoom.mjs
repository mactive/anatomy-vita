// node zoom.mjs <html> <out.png> x y w h [waitMs] [scale]
import { createRequire } from "node:module"; const { chromium } = createRequire(import.meta.url)("playwright");
const [,, file, out, x, y, w, h, wait = "2500", sc = "4"] = process.argv;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 820, height: 1000 }, deviceScaleFactor: +sc });
await p.goto("file://" + file); await p.waitForTimeout(+wait);
await p.screenshot({ path: out, clip: { x: +x, y: +y, width: +w, height: +h } }); await b.close(); console.log(out);
