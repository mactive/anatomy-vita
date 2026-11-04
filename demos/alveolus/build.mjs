// 15 · Alveolus — one human alveolus as a cut-open teaching model on three posts. The cut runs through the equator, so
// the rim shows the alveolar wall in section: air on the inside, the blood–air barrier, and a capillary cut lengthwise
// inside the wall. Red cells enter from an arteriole on the left, run single file round both halves of the rim and leave
// by a venule on the right; each one's stain follows its own haemoglobin saturation, computed from the time it has spent
// beside the air. What moves: the red cells. The control is exercise (transit time 0.75 → 0.25 s); F thickens the
// barrier (fibrosis) and the cells no longer finish loading before they leave. A monitor at the back plots the
// capillary PO₂ against time, the classic diffusion curve.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { blobOf } from "../../bio/soft.mjs";
import { k, G, liveScript, LOOP_SRC, rng, plinth, stain, vitaPage, byDepth, scene } from "../../bio/bio.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../site/demos");
const W = 740, H = 480;
const UM = 1.2; // 1 µm = 1.2 units
// ---- truth (human, resting adult; West's Respiratory Physiology, Weibel's morphometry) ----
const RL = 95 * UM;        // capillary centre line: alveolus ~200 µm across
const LUMEN = 3.5 * UM;    // capillary lumen radius (~7 µm across; a 7.5 µm red cell squeezes through)
const THICK = 2.5 * UM;    // thick side of the septum outside the capillary (interstitium, endothelium)
const RO = RL + LUMEN + THICK; // outer surface of the drawn wall
const BAR_DRAW = 3;        // the 0.6 µm barrier is drawn 3× thick or it would be a hairline
const barrierUm = (fib) => 0.6 + 2.4 * fib; // fibrosis thickens it to ~3 µm
const riOf = (fib) => RL - LUMEN - barrierUm(fib) * BAR_DRAW * UM; // air-side surface
const RBC_R = 3.4 * UM, RBC_T = 2.0 * UM; // red cell 7.5 µm × 2 µm, folded slightly in the capillary
const SPACING = 12 * UM;   // one cell per ~12 µm of capillary at a capillary haematocrit of ~0.2
const POST = 26;
const ZC = RO + POST;      // the cut plane (equator)
const C = [-14, 6, ZC];
const PLATE = { x: -205, y: -150, w: 390, d: 290, r: 12 };
const MON = { x: 44, y: 74, w: 112, d: 26, r: 2 }, MON_H = 54;
const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [C[0] - RO, C[1], ZC + 8], [C[0] + RO, C[1], ZC + 8], [C[0], C[1] - RO, ZC + 8], [C[0], C[1] + RO, ZC], ...k.boxCorners(MON, 0, MON_H + 6)], W, H, { pad: 16, azimuth: 50 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const V = G.viewOf(P);
const rand = rng(1661); // Malpighi described the alveoli and their capillaries in 1661

// ---- the ring, its two branches, inlet and outlet ----
const ringPt = (r, a, z = ZC) => [C[0] + r * Math.cos(a), C[1] + r * Math.sin(a), z];
const ringPath = (r, z = ZC, n = 180) => k.pathOf(Array.from({ length: n }, (_, i) => at(ringPt(r, (i / n) * Math.PI * 2, z))), true);
let aIn = 0, aOut = 0; { let lo = Infinity, hi = -Infinity; for (let i = 0; i < 720; i++) { const a = (i / 720) * Math.PI * 2, x = at(ringPt(RL, a))[0]; if (x < lo) { lo = x; aIn = a; } if (x > hi) { hi = x; aOut = a; } } }
// the near branch is the one whose midpoint lies nearer the viewer
let dNear = ((aOut - aIn + Math.PI * 4) % (Math.PI * 2)); let dFar = dNear - Math.PI * 2;
if (k.depthOf(ringPt(RL, aIn + dNear / 2), P) < k.depthOf(ringPt(RL, aIn + dFar / 2), P)) [dNear, dFar] = [dFar, dNear];
function belowUpperArc(r) { // screen region under the rim ellipse's upper arc
  const n = 180, sp = Array.from({ length: n }, (_, i) => at(ringPt(r, aIn + (i / n) * Math.PI * 2)));
  const far = Array.from({ length: 91 }, (_, i) => at(ringPt(r, aIn + (dFar * i) / 90)));
  const lo = far[0], hi = far[far.length - 1];
  return k.pathOf([[lo[0] - 2, lo[1]], ...far, [hi[0] + 2, hi[1]], [hi[0] + 2, 2000], [lo[0] - 2, 2000]], true);
}

// ---- static: posts, hull with its capillary net, inlet and outlet vessels ----
function posts() {
  const out = [];
  const spots = [0, 1, 2].map((i) => { const a = aIn + 0.5 + (i * Math.PI * 2) / 3; return [C[0] + 52 * Math.cos(a), C[1] + 52 * Math.sin(a)]; });
  for (const [x, y] of byDepth(spots, P)) {
    const top = ZC - Math.sqrt(RO * RO - (x - C[0]) ** 2 - (y - C[1]) ** 2);
    out.push(S(k.cylinder(x, y, 10, 0, 2.4, P, 30, 0.5), { tone: "mid" }));
    out.push(L(k.ring(x, y, 7, 2.4, P, 26), { tone: "faint" }));
    out.push(S(k.cylinder(x, y, 3.2, 2.4, top - 6, P, 20), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(x, y, 5.6, top - 5, 4, P, 24, 0.4), { tone: "mid" }));
    out.push(L(k.knurl(x, y, 5.6, top - 4.4, top - 1.6, 18, P), { tone: "faint" }));
  }
  return out.join("");
}
// capillary net on the outer wall: short segments between nodes of a jittered lat-long mesh; only the side facing us
function capNet() {
  // the capillary bed on the outer wall is so dense it behaves as a sheet of blood held apart by tissue posts
  // (Fung's sheet flow): draw the sheet as the stained hull and the posts as small pale islands, ~10 µm apart
  const R2 = RO + 0.2, N = 1500, out = [];
  for (let i = 0; i < N; i++) { const z = -((i + 0.5) / N); if (z > -0.03) continue; const r = Math.sqrt(1 - z * z), a = i * 2.39996 + (rand() - 0.5) * 0.06;
    const n = G.unit3([r * Math.cos(a), r * Math.sin(a), z]); const vis = G.dot3(n, V); if (vis < 0.1) continue;
    const p = G.add3(C, G.mul3(n, R2)); const F = G.frameAlong(p, n); const rr = (1.8 + rand() * 1.0) * UM;
    out.push(G.circleOf(F, 0, rr, P, 10)); }
  return `<path d="${out.join("")}" style="fill:var(--anatomy-paper);opacity:.55"/>` + L(out.join(""), { tone: "lo" }).replace("<path", '<path style="opacity:.45"');
}
// a stain between deoxy (venous) and oxy (arterial): one red-cell colour scale everywhere
function mixStain(f, html, kk = 0.6) { return `<g class="bio-stain" style="--stain:color-mix(in oklab,var(--stain-oxy) ${(f * 100).toFixed(0)}%,var(--stain-deoxy));--stain-k:${kk}">${html}</g>`; }
// the lower hemisphere as a turned body (its top cap is covered by the cavity and the cut face)
const BOWL = Array.from({ length: 49 }, (_, i) => { const t = i / 48, s = RO * Math.sin(t * Math.PI / 2) ; return [RO - RO * Math.cos(t * Math.PI / 2), Math.max(0.01, RO * Math.sin(t * Math.PI / 2)), 1]; });
const hull = `<path class="iso-halo" d="${k.haloOf({ x: C[0] - RO, y: C[1] - RO, w: 2 * RO, d: 2 * RO, r: RO }, 0, 1, P)}" style="opacity:.3"/>`
  + mixStain(0.85, S(G.solidOf(BOWL, G.frameAlong([C[0], C[1], ZC - RO], [0, 0, 1]), P, { smooth: true }), { tone: "hi" }), 0.4).replace("<g ", '<g data-part="sheet" ')
  + `<g clip-path="url(#alv-lower)">${capNet()}</g>`;
// arteriole in, venule out: each leaves the wall through a ball tee and ends on a port collar on the bench
function vessel(a, f, live = false) {
  const tint = live ? (h) => `<g class="bio-stain" style="--stain:color-mix(in oklab,var(--stain-oxy) var(--vout,100%),var(--stain-deoxy));--stain-k:.7">${h}</g>` : (h) => mixStain(f, h, 0.7);
  const out = G.unit3([Math.cos(a), Math.sin(a), 0]);
  const p0 = ringPt(RO + 2, a, ZC - 5);
  const route = G.fillet([p0, G.add3(p0, G.mul3(out, 26)), G.add3(G.add3(p0, G.mul3(out, 34)), [0, 0, -(ZC - 5) + 14]), G.add3(G.add3(p0, G.mul3(out, 34)), [0, 0, -(ZC - 5) + 4])], 14, 8);
  const sc = scene(P); const r = 7.5 * UM * 0.5 * 1.6;
  sc.tube(G.resample(route, 1.5), r, { tone: "hi" }, { maxLength: 18, wrap: tint });
  sc.put(k.depthOf(p0, P) + 2, tint(S(G.sphereOf(p0, r * 1.35, P), { tone: "hi" })));
  const foot = route[route.length - 1];
  const port = S(k.cylinder(foot[0], foot[1], r + 3.2, 0, 5, P, 28, 0.6), { tone: "mid" }) + L(k.knurl(foot[0], foot[1], r + 3.2, 1, 4, 22, P), { tone: "faint" });
  return { back: port + sc.svg(), p0 };
}
const vin = vessel(aIn, 0.25), vout = vessel(aOut, 1, true);

// ---- inside the bowl: the far wall seen through the cut ----
const inner0 = riOf(0);
const onInner = (lat, lon, lift = 0) => [C[0] + (inner0 - lift) * Math.cos(lat) * Math.cos(lon), C[1] + (inner0 - lift) * Math.cos(lat) * Math.sin(lon), ZC - (inner0 - lift) * Math.sin(lat)];
const farLon = Math.atan2(-V[1], -V[0]); // the far side, seen through the opening
function interior() {
  const sc = scene(P);
  const nrm = (p) => G.unit3(G.sub3(C, p)); // the wall's inward normal
  const onWall = (p, F, r) => G.circleOf(G.frameAlong(p, nrm(p)), 0, r, P);
  // the concave wall: latitude rings and tone bands that deepen toward the floor
  const rings = [0.3, 0.55, 0.78].map((f) => { const lat = f * Math.PI / 2; return ringPath(inner0 * Math.cos(lat), ZC - inner0 * Math.sin(lat), 120); }).join("");
  const bands = [0.18, 0.4, 0.6, 0.8].map((f, i) => { const lat = f * Math.PI / 2; return `<path d="${ringPath(inner0 * Math.cos(lat), ZC - inner0 * Math.sin(lat), 120)}" style="fill:var(--anatomy-shade-0);opacity:${(0.18 + i * 0.04).toFixed(2)}"/>`; }).join("");
  // type I cells line ~95% of the surface: flat nuclei (DAPI) and the faint borders of their thin plates
  const nuc = []; for (let i = 0; i < 14; i++) { const p = onInner(0.22 + rand() * 1.2, farLon + (rand() - 0.5) * 2.7, 0.3); nuc.push(onWall(p, 0, 2.6 * UM)); }
  // type II cells: cuboidal, ~9 µm, each a dome on a footprint, with lamellar bodies (stored surfactant)
  const t2 = [[0.35, -0.75], [0.62, 0.55], [0.85, 0.15], [0.42, 1.0], [0.75, -1.05]].map(([lat, d]) => [onInner(lat, farLon + d, 1.2), onInner(lat, farLon + d, 0)]);
  for (const [p, foot] of t2) {
    const body = blobOf([[...p, 4 * UM], [...G.add3(foot, G.mul3(nrm(foot), 1.2)), 4.4 * UM]], P, { merge: 0.4, step: 0.6 });
    const lb = [[0.8, 1.5], [-1.4, 0.4], [0.3, -1.2]].map(([u, v]) => at(G.add3(G.add3(p, G.mul3(nrm(p), 3.6)), [u * 1.4, v * 1.4, 0])));
    sc.at(p, L(onWall(foot, 0, 5.4 * UM), { tone: "lo" }) + stain("hema", S(body, { tone: "hi" }) + D(lb, { size: 0.65, tone: "mid" }), 0.45));
  }
  // pores of Kohn: 2–10 µm holes through to the neighbouring alveoli
  const pores = [[0.5, 0.2], [0.3, -0.4], [0.28, 0.62]].map(([lat, d]) => { const p = onInner(lat, farLon + d, 0.3); return `<path d="${onWall(p, 0, 3.6 * UM)}" style="fill:var(--anatomy-lo);opacity:.55"/>` + L(onWall(p, 0, 3.6 * UM), { tone: "mid" }) + L(onWall(p, 0, 4.6 * UM), { tone: "faint" }); });
  // an alveolar macrophage (~21 µm) crawling on the floor: one soft body with three pseudopods
  const floor = onInner(0.62, farLon - 0.3, 0), up = nrm(floor), mc = G.add3(floor, G.mul3(up, 6 * UM));
  const T1 = G.unit3(G.cross3(up, [0, 0, 1].map((v, i) => v + (i === 0 ? 0.3 : 0)))), T2 = G.cross3(up, T1);
  const pods = [[1, 0.2], [-0.6, 0.9], [-0.5, -1]].map(([a, b2]) => [...G.add3(G.add3(floor, G.mul3(up, 2.4 * UM)), G.add3(G.mul3(T1, a * 11 * UM), G.mul3(T2, b2 * 11 * UM))), 2.6 * UM]);
  const mac = blobOf([[...mc, 7 * UM], ...pods, ...pods.map((q) => [...G.lerp3(mc, q.slice(0, 3), 0.55), 3.6 * UM])], P, { merge: 0.5, step: 0.7 });
  const macSvg = L(onWall(floor, 0, 9 * UM), { tone: "faint" }) + stain("hema", S(mac, { tone: "hi" }), 0.5) + stain("dapi", D([at(G.add3(mc, G.add3(G.mul3(up, 6 * UM), G.mul3(T1, 2))))], { size: 2.2, tone: "lo" }), 0.85);
  return `<g clip-path="url(#alv-inner)">` + `<path class="bio-cavity" d="${ringPath(inner0)}"/>` + bands + L(rings, { tone: "faint" })
    + stain("dapi", `<path d="${nuc.join("")}" style="fill:var(--stain);opacity:.28"/>` + L(nuc.join(""), { tone: "lo" }), 0.6) + pores.join("") + macSvg + sc.svg() + `</g>`;
}
// ---- the monitor: capillary PO₂ against time in the capillary, on its front face ----
const SCR = { x0: MON.x + 8, x1: MON.x + MON.w - 8, z0: 10, z1: MON_H - 9 };
const scrY = MON.y + MON.d + 0.15;
const sx = (t) => SCR.x0 + 3 + (t / 0.75) * (SCR.x1 - SCR.x0 - 6), sz = (mm) => SCR.z0 + 3 + ((mm - 30) / 80) * (SCR.z1 - SCR.z0 - 6);
function monitor() {
  const out = [S(k.slabOf(MON, 0, MON_H, P, 4, 0.8), { tone: "mid" })];
  out.push(L(k.sideSeam(k.insetPlan(MON, 0), 6, P), { tone: "faint" }));
  const quad = (x0, x1, z0, z1) => k.pathOf([at([x0, scrY, z0]), at([x1, scrY, z0]), at([x1, scrY, z1]), at([x0, scrY, z1])], true);
  out.push(`<path d="${quad(SCR.x0, SCR.x1, SCR.z0, SCR.z1)}" style="fill:var(--anatomy-shade-0)"/>`, L(quad(SCR.x0, SCR.x1, SCR.z0, SCR.z1), { tone: "mid" }));
  out.push(L(quad(SCR.x0 - 2.5, SCR.x1 + 2.5, SCR.z0 - 2.5, SCR.z1 + 2.5), { tone: "faint" }));
  // graticule: 40 and 100 mmHg (venous, alveolar); 0.25 and 0.75 s (exercise, rest transit)
  for (const mm of [40, 100]) out.push(L(k.segment([SCR.x0, scrY, sz(mm)], [SCR.x1, scrY, sz(mm)], P), { tone: "faint", dashed: mm === 40 }));
  for (const t of [0.25, 0.5]) out.push(L(k.segment([sx(t), scrY, SCR.z0], [sx(t), scrY, SCR.z1], P), { tone: "faint", dotted: true }));
  const ticks = []; for (let t = 0; t <= 0.75 + 1e-6; t += 0.05) ticks.push(k.segment([sx(t), scrY, SCR.z0], [sx(t), scrY, SCR.z0 + (Math.round(t * 20) % 5 ? 1.2 : 2.4)], P));
  out.push(L(ticks.join(""), { tone: "lo" }));
  // knobs and a lamp on top, a cable from the back to the venule port
  for (const x of [MON.x + 14, MON.x + 28]) { out.push(S(k.cylinder(x, MON.y + 14, 4, MON_H, 3.4, P, 22), { tone: "mid" })); out.push(L(k.knurl(x, MON.y + 14, 4, MON_H + 0.6, MON_H + 2.8, 16, P), { tone: "faint" })); }
  out.push(S(k.slabOf({ x: MON.x + 50, y: MON.y + 8, w: 40, d: 12, r: 1.4 }, MON_H, 0.8, P, 3, 0.3), { tone: "lo" }));
  for (let i = 0; i < 2; i++) out.push(L(k.lineOnTop([MON.x + 54, MON.y + 12 + i * 4], [MON.x + 86 - i * 8, MON.y + 12 + i * 4], MON_H + 0.8, P), { tone: "faint", free: true }));
  out.push(D([at([MON.x + 100, MON.y + 14, MON_H])], { size: 1.3, tone: "hi" }));
  for (const [x, y] of k.corners(k.insetPlan(MON, 4), 0)) out.push(D([at([x, y, MON_H])], { size: 0.45 }));
  return out.join("");
}
// oximeter probe clipped on the venule: the readout reads off it
const probeAt = G.add3(vout.p0, G.mul3(G.unit3([Math.cos(aOut), Math.sin(aOut), 0]), 22));
const probe = S(k.slabOf({ x: probeAt[0] - 5, y: probeAt[1] - 6, w: 10, d: 12, r: 2 }, probeAt[2] - 7, 14, P, 4, 0.6), { tone: "mid" }) + D([at([probeAt[0], probeAt[1] + 6, probeAt[2]])], { size: 1.1, tone: "hi" });
const cable = k.wireSvg(at([probeAt[0] + 5, probeAt[1], probeAt[2] - 4]), at([MON.x + MON.w, MON.y + 8, 6]), { via: [at([probeAt[0] + 30, probeAt[1] + 10, 0]), at([MON.x + MON.w + 4, MON.y + 8, 0])], tone: "lo" });

const svg = k.figureSvg({
  width: W, height: H,
  label: "One human alveolus, about 200 micrometres across, cut open at its equator and resting on three posts. The cut edge shows the wall in section with a capillary running inside it. Red blood cells enter from an arteriole on the left, travel single file round the rim and leave by a venule on the right, changing from blue (deoxygenated) to red (oxygenated) as they pass the air. A monitor at the back plots oxygen pressure in the capillary against time.",
  body: [`<defs><clipPath id="alv-lower"><path d="${belowUpperArc(RO)}"/></clipPath><clipPath id="alv-inner"><path data-part="clipin" d="${ringPath(inner0)}"/></clipPath></defs>`,
    plinth(PLATE, P, { scale: { x: PLATE.x + 18, y: PLATE.y + PLATE.d - 15, w: 200, step: 10 * UM, every: 5 }, label: { x: PLATE.x + PLATE.w - 56, y: PLATE.y + PLATE.d - 20, w: 38 } }),
        cable, vin.back, posts(), hull, interior(), `<g data-part="rim"></g>`, `<g data-part="cells"></g>`, vout.back, probe, monitor(), `<path data-part="trace0" class="iso-line" data-tone="lo" d=""/>`, `<path data-part="trace" class="iso-line" data-tone="lit" style="stroke-width:1.1" d=""/>`, `<g data-part="mark"></g>`, `<g data-part="rimfront"></g>`],
});

const live = `
const P=${JSON.stringify(P)}; const C=${JSON.stringify(C)}; const UM=${UM}, RL=${RL}, LUMEN=${LUMEN}, RO=${RO}, ZC=${ZC};
const RBC_R=${RBC_R}, RBC_T=${RBC_T}, SPACING=${SPACING}, BAR_DRAW=${BAR_DRAW};
const A_IN=${aIn}, D_NEAR=${dNear}, D_FAR=${dFar}, SCR=${JSON.stringify(SCR)}, SCRY=${scrY};
const stage=document.querySelector(".iso-stage"), svg=stage.querySelector("svg"), readout=document.querySelector("[data-readout]");
const rimG=svg.querySelector('[data-part="rim"]'), cellsG=svg.querySelector('[data-part="cells"]'), rimF=svg.querySelector('[data-part="rimfront"]');
const sheet=svg.querySelector('[data-part="sheet"]'), trace=svg.querySelector('[data-part="trace"]'), trace0=svg.querySelector('[data-part="trace0"]'), mark=svg.querySelector('[data-part="mark"]'), clipIn=svg.querySelector('[data-part="clipin"]');
const at=(p)=>K.iso(p,P), V=G.viewOf(P);
const ringPt=(r,a,z)=>[C[0]+r*Math.cos(a),C[1]+r*Math.sin(a),z===undefined?ZC:z];
const ringPath=(r,z,n)=>{ n=n||160; return K.pathOf(Array.from({length:n},(_,i)=>at(ringPt(r,i/n*Math.PI*2,z))),true); };
const arcPath=(r,a0,d,n)=>K.pathOf(Array.from({length:n+1},(_,i)=>at(ringPt(r,a0+d*i/n))));
// truth: alveolar PO2 100 mmHg, mixed venous 40 mmHg. Oxygen crosses the barrier at a rate D·(PA − Pc) and lands in
// the blood's O2 content, nearly all of it on haemoglobin (20.1 ml/dl at full saturation, Hill P50 26.8 mmHg, n 2.7, plus
// 0.003 ml/dl/mmHg dissolved). Haemoglobin soaks up oxygen, so capillary PO2 rises slowly at first, then fast.
// D is set so a normal 0.6 µm barrier equilibrates by ~0.25 s (West); D scales as 1/thickness.
const PA=100, PV=40, P50=26.8, NH=2.7, SLOW=4;
const barrierUm=(f)=>0.6+2.4*f, Dof=(f)=>0.8*0.6/barrierUm(f);
const sat=(p)=>{ const q=Math.pow(p/P50,NH); return q/(1+q); };
const content=(p)=>20.1*sat(p)+0.003*p;
const TABLES={};
function tableOf(f){ const key=f.toFixed(2); if(TABLES[key]) return TABLES[key]; const D=Dof(+key), dt=0.0025, out=[]; let P=PV, c=content(PV);
  for(let i=0;i<=300;i++){ out.push(P); c+=D*(PA-P)*dt; let lo=P,hi=PA; for(let j=0;j<22;j++){ const m=(lo+hi)/2; if(content(m)<c) lo=m; else hi=m; } P=(lo+hi)/2; }
  return TABLES[key]=out; }
const po2=(t,f)=>{ const tb=tableOf(f), x=Math.max(0,Math.min(300,t/0.0025)), i=Math.floor(x), j=Math.min(300,i+1); return tb[i]+(tb[j]-tb[i])*(x-i); };
const SV=sat(PV), SA=sat(PA);
const colour=(s)=>Math.max(0,Math.min(1,(s-SV)/(SA-SV)));
let ex=0, exT=0, fib=0, fibT=0, phase=0, tour=0;
const transit=()=>0.75-0.5*ex;
const LEN_N=Math.abs(D_NEAR)*RL, LEN_F=Math.abs(D_FAR)*RL;
function cellSvg(f,branch,s){ // f: 0..1 along the branch
  const d=branch?D_NEAR:D_FAR; const a=A_IN+d*f; const p=ringPt(RL,a,ZC-0.6);
  const tan=G.unit3([-Math.sin(a)*Math.sign(d),Math.cos(a)*Math.sign(d),0]);
  // cells tilt in the narrow capillary: the axis leans off the flow line (parachute shape)
  const ax=G.unit3(G.add3(tan,[0,0,0.35]));
  const F=G.frameAlong(p,ax);
  const face=G.dot3(ax,V)>0?RBC_T/2:-RBC_T/2;
  const body=K.solidSvg(G.disc(-RBC_T/2,RBC_T/2,RBC_R,F,P),{tone:"hi"})+'<path class="iso-line" data-tone="lo" style="opacity:.55" d="'+G.circleOf(F,face,RBC_R*0.45,P,16)+'"/>';
  const c=colour(s); const fade=Math.min(1,f/0.03,(1-f)/0.03);
  return [K.depthOf(p,P),'<g class="bio-stain" style="--stain:color-mix(in oklab,var(--stain-oxy) '+(c*100).toFixed(0)+'%,var(--stain-deoxy));--stain-k:.8"'+(fade<1?' opacity="'+Math.max(0,fade).toFixed(2)+'"':'')+'>'+body+'</g>'];
}
function drawRim(){
  const ri=RL-LUMEN-barrierUm(fib)*BAR_DRAW*UM, lumIn=RL-LUMEN, lumOut=RL+LUMEN;
  clipIn.setAttribute("d",ringPath(ri));
  const face='<path class="bio-rim" fill-rule="evenodd" d="'+ringPath(RO)+ringPath(ri)+'"/>';
  const lumen='<path class="bio-lumen" fill-rule="evenodd" style="opacity:.75" d="'+ringPath(lumOut)+ringPath(lumIn)+'"/>';
  // the barrier: epithelium (air side), fused basement membranes, endothelium; collagen when fibrotic
  let col=''; if(fib>0.05){ const pts=[]; const n=Math.round(140*fib); for(let i=0;i<n;i++){ const a=i/n*Math.PI*2+0.013*i, r=ri+(lumIn-ri)*(0.25+0.5*((i*0.618)%1)); pts.push(at(ringPt(r,a))); } col='<g class="bio-stain" style="--stain:var(--stain-eosin);--stain-k:1">'+K.dotsSvg(pts,{size:0.75,tone:"mid"})+'</g>'; }
  const lines=K.lineSvg(ringPath(lumIn)+ringPath(lumOut),{tone:"mid"})+K.lineSvg(ringPath((ri+lumIn)/2),{tone:"faint"})+K.lineSvg(ringPath(ri),{tone:"mid"})+K.lineSvg(ringPath(RO-1.2),{tone:"faint"});
  rimG.innerHTML='<g class="bio-stain" style="--stain:var(--stain-eosin);--stain-k:.35">'+face+'</g>'+lumen+col+'<g class="bio-stain" style="--stain:var(--stain-eosin);--stain-k:.6">'+lines+'</g>';
  rimF.innerHTML='<g class="bio-stain" style="--stain:var(--stain-eosin);--stain-k:.6">'+K.lineSvg(arcPath(RO,A_IN,D_NEAR,90),{tone:"hi"})+'</g>';
}
function drawScreen(){
  const sx=(t)=>SCR.x0+3+(t/0.75)*(SCR.x1-SCR.x0-6), sz=(mm)=>SCR.z0+3+((mm-30)/80)*(SCR.z1-SCR.z0-6);
  const curve=(f,t1)=>"M"+Array.from({length:61},(_,i)=>{ const t=t1*i/60; const p=at([sx(t),SCRY+0.1,sz(po2(t,f))]); return p[0].toFixed(1)+" "+p[1].toFixed(1); }).join("L");
  const T=transit(); trace.setAttribute("d",curve(fib,T)); trace0.setAttribute("d",fib>0.05?curve(0,0.75):"");
  const e=at([sx(T),SCRY+0.1,sz(po2(T,fib))]), b0=at([sx(T),SCRY+0.1,SCR.z0]), b1=at([sx(T),SCRY+0.1,SCR.z1]);
  mark.innerHTML='<path class="iso-line" data-tone="mid" d="M'+b0[0].toFixed(1)+' '+b0[1].toFixed(1)+'L'+b1[0].toFixed(1)+' '+b1[1].toFixed(1)+'"/><circle cx="'+e[0].toFixed(1)+'" cy="'+e[1].toFixed(1)+'" r="1.6" style="fill:var(--anatomy-lit)"/>';
}
let lastKey="";
function draw(){
  const key=fib.toFixed(3); if(key!==lastKey){ drawRim(); lastKey=key; }
  drawScreen();
  const T=transit(), items=[];
  for(const [branch,len] of [[1,LEN_N],[0,LEN_F]]){ const n=Math.floor(len/SPACING); for(let i=0;i<n;i++){ const f=((i+phase*n/1)/n)%1; const ff=(i/n+phase)%1; items.push(cellSvg(ff,branch,sat(po2(ff*T,fib)))); } }
  items.sort((a,b)=>a[0]-b[0]); cellsG.innerHTML=items.map((x)=>x[1]).join("");
  const pout=po2(T,fib), sout=sat(pout);
  // the capillary sheet on the hull: the mean colour of the blood over the whole transit
  let m=0; for(let i=0;i<16;i++) m+=colour(sat(po2((i+0.5)/16*T,fib))); m=Math.round(m/16*100);
  const vo=Math.round(colour(sout)*100)+"%"; if(svg.style.getPropertyValue("--vout")!==vo) svg.style.setProperty("--vout",vo);
  if(sheet.dataset.m!==String(m)){ sheet.dataset.m=m; sheet.style.setProperty("--stain","color-mix(in oklab,var(--stain-oxy) "+m+"%,var(--stain-deoxy))"); }
  vitaSay(stage,readout,(fib>0.5?"fibrosis":ex>0.5?"exercise":"rest")+" · "+T.toFixed(2)+" s · out "+Math.round(pout)+" mmHg, "+Math.round(sout*100)+"%");
  stage.setAttribute("aria-valuenow",ex.toFixed(2));
}
vitaLoop({ stage, idleMs:5000,
  frame(dt,st){
    if(st.touring&&dt>0){ tour+=dt; const c=tour%26, h=c%13; exT=h<4?0:h<6?(h-4)/2:h<11?1:1-(h-11)/2; fibT=c>=13?1:0; }
    if(st.still){ ex=exT=1; fib=fibT=0; }
    const k=1-Math.exp(-dt/0.35); ex+=(exT-ex)*(dt?k:1); fib+=(fibT-fib)*(dt?1-Math.exp(-dt/0.6):1);
    phase=(phase+dt/(transit()*SLOW))%1; draw(); },
  pointer(x){ exT=x; },
  click(){ fibT=fibT?0:1; },
  keys(key){ if(key==="ArrowRight"||key==="ArrowUp"){ exT=Math.min(1,exT+0.25); return true; } if(key==="ArrowLeft"||key==="ArrowDown"){ exT=Math.max(0,exT-0.25); return true; } if(key==="f"||key==="F"||key===" "){ fibT=fibT?0:1; return true; } return false; },
  resume(){ tour=0; },
});
`;
const body = k.plateHtml({
  fig: "Fig 15", title: "Alveolus", hint: "Hover ↔ exercise · click/F fibrosis",
  readout: "rest · 0.75 s · out 100 mmHg, 97%",
  keys: [{ mark: "deoxy", label: "Red cells arriving, ~75% saturated" }, { mark: "oxy", label: "Leaving, ~97%" }, { mark: "eosin", label: "Alveolar wall in section; collagen" }, { mark: "lit", label: "Monitor: capillary PO₂ vs time" }],
  caption: "One human alveolus at true scale (ruler: 1 tick = 10 µm), about 200 µm across, cut at its equator; the 0.6 µm blood–air barrier is drawn 3× thick. A capillary runs inside the wall; in life a dense net covers most of the outer surface, as on the hull here. Red cells, 7.5 µm across and one per ~12 µm of capillary, enter at a PO₂ of 40 mmHg and meet alveolar air at 100 mmHg. Oxygen diffuses across the barrier and binds haemoglobin; capillary PO₂ reaches the alveolar value in about 0.25 s, a third of the 0.75 s a cell spends here at rest, so even at exercise (0.25 s) the blood leaves full. Thicken the barrier (fibrosis, ~3 µm) and diffusion slows about fivefold: still fine at rest, but at exercise cells leave before they are loaded. Flow is shown 4× slower; the capillary path stands for the whole transit, which in life crosses two or three alveoli.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Alveolus: arrow keys set exercise, F thickens the barrier" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0">${svg}</div>`,
});
const page = vitaPage({ n: "15", title: "Alveolus", zh: "肺泡 · 红细胞在毛细血管中载氧", en: "Alveolus · red cells loading oxygen", body, script: liveScript() + LOOP_SRC + live,
  facts: [["~200 µm", "人类肺泡直径", "human alveolus, diameter"], ["~480 million", "成人双肺肺泡数（约 4.8 亿）", "alveoli in adult lungs"], ["~0.6 µm", "气血屏障（薄侧）厚度", "blood–air barrier, thin side"], ["0.75 s", "静息时红细胞通过毛细血管的时间", "red-cell transit time at rest"], ["~0.25 s", "毛细血管 PO₂ 达到肺泡值所需时间", "to reach alveolar PO₂"], ["40 → 100 mmHg", "混合静脉血 → 肺泡 PO₂", "mixed venous → alveolar PO₂"], ["~75% → 97%", "血红蛋白饱和度", "haemoglobin saturation"], ["~70 m²", "气体交换面积", "gas-exchange surface"]] });
writeFileSync(join(OUT, "15-alveolus.html"), page);
console.log("wrote 15-alveolus.html", (page.length / 1024).toFixed(0) + " KB", "inlet", aIn.toFixed(2), "near", dNear.toFixed(2));
