// 01 · DNA replication fork — a Watson–Crick style display model on three stand rods.
// What moves: the fork. As it runs right, the helicase splits the parent duplex; the leading strand is
// copied continuously behind it, the lagging strand in Okazaki fragments with nicks between them.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, liveScript, RNG_SRC, plinth, standRod, vitaPage } from "../../bio/bio.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../site/demos");
const W = 720, H = 430;
// Truth: B-DNA. 1 nm = 12 units. Radius 1 nm, rise 0.34 nm/bp, 10.5 bp per turn.
const NM = 13, R = 1.0 * NM, RISE = 0.34 * NM, BPT = 10.5, N = 50;
const X0 = -((N - 1) * RISE) / 2 + 4, ZC = 78, SEP = 3.1 * NM;
const NV = [0, 0.62, 0.785];
const PLATE = { x: -128, y: -62, w: 250, d: 116, r: 8 };
const xL = X0, xR = X0 + (N - 1) * RISE;
const FL = 15; // flange radius
const ends = { a: [xL - 4, SEP * NV[1], ZC + SEP * NV[2]], b: [xL - 4, -SEP * NV[1], ZC - SEP * NV[2]], p: [xR + 4, 0, ZC] };
const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [xL, 0, ends.a[2] + 22], [xR, 0, ZC + 22], [xL, -40, 20]], W, H, { pad: 28, azimuth: 56 });

const rods = [ends.b, ends.p, ends.a].sort((u, v) => k.depthOf(u, P) - k.depthOf(v, P)).map((e) => standRod(e[0], e[1], e[2] - FL + 1.5, P, { clampAt: Math.min(26, e[2] - FL - 10) })).join("");
const base = plinth(PLATE, P, { scale: { x: -116, y: PLATE.y + PLATE.d - 15, w: 196, step: NM / 2, every: 2 }, label: { x: 84, y: PLATE.y + PLATE.d - 20, w: 36 } });

const svg = k.figureSvg({ width: W, height: H, label: "A display model of a DNA replication fork on three stand rods. The parent double helix on the right is unwound at the fork; behind it the two separated strands are each paired with a new strand: the leading strand continuously, the lagging strand in short fragments.", body: [base, rods, `<g data-part="molecule"></g>`] });

