// node scrub.mjs <html> <outprefix> x0 x1 ... : hover stage at fractions, screenshot the card
import { createRequire } from "node:module"; const { chromium } = createRequire(import.meta.url)("playwright");
const [,, file, out, ...fr] = process.argv;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 820, height: 900 }, deviceScaleFactor: 1 });
const errs=[]; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => m.type()==="error" && errs.push(m.text()));
await p.goto("file://" + file); await p.waitForTimeout(500);
const box = await (await p.$(".iso-stage svg")).boundingBox();
for (const f of fr) { const x = box.x + box.width * (0.12 + 0.76 * +f); await p.mouse.move(x, box.y + box.height / 2); await p.waitForTimeout(1500);
  const t0=Date.now(); await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))); 
  await (await p.$(".iso-plate, figure")).screenshot({ path: `${out}-${f}.png` }); console.log(f, await p.$eval("[data-readout]", e => e.textContent)); }
const ft = await p.evaluate(async()=>{ let n=0; const s=performance.now(); await new Promise(r=>{ const f=()=>{ n++; if(performance.now()-s<1000) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); }); return n; });
console.log("fps while idle-hover", ft, errs.length ? "ERRORS " + errs.join(" | ") : "no errors"); await b.close();
