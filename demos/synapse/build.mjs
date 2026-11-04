// 11 · Synapse — a cut-open teaching model of one excitatory synapse (rodent hippocampus, CA3 → CA1, Schaffer collateral):
// a presynaptic bouton held on its axon above a dendritic spine that rises from a dendrite lying on two cradles. The near
// half of bouton and spine is cut away, so the vesicles, the active zone, the cleft and the receptors face the reader.
// A recording rig (stimulating pipette on the axon, patch pipette on the dendrite, a two-trace amplifier) measures it.
// What moves: one synaptic transmission. The action potential runs down the axon; Ca²⁺ channels at the active zone open;
// each docked vesicle fuses with a probability set by external Ca²⁺ (∝ [Ca]⁴); glutamate crosses the cleft, binds AMPA
// receptors, they open and Na⁺ flows into the spine; the EPSP shows on the amplifier; glutamate is cleared, vesicles re-dock.
// The control is external [Ca²⁺] (hover / arrows); click or Space fires the axon.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, liveScript, LOOP_SRC, RNG_SRC, rng, plinth, standRod, stain, vitaPage, byDepth, scene } from "../../bio/bio.mjs";
import { tubePieces, tubeSvg } from "../../kit/tube.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../site/demos");
const W = 720, H = 600;
const UM = 200; // 1 µm = 200 units (1 nm = 0.2)
const MEM = 2.6; // a 7 nm bilayer drawn ~2× thick
// dendrite: a thin oblique CA1 dendrite, ~0.4 µm across, lying along y
const RD = 0.2 * UM, ZD = RD + 18;
// spine: ~0.5 µm head on a ~0.6 µm neck; its top is flattened where the PSD (~0.04 µm², Schikorski & Stevens 1997) sits
const RH = 0.25 * UM, AZR = 24; // active-zone / PSD radius: 0.12 µm → 0.045 µm²
const HCH = Math.sqrt(RH * RH - AZR * AZR);
const ZST = 228; // spine top (postsynaptic membrane)
const ZH0 = ZST - HCH - RH; // bottom of the head
const CLEFT = 32; // 20 nm cleft drawn 8× wide (160 nm)
const ZBB = ZST + CLEFT; // bouton floor (presynaptic membrane, the active zone)
const RB = 0.4 * UM, HCB = Math.sqrt(RB * RB - AZR * AZR);
const ZBT = ZBB + HCB + RB; // bouton top
const RV = 4; // vesicle radius: 40 nm across
const PLATE = { x: -248, y: -222, w: 318, d: 432, r: 12 };
const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [0, 0, ZBT + 8], [-60, -170, ZBT], [0, 0, ZBB]], W, H, { pad: 8, azimuth: 28, elevation: 24 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const rand = rng(1897); // Sherrington names the synapse, 1897
// the cut: the plane x = 0; the near half (x > 0) is removed, so everything we see inside has x ≤ 0.
const rB = (s) => Math.sqrt(Math.max(0, RB * RB - (s - HCB) ** 2)); // bouton radius at height s above its floor
const rH = (s) => Math.sqrt(Math.max(0, RH * RH - (s - RH) ** 2)); // spine head radius at height s above its bottom

// ---------- cut-face helpers: the profile in the plane x = 0 ----------
const profileOf = (rf, z0, s0, s1, inset = 0, n = 90) => {
  const right = [], left = [];
  for (let i = 0; i <= n; i++) { const s = s0 + ((s1 - s0) * i) / n; const r = Math.max(0, rf(s) - inset); right.push([0, r, z0 + s]); left.push([0, -r, z0 + s]); }
  return [...right, ...left.reverse()];
};
const screen = (pts) => pts.map(at);
function aboveLowerChain(pts) { // the screen region over the cut profile's lower edge: where the back half can show
  const sp = screen(pts);
  let lo = 0, hi = 0; sp.forEach((p, i) => { if (p[0] < sp[lo][0]) lo = i; if (p[0] > sp[hi][0]) hi = i; });
  const n = sp.length; const walk = (a, b, d) => { const out = []; for (let i = a; ; i = (i + d + n) % n) { out.push(sp[i]); if (i === b) break; } return out; };
  const c1 = walk(lo, hi, 1), c2 = walk(lo, hi, -1);
  const mean = (c) => c.reduce((s, p) => s + p[1], 0) / c.length;
  const lower = mean(c1) > mean(c2) ? c1 : c2;
  return k.pathOf([...lower, [sp[hi][0] + 400, sp[hi][1]], [sp[hi][0] + 400, -3000], [sp[lo][0] - 400, -3000], [sp[lo][0] - 400, sp[lo][1]]], true);
}
function backHull(rf, z0, s0, s1) { // the screen outline of the half-body x ≤ 0 (the near half is cut away)
  const pts = [];
  for (let i = 0; i <= 48; i++) { const sv = s0 + ((s1 - s0) * i) / 48, r = rf(sv); for (let j = 0; j <= 36; j++) { const t = Math.PI / 2 + (Math.PI * j) / 36; pts.push(at([r * Math.cos(t), r * Math.sin(t), z0 + sv])); } }
  return k.pathOf(G.hullOf(pts), true);
}
const backArc = (z, r, from = Math.PI / 2, to = Math.PI * 1.5, n = 40) => { const pts = []; for (let i = 0; i <= n; i++) { const t = from + ((to - from) * i) / n; pts.push(at([r * Math.cos(t), r * Math.sin(t), z])); } return k.pathOf(pts); };

// ---------- the bench: plinth, cradles, the dendrite and its other spines ----------
const DX1 = 46; // the dendrite's cut front end
const FD = G.frameAlong([-235, 0, ZD], [1, 0, 0]);
const LD = 235 + DX1;
const dProfile = [[0, RD * 0.62], [1.2, RD * 0.9, 1], [4, RD, 1], ...Array.from({ length: 5 }, (_, i) => [20 + i * 55, RD * (1 + 0.04 * Math.sin(i * 1.7)), 1]), [LD, RD]];
function cradles() {
  const out = [];
  for (const [x, y] of byDepth([[-180, 0], [-50, 0]], P)) {
    out.push(S(k.cylinder(x, y, 26, 0, 3, P, 36, 0.6), { tone: "mid" }));
    out.push(L(k.ring(x, y, 20, 3, P, 32), { tone: "faint" }));
    out.push(S(k.cylinder(x, y, 6, 3, ZD - RD - 15, P, 22), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(x, y, 9, ZD - RD - 16, 4, P, 24, 0.5), { tone: "mid" }));
    out.push(L(k.knurl(x, y, 9, ZD - RD - 15.5, ZD - RD - 12.5, 20, P), { tone: "faint" }));
    out.push(S(k.slabOf({ x: x - 9, y: y - 24, w: 18, d: 48, r: 2 }, ZD - RD - 12, 7, P, 4, 0.5), { tone: "mid" }));
    out.push(D([at([x, y - 18, ZD - RD - 5]), at([x, y + 18, ZD - RD - 5])], { size: 0.5 }));
  }
  return out.join("");
}
// three neighbouring spines on the same dendrite (stubby, thin, mushroom), uncut
const OTHER = [{ x: -210, a: 0.5, neck: 22, head: 14 }, { x: -150, a: 2.5, neck: 48, head: 20 }, { x: -70, a: 2.35, neck: 40, head: 24 }, { x: 22, a: 2.4, neck: 26, head: 15 }];
function otherSpines(front) {
  const sc = scene(P);
  for (const o of OTHER) {
    if ((Math.cos(o.a) > 0) !== front) continue;
    const d = G.unit3([-0.12, Math.cos(o.a) * 0.7, Math.sin(o.a)]);
    const base = G.add3([o.x, 0, ZD], G.mul3(d, RD - 3));
    const tip = G.add3(base, G.mul3(d, o.neck));
    sc.tube(G.resample([base, G.lerp3(base, tip, 0.5), tip], 2), (t) => 7 - 2.5 * t, { tone: "mid" }, { maxLength: 40 });
    const hc = G.add3(tip, G.mul3(d, o.head * 0.8));
    sc.at(hc, S(G.sphereOf(hc, o.head, P), { tone: "mid" }));
  }
  return sc;
}

// ---------- the subject: spine head and bouton, cut open ----------
const spineOuter = profileOf(rH, ZH0, 0, RH + HCH);
const spineInner = profileOf(rH, ZH0, MEM, RH + HCH - MEM, MEM);
const boutOuter = profileOf(rB, ZBB, 0, HCB + RB);
const boutInner = profileOf(rB, ZBB, MEM, HCB + RB - MEM, MEM);
const spineHull = S(G.solidOf(Array.from({ length: 49 }, (_, i) => { const s = 0.5 + ((RH + HCH - 0.5) * i) / 48; return [s, Math.max(0.5, rH(s)), 1]; }), G.frameAlong([0, 0, ZH0], [0, 0, 1]), P, { smooth: true }), { tone: "hi" });
const boutHull = S(G.solidOf(Array.from({ length: 61 }, (_, i) => { const s = (HCB + RB - 0.5) * i / 60; return [s, Math.max(0.5, rB(s)), 1]; }), G.frameAlong([0, 0, ZBB], [0, 0, 1]), P, { smooth: true }), { tone: "hi" });
const neck = S(G.solidOf([[0, 15], [6, 11, 1], [30, 8.5, 1], [70, 8, 1], [ZH0 - (ZD + RD) + 10, 11, 1], [ZH0 - (ZD + RD) + 16, 13]], G.frameAlong([0, 0, ZD + RD - 6], [0, 0, 1]), P, { smooth: true }), { tone: "hi" });
const rimOf = (outer, inner, tone = "hi") => `<path class="bio-rim" fill-rule="evenodd" d="${k.pathOf(screen(outer), true)}${k.pathOf(screen(inner), true)}"/>`
  + L(k.pathOf(screen(outer), true), { tone }) + L(k.pathOf(screen(inner), true), { tone: "mid" });
// bilayer on the cut: two rows of head-group dots inside the rim
const bilayerDots = (rf, z0, s0, s1, step = 4) => {
  const pts = [];
  for (let s = s0; s <= s1; s += step / 1.6) { const r = rf(s); if (r < 3) continue; for (const sg of [-1, 1]) { pts.push(at([0, sg * (r - 0.6), z0 + s]), at([0, sg * (r - MEM + 0.6), z0 + s])); } }
  return pts;
};
// interior: latitude arcs on the far wall (where the bowl curves away), clipped to the opening
const latB = [0.25, 0.5, 0.72, 0.9].map((f) => { const s = MEM + (HCB + RB - 2 * MEM) * f; return backArc(ZBB + s, rB(s) - MEM); }).join("");
const latS = [0.3, 0.55, 0.78].map((f) => { const s = MEM + (RH + HCH - 2 * MEM) * f; return backArc(ZH0 + s, rH(s) - MEM); }).join("");
// PSD: an electron-dense plate under the postsynaptic membrane, seen in section
const PSD_T = 7; // ~35 nm thick, drawn at true thickness
const psdPoly = [[0, -AZR + 1, ZST - MEM], [0, AZR - 1, ZST - MEM], [0, AZR - 3, ZST - MEM - PSD_T], [0, -AZR + 3, ZST - MEM - PSD_T]];
// actin filaments in the spine head (short faint rules) and the spine apparatus is omitted
const actin = [];
for (let i = 0; i < 14; i++) { const z = ZH0 + 14 + rand() * (RH + HCH - 30); const r = rH(z - ZH0) - MEM - 4; if (r < 6) continue; const y = (rand() * 2 - 1) * r * 0.85; const x = -rand() * 4; const a = rand() * Math.PI; actin.push(k.segment([x, y - 4 * Math.cos(a), z - 4 * Math.sin(a)], [x, y + 4 * Math.cos(a), z + 4 * Math.sin(a)], P)); }
// mitochondrion in the bouton: a small capsule in the back top, its cristae as rules
const MITO = { c: [-40, 22, ZBB + 104], len: 60, r: 13 };
function mito() {
  const F = G.frameAlong([MITO.c[0], MITO.c[1] - MITO.len / 2, MITO.c[2]], [0.15, 1, -0.12]);
  const prof = []; for (let i = 0; i <= 40; i++) { const s = (MITO.len * i) / 40; const e = Math.min(s, MITO.len - s); prof.push([s, Math.max(0.4, e < MITO.r ? Math.sqrt(MITO.r * MITO.r - (MITO.r - e) ** 2) : MITO.r), 1]); }
  return stain("myelin", S(G.solidOf(prof, F, P, { smooth: true }), { tone: "mid" }), 0.45)
    + L([12, 22, 32, 42, 52].map((s) => G.arcOf(F, s, MITO.r, P)).join(""), { tone: "faint" });
}
// receptors (AMPA) on the PSD's back half, Ca²⁺ channels at the edge of the active zone
const REC = [[-4, -15], [-4, -5], [-4, 5], [-4, 15], [-13, -10], [-13, 0], [-13, 10], [-21, -4], [-21, 6]];
const RECH = 5.5, RECR = 2.4;
const CACH = [[-3, -21], [-3, 21], [-12, -19], [-12, 19]];
// docked vesicle sites on the inside of the active zone, and the reserve pool behind them
const DOCK = [[-6, -15], [-6, -2], [-6, 11], [-15, -8], [-15, 5]].map(([x, y]) => [x, y, ZBB + MEM + RV + 0.4]);
const POOL = [];
for (let tries = 0; POOL.length < 26 && tries < 4000; tries++) {
  const z = ZBB + 22 + rand() * 70, s = z - ZBB, r = rB(s) - MEM - RV - 2;
  const x = -4 - rand() * (r - 4), y = (rand() * 2 - 1) * r;
  if (x * x + y * y > r * r) continue;
  if (Math.hypot(x - MITO.c[0], (y - MITO.c[1]) * 0.45, z - MITO.c[2]) < MITO.r + RV + 4) continue;
  if (POOL.some((q) => Math.hypot(q[0] - x, q[1] - y, q[2] - z) < 2 * RV + 1.4)) continue;
  POOL.push([+x.toFixed(1), +y.toFixed(1), +z.toFixed(1)]);
}

// ---------- the rig: axon on a stand, stimulating and recording pipettes, amplifier ----------
const AX_R = 9; // ~0.1 µm axon, drawn ~1× (0.09 µm)
const AXZ = ZBB + 96;
const axonPts = G.resample(G.fillet([[-30, -50, AXZ], [-52, -92, AXZ + 8], [-80, -150, AXZ + 8], [-80, -186, AXZ + 8]], 30, 10), 2);
const AXLEN = G.pathLength(axonPts);
const STAND = [-80, -198];
function axon() {
  const sc = scene(P);
  sc.tube(axonPts, (t) => (t < 0.06 ? AX_R + 7 * (1 - t / 0.06) : AX_R), { tone: "hi" }, { maxLength: 18 });
  return sc;
}
function stand() { // a rod with a small V-block that cradles the axon's cut end
  const z = AXZ + 8 - AX_R - 2;
  return standRod(STAND[0], STAND[1], z - 6, P, { r: 3.2, clampAt: z - 70 })
    + S(k.slabOf({ x: STAND[0] - 14, y: STAND[1] - 8, w: 28, d: 22, r: 2 }, z - 6, 6, P, 4, 0.5), { tone: "mid" })
    + D([at([STAND[0] - 9, STAND[1] + 12, z]), at([STAND[0] + 9, STAND[1] + 12, z])], { size: 0.5 });
}
function manipulator(x, y, h) {
  const out = [];
  out.push(S(k.slabOf({ x: x - 16, y: y - 14, w: 32, d: 28, r: 2 }, 0, 10, P, 4, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 5, 10, h - 26, P, 24), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: x - 12, y: y - 11, w: 24, d: 22, r: 2 }, h - 16, 16, P, 4, 0.6), { tone: "mid" }));
  for (const kz of [h - 8, 5]) { out.push(S(k.cylinder(x + 16, y + 2, 4, kz - 4, 8, P, 20), { tone: "mid" })); out.push(L(k.knurl(x + 16, y + 2, 4, kz - 3, kz + 3, 16, P), { tone: "faint" })); }
  out.push(D([at([x - 8, y + 11, h]), at([x + 8, y + 11, h])], { size: 0.5 }));
  return out.join("");
}
const MANI = [[-170, -200, AXZ - 20], [48, -172, 140]];
const stimTip = G.pointAlong(axonPts, AXLEN * 0.72);
const recTip = [22, -RD * 0.5, ZD + RD * 0.86];
const pipette = (from, tip, r0 = 4) => {
  const pts = G.resample([from, G.lerp3(from, tip, 0.6), tip], 2);
  return tubePieces(pts, (t) => r0 * (1 - t) + 0.8, P, { maxLength: 600 }).map((p) => `<g class="bio-pipette">${tubeSvg(p, { tone: "mid" })}</g>`).join("") + D([at(tip)], { size: 0.8, tone: "hi" });
};
const holderA = [MANI[0][0] + 12, MANI[0][1] + 6, MANI[0][2] - 8], holderB = [MANI[1][0] - 10, MANI[1][1] + 12, MANI[1][2] - 8];
// amplifier with a two-trace screen on its +x face (pre: the axon's spike; post: the EPSP at the dendrite)
const AMP = { x: -238, y: 50, w: 42, d: 160, r: 2 }, AMP_H = 60;
const SCR = { y0: AMP.y + 10, y1: AMP.y + AMP.d - 10, z0: 10, z1: AMP_H - 10 }, SCRX = AMP.x + AMP.w + 0.2;
const corner = (y, z) => at([SCRX, y, z]);
const scrPath = (inset = 0) => k.pathOf([corner(SCR.y0 + inset, SCR.z0 + inset), corner(SCR.y1 - inset, SCR.z0 + inset), corner(SCR.y1 - inset, SCR.z1 - inset), corner(SCR.y0 + inset, SCR.z1 - inset)], true);
const zPre = (mv) => SCR.z0 + 20 + ((mv + 80) / 120) * 14, zPost = (mv) => SCR.z0 + 3 + ((mv + 70.5) / 4) * 14;
function amplifier() {
  const out = [S(k.slabOf(AMP, 0, AMP_H, P, 4, 0.8), { tone: "mid" })];
  out.push(`<path d="${scrPath()}" style="fill:var(--anatomy-shade-1)"/>`, L(scrPath(), { tone: "mid" }));
  out.push(L(k.segment([SCRX, SCR.y0, zPre(-70)], [SCRX, SCR.y1, zPre(-70)], P) + k.segment([SCRX, SCR.y0, zPost(-70)], [SCRX, SCR.y1, zPost(-70)], P), { tone: "faint" }));
  out.push(L(k.segment([SCRX, SCR.y0, SCR.z0 + 18], [SCRX, SCR.y1, SCR.z0 + 18], P), { tone: "lo" }));
  for (const y of [AMP.y + 22, AMP.y + 42, AMP.y + 62]) { out.push(S(k.cylinder(AMP.x + 20, y, 4, AMP_H, 3, P, 20), { tone: "mid" })); out.push(L(k.knurl(AMP.x + 20, y, 4, AMP_H + 0.5, AMP_H + 2.5, 16, P), { tone: "faint" })); }
  out.push(D([at([AMP.x + 14, AMP.y + 100, AMP_H]), at([AMP.x + 26, AMP.y + 100, AMP_H]), at([AMP.x + 14, AMP.y + 112, AMP_H])], { size: 1.1, tone: "lo" }));
  out.push(D([at([SCRX, AMP.y + 4, AMP_H - 4]), at([SCRX, AMP.y + AMP.d - 4, AMP_H - 4]), at([SCRX, AMP.y + 4, 4]), at([SCRX, AMP.y + AMP.d - 4, 4])], { size: 0.5 }));
  return out.join("");
}

