#!/usr/bin/env node
// Anatomy Vita — the life-law checker. Run it on built figure pages before shipping:
//   node bio/check.mjs site/demos/*.html            (needs Playwright, or set CHROME to a Chrome/Chromium binary)
// The kit's audit.mjs proves rigid geometry; it cannot see membranes or particles. This proves the page keeps the
// Vita laws and the Anatomy behaviour contract, and exits 1 on any failure.
//
//   errors     no page errors or console errors while it runs
//   live       the readout changes on its own (idle tour) within 4 s
//   keys       focus + arrow keys (or Space) change the readout or aria state
//   still      under prefers-reduced-motion the page draws once and then stops (no rAF loop)
//   phone      at 390 px the page has no horizontal scroll and the figure fits
//   scale      the caption names a scale ("1 tick = …", "true scale", "not to scale")       law 1
//   stains     every --stain-* used exists in STAINS                                         law 2
//   time       the caption says how time is changed ("× slower", "× faster", or real time)   law 3
//   facts      a facts row of at least three numbers, each labelled in Chinese and English
//   size       the page is under 1.5 MB (big pages: use a <use> pose library, avoid per-pose lathes)
//   fit        the drawing's painted bounds stay inside the figure's viewBox (nothing clipped by the card)
//   ink        no stained shape renders as unresolved black (a broken color-mix falls back to black)
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { STAINS } from "./bio.mjs";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { try { ({ chromium } = require("playwright-core")); } catch { console.error("check.mjs needs playwright (npm i -D playwright)"); process.exit(2); } }

