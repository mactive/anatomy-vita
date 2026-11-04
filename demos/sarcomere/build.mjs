// 12 · Sarcomere — one sarcomere of a skinned frog myofibril, cut to one longitudinal plane of its lattice and mounted
// like a slide-rule: each Z disc rides a carriage on a rail, held out by a load spring; the M line is held on a post
// behind; a perfusion pipette above sets the bath calcium.
// What moves: Ca²⁺ binds troponin, tropomyosin rolls off the myosin sites, the myosin heads bind, swing their lever arms
// (the power stroke) toward the M line, let go and re-cock. The thin filaments slide over the thick ones and both Z
// discs move in against their springs. Less Ca²⁺: heads stop binding and the springs pull the sarcomere back out.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, liveScript, LOOP_SRC, plinth, stain, vitaPage, scene, standRod, rng } from "../../bio/bio.mjs";
import { tubePieces, tubeSvg } from "../../kit/tube.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../site/demos");
const W = 720, H = 440;

// ---------- truth (frog skeletal muscle unless noted) ----------
// Gordon, Huxley & Julian 1966: thick filament 1.6 µm, thin filament ~0.95–1.0 µm, bare zone ~0.15–0.2 µm,
// full overlap plateau SL 2.0–2.25 µm, zero overlap at 3.65 µm.
// Myosin heads: crowns every 14.3 nm, helical repeat 43 nm; working stroke ~5–10 nm per head (Finer et al. 1994; Huxley 1957).
// Actin: two strands, crossover every ~36 nm; one troponin–tropomyosin unit every 38.5 nm on each strand.
// Lattice: thick–thin centre spacing ~26 nm; thin filament ~7–8 nm across, thick backbone ~13–15 nm.
// Troponin C switch: pCa50 ~5.8, Hill coefficient ~3 (skinned fast fibres; resting Ca²⁺ ~0.1 µM, active ~1–10 µM).
const X = 0.2;   // along the filaments: 1 nm = 0.2 units (true scale on the ruler)
const C = 1.0;   // across the filaments: 1 nm = 1 unit (widths and lattice spacing drawn 5× larger)
const SL0 = 2.5; // the drawn rest length, µm
const RTHIN = 3.5 * C, RTHICK = 7 * C, SP = 26 * C;  // 2.8, 5.6, 20.8
const THIN_L = 950 * X, THICK_H = 800 * X, BARE = 80 * X; // 190, 160, 16
const ZW = 6;            // Z disc, ~30 nm
const Z0 = 58;           // axis of the lowest thin filament
const THIN_Z = [Z0, Z0 + 2 * SP, Z0 + 4 * SP];
const THICK_Z = [Z0 + SP, Z0 + 3 * SP];
const ZBOT = Z0 - 13, ZTOP = Z0 + 4 * SP + 13;
const zAt = (sl) => sl * 1000 * X / 2; // Z-line centre from the M line
const XR = zAt(SL0);                    // 250
const HEAD_DX = 43 * X;                 // one head pair per 43 nm repeat facing each thin filament
const RB = 2.9, LL = 5.4;               // motor domain (~10 nm) and lever (~9 nm), drawn at the 5× cross scale
const BALL_ON = SP - RTHIN - 1.57 * RB - 0.1, BALL_OFF = BALL_ON - 3.6;
const TH = 0.5;                          // lever swing ±0.5 rad
const NTH = 9, NHT = 3;
const RAIL_Z = 5, RAIL_DY = 8, END = 302;
const PLATE = { x: -322, y: -54, w: 644, d: 102, r: 10 };
const POST_Y = -34;
const PIP = { stand: [-70, -40], tip: [-8, 8, ZTOP + 16] };

const AZ = +(process.env.AZ || 64);
const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [-XR, 0, ZTOP], [XR, 0, ZTOP], [PIP.stand[0], PIP.stand[1], ZTOP + 60], [0, 0, ZTOP + 40]], W, H, { pad: 10, azimuth: AZ });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const V = G.viewOf(P);
const ax = (x, z) => G.frameAlong([x, 0, z], [1, 0, 0]);
const tube = (pts, r, style, opts = {}) => tubePieces(pts, r, P, { maxLength: 40, ...opts }).map((p) => tubeSvg(p, style)).join("");