const live = `
const P = ${JSON.stringify(P)};
const NM=${NM}, R=${R}, RISE=${RISE}, BPT=${BPT}, N=${N}, X0=${X0}, ZC=${ZC}, SEP=${SEP}, FL=${FL};
const NV=${JSON.stringify(NV)}; const ENDS=${JSON.stringify(ends)};
${RNG_SRC}
const rand = rng(1953);
const SEQ = Array.from({length:N}, () => "ACGT"[Math.floor(rand()*4)]);
const PAIR = {A:"T",T:"A",G:"C",C:"G"};
const PURINE = {A:1,G:1,C:0,T:0};
const V = G.viewOf(P);
const stage = document.querySelector(".iso-stage"), svg = stage.querySelector("svg");
const mol = svg.querySelector('[data-part="molecule"]'), readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const W_SPLIT = 8, LEAD = 2.6, LAG = 6.5, FRAG = 9, FMIN = 20, FMAX = N - 7;
const smooth = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const delta = 2.45; // minor-groove offset between the two glycosidic bonds
const omega = 2 * Math.PI / BPT;
const xAt = (t) => X0 + t * RISE;
const axis = (t, f, side) => { const g = smooth((f - t) / W_SPLIT) ; return [xAt(t), side * SEP * NV[1] * g, ZC + side * SEP * NV[2] * g]; };
const onHelix = (c, ang) => [c[0], c[1] + R * Math.cos(ang), c[2] + R * Math.sin(ang)];
// strand positions: A and B are the parent strands; A2 pairs with A on daughter +1, B2 with B on daughter -1
const pos = { A: (t, f) => onHelix(axis(t, f, 1), t * omega), B: (t, f) => onHelix(axis(t, f, -1), t * omega + delta),
  A2: (t, f) => onHelix(axis(t, f, 1), t * omega + delta), B2: (t, f) => onHelix(axis(t, f, -1), t * omega) };
const has = { A: () => true, B: () => true, A2: (t, f) => t <= f - LEAD, B2: (t, f) => t <= f - LAG && (t % FRAG) < FRAG - 0.9 };
const partner = { A: "B", B: "A", A2: "A", B2: "B" };
const daughterPartner = { A: "A2", B: "B2" };
const routes = (name, f) => { // runs of t where the strand exists, sampled every 1/8 bp
  const runs = []; let cur = null;
  for (let t = 0; t <= N - 1 + 1e-9; t += 0.125) {
    const ok = has[name](t, f) && !(name !== "A" && name !== "B" && t > N - 1);
    if (ok) { if (!cur) runs.push(cur = []); cur.push(pos[name](t, f)); } else cur = null;
  }
  return runs.filter((r) => r.length > 2);
};
const items = [];
const put = (depth, html) => items.push([depth, html]);
const tube = (points, r, tone, cls, opts = {}) => {
  for (const piece of T.tubePieces(points, r, P, { maxLength: 7, ...opts })) put(G.dot3(piece.mid, V), (cls === "dna-new" ? '<g class="bio-stain dna-new" style="--stain:var(--stain-dapi)">' : "<g>") + T.tubeSvg(piece, { tone }) + "</g>");
};
function flange(c, dir) {
  const F = G.frameAlong(c, [1, 0, 0]);
  const s0 = dir < 0 ? -3 : 0, s1 = dir < 0 ? 0 : 3;
  const body = K.solidSvg(G.disc(s0, s1, FL, F, P), { tone: "mid" });
  const ring = K.lineSvg(G.arcOf(F, dir < 0 ? 0 : 3, FL - 2.5, P, { least: -1 }), { tone: "faint" });
  const dots = K.dotsSvg(G.dotsOf(F, dir < 0 ? 0 : 3, FL - 2.5, 6, P, { all: true, phase: 0.5 }), { size: 0.5 });
  put(G.dot3(c, V), body + ring + dots);
}
function build(f) {
  items.length = 0;
  const lit = { A: false, B: false, A2: true, B2: true };
  for (const name of ["A", "B", "A2", "B2"]) for (const run of routes(name, f)) tube(run, 1.5, lit[name] ? "lit" : "hi", lit[name] ? "dna-new" : "dna-old", { rings: { pitch: 7.9, tone: "faint", fade: [0.15, 0.6] } });
  // bases: a half rung from each backbone toward the pair's centre; purines reach further than pyrimidines
  let paired = 0;
  for (let i = 0; i < N; i++) {
    for (const name of ["A", "B", "A2", "B2"]) {
      if (!has[name](i, f)) continue;
      const base = name === "A" || name === "B2" ? SEQ[i] : PAIR[SEQ[i]];
      const mate = i >= f - 0.5 ? partner[name] : (name === "A" || name === "B" ? daughterPartner[name] : partner[name]);
      const p = pos[name](i, f), q = pos[mate](i, f);
      const reach = PURINE[base] ? 0.56 : 0.44;
      const tip = G.lerp3(p, q, reach - 0.03);
      const isNew = name === "A2" || name === "B2";
      tube([G.lerp3(p, q, 0.1), tip], 0.95, isNew ? "lit" : "mid", isNew ? "dna-new" : "", { maxLength: 40 });
      const hbonds = has[mate](i, f) && (name === "A" || (name === "B" && i < f - 0.5));
      if (hbonds) {
        // hydrogen bonds where the two bases meet: 2 for A–T, 3 for G–C
        const n = base === "G" || base === "C" ? 3 : 2, mid = G.lerp3(p, q, reach);
        const pts = Array.from({ length: n }, (_, j) => K.iso(G.add3(mid, [(j - (n - 1) / 2) * 1.1, 0, 0]), P));
        put(G.dot3(mid, V) + 0.01, K.dotsSvg(pts, { size: 0.42, tone: "hi" }));
      }
    }
    if (i <= f - LEAD || i <= f - LAG) paired++;
  }
  // helicase: a ring of six subunits around the lagging-strand template, just ahead of the fork
  const hc = pos.B(f + 0.6, f);
  for (let j = 0; j < 6; j++) { const a = j * Math.PI / 3; const c = G.add3(hc, [0, Math.cos(a) * 5.6, Math.sin(a) * 5.6]); put(G.dot3(c, V), K.solidSvg(G.sphereOf(c, 3.4, P), { tone: "mid" })); }
  // two polymerases: one riding the leading strand, one finishing the newest Okazaki fragment
  const pl = G.add3(axis(f - LEAD - 1.2, f, 1), [0, NV[1] * 13, NV[2] * 13]);
  put(G.dot3(pl, V), K.solidSvg(G.sphereOf(pl, 8.5, P), { tone: "mid" }) + '<path class="iso-line" data-tone="faint" d="' + G.arcOf(G.frameAlong(pl, [0, 0, 1]), 0, 8.5, P, {}) + '"/>');
  const lagEnd = Math.floor((f - LAG) / FRAG) * FRAG + FRAG - 1; // rightmost end of the fragment now being finished
  const pg = G.add3(axis(Math.min(f - LAG, lagEnd), f, -1), [0, -NV[1] * 13, -NV[2] * 13]);
  put(G.dot3(pg, V), K.solidSvg(G.sphereOf(pg, 7.5, P), { tone: "mid" }));
  flange(ENDS.a, -1); flange(ENDS.b, -1); flange(ENDS.p, 1);
  items.sort((a, b) => a[0] - b[0]);
  mol.innerHTML = items.map((x) => x[1]).join("");
  const lead = Math.max(0, Math.floor(f - LEAD) + 1), frags = Math.max(0, Math.floor((f - LAG) / FRAG) + 1);
  const text = "fork at bp " + f.toFixed(1) + " · " + lead + " bp copied · " + (f / BPT).toFixed(2) + " turns unwound · " + frags + " Okazaki";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text); stage.setAttribute("aria-valuenow", String(Math.round(f)));
}
let f = 30, target = 30, clock = 0, touring = !still.matches, visible = false, frame = 0, last = 0, idle = 0, drawn = -1, paused = false;
const tourAt = (t) => FMIN + (FMAX - FMIN) * (0.5 - 0.5 * Math.cos(t * 2 * Math.PI / 40));
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
  if (touring && !paused) { clock += dt; target = tourAt(clock); }
  f = still.matches ? target : f + (target - f) * (1 - Math.exp(-dt / 0.35));
  if (Math.abs(target - f) < 0.002) f = target;
  if (Math.abs(f - drawn) > 0.004) { build(f); drawn = f; }
  frame = visible && (touring && !paused || f !== target) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (to) => { touring = false; target = Math.min(FMAX, Math.max(FMIN, to)); clearTimeout(idle); idle = setTimeout(() => { if (!still.matches) { touring = true; clock = Math.acos(Math.max(-1, Math.min(1, 1 - 2 * (f - FMIN) / (FMAX - FMIN)))) * 40 / (2 * Math.PI); run(); } }, 4000); run(); };
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (e) => { const b = svg.getBoundingClientRect(); const s = ((e.clientX - b.left) / b.width - 0.2) / 0.6; steer(FMIN + Math.min(1, Math.max(0, s)) * (FMAX - FMIN)); });
stage.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") steer(Math.round(target) + 1); else if (e.key === "ArrowLeft") steer(Math.round(target) - 1);
  else if (e.key === " ") { paused = !paused; touring = true; run(); } else return; e.preventDefault(); });
build(f); drawn = f;
`;