// ---------- assemble ----------
const clipSpine = "syn-spine", clipSpineIn = "syn-spine-in", clipBout = "syn-bout", clipBoutIn = "syn-bout-in";
const defs = `<defs><clipPath id="${clipSpine}"><path d="${backHull(rH, ZH0, 0, RH + HCH)}"/></clipPath><clipPath id="${clipSpineIn}"><path d="${k.pathOf(screen(spineInner), true)}"/></clipPath>`
  + `<clipPath id="${clipBout}"><path d="${backHull(rB, ZBB, 0, HCB + RB)}"/></clipPath><clipPath id="${clipBoutIn}"><path d="${k.pathOf(screen(boutInner), true)}"/></clipPath></defs>`;
const othersBack = otherSpines(false), othersFront = otherSpines(true);
const FE = G.frameAlong([DX1, 0, ZD], [1, 0, 0]);
const mts = []; for (let i = 0; i < 11; i++) { const a = i * 2.4 + 0.3, r = (i % 3 === 0 ? 8 : 20) + (i % 2) * 6; mts.push([Math.cos(a) * r, Math.sin(a) * r]); }
const dEnd = `<path class="bio-rim" fill-rule="evenodd" d="${G.circleOf(FE, 0, RD, P)}${G.circleOf(FE, 0, RD - MEM, P)}"/><path class="bio-cavity" d="${G.circleOf(FE, 0, RD - MEM, P)}"/>`
  + L(G.circleOf(FE, 0, RD, P), { tone: "hi" }) + L(G.circleOf(FE, 0, RD - MEM, P), { tone: "mid" })
  + L(mts.map(([u, v]) => G.circleOf(G.frameAlong([DX1, u, ZD + v], [1, 0, 0]), 0, 2.5, P, 12)).join(""), { tone: "mid" }) // microtubules, 25 nm
  + D(mts.map(([u, v]) => at([DX1, u, ZD + v])), { size: 0.4, tone: "lo" });
