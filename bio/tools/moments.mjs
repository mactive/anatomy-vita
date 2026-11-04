// node moments.mjs <html> <outprefix> [ca keys: number of ArrowRight presses] ms1 ms2 ...
import { createRequire } from "node:module"; const { chromium } = createRequire(import.meta.url)("playwright");
const [,, file, out, right, ...ms] = process.argv;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 820, height: 900 }, deviceScaleFactor: 1.5 });
const errs=[]; p.on("pageerror", e => errs.push(e.message));
await p.goto("file://" + file); await p.waitForTimeout(300);
const st = await p.$(".iso-stage"); await st.focus();
for (let i = 0; i < Math.abs(+right); i++) await p.keyboard.press(+right > 0 ? "ArrowRight" : "ArrowLeft"); await p.keyboard.press("ArrowUp"); await p.keyboard.press("ArrowDown");
await p.waitForTimeout(5200); await p.keyboard.press(" "); const t0 = Date.now();
for (const m of ms) { const w = +m - (Date.now() - t0); if (w > 0) await p.waitForTimeout(w);
  await (await p.$(".iso-plate")).screenshot({ path: `${out}-${m}.png` }); console.log(m, await p.$eval("[data-readout]", e => e.textContent)); }
console.log(errs.length ? "ERRORS " + errs.join(" | ") : "no errors"); await b.close();