// a helical line on a cylinder (actin strand, tropomyosin), only where it faces the viewer
function helix(F, s0, s1, r, pitch, phase, least = 0.08) {
  const runs = []; let run = [];
  for (let s = s0; s <= s1 + 1e-6; s += 0.6) {
    const t = phase + (s / pitch) * 2 * Math.PI;
    const facing = G.dot3(G.radialOf(F, t), V);
    if (facing > least) run.push(at(G.pointOf(F, s, r, t)));
    else if (run.length) { if (run.length > 1) runs.push(k.pathOf(run)); run = []; }
  }
  if (run.length > 1) runs.push(k.pathOf(run));
  return runs.join("");
}

// ---------- static parts ----------
function railsAndEnds(sx) { // one end block; the rails go between the far block and the near one
  const out = [];
  if (sx) {
    const x = sx * END;
    out.push(S(k.slabOf({ x: x - 9, y: -18, w: 18, d: 36, r: 2 }, 0, 16, P, 6, 0.8), { tone: "mid" }));
    out.push(D([at([x - 5, -13, 16]), at([x + 5, 13, 16]), at([x - 5, 13, 16]), at([x + 5, -13, 16])], { size: 0.45 }));
    out.push(L(k.planOutline(k.insetPlan({ x: x - 9, y: -18, w: 18, d: 36, r: 2 }, 3), 16, P, 6), { tone: "faint" }));
    return out.join("");
  }
  for (const dy of [-RAIL_DY, RAIL_DY]) {
    const F = G.frameAlong([-END + 9, dy, RAIL_Z], [1, 0, 0]);
    out.push(S(G.disc(0, 2 * END - 18, 2.2, F, P), { tone: "mid", crease: "none" }));
  }
  return out.join("");
}
// M-line post behind the lattice, an arm to each thick filament's bare zone
function mPost() {
  const out = [];
  out.push(S(k.cylinder(0, POST_Y, 9, 0, 2.4, P, 28, 0.4), { tone: "mid" }));
  out.push(D(k.corners({ x: -6, y: POST_Y - 6, w: 12, d: 12 }).map(([x, y]) => at([x, y, 2.4])), { size: 0.4 }));
  out.push(S(k.cylinder(0, POST_Y, 3.4, 2.4, THICK_Z[1] + 4 - 2.4, P, 20), { tone: "mid", crease: "none" }));
  for (const z of THICK_Z) {
    out.push(S(k.cylinder(0, POST_Y, 5, z - 3, 6, P, 24, 0.4), { tone: "mid" }));
    out.push(L(k.knurl(0, POST_Y, 5, z - 2, z + 2, 18, P), { tone: "faint" }));
    out.push(S(G.disc(0, -POST_Y - RTHICK - 1.6, 1.8, G.frameAlong([0, POST_Y + 4.6, z], [0, 1, 0]), P), { tone: "mid", crease: "none" }));
  }
  return out.join("");
}
// a thick filament: tapered tips, a bare zone, a crown arc at every 43 nm repeat, M-line collars
function thick(z, half) {
  const out = [];
  const s0 = half < 0 ? -THICK_H : 2.2, s1 = half < 0 ? -2.2 : THICK_H;
  const F = ax(s0, z);
  const len = s1 - s0, taper = 14;
  const prof = [];
  if (half < 0) { prof.push([0, 0]); for (let i = 0; i <= 8; i++) { const s = (i / 8) * taper; prof.push([s, RTHICK * (0.45 + 0.55 * Math.sin((i / 8) * Math.PI / 2)), 1]); } prof.push([len, RTHICK], [len, 0]); }
  else { prof.push([0, 0], [0, RTHICK]); for (let i = 8; i >= 0; i--) { const s = len - (i / 8) * taper; prof.push([s, RTHICK * (0.45 + 0.55 * Math.sin((i / 8) * Math.PI / 2)), 1]); } prof.push([len, 0]); }
  out.push(S(G.solidOf(prof, F, P, { smooth: true }), { tone: "hi" }));
  const arcs = [];
  for (let x = BARE + HEAD_DX / 2; x < THICK_H - taper; x += HEAD_DX) arcs.push(G.arcOf(F, (half < 0 ? -x : x) - s0, RTHICK, P));
  out.push(L(arcs.join(""), { tone: "faint" }));
  out.push(L(helix(F, half < 0 ? taper : 1, half < 0 ? len - 1 : len - taper, RTHICK, 43 * X * 3, half < 0 ? 0 : 1.3, 0.25), { tone: "faint", free: true }));
  // M-line collar (M-protein / myomesin) right at the centre
  const M = ax(half < 0 ? -2.2 : 0, z);
  out.push(S(G.disc(0, 2.2, RTHICK + 1.4, M, P), { tone: "mid" }));
  return out.join("");
}
// a thin filament from a Z disc face toward the M line: eosin-stained actin with its two helical strands, a pointed-end cap
function thin(z, side) {
  const x0 = side * (XR - ZW / 2); const dir = -side;
  const F = G.frameAlong([x0, 0, z], [dir, 0, 0]);
  const out = [];
  out.push(S(G.disc(0, THIN_L, RTHIN, F, P), { tone: "hi" }));
  out.push(L(helix(F, 0.5, THIN_L - 0.5, RTHIN, 72 * X * 0.5 / 0.5, 0) + helix(F, 0.5, THIN_L - 0.5, RTHIN, 72 * X, Math.PI), { tone: "lo" }));
  // pointed end: tropomodulin cap
  out.push(S(G.sphereOf(G.pointOf(F, THIN_L + 0.6, 0, 0), RTHIN * 0.8, P, { steps: 24 }), { tone: "mid" }));
  return stain("eosin", out.join(""), 0.4);
}
// tropomyosin in the groove: blocked (Ca²⁺ off) and open (rolled ~25° over) versions, cross-faded live
function tropo(z, side, open) {
  const x0 = side * (XR - ZW / 2); const F = G.frameAlong([x0, 0, z], [-side, 0, 0]);
  return L(helix(F, 1, THIN_L - 2, RTHIN + 0.35, 72 * X, open ? Math.PI / 2 + 0.45 : Math.PI / 2, 0.15), { tone: "mid" });
}
// troponin sites every 38.5 nm along the face that looks at the viewer; returns [x-on-filament-from-Z, screen point]
function troponins(z, side) {
  const x0 = side * (XR - ZW / 2); const F = G.frameAlong([x0, 0, z], [-side, 0, 0]);
  const t = G.angleToward(F, G.add3(V, [0, 0, 0.35]));
  const list = [];
  for (let s = 38.5 * X * 0.6; s < THIN_L - 3; s += 38.5 * X) list.push([s, at(G.pointOf(F, s, RTHIN + 0.7, t))]);
  return list;
}
// one Z disc: an α-actinin lattice plate with the thin filaments' anchor sockets, the next sarcomere's filaments cut short
function zDisc(side) {
  const xc = side * XR; const out = [];
  const plan = { x: xc - ZW / 2, y: -16, w: ZW, d: 32, r: 1.4 };
  const stubs = THIN_Z.map((z) => { const F = G.frameAlong([xc + side * ZW / 2, 0, z], [side, 0, 0]); return stain("eosin", S(G.disc(0, 22, RTHIN, F, P), { tone: "hi" }) + L(helix(F, 0.5, 21.5, RTHIN, 72 * X, 0.7), { tone: "lo" }), 0.4); }).join("");
  if (side < 0) out.push(stubs);
  out.push(S(k.slabOf(plan, ZBOT, ZTOP - ZBOT, P, 4, 0.6), { tone: "mid" }));
  // zig-zag α-actinin cross-links on the face toward the viewer
  const zz = []; const yF = 16;
  for (let z = ZBOT + 4; z < ZTOP - 6; z += 6) zz.push(k.pathOf([at([xc - ZW / 2 + 0.8, yF, z]), at([xc + ZW / 2 - 0.8, yF, z + 3]), at([xc - ZW / 2 + 0.8, yF, z + 6])]));
  out.push(L(zz.join(""), { tone: "faint" }));
  if (side > 0) out.push(stubs);
  // sockets on the M-facing face (only the left one faces the viewer)
  if (side < 0) for (const z of [...THIN_Z, ...THICK_Z]) out.push(L(G.circleOf(G.frameAlong([xc + ZW / 2, 0, z], [1, 0, 0]), 0.05, THIN_Z.includes(z) ? RTHIN + 1.2 : 1.4, P), { tone: "lo" }));
  return out.join("");
}
function zDiscLow(side) { // carriage + stem under a Z disc
  const xc = side * XR; const out = [];
  const cp = { x: xc - 14, y: -15, w: 28, d: 30, r: 3 };
  out.push(S(k.slabOf(cp, RAIL_Z + 1.8, 7, P, 6, 0.8), { tone: "mid" }));
  out.push(D(k.corners(k.insetPlan(cp, 3.5)).map(([x, y]) => at([x, y, RAIL_Z + 8.8])), { size: 0.42 }));
  out.push(L(k.planOutline(k.insetPlan(cp, 2), RAIL_Z + 8.8, P, 6), { tone: "faint" }));
  out.push(S(k.cylinder(xc, 0, 5.4, RAIL_Z + 8.8, 3, P, 24, 0.4), { tone: "mid" }));
  out.push(L(k.knurl(xc, 0, 5.4, RAIL_Z + 9.4, RAIL_Z + 11.4, 18, P), { tone: "faint" }));
  out.push(S(k.cylinder(xc, 0, 2.6, RAIL_Z + 11.8, ZBOT - RAIL_Z - 11.8, P, 20), { tone: "mid", crease: "none" }));
  // pointer arm out over the ruler: reads the Z line position
  const F = G.frameAlong([xc, 15, RAIL_Z + 5], [0, 1, 0]);
  out.push(S(G.disc(0, 26, 1.1, F, P), { tone: "mid", crease: "none" }));
  out.push(L(k.pathOf([at([xc, 41, RAIL_Z + 5]), at([xc, 45.5, 0.8])]), { tone: "hi" }));
  out.push(D([at([xc, 45.5, 0.8])], { size: 0.8, tone: "hi" }));
  return out.join("");
}
function pipette() {
  const [sx, sy] = PIP.stand; const top = ZTOP + 52;
  let out = standRod(sx, sy, top, P, { clampAt: top - 10 });
  const holder = [[sx, sy, top - 4], [sx + 30, sy + 14, top - 4]];
  out += S(G.disc(0, 34, 3.4, G.frameAlong([sx - 3.4, sy + 1.6, top - 4], G.sub3(holder[1], holder[0])), P), { tone: "mid" });
  const a = holder[1], tip = PIP.tip;
  const glass = tubePieces([a, tip], (t) => 2.6 * (1 - t) + 0.9 * t, P, { maxLength: 30 }).map((p) => `<g class="bio-pipette">${tubeSvg(p, { tone: "mid" })}</g>`).join("");
  // the bath it delivers: a faint Ca²⁺-indicator tint in the glass (Fluo dye, green)
  return out + glass;
}