const files = process.argv.slice(2).filter((f) => f.endsWith(".html"));
if (!files.length) { console.error("usage: node bio/check.mjs page.html ..."); process.exit(2); }
const launch = process.env.CHROME ? { executablePath: process.env.CHROME } : {};
const browser = await chromium.launch(launch);
let failed = 0;
const rows = [];
for (const file of files) {
  const url = "file://" + (file.startsWith("/") ? file : process.cwd() + "/" + file);
  const html = readFileSync(file, "utf8");
  const r = {};
  // static laws
  const caption = (html.match(/class="iso-caption">([^<]*)</) || [])[1] || "";
  r.scale = /tick\s*=|true scale|not to scale|at scale/i.test(caption);
  r.time = /×\s*slower|×\s*faster|\bslower\b|\bfaster\b|real time|real-time|timings|relative rates/i.test(caption);
  const used = [...new Set([...html.matchAll(/--stain-([a-z]+)/g)].map((m) => m[1]))].filter((n) => n !== "k"); // --stain-k is the amount, not a dye
  r.stains = used.every((n) => n in STAINS);
  r.size = html.length < 1.5 * 1024 * 1024;
  { const facts = [...html.matchAll(/<div class="vita-facts">([\s\S]*?)<\/div>/g)].map((m) => m[1]).join("");
    const items = facts.split("<span><b>").slice(1); // each fact needs a value plus a Chinese and an English label
    r.facts = items.length >= 3 && items.every((it) => { const zh = (it.match(/class="l-zh"[^>]*>([^<]*)</) || [])[1], en = (it.match(/class="l-en"[^>]*>([^<]*)</) || [])[1]; return zh && en && zh !== en; }); }
  // runtime
  const page = await browser.newPage({ viewport: { width: 820, height: 900 } });
  const errs = []; page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(url); await page.waitForTimeout(600);
  const read = () => page.evaluate(() => { const e = document.querySelector("[data-readout]"); const s = document.querySelector(".iso-stage"); return (e ? e.textContent : "") + "|" + (s ? s.getAttribute("aria-valuetext") || "" : "") + "|" + (document.querySelector(".iso-stage svg")?.innerHTML.length || 0); });
  const a = await read(); await page.waitForTimeout(3500); const b = await read();
  r.live = a !== b;
  const stage = await page.$(".iso-stage");
  if (stage) { await stage.focus(); const before = await read(); for (const key of ["ArrowRight", "ArrowRight", "ArrowRight", " "]) await page.keyboard.press(key); await page.waitForTimeout(900); r.keys = (await read()) !== before; } else r.keys = false;
  r.ink = await page.evaluate(() => { const bad = [...document.querySelectorAll(".iso-stage .bio-stain path")].filter((e) => { const c = getComputedStyle(e); return /^(tb-body|tb-shine|tb-shade|iso-fill|iso-shade|iso-top)$/.test(e.getAttribute("class") || "") && c.fill === "rgb(0, 0, 0)"; }); return bad.length === 0; });
  r.fit = await page.evaluate(() => { // painted bounds of every leaf, transforms applied, limited by any clip-path above it
    const svg = document.querySelector(".iso-stage svg"); if (!svg) return false;
    const vb = svg.viewBox.baseVal, inv = svg.getScreenCTM().inverse();
    const toUser = (r) => { const a = new DOMPoint(r.left, r.top).matrixTransform(inv), b = new DOMPoint(r.right, r.bottom).matrixTransform(inv); return { x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y) }; };
    const clipBox = (el) => { for (let e = el; e && e !== svg; e = e.parentElement) { const c = e.getAttribute && e.getAttribute("clip-path"); if (!c) continue;
        const id = (c.match(/#([^)"']+)/) || [])[1]; const cp = id && svg.querySelector("#" + CSS.escape(id)); if (!cp) return null; let b = null;
        for (const k of cp.children) { const bb = k.getBBox(); const m = e.getCTM ? (svg.getCTM().inverse().multiply(e.getCTM())) : new DOMMatrix();
          const p0 = new DOMPoint(bb.x, bb.y).matrixTransform(m), p1 = new DOMPoint(bb.x + bb.width, bb.y + bb.height).matrixTransform(m);
          const r = { x0: Math.min(p0.x, p1.x), y0: Math.min(p0.y, p1.y), x1: Math.max(p0.x, p1.x), y1: Math.max(p0.y, p1.y) };
          b = b ? { x0: Math.min(b.x0, r.x0), y0: Math.min(b.y0, r.y0), x1: Math.max(b.x1, r.x1), y1: Math.max(b.y1, r.y1) } : r; }
        return b; } return null; };
    let ok = true;
    for (const el of svg.querySelectorAll("path,circle,ellipse,rect,line,polyline,polygon,use")) {
      if (el.closest("defs,clipPath,mask")) continue; const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden") continue;
      const r = el.getBoundingClientRect(); if (!r.width && !r.height) continue; let u = toUser(r); const c = clipBox(el);
      if (c) u = { x0: Math.max(u.x0, c.x0), y0: Math.max(u.y0, c.y0), x1: Math.min(u.x1, c.x1), y1: Math.min(u.y1, c.y1) };
      if (u.x1 <= u.x0 || u.y1 <= u.y0) continue;
      if (u.x0 < vb.x - 2 || u.y0 < vb.y - 2 || u.x1 > vb.x + vb.width + 2 || u.y1 > vb.y + vb.height + 2) { ok = false; break; } }
    return ok; });
  r.errors = errs.length === 0;
  await page.close();
  // reduced motion: count animation frames after load
  const still = await browser.newPage({ viewport: { width: 820, height: 900 }, reducedMotion: "reduce" });
  await still.addInitScript(() => { window.__raf = 0; const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (f) => { window.__raf++; return raf(f); }; });
  await still.goto(url); await still.waitForTimeout(800); const n0 = await still.evaluate(() => window.__raf); await still.waitForTimeout(1000); const n1 = await still.evaluate(() => window.__raf);
  r.still = n1 - n0 < 5 && (await still.evaluate(() => (document.querySelector(".iso-stage svg")?.innerHTML.length || 0) > 1000));
  await still.close();
  // phone
  const phone = await browser.newPage({ viewport: { width: 390, height: 800 } });
  await phone.goto(url); await phone.waitForTimeout(500);
  r.phone = await phone.evaluate(() => document.documentElement.scrollWidth <= 391 && (document.querySelector(".iso-stage svg")?.getBoundingClientRect().width || 0) <= 391);
  await phone.close();
  const keys = ["errors", "live", "keys", "still", "phone", "scale", "stains", "time", "facts", "ink", "size", "fit"];
  const bad = keys.filter((k) => !r[k]);
  if (bad.length) failed++;
  rows.push([file.split("/").pop(), ...keys.map((k) => (r[k] ? "ok" : "FAIL")), errs[0] ? errs[0].slice(0, 60) : ""]);
}
await browser.close();
const head = ["page", "errors", "live", "keys", "still", "phone", "scale", "stains", "time", "facts", "ink", "size", "fit", ""];
const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
const line = (r) => r.map((c, i) => String(c).padEnd(w[i])).join("  ");
console.log(line(head)); for (const r of rows) console.log(line(r));
console.log(failed ? `\n${failed} page(s) failed` : "\nvita check passed");
process.exit(failed ? 1 : 0);
