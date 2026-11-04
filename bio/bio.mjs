// Anatomy Vita — the bio layer on top of the Anatomy kit (MIT, wheresryan22/anatomy).
// Adds what living things need and machines don't: stains, membranes you can see into,
// seeded variation, specimen stages, the kit running live inside the page, and the site shell.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../kit/tube.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// 1. Live runtime: iso-kit, lathe and tube as namespaces K, G, T inside one page script; bio modules on request
//    (liveScript({ soft: true, branch: true }) adds SOFT and BR, built from the same files the build uses).
function moduleAsNamespace(file, name, imports) {
  let src = readFileSync(join(ROOT, file), "utf8");
  const names = [];
  src = src.replace(/^import[^\n]*\n/gm, "");
  src = src.replace(/^export (async function|function|const|let|class) ([A-Za-z0-9_$]+)/gm, (_, kind, id) => { names.push(id); return `${kind} ${id}`; });
  return `const ${name} = (() => {\n${imports}\n${src}\nreturn { ${names.join(", ")} };\n})();\n`;
}
export function liveScript({ soft = false, branch = false } = {}) {
  return moduleAsNamespace("kit/iso-kit.mjs", "K", "") + moduleAsNamespace("kit/lathe.mjs", "G", "const { cameraOf, iso, pathOf } = K;") + moduleAsNamespace("kit/tube.mjs", "T", "const { iso, pathOf } = K;")
    + (soft ? moduleAsNamespace("bio/soft.mjs", "SOFT", "") : "")
    + (branch ? moduleAsNamespace("bio/branch.mjs", "BR", "const { tubePieces, tubeSvg } = T;") : "");
}

// 2. Seeded variation: no two cells are the same, but every build is.
export function rng(seed = 1) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
export const RNG_SRC = `function rng(seed){let s=seed>>>0||1;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296);}`;

// 3. Stains: colour only where colour is the subject. The four tones stay; each is mixed toward the stain.
export const STAINS = { dapi: "#3b5bdb", gfp: "#2b8a3e", rfp: "#e03131", eosin: "#d6336c", hema: "#5f3dc4", atp: "#e8590c", myelin: "#b08d3c", oxy: "#c92a2a", deoxy: "#364fc7", na: "#f08c00", k: "#7048e8", trna: "#0c8599", cyt: "#c2255c" };
export const stain = (name, svg, amount = 1) => `<g class="bio-stain" style="--stain:var(--stain-${name});--stain-k:${amount}">${svg}</g>`;

// 4. Membranes you can see into: a shell in two halves. back() before the contents, front() after.
export function shellOf(centre, r, P, { steps = 72 } = {}) {
  const paths = G.sphereOf(centre, r, P, { steps });
  const s = G.scaleOf(P) * r;
  const hl = k.iso(G.add3(centre, G.mul3(G.unit3(G.add3(G.lightOf(P), G.viewOf(P))), r * 0.62)), P);
  const f = (v) => v.toFixed(1);
  return {
    back: `<g class="bio-shell-back"><path class="iso-fill" d="${paths.fill}"/>${paths.shades.slice(1).map((d, i) => (d ? `<path class="bio-shell-tone" data-shade="${i + 1}" d="${d}"/>` : "")).join("")}</g>`,
    front: `<g class="bio-shell-front"><path class="bio-glass" d="${paths.fill}"/><ellipse class="bio-gleam" cx="${f(hl[0])}" cy="${f(hl[1])}" rx="${f(s * 0.22)}" ry="${f(s * 0.11)}" transform="rotate(-28 ${f(hl[0])} ${f(hl[1])})"/><path class="iso-line bio-membrane" data-tone="hi" d="${paths.outline}"/></g>`,
  };
}

// 5. Specimen stages: every living thing sits on a real bench.
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
export const byDepth = (points, P) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