const body = k.plateHtml({
  fig: "Fig 01", title: "Replication fork", hint: "Hover ↔ to run the fork · Space pause",
  readout: "fork at bp 30.0", keys: [{ mark: "blue", label: "New strands, copied from the old" }, { mark: "raised", label: "Parent strands, base pairs and three end flanges" }],
  caption: "B-DNA at true scale on the ruler (1 major tick = 1 nm): 2 nm wide, 0.34 nm per base pair, 10.5 base pairs per turn. Each purine (A, G) reaches further across than a pyrimidine (T, C), so every pair is the same width; A–T holds by two hydrogen bonds, G–C by three. The leading strand is copied right up to the fork, the lagging strand backwards in fragments (here 9 bp; really 100–200 nt in human cells) that leave nicks between them.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Replication fork: arrow keys move the fork one base pair" aria-valuemin="20" aria-valuemax="43" aria-valuenow="30">${svg}</div>`,
});
const page = vitaPage({ n: "01", title: "DNA replication fork", zh: "DNA 复制叉 · 分子尺度", en: "DNA replication fork · molecular scale", body, script: liveScript() + live,
  facts: [["2 nm", "双螺旋直径", "helix diameter"], ["0.34 nm", "每碱基对上升", "rise per base pair"], ["10.5 bp", "每一圈", "base pairs per turn"], ["~1,000 bp/s", "大肠杆菌复制叉速度", "E. coli fork speed"], ["~50 bp/s", "人类复制叉速度", "human fork speed"]] });
writeFileSync(join(OUT, "01-dna.html"), page);
console.log("wrote 01-dna.html", (page.length / 1024).toFixed(0) + " KB");
