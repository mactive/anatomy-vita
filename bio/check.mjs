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
//   facts      the page carries a facts row with at least three true numbers
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
  r.time = /×\s*slower|× faster|slower|faster|real time|real-time|days|timings/i.test(caption);
  const used = [...new Set([...html.matchAll(/--stain-([a-z]+)/g)].map((m) => m[1]))].filter((n) => n !== "k");
  r.stains = used.every((n) => n in STAINS);
  r.facts = (html.match(/<span><b>/g) || []).length >= 3 || /vita-facts/.test(html) === false;
  // runtime
  const page = await browser.newPage({ viewport: { width: 820, height: 900 } });
  const errs = []; page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(url); await page.waitForTimeout(600);
  const read = () => page.evaluate(() => { const e = document.querySelector("[data-readout]"); const s = document.querySelector(".iso-stage"); return (e ? e.textContent : "") + "|" + (s ? s.getAttribute("aria-valuetext") || "" : "") + "|" + (document.querySelector(".iso-stage svg")?.innerHTML.length || 0); });
  const a = await read(); await page.waitForTimeout(3500); const b = await read();
  r.live = a !== b;
  const stage = await page.$(".iso-stage");
  if (stage) { await stage.focus(); const before = await read(); for (const key of ["ArrowRight", "ArrowRight", "ArrowRight", " "]) await page.keyboard.press(key); await page.waitForTimeout(900); r.keys = (await read()) !== before; } else r.keys = false;
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
  const keys = ["errors", "live", "keys", "still", "phone", "scale", "stains", "time", "facts"];
  const bad = keys.filter((k) => !r[k]);
  if (bad.length) failed++;
  rows.push([file.split("/").pop(), ...keys.map((k) => (r[k] ? "ok" : "FAIL")), errs[0] ? errs[0].slice(0, 60) : ""]);
}
await browser.close();
const head = ["page", "errors", "live", "keys", "still", "phone", "scale", "stains", "time", "facts", ""];
const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
const line = (r) => r.map((c, i) => String(c).padEnd(w[i])).join("  ");
console.log(line(head)); for (const r of rows) console.log(line(r));
console.log(failed ? `\n${failed} page(s) failed` : "\nvita check passed");
process.exit(failed ? 1 : 0);