// heads: every head base along each face of each thick filament, in both halves
const HEADS = [];
for (let r = 0; r < 2; r++) for (const n of [-1, 1]) for (const half of [-1, 1]) for (let x = BARE + HEAD_DX / 2; x < THICK_H - 10; x += HEAD_DX) HEADS.push({ x: half * x, z: THICK_Z[r], n, m: -half, row: r * 2 + (n > 0 ? 1 : 0), thin: r + (n > 0 ? 1 : 0), half });
// head pose library: base at the origin of a thick axis; θ index, height index (0 off … 2 on), normal n, direction m, lit
function headPose(ti, hi, n, m, lit) {
  const th = -TH + (2 * TH * ti) / (NTH - 1);
  const bz = BALL_OFF + (BALL_ON - BALL_OFF) * (hi / (NHT - 1));
  const Lc = LL + 1.1 * RB;
  const ball = [m * Lc * Math.sin(th), 0, n * bz];                 // motor-domain centre
  const hinge = [0, 0, n * (bz - Lc * Math.cos(th))];              // S2 / lever junction
  const d = G.unit3(G.sub3(ball, hinge));
  const base = [0, 0, n * (RTHICK - 0.4)];
  let s = "";
  s += tube([base, hinge], 0.8, { tone: "mid" });                   // S2, from the backbone
  s += S(G.sphereOf(hinge, 1.05, P, { steps: 16 }), { tone: "mid" });
  s += tube([hinge, G.add3(hinge, G.mul3(d, LL + 0.6))], 0.95, { tone: lit ? "lit" : "mid" }); // lever arm (light-chain domain)
  // motor domain: a pear along the lever, its narrow end on actin
  // motor domain: a big lobe and the narrower actin-binding lobe at its tip, drawn back to front
  const lobes = [[ball, RB], [G.add3(ball, G.mul3(d, 0.95 * RB)), 0.62 * RB]].sort((p, q) => k.depthOf(p[0], P) - k.depthOf(q[0], P));
  for (const [c, r] of lobes) s += S(G.sphereOf(c, r, P, { steps: 16 }), { tone: "hi" });
  if (hi === 0) s += stain("atp", D([at(G.add3(ball, [0, RB * 0.8, 0]))], { size: 1.15, tone: "hi" }), 1);
  return s;
}
const defs = [];
for (const n of [-1, 1]) for (const m of [-1, 1]) for (let ti = 0; ti < NTH; ti++) for (let hi = 0; hi < NHT; hi++) for (const lit of hi === NHT - 1 ? [0, 1] : [0]) {
  const o = at([0, 0, 0]);
  defs.push(`<g id="h${n > 0 ? "u" : "d"}${m > 0 ? "p" : "n"}${ti}_${hi}${lit ? "L" : ""}" transform="translate(${(-o[0]).toFixed(2)} ${(-o[1]).toFixed(2)})">${headPose(ti, hi, n, m, lit)}</g>`);
}
const headUse = HEADS.map((h, i) => { const o = at([h.x, 0, h.z]); return `<use data-h="${i}" href="#h${h.n > 0 ? "u" : "d"}${h.m > 0 ? "p" : "n"}0_0" x="${o[0].toFixed(2)}" y="${o[1].toFixed(2)}"/>`; });