const dend = S(G.solidOf(dProfile, FD, P, { smooth: true }), { tone: "hi" }) + dEnd
  + L([30, 100, 175].map((s) => G.arcOf(FD, s, RD * 0.995, P)).join(""), { tone: "faint" });
const spineCut = `<g clip-path="url(#${clipSpine})">${spineHull}</g>`
  + `<path class="bio-cavity" d="${k.pathOf(screen(spineInner), true)}"/>`
  + `<g clip-path="url(#${clipSpineIn})">${L(latS, { tone: "faint" })}${L(actin.join(""), { tone: "faint", free: true })}<g data-part="spineIn"></g></g>`
  + `<path d="${k.pathOf(screen(psdPoly), true)}" style="fill:var(--anatomy-shade-0)"/>` + L(k.pathOf(screen(psdPoly), true), { tone: "mid" })
  + rimOf(spineOuter, spineInner) + D(bilayerDots(rH, ZH0, 2, RH + HCH - 1), { size: 0.45, tone: "lo" });
const boutCut = `<g clip-path="url(#${clipBout})">${boutHull}</g>`
  + `<path class="bio-cavity" d="${k.pathOf(screen(boutInner), true)}"/>`
  + `<g clip-path="url(#${clipBoutIn})">${L(latB, { tone: "faint" })}${mito()}<g data-part="boutIn"></g></g>`
  + rimOf(boutOuter, boutInner) + D(bilayerDots(rB, ZBB, 1, HCB + RB - 1), { size: 0.45, tone: "lo" })
  + `<g data-part="azFlash"></g>`;
