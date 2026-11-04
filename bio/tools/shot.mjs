// usage: node shot.mjs <html> <out.png> [width] [waitMs] [height]
import { createRequire } from "node:module"; const { chromium } = createRequire(import.meta.url)("playwright");
const [,, file, out, w = "820", wait = "1500", h = "760"] = process.argv;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => m.type() === "error" && errs.push(m.text()));
await p.goto("file://" + file); await p.waitForTimeout(+wait);
await p.screenshot({ path: out, fullPage: true }); console.log(out, errs.length ? "ERRORS: " + errs.join(" | ") : "no errors"); await b.close();