// troponins, with seeded per-site thresholds so the bound count is exact and stable
const R = rng(12);
const TN = [];
const tnSvg = { L: THIN_Z.map(() => ""), R: THIN_Z.map(() => "") };
THIN_Z.forEach((z, r) => {
  for (const side of [-1, 1]) {
    const key = side < 0 ? "L" : "R"; let off = "", on = "";
    for (const [s, p] of troponins(z, side)) {
      const i = TN.length; TN.push({ r, side, x: side * (XR - ZW / 2) - side * s, u: R() });
      off += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="0.95"/>`;
      on += `<circle data-tn="${i}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="1.45" opacity="0"/>`;
    }
    tnSvg[key][r] = `<g class="iso-dots" data-tone="lo">${off}</g>` + stain("calcium", `<g class="iso-dots" data-tone="hi">${on}</g>`, 1);
  }
});

// ---------- paint, bottom row to top row ----------
const sideG = (side, html) => `<g data-side="${side < 0 ? "L" : "R"}">${html}</g>`;
const rows = [];
for (let r = 0; r < 3; r++) {
  for (const side of [-1, 1]) rows.push(sideG(side, thin(THIN_Z[r], side) + `<g data-tropo="0">${tropo(THIN_Z[r], side, false)}</g><g data-tropo="1" opacity="0">${tropo(THIN_Z[r], side, true)}</g>` + tnSvg[side < 0 ? "L" : "R"][r]));
  if (r < 2) {
    rows.push(`<g data-heads="${r * 2}">${HEADS.map((h, i) => (h.row === r * 2 ? headUse[i] : "")).join("")}</g>`);
    rows.push(thick(THICK_Z[r], -1) + thick(THICK_Z[r], 1) + `<g data-titin="${r}"></g>`);
    rows.push(`<g data-heads="${r * 2 + 1}">${HEADS.map((h, i) => (h.row === r * 2 + 1 ? headUse[i] : "")).join("")}</g>`);
  }
}