export function plinth(PLATE, P, { h = 10, foot = 5, scale = null, label = null } = {}) {
  const at = (p) => k.iso(p, P);
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -h - foot, h, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 20), P)) {
    out.push(S(k.cylinder(x, y, 7, -h - foot, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -h - foot + 1.6, foot - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -h, h, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  if (scale) { // one tick per true unit of the specimen (nm, µm, mm)
    const strip = { x: scale.x, y: scale.y, w: scale.w, d: 7, r: 1 };
    out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
    const t = k.topTicks(strip.x + 3, strip.x + strip.w - 3, scale.step, scale.every, strip.y + 0.8, 0.6, [2, 3.8], P);
    out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
    out.push(D([at([strip.x + 1.6, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 1.6, strip.y + 3.5, 0.6])], { size: 0.45 }));
  }
  if (label) {
    const plate = { x: label.x, y: label.y, w: label.w ?? 34, d: label.d ?? 12, r: 1.4 };
    out.push(S(k.slabOf(plate, 0, 0.8, P, 3, 0.3), { tone: "lo" }));
    for (let i = 0; i < 3; i++) out.push(L(k.lineOnTop([plate.x + 4, plate.y + 3 + i * 3], [plate.x + plate.w - 4 - i * 6, plate.y + 3 + i * 3], 0.8, P), { tone: "faint", free: true }));
    out.push(D([at([plate.x + 2, plate.y + plate.d / 2, 0.8]), at([plate.x + plate.w - 2, plate.y + plate.d / 2, 0.8])], { size: 0.4 }));
  }
  return out.join("");
}

export function standRod(x, y, z, P, { r = 2.4, clampAt = z - 8 } = {}) {
  const out = [];
  out.push(S(k.cylinder(x, y, 6, 0, 2, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 4.2, 2, 2, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, r, 4, clampAt - 4, P, 20), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x, y, r + 1.6, clampAt, 5, P, 24, 0.4), { tone: "mid" }));
  out.push(L(k.knurl(x, y, r + 1.6, clampAt + 1, clampAt + 4, 20, P), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, r, clampAt + 5, z - clampAt - 5, P, 20), { tone: "mid", crease: "none" }));
  return out.join("");
}

// 6. CSS: stains, membranes, ions and the site chrome.
const mix = (sel, prop, base, pct) => `${sel}{${prop}:color-mix(in oklab,var(${base}),var(--stain) calc(var(--stain-k,1)*${pct}%))}`;
export const BIO_CSS = `
.iso{${Object.entries(STAINS).map(([n, c]) => `--stain-${n}:${c}`).join(";")}}
${mix(".bio-stain .iso-solid>.iso-top", "fill", "--anatomy-top", 22)}
${mix(".bio-stain .iso-solid>.iso-fill", "fill", "--anatomy-paper", 18)}
${[42, 34, 28, 22].map((p, i) => mix(`.bio-stain .iso-solid>.iso-shade[data-shade="${i}"]`, "fill", `--anatomy-shade-${i}`, p) + mix(`.bio-stain .iso-solid[data-seamless]>.iso-shade[data-shade="${i}"]`, "stroke", `--anatomy-shade-${i}`, p)).join("\n")}
${mix(".bio-stain .iso-solid>.iso-edge", "stroke", "--anatomy-hi", 55)}
${mix(".bio-stain .tb-body", "fill", "--anatomy-shade-2", 30)}
${mix(".bio-stain .tb-shine", "fill", "--anatomy-top", 18)}
${mix(".bio-stain .tb-shade", "fill", "--anatomy-shade-0", 45)}
${mix(".bio-stain .tb-edge", "stroke", "--anatomy-hi", 50)}
${mix(".bio-stain .iso-line:not(.tb-edge)", "stroke", "--anatomy-mid", 60)}
.bio-stain .iso-dots circle{fill:var(--stain)}
${Object.keys(STAINS).map((n) => `.iso-swatch[data-mark="${n}"] path{stroke:var(--stain-${n});stroke-width:2.2}`).join("\n")}
.bio-shell-back .iso-fill{fill:color-mix(in oklab,var(--anatomy-paper),var(--anatomy-shade-1) 30%)}
.bio-shell-tone{fill:var(--anatomy-paper);opacity:.35}
.bio-glass{fill:var(--anatomy-top);opacity:.14}
.bio-gleam{fill:var(--anatomy-paper);opacity:.6;filter:blur(1.6px)}
.bio-lumen{fill:color-mix(in oklab,var(--anatomy-paper),var(--anatomy-shade-0) 75%)}
.bio-cavity{fill:color-mix(in oklab,color-mix(in oklab,var(--anatomy-paper),var(--anatomy-shade-1) 55%),var(--stain-myelin) 12%)}
.bio-rim{fill:color-mix(in oklab,var(--anatomy-top),var(--stain-myelin) 10%)}
.bio-seam{stroke-width:calc(var(--anatomy-weight) * .8)}
.bio-zona-back{opacity:.5}
.bio-pipette .tb-body,.bio-pipette .tb-shade{opacity:.75}
.bio-blastocoel{fill:color-mix(in oklab,var(--anatomy-paper),var(--stain-dapi) 10%)}
.bio-membrane{stroke-width:calc(var(--anatomy-weight) * 1.7)}
.vita-nav{display:flex;justify-content:space-between;align-items:baseline;gap:16px;margin:0 0 18px;font:12px/1.4 var(--anatomy-mono,ui-monospace),monospace;letter-spacing:.06em;color:var(--anatomy-muted);text-transform:uppercase}
.vita-nav a{color:var(--anatomy-text);text-decoration:none}
.vita-nav a:hover{color:var(--anatomy-strong)}
.vita-facts{margin:22px 0 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px 18px;font:12px/1.5 var(--anatomy-mono,ui-monospace),monospace;color:var(--anatomy-muted)}
.vita-facts b{display:block;color:var(--anatomy-strong);font-weight:500;font-size:14px}
body.vita-embed .vita-nav,body.vita-embed .vita-facts{display:none}
body.vita-embed .iso-page{margin:10px auto}
`;

// 7. A figure page: nav, card, true facts; ?embed hides the chrome for the essay page.
export function vitaPage({ n, title, zh, body, script, facts = [], theme = "light", width = 760 }) {
  const nav = `<nav class="vita-nav"><a href="../index.html">← Anatomy Vita</a><span>${n} · ${zh}</span></nav>`;
  const factHtml = facts.length ? `<div class="vita-facts">${facts.map(([v, l]) => `<span><b>${v}</b>${l}</span>`).join("")}</div>` : "";
  const embed = `if(new URLSearchParams(location.search).has("embed")||location.hash==="#embed")document.body.classList.add("vita-embed");`;
  return k.pageHtml({ title: `${title} · Anatomy Vita`, theme, width, body: `<style>${BIO_CSS}</style>${nav}${body}${factHtml}`, script: embed + "\n" + script });
}

// 8. (v2) A depth collector. Everything that can overlap goes in with its depth; svg() paints back to front.
export function scene(P) {
  const items = [];
  const api = {
    depth: (p) => k.depthOf(p, P),
    put(depth, html) { items.push([depth, html]); return api; },
    at(p, html) { items.push([k.depthOf(p, P), html]); return api; },
    tube(points, r, style = { tone: "hi" }, { wrap = (h) => h, maxLength = 12, ...opts } = {}) {
      for (const piece of tubePieces(points, r, P, { maxLength, ...opts })) items.push([k.depthOf(piece.mid, P), wrap(tubeSvg(piece, style))]);
      return api;
    },
    svg() { return items.sort((a, b) => a[0] - b[0]).map((x) => x[1]).join(""); },
  };
  return api;
}

// 9. (v2) One shared live runtime, so every figure pauses offscreen, tours when idle, answers pointer and keys,
// and stands still under reduced motion in exactly the same way.
//   vitaLoop({ stage, frame(dt, st), pointer(x01, st), click(st), keys(key, st) → true if used, resume(st), idleMs })
//   st = { touring, still, clock }; frame gets dt = 0 when motion is reduced.
export const LOOP_SRC = `
function vitaLoop(o){
  const stage=o.stage, mq=matchMedia("(prefers-reduced-motion: reduce)");
  const st={touring:!mq.matches, still:mq.matches, clock:0};
  let raf=0,last=0,visible=false,idle=0;
  function tick(now){ const dt=last?Math.min((now-last)/1000,1/30):1/60; last=now; st.clock+=dt; o.frame(dt,st); raf=visible&&!st.still?requestAnimationFrame(tick):0; }
  const run=()=>{ if(st.still){ o.frame(0,st); return; } if(!raf&&visible){ last=0; raf=requestAnimationFrame(tick); } };
  const takeOver=()=>{ st.touring=false; clearTimeout(idle); idle=setTimeout(()=>{ st.touring=!st.still; if(o.resume) o.resume(st); run(); }, o.idleMs||5000); run(); };
  mq.addEventListener&&mq.addEventListener("change",()=>{ st.still=mq.matches; st.touring=!mq.matches; run(); });
  new IntersectionObserver((e)=>{ visible=e[e.length-1].isIntersecting; if(visible) run(); },{rootMargin:"120px 0px"}).observe(stage);
  if(o.pointer) stage.addEventListener("pointermove",(e)=>{ const b=stage.querySelector("svg").getBoundingClientRect(); const x=Math.min(1,Math.max(0,((e.clientX-b.left)/b.width-0.12)/0.76)); o.pointer(x,st); takeOver(); });
  if(o.click) stage.addEventListener("click",()=>{ o.click(st); takeOver(); });
  if(o.keys) stage.addEventListener("keydown",(e)=>{ if(o.keys(e.key,st)){ e.preventDefault(); takeOver(); } });
  o.frame(0,st);
  return { run, takeOver, st };
}
function vitaSay(stage, readout, text){ if(readout.textContent!==text) readout.textContent=text; stage.setAttribute("aria-valuetext",text); }
`;

export { k, G };