// receptors and channels are static bodies; their open state is drawn live on top
const recSvg = byDepth(REC, P).map(([x, y]) => S(k.cylinder(x, y, RECR, ZST, RECH, P, 18, 0.3), { tone: "mid" }) + L(k.ring(x, y, 1, ZST + RECH, P, 12), { tone: "lo" })).join("");
const caSvg = byDepth(CACH, P).map(([x, y]) => S(k.cylinder(x, y, 2.2, ZBB - 5, 5, P, 16, 0.3), { tone: "mid" })).join("");

const svg = k.figureSvg({
  width: W, height: H,
  label: "A cut-open teaching model of one synapse. Above, the presynaptic bouton hangs on its axon from a stand; its near half is cut away to show synaptic vesicles, five of them docked on the active zone at the bottom. Below a narrow gap, the synaptic cleft, rises a dendritic spine on a dendrite lying on two cradles, its top carrying receptors on a dark postsynaptic density. A stimulating pipette touches the axon, a recording pipette the dendrite, and an amplifier at the back draws both signals. When the axon fires, calcium enters, vesicles fuse and release glutamate, which crosses the cleft and opens the receptors so sodium flows into the spine.",
  body: [
    defs,
    plinth(PLATE, P, { scale: { x: PLATE.x + 30, y: PLATE.y + PLATE.d - 15, w: 210, step: UM / 10, every: 5 }, label: { x: PLATE.x + PLATE.w - 52, y: PLATE.y + 14, w: 38 } }),
    amplifier(), manipulator(...MANI[0]), manipulator(...MANI[1]),
    k.wireSvg(at([MANI[0][0] - 16, MANI[0][1], 5]), at([AMP.x + 4, AMP.y, 6]), { via: [at([MANI[0][0] - 20, AMP.y - 8, 0])], tone: "lo" }),
    k.wireSvg(at([MANI[1][0] - 16, MANI[1][1], 5]), at([AMP.x + 30, AMP.y, 6]), { via: [at([MANI[1][0] - 22, MANI[1][1], 0]), at([-120, -168, 0]), at([-120, AMP.y - 10, 0]), at([AMP.x + 30, AMP.y - 10, 0])], tone: "lo" }),
    `<path data-part="tracePre" class="iso-line" data-tone="hi" style="stroke-width:1" d=""/>`, `<path data-part="tracePost" class="iso-line" data-tone="lit" style="stroke-width:1.2" d=""/>`,
    stand(), cradles(),
    othersBack.svg(), dend, othersFront.svg(), neck,
    pipette(holderB, recTip),
    spineCut,
    `<g data-part="cleftBack"></g>`, recSvg, `<g data-part="recLive"></g>`, caSvg, `<g data-part="cleft"></g>`,
    axon().svg(), `<g data-part="axBand"></g>`,
    boutCut,
    pipette(holderA, stimTip, 3.4),
    `<g data-part="spark"></g>`,
  ],
});