const svg = k.figureSvg({
  width: W, height: H,
  label: "One sarcomere on a bench. Two Z discs stand on carriages that run on a pair of rails, each held outward by a coil spring to an end block. Between them, thin actin filaments reach in from each Z disc and interleave with two thick myosin filaments, which are held at the M line by a post behind. Myosin heads bridge the gaps. A glass perfusion pipette above sets the calcium. With calcium the heads bind, swing and let go, and the thin filaments slide in, pulling the Z discs toward each other.",
  body: [
    `<defs>${defs.join("")}</defs>`,
    plinth(PLATE, P, { scale: { x: -310, y: PLATE.y + PLATE.d - 13, w: 620, step: 20, every: 5 }, label: { x: PLATE.x + 16, y: PLATE.y + 12, w: 40 } }),
    mPost(), railsAndEnds(-1), railsAndEnds(0), railsAndEnds(1),
    `<g data-spring="L"></g>`,
    pipette(),
    sideG(-1, zDiscLow(-1)), sideG(-1, zDisc(-1)),
    sideG(1, zDiscLow(1)),
    `<g data-spring="R"></g>`,
    ...rows,
    sideG(1, zDisc(1)),
    `<g data-part="ions"></g>`,
  ],
});

const HEAD_META = HEADS.map((h) => [h.x, h.n, h.m, h.thin, h.half]);
const TN_META = TN.map((t) => [t.r, t.side, +t.x.toFixed(2), +t.u.toFixed(3)]);
const live = `
const P=${JSON.stringify(P)}; const X=${X}, SL0=${SL0}, XR=${XR}, ZW=${ZW}, THIN_L=${THIN_L}, THICK_H=${THICK_H}, RTHICK=${RTHICK}, NTH=${NTH}, NHT=${NHT}, END=${END}, RAIL_Z=${RAIL_Z};
const THICK_Z=${JSON.stringify(THICK_Z)}, PIPTIP=${JSON.stringify(PIP.tip)}, ZTOP=${ZTOP};
const HM=${JSON.stringify(HEAD_META)}, TM=${JSON.stringify(TN_META)};
const stage=document.querySelector(".iso-stage"), svg=stage.querySelector("svg"), readout=document.querySelector("[data-readout]");
const at=(p)=>K.iso(p,P), L=(d,st)=>K.lineSvg(d,st);
const stainG=(n,h,a)=>'<g class="bio-stain" style="--stain:var(--stain-'+n+');--stain-k:'+a+'">'+h+'</g>';
const sides={L:[...svg.querySelectorAll('[data-side="L"]')],R:[...svg.querySelectorAll('[data-side="R"]')]};
const uses=[...svg.querySelectorAll("use[data-h]")].sort((a,b)=>a.dataset.h-b.dataset.h);
const tnOn=[...svg.querySelectorAll("[data-tn]")].sort((a,b)=>a.dataset.tn-b.dataset.tn);
const tropo0=[...svg.querySelectorAll('[data-tropo="0"]')], tropo1=[...svg.querySelectorAll('[data-tropo="1"]')];
const titinG=[...svg.querySelectorAll("[data-titin]")], springG={L:svg.querySelector('[data-spring="L"]'),R:svg.querySelector('[data-spring="R"]')}, ionG=svg.querySelector('[data-part="ions"]');
// ---- the model (frog, ~5 °C-ish kinetics scaled; shown 20× slower) ----
const PCA50=5.8, NH=3, SLOW=20;
const VMAX=10/SLOW;           // unloaded shortening ~10 µm/s per sarcomere (~4 lengths/s, frog fibre near 20 °C), µm per screen-second
const KL=2.2;                 // load springs: P0 per µm of shortening below the 2.5 µm rest length
const theta=(pca)=>1/(1+Math.pow(10,NH*(pca-PCA50)));
const overlap=(sl)=>sl>=2.0&&sl<=2.25?1:sl>2.25?Math.max(0,(3.65-sl)/1.4):Math.max(0,1-(2.0-sl)*2.5); // Gordon et al. 1966
let pCa=7, pCaT=7, act=0, SL=SL0, F=0, bound=0;
const hs=HM.map(()=>({st:0,t:0,ti:0,hi:0,lit:0,key:""}));
const DUR=[0,0.22,0.55,0.18,0.18,0.4]; // 1 bind, 2 stroke, 3 ADP off, 4 ATP on → detach, 5 re-cock (hydrolysis)
const ease=(t)=>t<0?0:t>1?1:t*t*(3-2*t);
const tnBound=new Uint8Array(TM.length);
function covered(h){ // does the thin filament this head faces reach over it, and is a troponin site near it switched on?
  const [x,,, thinRow, half]=h; const shift=(SL0-SL)*1000*X/2; const zx=half<0?-XR+ZW/2+shift:XR-ZW/2-shift; const tip=half<0?zx+THIN_L:zx-THIN_L;
  if(half<0? x>tip-1.5 : x<tip+1.5) return false;
  let best=1e9,on=false; for(let i=0;i<TM.length;i++){ const t=TM[i]; if(t[0]!==thinRow||t[1]!==half) continue; const tx=t[2]+(half<0?shift:-shift); const d=Math.abs(tx-x); if(d<best){best=d;on=tnBound[i]===1;} }
  return on;
}
function stepHeads(dt,rate){
  bound=0;
  for(let i=0;i<hs.length;i++){ const h=hs[i];
    if(h.st===0){ h.ti=0; h.hi=0; h.lit=0; if(dt>0&&covered(HM[i])&&Math.random()<rate*dt){ h.st=1; h.t=0; } }
    else { h.t+=dt/(DUR[h.st]*(h.st===2?1+1.6*Math.min(1,F/Math.max(0.05,act*overlap(SL))):1)); if(h.t>=1){ h.t=0; h.st=h.st===5?0:h.st+1; } }
    const t=ease(h.t);
    if(h.st===1){ h.ti=0; h.hi=Math.round(t*(NHT-1)); }
    if(h.st===2){ h.ti=Math.round(t*(NTH-1)); h.hi=NHT-1; h.lit=1; }
    if(h.st===3){ h.ti=NTH-1; h.hi=NHT-1; h.lit=0; }
    if(h.st===4){ h.ti=NTH-1; h.hi=Math.round((1-t)*(NHT-1)); }
    if(h.st===5){ h.ti=Math.round((1-t)*(NTH-1)); h.hi=0; }
    if(h.st>=1&&h.st<=3) bound++;
    const m=HM[i]; const key="#h"+(m[1]>0?"u":"d")+(m[2]>0?"p":"n")+h.ti+"_"+h.hi+(h.lit?"L":"");
    if(key!==h.key){ h.key=key; uses[i].setAttribute("href",key); }
  }
}
function coilX(x0,x1,y,z,r,turns){ // a helical spring along x, split into back and front runs
  const b=[],f=[]; let run=[],near=null; const n=Math.max(8,Math.round(turns*18));
  for(let i=0;i<=n;i++){ const a=i/n*turns*Math.PI*2; const p=[x0+(x1-x0)*i/n,y+r*Math.cos(a),z+r*Math.sin(a)]; const fc=K.depthOf([0,Math.cos(a),Math.sin(a)],P)>0; const q=at(p);
    if(near===null) near=fc; if(fc!==near){ run.push(q); (near?f:b).push(K.pathOf(run)); run=[q]; near=fc; } else run.push(q); }
  if(run.length>1)(near?f:b).push(K.pathOf(run)); return {back:b.join(""),front:f.join("")};
}
function draw(){
  const shift=(SL0-SL)*1000*X/2;
  const tL=K.translateAlong(P,[shift,0,0]), tR=K.translateAlong(P,[-shift,0,0]);
  for(const g of sides.L) g.setAttribute("transform",tL); for(const g of sides.R) g.setAttribute("transform",tR);
  const open=Math.min(1,act*1.15).toFixed(2); for(const g of tropo1) g.setAttribute("opacity",open); for(const g of tropo0) g.setAttribute("opacity",(1-open).toFixed(2));
  for(let i=0;i<TM.length;i++) tnOn[i].setAttribute("opacity",tnBound[i]?"1":"0");
  // titin: a coil from each Z disc face to the thick filament tip
  THICK_Z.forEach((z,r)=>{ let h=""; for(const s of [-1,1]){ const zf=s*(XR-shift-ZW/2), tip=s*(THICK_H+0.5); const c=coilX(zf,tip,0,z,1.5,Math.abs(zf-tip)/5);
      h+=L(c.back,{tone:"faint"})+L(c.front,{tone:"lo"})+K.dotsSvg([at([zf,0,z]),at([tip,0,z])],{size:0.6,tone:"mid"}); }
    titinG[r].innerHTML=h; });
  // load springs on the rails: carriage outer face to end block
  for(const s of [-1,1]){ const xc=s*(XR-shift); const c=coilX(xc+s*14,s*(END-9),0,RAIL_Z+4.5,3.2,7);
    springG[s<0?"L":"R"].innerHTML=L(c.back,{tone:"lo"})+L(c.front,{tone:"mid"})+K.dotsSvg([at([xc+s*14,0,RAIL_Z+4.5]),at([s*(END-9),0,RAIL_Z+4.5])],{size:0.7,tone:"mid"}); }
  // Ca²⁺ leaving the pipette: a short counted stream, denser with more calcium
  const n=Math.round(Math.max(0,(7-pCa))*4); let pts=[];
  for(let i=0;i<n;i++){ const u=((clock*0.35+i/n)%1); const p=[PIPTIP[0]-u*6+Math.sin(i*2.3)*u*14, PIPTIP[1]+Math.cos(i*1.7)*u*9, PIPTIP[2]-1.5-u*20]; const q=at(p); pts.push([q[0],q[1],u<0.75?1:(1-u)*4]); }
  ionG.innerHTML=n?stainG("calcium",K.dotsSvg(pts,{size:1.35,tone:"hi"}),1):"";
}
let clock=0;
function say(){ vitaSay(stage,readout,"pCa "+pCa.toFixed(1)+" · SL "+SL.toFixed(2)+" µm · "+bound+" heads on · "+F.toFixed(2)+" P₀"); stage.setAttribute("aria-valuenow",pCa.toFixed(1)); }
const TOUR=16;
vitaLoop({ stage, idleMs:5000,
  frame(dt,st){
    clock+=dt;
    if(st.touring){ const ph=(st.clock%TOUR)/TOUR; pCaT=ph<0.06?7-2.3*ph/0.06:ph<0.5?4.7:ph<0.62?4.7+2.3*(ph-0.5)/0.12:7; }
    if(st.still){ pCaT=4.7; pCa=4.7; act=theta(pCa); SL=2.06; }
    pCa+=(pCaT-pCa)*(1-Math.exp(-dt/0.25));
    const th=theta(pCa); act+=(th-act)*(1-Math.exp(-dt/0.3));
    for(let i=0;i<TM.length;i++){ const u=TM[i][3]; if(!tnBound[i]&&u<th-0.03) tnBound[i]=1; else if(tnBound[i]&&u>th+0.03) tnBound[i]=0; }
    if(st.still) for(let i=0;i<TM.length;i++) tnBound[i]=TM[i][3]<th?1:0;
    const F0=act*overlap(SL); const load=Math.max(0,KL*(SL0-SL));
    let v; // shortening velocity, µm/s (Hill: a/P0 = 0.25); lengthening when the spring wins
    if(load<=F0) v=VMAX*(F0-load)/(F0+load/0.25+1e-6)*Math.min(1,F0*4); else v=-VMAX*0.6*(load-F0)/(0.15+load-F0);
    if(dt>0) SL=Math.max(2.02,Math.min(SL0,SL-v*dt));
    F=load;
    stepHeads(st.still?0:dt, 1.4*act);
    if(st.still){ for(let i=0;i<hs.length;i++){ const h=hs[i]; if(covered(HM[i])&&(i*7)%5<2){ h.st=2; h.t=((i*37)%10)/10; } } stepHeads(0,0); }
    draw(); say();
  },
  pointer(x){ pCaT=7-x*2.4; },
  keys(key){ if(key==="ArrowRight"||key==="ArrowUp"){ pCaT=Math.max(4.6,pCaT-0.2); return true; } if(key==="ArrowLeft"||key==="ArrowDown"){ pCaT=Math.min(7,pCaT+0.2); return true; } if(key===" "){ pCaT=pCaT>5.8?4.7:7; return true; } return false; },
});
`;
const body = k.plateHtml({
  fig: "Fig 12", title: "Sarcomere", hint: "Hover ↔ calcium",
  readout: "pCa 7.0 · SL 2.50 µm · 0 heads on · 0.00 P₀",
  keys: [{ mark: "lit", label: "Lever arm in its power stroke" }, { mark: "eosin", label: "Actin (thin)" }, { mark: "calcium", label: "Ca²⁺ on troponin" }, { mark: "atp", label: "ATP / ADP·Pi on a free head" }],
  caption: "One sarcomere of frog skeletal muscle, cut to a single plane of its filament lattice. Ruler: 1 tick = 100 nm; lengths along the filaments are true (thick 1.6 µm, thin 0.95 µm), widths, lattice spacing and myosin heads are drawn 5× larger. Ca²⁺ from the pipette binds troponin (green dots); tropomyosin (the grey strand) rolls aside, and myosin heads that face an open site bind, swing their lever arm toward the M line (lit), release ADP, take a new ATP, let go and re-cock. Each stroke pulls the thin filament ~5–10 nm; asynchronous heads make the slide smooth and both Z discs move in against their load springs. Remove Ca²⁺ and the springs pull the sarcomere back out to 2.5 µm. Only one head pair per 43 nm repeat is drawn. Shown about 20× slower.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Sarcomere: arrow keys change the calcium (pCa)" aria-valuemin="4.6" aria-valuemax="7" aria-valuenow="7">${svg}</div>`,
});
const page = vitaPage({ n: "12", title: "Sarcomere", zh: "肌节 · 肌丝滑行", en: "Sarcomere · sliding filaments", body, script: liveScript() + LOOP_SRC + live,
  facts: [
    ["2.0–2.25 µm", "全重叠的肌节长度（蛙）", "sarcomere length at full overlap (frog)"],
    ["1.6 / 0.95 µm", "粗肌丝 / 细肌丝长度", "thick / thin filament length"],
    ["~5–10 nm", "每个横桥一次做功冲程", "working stroke per cross-bridge"],
    ["~2–20 /s", "每个肌球蛋白头的循环（等长→快速缩短）", "cycles per myosin head (isometric → fast shortening)"],
    ["pCa ~5.8", "肌钙蛋白半激活（约 1.6 µM Ca²⁺）", "half-activation of troponin (~1.6 µM Ca²⁺)"],
  ] });
writeFileSync(join(OUT, "12-sarcomere.html"), page);
console.log("wrote 12-sarcomere.html", (page.length / 1024).toFixed(0) + " KB");