// world → screen of the axon, for the travelling impulse
const axS = [0]; for (let i = 1; i < axonPts.length; i++) axS.push(axS[i - 1] + G.len3(G.sub3(axonPts[i], axonPts[i - 1])));
const live = `
const P=${JSON.stringify(P)}; const ZST=${ZST}, ZBB=${ZBB}, AZR=${AZR}, RV=${RV}, MEM=${MEM}, RECH=${RECH}, RB=${RB}, HCB=${HCB};
const REC=${JSON.stringify(REC)}, CACH=${JSON.stringify(CACH)}, DOCK=${JSON.stringify(DOCK)}, POOL0=${JSON.stringify(POOL)};
const AXP=${JSON.stringify(axonPts.map((p) => at(p).map((v) => +v.toFixed(1))))}, AXS=${JSON.stringify(axS.map((v) => +v.toFixed(1)))};
const SCR=${JSON.stringify(SCR)}, SCRX=${SCRX}, STIM=${JSON.stringify(at(stimTip))};
${RNG_SRC}
const rand=rng(1897);
const stage=document.querySelector(".iso-stage"), svg=stage.querySelector("svg"), readout=document.querySelector("[data-readout]");
const g=(n)=>svg.querySelector('[data-part="'+n+'"]');
const boutIn=g("boutIn"), spineIn=g("spineIn"), cleftG=g("cleft"), recLive=g("recLive"), axBand=g("axBand"), azFlash=g("azFlash"), spark=g("spark"), trPre=g("tracePre"), trPost=g("tracePost");
const at=(p)=>K.iso(p,P), dep=(p)=>K.depthOf(p,P);
const ease=(t)=>t<=0?0:t>=1?1:t*t*(3-2*t);
const sg=(n,h,a)=>'<g class="bio-stain" style="--stain:var(--stain-'+n+');--stain-k:'+(a==null?1:a)+'">'+h+'</g>';
const rB=(s)=>Math.sqrt(Math.max(0,RB*RB-(s-HCB)**2));
// ---- truth ----
// Release probability rises with the 4th power of external Ca²⁺ (Dodge & Rahamimoff 1967). Tuned so that at 2 mM about
// half the drawn docked vesicles fuse (a strong synapse); at 0.5 mM almost every spike fails.
const KCA=1.8, PMAX=0.9;
const pOf=(ca)=>PMAX*ca**4/(ca**4+KCA**4);
// time: the whole event (~5 ms) is shown ~1,000× slower; the cleft crossing (<1 µs) is slowed far more.
let ca=2.0, clock=0, ap=null, fused=0, lastFused=0, vPost=-70, vPre=-70, hPre=[], hPost=[];
const sites=DOCK.map((p)=>({p:p.slice(),state:"docked",t:0,v:null}));
const pool=POOL0.map((p)=>({p:p.slice(),home:p.slice(),a:1,move:null}));
let glu=[], cas=[], nas=[];
const rec=REC.map(()=>({bound:0,open:0}));
function fire(){ if(ap&&clock-ap.t0<1.2) return; ap={t0:clock,done:{}}; lastFused=0; }
function once(key,t){ if(ap&&!ap.done[key]&&clock-ap.t0>=t){ ap.done[key]=1; return true; } return false; }
function along(pts,t){ const n=pts.length-1; const s=Math.min(n-1e-6,Math.max(0,t*n)); const i=Math.floor(s), f=ease(s-i); return [0,1,2].map((c)=>pts[i][c]+(pts[i+1][c]-pts[i][c])*f); }
function step(dt){
  clock+=dt;
  const tau=ap?clock-ap.t0:99;
  // 1. Ca²⁺ channels open as the spike reaches the bouton; ions stream in from the cleft and are buffered away
  if(once("ca",0.75)) CACH.forEach(([x,y])=>{ for(let j=0;j<4;j++){ const z0=ZST+4+rand()*6; cas.push({path:[[x+(rand()-.5)*6,y+(rand()-.5)*8,z0],[x,y,ZBB-3],[x,y,ZBB+MEM+2],[x-2-rand()*6,y*0.6+(rand()-.5)*10,ZBB+10+rand()*14]],t:-j*0.12,dur:0.9,life:0}); } });
  // 2. fusion: each docked vesicle fuses with probability p
  if(once("fuse",1.0)){ lastFused=0; for(const s of sites) if(s.state==="docked"&&rand()<pOf(ca)){ s.state="fusing"; s.t=0; lastFused++; fused++; } }
  for(const s of sites){
    if(s.state==="fusing"){ s.t+=dt/0.55; if(s.t>=0.45&&!s.spilled){ s.spilled=1; for(let j=0;j<22;j++) glu.push({p:[s.p[0]+(rand()-.5)*3,s.p[1]+(rand()-.5)*3,ZBB-1.5],v:[(rand()-.5)*20,(rand()-.5)*30,-30-rand()*30],age:0,bound:-1,a:1}); }
      if(s.t>=1){ s.state="empty"; s.t=0; s.spilled=0; } }
    else if(s.state==="empty"){ s.t+=dt; if(s.t>2.2){ // re-dock: the nearest reserve vesicle walks down to the site
        let best=null,bd=1e9; for(const v of pool) if(!v.move&&v.a>=1){ const d=Math.hypot(v.p[0]-s.p[0],v.p[1]-s.p[1],v.p[2]-s.p[2]); if(d<bd){bd=d;best=v;} }
        if(best){ best.move={path:[best.p.slice(),[best.p[0]*0.6+s.p[0]*0.4,best.p[1]*0.5+s.p[1]*0.5,s.p[2]+16],s.p.slice()],t:0,site:s}; s.state="coming"; } } }
  }
  for(const v of pool){ if(v.move){ v.move.t+=dt/1.3; v.p=along(v.move.path,v.move.t); if(v.move.t>=1){ v.move.site.state="docked"; // the fused membrane is recycled: a new vesicle buds back at this one's old place
        v.p=v.home.slice(); v.a=0; v.move=null; } }
    else { if(v.a<1) v.a=Math.min(1,v.a+dt/1.6); v.p[0]=v.home[0]+Math.sin(clock*0.9+v.home[1])*0.6; v.p[2]=v.home[2]+Math.cos(clock*0.7+v.home[0])*0.6; } }
  // 3. glutamate: Brownian in the cleft, drawn downward by the open fusion pore's jet; binds receptors it meets
  for(const m of glu){ m.age+=dt;
    if(m.bound>=0){ m.hold-=dt; if(m.hold<=0){ rec[m.bound].bound--; m.bound=-1; m.v=[(rand()-.5)*20,(m.p[1]>=0?1:-1)*(16+rand()*16),6]; } continue; }
    m.v[0]+=(rand()-.5)*120*dt; m.v[1]+=(rand()-.5)*120*dt; m.v[2]+=(rand()-.5)*120*dt-20*dt;
    const damp=Math.exp(-dt*1.6); m.v=m.v.map((c)=>c*damp);
    m.p=[m.p[0]+m.v[0]*dt,m.p[1]+m.v[1]*dt,m.p[2]+m.v[2]*dt];
    const r=Math.hypot(m.p[0],m.p[1]);
    if(r<AZR+4){ if(m.p[2]>ZBB-1.2){ m.p[2]=ZBB-1.2; m.v[2]=-Math.abs(m.v[2]); } if(m.p[2]<ZST+RECH*0.5+1){ m.p[2]=ZST+RECH*0.5+1; m.v[2]=Math.abs(m.v[2]); } }
    if(m.p[0]>-0.6){ m.p[0]=-0.6; m.v[0]=-Math.abs(m.v[0]); }
    if(m.age>0.25&&m.bound<0&&!m.used) REC.forEach(([x,y],i)=>{ if(m.bound<0&&Math.hypot(m.p[0]-x,m.p[1]-y)<3.4&&m.p[2]<ZST+RECH+3&&rec[i].bound<2&&rand()<0.5){ m.bound=i; m.used=1; m.hold=0.3+rand()*0.4; m.p=[x+(rec[i].bound?1:-1)*1.3,y,ZST+RECH+1]; rec[i].bound++; } });
    // transporters on the surrounding glia take up whatever drifts out of the cleft
    if(r>AZR+6) m.a-=dt*1.4; if(m.age>3.2) m.a-=dt*1.2; }
  glu=glu.filter((m)=>m.a>0||m.bound>=0);
  // 4. AMPA receptors open while glutamate is bound; Na⁺ flows in through the open pore
  rec.forEach((r,i)=>{ const want=r.bound>0?1:0; r.open+=(want-r.open)*(1-Math.exp(-dt/0.12)); if(r.open>0.6){ r.acc=(r.acc||0)+dt; if(r.acc>0.22){ r.acc=0; const [x,y]=REC[i]; nas.push({path:[[x+(rand()-.5)*4,y+(rand()-.5)*4,ZBB-4],[x,y,ZST+RECH+1],[x,y,ZST-2],[x-2-rand()*10,y+(rand()-.5)*24,ZST-16-rand()*30]],t:0,dur:0.9}); } } });
  for(const c of cas){ c.t+=dt/c.dur; } cas=cas.filter((c)=>c.t<1.9);
  for(const n of nas){ n.t+=dt/n.dur; } nas=nas.filter((n)=>n.t<2.2);
  // 5. the two traces: the presynaptic spike (−70 → +30 mV, ~1 ms) and the EPSP from the open receptors
  const sp=tau-0.5; vPre= sp<0||sp>0.9? -70 : sp<0.15? -70+100*ease(sp/0.15) : sp<0.45? 30-110*ease((sp-0.15)/0.3) : -80+10*ease((sp-0.45)/0.45);
  const g=rec.reduce((s,r)=>s+r.open,0); vPost+=((-70+0.3*g)-vPost)*(1-Math.exp(-dt/(g>0.3?0.25:0.7)));
  hPre.push(vPre); hPost.push(vPost); if(hPre.length>180){ hPre.shift(); hPost.shift(); }
}
function draw(){
  const tau=ap?clock-ap.t0:99;
  // the impulse: a lit band running down the axon into the bouton
  const AX=AXS[AXS.length-1]; const s=(1-tau/0.75)*AX; let band="";
  if(tau>=0&&tau<0.85){ const a=Math.max(0,s-4), b=Math.min(AX,s+26); if(b>a){ const pts=[]; for(let i=0;i<AXS.length;i++) if(AXS[i]>=a&&AXS[i]<=b) pts.push(AXP[i]); if(pts.length>1) band='<path class="iso-line" data-tone="lit" style="stroke-width:3.4;stroke-linecap:round;opacity:.8" d="M'+pts.map((p)=>p[0]+" "+p[1]).join("L")+'"/>'; } }
  if(axBand.innerHTML!==band) axBand.innerHTML=band;
  spark.innerHTML=tau<0.3?'<circle cx="'+STIM[0]+'" cy="'+STIM[1]+'" r="'+(3+tau*16).toFixed(1)+'" fill="none" stroke="var(--anatomy-lit)" stroke-width=".8" opacity="'+(1-tau/0.3).toFixed(2)+'"/>':"";
  const fl=tau>0.7&&tau<1.6?Math.sin(Math.PI*(tau-0.7)/0.9):0;
  azFlash.innerHTML=fl>0.02?'<g opacity="'+fl.toFixed(2)+'">'+K.lineSvg(CACH.filter(([x])=>x>-6).map(([x,y])=>K.ring(x,y,3.2,ZBB-5,P,14)).join(""),{tone:"lit"})+'</g>':"";
  // bouton interior: reserve and docked vesicles (eosin: full of glutamate), fusing ones lit
  const ves=[];
  for(const v of pool) ves.push({p:v.p,r:RV,a:v.a,lit:!!v.move});
  for(const st of sites){ if(st.state==="docked") ves.push({p:st.p,r:RV,a:1}); else if(st.state==="fusing"){ const t=st.t; ves.push({p:[st.p[0],st.p[1],st.p[2]-ease(Math.min(1,t/0.4))*(RV+MEM*0.5)],r:RV*(1-0.75*ease((t-0.35)/0.65)),a:1-ease((t-0.6)/0.4),lit:true,pore:t}); } }
  ves.sort((a,b)=>dep(a.p)-dep(b.p));
  let h="";
  for(const v of ves){ const body=K.solidSvg(G.sphereOf(v.p,v.r,P,{steps:20}),{tone:"hi",lit:!!v.lit}); h+='<g'+(v.a<1?' opacity="'+v.a.toFixed(2)+'"':'')+'>'+(v.lit?body:sg("transmitter",body,0.35))+'</g>'; }
  // Ca²⁺ that got in, fading as buffers take it up
  const caIn=[], caOut=[];
  for(const c of cas){ if(c.t<0) continue; const p=along(c.path,Math.min(1,c.t)); const a=c.t<1?1:1-(c.t-1)/0.9; (p[2]>ZBB?caIn:caOut).push([...at(p),a]); }
  h+=sg("calcium",K.dotsSvg(caIn,{size:1.5,tone:"hi"}),1);
  boutIn.innerHTML=h;
  // the cleft: glutamate, Ca²⁺ on its way in, Na⁺ on its way to the receptors
  const gl=glu.map((m)=>[...at(m.p),Math.max(0,Math.min(1,m.a))]);
  const naOut=[], naIn=[];
  for(const n of nas){ const p=along(n.path,Math.min(1,n.t)); const a=n.t<1?1:1-(n.t-1)/1.2; (p[2]>ZST?naOut:naIn).push([...at(p),a]); }
  cleftG.innerHTML=sg("transmitter",K.dotsSvg(gl,{size:1.5,tone:"hi"}),1)+sg("calcium",K.dotsSvg(caOut,{size:1.5,tone:"hi"}),1)+sg("sodium",K.dotsSvg(naOut,{size:1.5,tone:"hi"}),1);
  spineIn.innerHTML=sg("sodium",K.dotsSvg(naIn,{size:1.5,tone:"hi"}),1);
  // open receptors: the pore lit
  let rl=""; rec.forEach((r,i)=>{ if(r.open>0.05){ const [x,y]=REC[i]; rl+='<g opacity="'+Math.min(1,r.open).toFixed(2)+'">'+K.lineSvg(K.ring(x,y,1.6,ZST+RECH,P,12),{tone:"lit"})+K.lineSvg(K.ring(x,y,2.4,ZST+RECH,P,16),{tone:"lit"})+'</g>'; } });
  recLive.innerHTML=rl;
  // traces on the amplifier screen
  const zPre=(mv)=>SCR.z0+20+((mv+80)/120)*14, zPost=(mv)=>SCR.z0+3+Math.min(15,((mv+70.5)/4)*14);
  const tr=(hist,zf)=>hist.length<2?"":"M"+hist.map((v,i)=>{ const p=at([SCRX+0.1,SCR.y0+2+(SCR.y1-SCR.y0-4)*i/179,zf(v)]); return p[0].toFixed(1)+" "+p[1].toFixed(1); }).join("L");
  trPre.setAttribute("d",tr(hPre,zPre)); trPost.setAttribute("d",tr(hPost,zPost));
}
function phase(){ const tau=ap?clock-ap.t0:99;
  if(tau<0.75) return "spike arrives"; if(tau<1.0) return "Ca²⁺ in"; if(tau<1.5) return lastFused?"vesicle fusion":"failure, no fusion";
  if(glu.some((m)=>m.bound>=0)) return "AMPA open"; if(glu.length) return "glutamate crosses"; if(sites.some((s)=>s.state!=="docked")) return "re-docking"; return "at rest"; }
function say(){ vitaSay(stage,readout,phase()+" · Ca²⁺ "+ca.toFixed(1)+" mM · p "+pOf(ca).toFixed(2)+" · "+lastFused+"/5"); }
const TOUR=[2.0,2.0,3.0,1.0,0.6,2.0,1.4];
let nextFire=0.6, tourI=0, caT=ca;
vitaLoop({ stage, idleMs:7000,
  frame(dt,st){
    if(st.still){ // one telling still: glutamate mid-cleft, two receptors open
      if(!ap){ ca=2; fire(); sites[0].state="docked"; let n=0; while(clock<1.0+1.15&&n<400){ step(1/60); n++; } } draw(); say(); return; }
    if(st.touring){ nextFire-=dt; if(nextFire<=0){ caT=TOUR[tourI++%TOUR.length]; fire(); nextFire=4.6; } }
    ca+=(caT-ca)*(1-Math.exp(-dt/0.3));
    if(dt>0) step(dt); draw(); say(); },
  pointer(x){ caT=0.5+3.5*x; },
  click(){ fire(); },
  keys(key){ if(key===" "||key==="Enter"){ fire(); return true; } if(key==="ArrowRight"||key==="ArrowUp"){ caT=Math.min(4,caT+0.25); return true; } if(key==="ArrowLeft"||key==="ArrowDown"){ caT=Math.max(0.5,caT-0.25); return true; } return false; },
  resume(){ nextFire=0.8; },
});
`;
const white = `<style>body.iso[data-theme="light"]{--anatomy-page:#ffffff;--anatomy-card:#ffffff}</style>`;
const body = white + k.plateHtml({
  fig: "Fig 11", title: "Chemical synapse", hint: "Click · fire  ↔ Ca²⁺",
  readout: "at rest · Ca²⁺ 2.0 mM · p 0.54 · 0/5",
  keys: [{ mark: "lit", label: "Fusing vesicle, open receptor, the spike" }, { mark: "transmitter", label: "Glutamate (and the vesicles that hold it)" }, { mark: "calcium", label: "Ca²⁺, as a GCaMP indicator sees it" }, { mark: "sodium", label: "Na⁺" }],
  caption: "One excitatory synapse from a rodent hippocampus (CA3 axon onto a CA1 spine), as a teaching model with its near half cut away (ruler: 1 tick = 100 nm). Bouton, spine, vesicles (40 nm) and the active zone (about 0.04 µm²) are at true scale; the cleft, really 20 nm, is drawn 8× wide and membranes about 2× thick. The bouton holds about 200 vesicles and about 10 docked on the active zone; the half shown has 31 and 5. When a spike arrives, voltage-gated Ca²⁺ channels at the edge of the active zone open; Ca²⁺ triggers docked vesicles to fuse, each spilling some 2,000–4,000 glutamate molecules (each pink dot stands for ~150). Glutamate crosses the cleft, binds AMPA receptors on the postsynaptic density, and their pores let Na⁺ in: the recording pipette sees a small depolarisation, the EPSP. Glial transporters clear the cleft and new vesicles dock. Release probability rises with the fourth power of external Ca²⁺; this model is tuned to a strong synapse, and at low Ca²⁺ most spikes fail. The whole event, about 5 ms, is shown roughly 1,000× slower; the cleft crossing, under a microsecond in life, is slowed far more so you can watch it.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Synapse: Space fires the axon, arrow keys change external calcium from 0.5 to 4 mM" aria-valuemin="0.5" aria-valuemax="4">${svg}</div>`,
});
const page = vitaPage({ n: "11", title: "Chemical synapse", zh: "化学突触 · 递质跨越间隙", en: "Chemical synapse · across the cleft", body, script: liveScript() + LOOP_SRC + live,
  facts: [["20 nm", "突触间隙宽度（图中放大 8 倍）", "synaptic cleft (drawn 8× wide)"], ["~40 nm", "突触小泡直径", "synaptic vesicle diameter"], ["~10 / ~200", "活性区停靠小泡 / 每个突触小体的小泡（大鼠 CA1）", "docked per active zone / vesicles per bouton (rat CA1)"], ["2,000–4,000", "每个小泡中的谷氨酸分子", "glutamate molecules per vesicle"], ["~0.5 ms", "突触延搁：峰电位到突触后电流", "synaptic delay, spike to postsynaptic current"], ["∝ [Ca²⁺]⁴", "释放概率（Dodge & Rahamimoff 1967）", "release probability (Dodge & Rahamimoff 1967)"]] });
writeFileSync(join(OUT, "11-synapse.html"), page);
console.log("wrote 11-synapse.html", (page.length / 1024).toFixed(0) + " KB", "pool", POOL.length);
