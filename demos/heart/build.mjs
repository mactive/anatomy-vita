// 14 · Heart — a four-chamber teaching model: the posterior half of an adult human heart, cut in the frontal plane,
// lies cut-face up on two cradles. A dual-sensor pressure catheter runs in through the aortic stump, across the aortic
// valve into the left ventricle, and feeds a bedside monitor that draws LV, aortic and left-atrial pressure (a Wiggers
// diagram) as the beat goes on.
// What moves: one heartbeat (75 bpm, 0.8 s). Every number comes from one lumped model (model.mjs): time-varying
// elastance ventricles and atria, valves that open on a forward pressure gradient and close on a reverse one, and a
// Windkessel for each great artery. From its volumes: the AV plane descends toward the fixed apex (MAPSE / TAPSE), the
// ventricular walls thicken, the cavities narrow, and blood dots (5 mL each, counted) move through the open valves.
// Hover scrubs the beat; the idle tour plays it 4× slower than life.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, liveScript, LOOP_SRC, RNG_SRC, plinth, stain, vitaPage, scene } from "../../bio/bio.mjs";
import { blobOf, ringsOf, chaikin } from "../../bio/soft.mjs";
import { simulate, T } from "./model.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../site/demos");
const W = 720, H = 460;
const MM = 2.2;            // 1 mm = 2.2 world units
const ZC = 46 * MM;        // the cut plane (frontal section) above the bench
const A0 = 65;             // a (base → apex, mm) to world y
const Wd = (a, b, z = ZC) => [b * MM, (a - A0) * MM, z]; // b: patient's left is +

// ---------- the model, tabulated ----------
const N = 200;
const TAB = simulate(N);
const ext = (key) => [Math.min(...TAB.map((r) => r[key])), Math.max(...TAB.map((r) => r[key]))];
const [ESV, EDV] = ext("vlv"), [ESVR, EDVR] = ext("vrv"), [LVmin, LVmax] = ext("lv"), [AOmin, AOmax] = ext("ao"), [RVmin, RVmax] = ext("rv"), [PAmin, PAmax] = ext("pa");
const cross = (key) => { const ev = []; for (let i = 1; i < N; i++) { const a = TAB[i - 1][key] >= 0.5, b = TAB[i][key] >= 0.5; if (a !== b) ev.push([TAB[i].t, b]); } return ev; };
const EVENTS = { mi: cross("mi"), av: cross("av") }; // [t, opened?]
const SV = EDV - ESV, EF = SV / EDV, CO = (SV * 60) / T / 1000;
const COLS = ["t", "lv", "ao", "la", "vlv", "vla", "mi", "av", "rv", "pa", "ra", "vrv", "vra", "tr", "pv", "aa"];
const TABC = TAB.map((r) => COLS.map((c) => +r[c].toFixed(c === "t" ? 4 : 3)));

// ---------- the section: one field of spheres, cut at z = ZC ----------
// The outline of a frontal section through an adult heart (a, b in mm): flat base, RA on the right border, LV on
// the left border, apex toward the left. The posterior half under it is filled with spheres whose radius is their
// distance to the outline (a medial-axis fill), so the body is deepest in the middle and rounds off at every edge.
const OUTLINE = [[2, -44], [0, -20], [-1, 0], [0, 24], [3, 44], [12, 52], [30, 56], [55, 60], [80, 58], [100, 50], [116, 38], [128, 26], [134, 16], [132, 8], [122, -6], [108, -22], [90, -36], [70, -46], [48, -52], [26, -54], [10, -52]];
const RING = chaikin(OUTLINE, true, 3);
const segDist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1]; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
const edgeDist = (p) => { let d = Infinity; for (let i = 0; i < RING.length; i++) d = Math.min(d, segDist(p, RING[i], RING[(i + 1) % RING.length])); return d; };
const insideRing = (p) => { let c = false; for (let i = 0, j = RING.length - 1; i < RING.length; j = i++) { const A = RING[i], B = RING[j]; if ((A[1] > p[1]) !== (B[1] > p[1]) && p[0] < ((B[0] - A[0]) * (p[1] - A[1])) / (B[1] - A[1]) + A[0]) c = !c; } return c; };
const SPHERES = [];
for (let a = -4; a <= 136; a += 7) for (let b = -58; b <= 62; b += 7) { const d = edgeDist([a, b]); if (insideRing([a, b]) && d > 5) SPHERES.push([a, b, Math.min(d, 30)]); }
for (let i = 0; i < RING.length; i += 2) { const p = RING[i], q = RING[(i + 1) % RING.length], m = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; const n = [(q[1] - p[1]) / m, -(q[0] - p[0]) / m]; const c = [p[0] - n[0] * 5, p[1] - n[1] * 5]; if (insideRing(c)) SPHERES.push([...c, 5]); else SPHERES.push([p[0] + n[0] * 5, p[1] + n[1] * 5, 5]); }
const MERGE = 0.12;
// the four great-vessel stumps: half-tubes cut by the same plane, leaving the base (b centre, outer r, a of the sawn end)
const VESSELS = [{ id: "SVC", b: -41, r: 9, end: -22 }, { id: "PA", b: -17.5, r: 12.5, end: -34 }, { id: "AO", b: 9, r: 14.5, end: -42 }, { id: "PV", b: 38, r: 8.5, end: -16 }];
// the heart's lateral edges at each level a (ventricles and atria; vessels end above a = 18)
const EDGE = [];
for (let a = 0; a <= 140; a++) {
  const xs = [];
  for (let i = 0; i < RING.length; i++) { const p = RING[i], q = RING[(i + 1) % RING.length]; if ((p[0] - a) * (q[0] - a) <= 0 && p[0] !== q[0]) xs.push(p[1] + ((a - p[0]) / (q[0] - p[0])) * (q[1] - p[1])); }
  EDGE.push(xs.length ? [Math.min(...xs), Math.max(...xs)] : [0, 0]);
}
const APEX = Math.max(...RING.map((p) => p[0]));

// ---------- the chamber geometry: one source for the build and the page ----------
const GEO_SRC = `
const EDGE=${JSON.stringify(EDGE.map(([l, r]) => [+l.toFixed(2), +r.toFixed(2)]))};
const EDV=${EDV.toFixed(2)}, ESV=${ESV.toFixed(2)}, EDVR=${EDVR.toFixed(2)}, ESVR=${ESVR.toFixed(2)};
const SEPC=-6, AV0=40, LVEND=${(APEX - 11).toFixed(1)}, RVEND=${(APEX - 26).toFixed(1)};
const edgeAt=(a)=>{ const i=Math.max(0,Math.min(139,Math.floor(a))), f=Math.max(0,Math.min(1,a-i)); return [EDGE[i][0]+(EDGE[i+1][0]-EDGE[i][0])*f, EDGE[i][1]+(EDGE[i+1][1]-EDGE[i][1])*f]; };
const sm=(x)=>{ x=Math.max(0,Math.min(1,x)); return x*x*(3-2*x); };
const lerp=(a,b,t)=>a+(b-a)*t;
// state from a model row: AV-plane descent (MAPSE ~14 mm, TAPSE ~21 mm), cavity widths from volume (ellipsoid V ∝ L·D²)
function geoOf(r){
  const g={}; const fl=(EDV-r.vlv)/(EDV-ESV), fr=(EDVR-r.vrv)/(EDVR-ESVR);
  g.dL=14*fl; g.dR=21*fr; g.avL=AV0+g.dL; g.avR=AV0+g.dR;
  g.aa=r.aa; g.top=8+3*r.aa;
  const LdL=LVEND-AV0, LL=LVEND-g.avL; g.D=48*Math.sqrt((r.vlv/EDV)*(LdL/LL));
  g.tSm=10+0.3*(48-g.D);
  const LdR=RVEND-AV0, LR=RVEND-g.avR; g.DR=27*Math.sqrt((r.vrv/EDVR)*(LdR/LR));
  const mid=(AV0+LVEND)/2; g.wF=edgeAt(mid)[1]-(SEPC+g.tSm/2)-g.D; // LV free-wall thickness so the mid width is D
  const midR=(AV0+RVEND)/2; g.wR=(SEPC-g.tSm/2)-g.DR-edgeAt(midR)[0];
  g.r=r; return g; }
const tSep=(g,a,av)=>lerp(3,g.tSm,sm((a-av)/16));
function lvSlice(g,a){ const u=(a-g.avL)/(LVEND-g.avL); const s=SEPC+tSep(g,a,g.avL)/2; const f=edgeAt(a)[1]-lerp(3.5,g.wF,sm((a-g.avL)/14));
  const c=(s+f)/2, h=(f-s)/2*Math.sqrt(Math.max(0,1-Math.pow(Math.max(0,u),3.2))); return [c-h,c+h]; }
function rvSlice(g,a){ const u=(a-g.avR)/(RVEND-g.avR); const s=SEPC-tSep(g,a,g.avR)/2; const f=edgeAt(a)[0]+lerp(3,g.wR,sm((a-g.avR)/14));
  const c=(s+f)/2, h=(s-f)/2*Math.sqrt(Math.max(0,1-Math.pow(Math.max(0,u),2.6))); return [c-h,c+h]; }
function sliced(fn,g,a0,a1,n=26){ const L=[],R=[]; for(let i=0;i<=n;i++){ const a=a0+(a1-a0)*i/n; const [l,r]=fn(g,a); L.push([a,l]); R.push([a,r]); } return [...L,...R.reverse()]; }
function boxed(a0,a1,bl,br,n=10){ const L=[],R=[]; for(let i=0;i<=n;i++){ const a=a0+(a1-a0)*i/n; L.push([a,typeof bl==="function"?bl(a):bl]); R.push([a,typeof br==="function"?br(a):br]); } return [...L,...R.reverse()]; }
// a rounded box (superellipse) between a0..a1 and b0..b1: atria and the vessel lumens
function roundBox(a0,a1,b0,b1,n=3.2,steps=48){ const ca=(a0+a1)/2, cb=(b0+b1)/2, ra=(a1-a0)/2, rb=(b1-b0)/2, out=[];
  for(let i=0;i<steps;i++){ const t=i/steps*Math.PI*2, c=Math.cos(t), s=Math.sin(t); out.push([ca+ra*Math.sign(c)*Math.pow(Math.abs(c),2/n), cb+rb*Math.sign(s)*Math.pow(Math.abs(s),2/n)]); } return out; }
function chambersOf(g){
  const mRA=edgeAt((g.top+g.avR)/2)[0], mLA=edgeAt((g.top+g.avL)/2)[1];
  return {
    LV: sliced(lvSlice,g,g.avL-0.5,LVEND),
    RV: sliced(rvSlice,g,g.avR-0.5,RVEND),
    LA: roundBox(g.top+1,g.avL+3,24,mLA-3.5,2.6),
    RA: roundBox(g.top,g.avR+3,mRA+3.5,-32,2.6),
    AO: roundBox(-41,g.avL+1,-3,21,6),
    PA: roundBox(-33,g.avR+1,-28,-7,6),
    SVC: roundBox(-21,g.top+6,-47,-35,6),
    PV: roundBox(-15,g.top+6,32,44,6),
  };
}
// valves: [hinge a, hinge b, across sign, length, flow direction (+1 into the ventricle, -1 into the artery), opening key]
function valvesOf(g){
  const r=g.r, [lA]=edgeAt(g.avR), [,rA]=edgeAt(g.avL);
  const tri0=lA+3.5, tri1=-32, mi0=24, mi1=rA-3.5;
  const span=(x,y)=>Math.abs(y-x);
  return [
    {name:"T",a:g.avR,b:tri0,dir:1,len:span(tri0,tri1)*0.55,flow:1,open:r.tr},
    {name:"T",a:g.avR,b:tri1,dir:-1,len:span(tri0,tri1)*0.5,flow:1,open:r.tr},
    {name:"M",a:g.avL,b:mi0,dir:1,len:span(mi0,mi1)*0.62,flow:1,open:r.mi},
    {name:"M",a:g.avL,b:mi1,dir:-1,len:span(mi0,mi1)*0.42,flow:1,open:r.mi},
    {name:"P",a:g.avR-1,b:-28,dir:1,len:10.6,flow:-1,open:r.pv},
    {name:"P",a:g.avR-1,b:-7,dir:-1,len:10.6,flow:-1,open:r.pv},
    {name:"A",a:g.avL-2,b:-3,dir:1,len:12.2,flow:-1,open:r.av},
    {name:"A",a:g.avL-2,b:21,dir:-1,len:12.2,flow:-1,open:r.av},
  ];
}
// a leaflet: closed it lies across the ring (bowed back against the flow), open it swings with the flow
function leafletOf(v){ const closedTilt=-0.16*v.flow, phi=v.open*1.32; const ang=closedTilt*(1-v.open)+phi*v.flow*(1);
  const da=Math.sin(ang), db=v.dir*Math.cos(ang); return {h:[v.a,v.b], tip:[v.a+da*v.len, v.b+db*v.len], n:[-db,da]}; }
// papillary muscles: [chamber, a offset below the AV plane, which wall, inset]
function papillaryOf(g){
  const lv=(da,side,ins)=>{ const a=g.avL+da; const [l,r]=lvSlice(g,a); return [a, side>0?r-ins:l+ins]; };
  const rv=(da,ins)=>{ const a=g.avR+da; const [l]=rvSlice(g,a); return [a,l+ins]; };
  return [{p:lv(32,1,6),v:"M"},{p:lv(46,1,15),v:"M"},{p:rv(28,6),v:"T"}];
}
`;
const GEO = new Function(GEO_SRC + "; return { geoOf, chambersOf, valvesOf, leafletOf, papillaryOf, lvSlice, rvSlice, edgeAt };")();
const row0 = Object.fromEntries(COLS.map((c, i) => [c, TABC[0][i]]));
const g0 = GEO.geoOf(row0);

// ---------- camera ----------
const PLATE = { x: -64 * MM, y: (-132 - A0) * MM, w: 132 * MM, d: 274 * MM, r: 12 };
const MON = { b0: -24, b1: 40, a0: -126, a1: -98 }; // the monitor's footprint (mm)
const fitPts = [...k.boxCorners(PLATE, -15, 0), Wd(-50, 8), Wd(APEX, 10), Wd(20, -60), Wd(60, 64), Wd(MON.a0, MON.b0, 62 * MM), Wd(MON.a0, MON.b1, 62 * MM)];
const P = k.fitProjection(fitPts, W, H, { pad: 14, azimuth: 132, elevation: 36 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const screen = (pts, z = ZC) => pts.map(([a, b]) => at(Wd(a, b, z)));
function belowUpperArc(pts) { // the screen region under the section's upper boundary (demos/mito)
  const sp = screen(pts);
  let lo = 0, hi = 0; sp.forEach((p, i) => { if (p[0] < sp[lo][0]) lo = i; if (p[0] > sp[hi][0]) hi = i; });
  const n = sp.length; const walk = (a, b, d) => { const out = []; for (let i = a; ; i = (i + d + n) % n) { out.push(sp[i]); if (i === b) break; } return out; };
  const c1 = walk(lo, hi, 1), c2 = walk(lo, hi, -1);
  const mean = (c) => c.reduce((s, p) => s + p[1], 0) / c.length;
  const upper = mean(c1) < mean(c2) ? c1 : c2;
  return k.pathOf([...upper, [sp[hi][0], 2000], [sp[lo][0], 2000]], true);
}

// ---------- static: the posterior half of the heart ----------
const body3 = SPHERES.map(([a, b, r]) => [...Wd(a, b), r * MM]);
const hullPaths = blobOf(body3, P, { merge: MERGE, step: 1.2 });
// the vessel stumps: straight half-tubes from inside the heart out past the base, each cut by the same plane
const gutterPts = (v) => { const pts = []; for (let i = 0; i <= 24; i++) { const t = (i / 24) * Math.PI; pts.push([v.end + v.r * 0.25 * Math.sin(t) * 0, v.b - v.r * Math.cos(t)]); } return [[20, v.b + v.r], [20, v.b - v.r], [v.end, v.b - v.r], [v.end, v.b + v.r]]; };
const gutters = VESSELS.map((v, i) => {
  const F = G.frameAlong(Wd(20, v.b), [0, -1, 0]);
  const len = (20 - v.end) * MM;
  const body = S(G.solidOf([[0, v.r * MM, 1], [len, v.r * MM]], F, P, { smooth: true }), { tone: "hi" });
  const rect = gutterPts(v);
  return `<clipPath id="hrt-g${i}"><path d="${belowUpperArc(rect)}"/></clipPath><g clip-path="url(#hrt-g${i})">${stain("eosin", body, v.id === "AO" || v.id === "PV" ? 0.3 : 0.18)}</g>`;
}).join("");
const gutterFaces = VESSELS.map((v) => `<path class="hrt-cut" d="${k.pathOf(screen(gutterPts(v)), true)}"/>`).join("")
  // adventitia: a line just inside each cut wall, running to the sawn end
  + L(VESSELS.map((v) => [v.b - v.r + 1.2, v.b + v.r - 1.2].map((b) => k.pathOf([at(Wd(v.end, b)), at(Wd(4, b))])).join("")).join(""), { tone: "faint" });
const hull = `<path class="iso-halo" d="${hullPaths.outline}" style="opacity:.22"/>` + gutters
  + `<g clip-path="url(#hrt-lower)">${stain("eosin", S(hullPaths, { tone: "hi" }), 0.42)}</g>`;
// coronary arteries on the visible lower hull: the posterior interventricular branch and the AV-groove arteries,
// drawn just under the rim where the hull shows below the cut
const cutFace = gutterFaces + `<path class="hrt-cut" d="${k.pathOf(screen(RING), true)}"/>`
  + `<g clip-path="url(#hrt-face)">${L(k.pathOf(screen(RING.map(([a, b], i) => { const p = RING[(i + 1) % RING.length], q = RING[(i - 1 + RING.length) % RING.length]; const ta = p[0] - q[0], tb = p[1] - q[1], m = Math.hypot(ta, tb) || 1; return [a + (tb / m) * 1.6 * Math.sign(1), b - (ta / m) * 1.6]; })), true), { tone: "faint" })}</g>`;

// ---------- static: cradles under the heart ----------
function cradles() {
  const out = [];
  for (const [a, b] of [[32, 0], [96, 8]].sort((p, q) => k.depthOf(Wd(p[0], p[1], 0), P) - k.depthOf(Wd(q[0], q[1], 0), P))) {
    const [x, y] = Wd(a, b);
    const top = ZC - 30 * MM;
    out.push(S(k.cylinder(x, y, 16, 0, 2.6, P, 32, 0.5), { tone: "mid" }));
    out.push(L(k.ring(x, y, 11, 2.6, P, 28), { tone: "faint" }));
    out.push(D(k.corners({ x: x - 8, y: y - 8, w: 16, d: 16 }).map(([p, q]) => at([p, q, 2.6])), { size: 0.45 }));
    out.push(S(k.cylinder(x, y, 4.4, 2.6, top - 8, P, 22), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(x, y, 7, top - 10, 5, P, 24, 0.5), { tone: "mid" }));
    out.push(L(k.knurl(x, y, 7, top - 9, top - 6, 20, P), { tone: "faint" }));
    out.push(S(k.slabOf({ x: x - 22, y: y - 9, w: 44, d: 18, r: 3 }, top - 5, 6, P, 4, 0.5), { tone: "mid" }));
    out.push(L(k.sideSeam({ x: x - 22, y: y - 9, w: 44, d: 18, r: 3 }, top - 2, P, 4), { tone: "faint" }));
  }
  return out.join("");
}

// ---------- static: the bedside monitor (pressure module + screen) ----------
const MY0 = (MON.a0 - A0) * MM, MY1 = (MON.a1 - A0) * MM, MX0 = MON.b0 * MM, MX1 = MON.b1 * MM;
const MH = 40 * MM, MLIP = 9 * MM, MBACK = MY0;
// side profile in (y, z): a box with its front sloping back, a lip below the screen
const DEPTH = MY1 - MY0;
const prof = [[MY0, 6], [MY1, 6], [MY1, 6 + MLIP], [MY1 - DEPTH * 0.32, 6 + MH], [MY0, 6 + MH]];
const FM = G.frameAlong([MX0, 0, 0], [1, 0, 0]); // u = +y, v = +z
const slopeA = [MY1, 6 + MLIP], slopeB = [MY1 - DEPTH * 0.32, 6 + MH];
const sU = [1, 0, 0], sVraw = [0, slopeB[0] - slopeA[0], slopeB[1] - slopeA[1]], sLen = G.len3(sVraw), sV = G.mul3(sVraw, 1 / sLen);
const sN = G.unit3(G.cross3(sU, sV)); // outward normal of the sloped face
const onFace = (u, v, lift = 0.6) => G.add3(G.add3([MX0, slopeA[0], slopeA[1]], G.add3(G.mul3(sU, u), G.mul3(sV, v))), G.mul3(sN, -lift));
const SCR = { u0: 7 * MM, u1: (MON.b1 - MON.b0 - 7) * MM, v0: 4 * MM, v1: sLen - 4 * MM };
const quad = (u0, u1, v0, v1, lift) => k.pathOf([onFace(u0, v0, lift), onFace(u1, v0, lift), onFace(u1, v1, lift), onFace(u0, v1, lift)].map(at), true);
function monitor() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: MX0, y: MY0, w: MX1 - MX0, d: MY1 - MY0, r: 4 }, 0, 6, P)}"/>`);
  for (const [x, y] of k.corners({ x: MX0, y: MY0, w: MX1 - MX0, d: MY1 - MY0 }, 9)) out.push(S(k.cylinder(x, y, 5, 0, 6, P, 20), { tone: "lo" }));
  out.push(S(G.prismOf(FM, prof, 0, MX1 - MX0, P), { tone: "mid" }));
  // bezel, glass, then the screen ground
  out.push(`<path class="hrt-bezel" d="${quad(SCR.u0 - 4, SCR.u1 + 4, SCR.v0 - 4, SCR.v1 + 4, -0.2)}"/>`);
  out.push(L(quad(SCR.u0 - 4, SCR.u1 + 4, SCR.v0 - 4, SCR.v1 + 4, -0.2), { tone: "mid" }));
  out.push(`<path class="hrt-screen" d="${quad(SCR.u0, SCR.u1, SCR.v0, SCR.v1, -0.4)}"/>`);
  out.push(L(quad(SCR.u0, SCR.u1, SCR.v0, SCR.v1, -0.4), { tone: "lo" }));
  // grid: 0, 40, 80, 120 mmHg and 0.1 s divisions
  const g = [];
  for (const p of [0, 40, 80, 120]) { const v = SCR.v0 + 3 + (p / 140) * (SCR.v1 - SCR.v0 - 6); g.push(k.pathOf([at(onFace(SCR.u0 + 2, v, -0.5)), at(onFace(SCR.u1 - 2, v, -0.5))])); }
  for (let t = 0; t <= 0.8001; t += 0.1) { const u = SCR.u0 + 3 + (t / T) * (SCR.u1 - SCR.u0 - 6); g.push(k.pathOf([at(onFace(u, SCR.v0 + 2, -0.5)), at(onFace(u, SCR.v0 + 4.5, -0.5))])); }
  out.push(`<g class="hrt-grid">${L(g.join(""), { tone: "faint", free: true })}</g>`);
  // valve-event marks under the trace: mitral and aortic, closed (hollow) and opened (dot)
  const mk = [];
  for (const [t] of [...EVENTS.mi, ...EVENTS.av]) { const u = SCR.u0 + 3 + (t / T) * (SCR.u1 - SCR.u0 - 6); mk.push(at(onFace(u, SCR.v0 + 6.5, -0.5))); }
  out.push(D(mk, { size: 0.9, tone: "mid" }));
  // the lip: three knobs, a zero button, two catheter sockets
  const lip = (u, h) => [MX0 + u, MY1, 6 + h];
  for (const u of [0.18, 0.3, 0.42].map((f) => f * (MX1 - MX0))) {
    const F = G.frameAlong(lip(u, MLIP / 2), [0, 1, 0]);
    out.push(S(G.disc(0, 4.2, 5.2, F, P), { tone: "mid" }), L(G.ribsOf(F, 0.6, 3.8, 5.2, 14, P), { tone: "faint" }), S(G.disc(4.2, 5.4, 2.6, F, P), { tone: "mid" }));
  }
  for (const u of [0.66, 0.8].map((f) => f * (MX1 - MX0))) {
    const F = G.frameAlong(lip(u, MLIP / 2), [0, 1, 0]);
    out.push(S(G.disc(0, 1.8, 6.2, F, P), { tone: "lo" }), S(G.disc(1.8, 3.6, 4.4, F, P), { tone: "mid" }), D([at(lip(u, MLIP / 2 + 0).map((c, i) => (i === 1 ? c + 3.8 : c)))], { size: 1.1, tone: "lo" }));
  }
  // vents on the top, closed slots running edge to edge
  const vents = []; for (let i = 0; i < 7; i++) { const x = MX0 + 12 + i * ((MX1 - MX0 - 24) / 6); vents.push(k.lineOnTop([x, MY0 + 8], [x, MY0 + DEPTH * 0.6], 6 + MH, P)); }
  out.push(L(vents.join(""), { tone: "faint" }));
  out.push(D([[MX0 + 5, MY0 + 5], [MX1 - 5, MY0 + 5]].map(([x, y]) => at([x, y, 6 + MH])), { size: 0.5 }));
  return out.join("");
}
// the screen point for (t, mmHg)
const SCR_SRC = `const SCR=${JSON.stringify(SCR)}, SO=${JSON.stringify([MX0, slopeA[0], slopeA[1]])}, SU=${JSON.stringify(sU)}, SV=${JSON.stringify(sV.map((c) => +c.toFixed(5)))}, SN=${JSON.stringify(sN.map((c) => +c.toFixed(5)))};
const onScreen=(t,p)=>{ const u=SCR.u0+3+(t/${T})*(SCR.u1-SCR.u0-6), v=SCR.v0+3+(Math.max(0,p)/140)*(SCR.v1-SCR.v0-6); return K.iso([SO[0]+SU[0]*u+SV[0]*v-SN[0]*0.6, SO[1]+SU[1]*u+SV[1]*v-SN[1]*0.6, SO[2]+SU[2]*u+SV[2]*v-SN[2]*0.6],P); };`;

// ---------- static: the catheter outside the heart, from the aortic stump to the monitor ----------
const CATH_R = 1.1 * MM;
const socket = [MX0 + 0.66 * (MX1 - MX0), MY1 + 3.6, 6 + MLIP / 2];
const cathOut = G.fillet([Wd(-40, 9, ZC + 1.2), Wd(-52, 9, ZC + 1.2), Wd(-62, 9, ZC - 16 * MM), Wd(-70, 9, 3 + CATH_R), Wd(-84, socket[0] / MM, 3 + CATH_R), [socket[0], socket[1] + 16, socket[2]], [socket[0], socket[1] + 1, socket[2]]], 12, 7);
const sc = scene(P);
sc.tube(cathOut, CATH_R, { tone: "mid" }, { maxLength: 16 });
const cathOutside = `<g class="hrt-cath">${sc.svg()}</g>`
  + S(G.disc(0, 6, 2.6, G.frameAlong([socket[0], socket[1] + 1, socket[2]], [0, 1, 0]), P), { tone: "mid" }); // strain relief at the socket

// ---------- the figure ----------
const defs = `<defs><clipPath id="hrt-lower"><path d="${belowUpperArc(RING)}"/></clipPath><clipPath id="hrt-face"><path d="${k.pathOf(screen(RING), true)}"/></clipPath><clipPath id="hrt-lumen"><path data-part="clip" d=""/></clipPath></defs>`;
const svg = k.figureSvg({
  width: W, height: H,
  label: "The back half of an adult human heart, cut through all four chambers, lies cut face up on two cradles. A thin pressure catheter enters through the cut aorta, crosses the aortic valve into the left ventricle, and runs to a bedside monitor that draws left-ventricular, aortic and left-atrial pressure through one beat. As the beat runs the ventricles squeeze, the valve plane slides toward the apex, the four valves swing open and shut, and blood dots move from chamber to chamber.",
  body: [defs, plinth(PLATE, P, { scale: { x: PLATE.x + 16, y: PLATE.y + PLATE.d - 15, w: 220, step: 5 * MM, every: 2 }, label: { x: PLATE.x + PLATE.w - 54, y: PLATE.y + PLATE.d - 21, w: 38 } }),
    monitor(), `<g data-part="trace"></g>`, cradles(), hull, cutFace, `<g data-part="cut"></g>`, `<g data-part="cath"></g>`, cathOutside],
});

// ---------- live ----------
const live = `
const P=${JSON.stringify(P)}; const MM=${MM}, ZC=${ZC}, A0=${A0}, TC=${T};
const COLS=${JSON.stringify(COLS)}; const TAB=${JSON.stringify(TABC)};
${GEO_SRC}
${SCR_SRC}
${RNG_SRC}
const rand=rng(1628); // Harvey, De motu cordis
const stage=document.querySelector(".iso-stage"), svg=stage.querySelector("svg"), readout=document.querySelector("[data-readout]");
const slot=(n)=>svg.querySelector('[data-part="'+n+'"]');
const cutG=slot("cut"), traceG=slot("trace"), cathG=slot("cath"), clipP=slot("clip");
const Wd=(a,b,z=ZC)=>[b*MM,(a-A0)*MM,z];
const at=(p)=>K.iso(p,P);
const f1=(n)=>n.toFixed(1);
const pathAB=(pts,z=ZC)=>K.pathOf(pts.map(([a,b])=>at(Wd(a,b,z))),true);
const sg=(n,k,h)=>'<g class="bio-stain" style="--stain:var(--stain-'+n+');--stain-k:'+k+'">'+h+'</g>';
function rowAt(t){ const x=((t%TC)+TC)%TC/TC*TAB.length; const i=Math.floor(x)%TAB.length, j=(i+1)%TAB.length, f=x-Math.floor(x); const r={};
  COLS.forEach((c,n)=>{ r[c]=TAB[i][n]+(TAB[j][n]-TAB[i][n])*(c==="t"?0:f); }); r.t=((t%TC)+TC)%TC; return r; }
const ccw=(pts)=>{ let s=0; for(let i=0;i<pts.length;i++){ const p=pts[i],q=pts[(i+1)%pts.length]; s+=p[0]*q[1]-q[0]*p[1]; } return s>0?pts:pts.slice().reverse(); };
// the inside of a chamber: the same outline sunk below the cut and drawn smaller, like contour lines down a bowl
function bowl(pts,depth){ const c=pts.reduce((s,p)=>[s[0]+p[0]/pts.length,s[1]+p[1]/pts.length],[0,0]);
  return [0.3,0.6,0.85].map((f)=>{ const k=1-0.32*f; return pathAB(pts.map(([a,b])=>[c[0]+(a-c[0])*k,c[1]+(b-c[1])*k]),ZC-depth*MM*f); }).join(""); }
// ---- blood: dots of 5 mL each, counted per chamber
const ML=5;
const LEFT={ven:"PV",atr:"LA",vent:"LV",art:"AO",stain:"oxy",vv:"vlv",va:"vla",inn:"mi",out:"av"};
const RIGHT={ven:"SVC",atr:"RA",vent:"RV",art:"PA",stain:"deoxy",vv:"vrv",va:"vra",inn:"tr",out:"pv"};
const dots=[]; // {side, comp, u, v, tr:{from,via,t}}
function placeIn(g,ch,comp,u,v){
  if(comp==="LV"||comp==="RV"){ const fn=comp==="LV"?lvSlice:rvSlice; const a0=comp==="LV"?g.avL:g.avR, a1=comp==="LV"?LVEND:RVEND; const a=a0+2+(a1-a0-6)*u; const [l,r]=fn(g,a); return [a,l+(r-l)*(0.5+0.42*v)]; }
  const pts=ch[comp]; let a0=Infinity,a1=-Infinity; for(const p of pts){ a0=Math.min(a0,p[0]); a1=Math.max(a1,p[0]); }
  const a=a0+2+(a1-a0-4)*u; let lo=Infinity,hi=-Infinity; const n=pts.length;
  for(let i=0;i<n;i++){ const p=pts[i],q=pts[(i+1)%n]; if((p[0]-a)*(q[0]-a)<=0&&p[0]!==q[0]){ const b=p[1]+(a-p[0])/(q[0]-p[0])*(q[1]-p[1]); lo=Math.min(lo,b); hi=Math.max(hi,b);} }
  if(lo===Infinity){ lo=pts[0][1]; hi=lo; } return [a,lo+(hi-lo)*(0.5+0.4*v)]; }
function seed(g){ for(const S of [LEFT,RIGHT]){ for(const [comp,n] of [[S.atr,Math.round(g.r[S.va]/ML)],[S.vent,Math.round(g.r[S.vv]/ML)],[S.art,5]]) for(let i=0;i<n;i++) dots.push({S,comp,u:rand(),v:rand()*2-1,ju:0,jv:0}); } }
const count=(S,comp)=>dots.filter((d)=>d.S===S&&d.comp===comp).length;
function nearest(S,comp,u){ let best=null,bd=9; for(const d of dots){ if(d.S!==S||d.comp!==comp||d.tr) continue; const dd=Math.abs(d.u-u); if(dd<bd){ bd=dd; best=d; } } return best; }
function move(d,to,uTo,via,g,ch){ const from=pos(d,g,ch); d.tr={from,via,t:0}; d.comp=to; d.u=uTo; d.v=rand()*2-1; }
function pos(d,g,ch){ return placeIn(g,ch,d.comp,Math.max(0,Math.min(1,d.u+d.ju)),Math.max(-1,Math.min(1,d.v+d.jv))); }
let lastT=0;
function bloodStep(g,ch,dt){
  for(const S of [LEFT,RIGHT]){
    const r=g.r, ve=S.vent, av=S===LEFT?g.avL:g.avR;
    const vIn=[av,S===LEFT?(23+edgeAt(av)[1]-3)/2:(edgeAt(av)[0]+3-30)/2], vOut=S===LEFT?[g.avL-2,9]:[g.avR-1,-17.5];
    const want=Math.round(r[S.vv]/ML), wantA=Math.round(r[S.va]/ML);
    let n=count(S,ve), guard=0;
    while(n>want&&guard++<4){ const d=r[S.out]>0.2?nearest(S,ve,0):nearest(S,ve,0); if(!d) break; if(r[S.out]>0.2) move(d,S.art,1,vOut,g,ch); else move(d,S.atr,1,vIn,g,ch); n--; }
    while(n<want&&guard++<8){ const d=r[S.inn]>0.2?nearest(S,S.atr,1):nearest(S,S.art,1); if(!d) break; move(d,ve,0.05+rand()*0.2,r[S.inn]>0.2?vIn:vOut,g,ch); n++; }
    let na=count(S,S.atr);
    while(na<wantA&&guard++<12){ dots.push({S,comp:S.atr,u:rand()*0.35,v:rand()*2-1,ju:0,jv:0,tr:{from:placeIn(g,ch,S.ven,rand(),rand()*2-1),via:null,t:-rand()}}); na++; }
    while(na>wantA&&guard++<16){ const d=nearest(S,S.atr,0); if(!d) break; dots.splice(dots.indexOf(d),1); na--; }
    // arterial dots run off down the stump; keep five or so in view
    for(const d of dots) if(d.S===S&&d.comp===S.art&&!d.tr) d.u-=dt*(0.25+1.6*r[S.out]);
    for(let i=dots.length-1;i>=0;i--){ const d=dots[i]; if(d.S===S&&d.comp===S.art&&d.u<0.02) dots.splice(i,1); }
  }
  for(const d of dots){ if(d.tr){ d.tr.t+=dt/0.28; if(d.tr.t>=1) d.tr=null; } d.ju=0.04*Math.sin(d.v*40+lastT*1.3); d.jv=0.08*Math.cos(d.u*30+lastT*1.1); }
}
function dotXY(d,g,ch){ const p=pos(d,g,ch); if(!d.tr) return p; const t=d.tr.t, s=t*t*(3-2*t); const a=d.tr.from, c=d.tr.via||[(a[0]+p[0])/2,(a[1]+p[1])/2];
  const q=(x,y,z)=> (1-s)*(1-s)*x+2*(1-s)*s*y+s*s*z; return [q(a[0],c[0],p[0]),q(a[1],c[1],p[1])]; }
// ---- draw
let tNow=0, tT=0, playing=true;
function draw(dt){
  const r=rowAt(tNow), g=geoOf(r), ch=chambersOf(g);
  if(!dots.length) seed(g);
  if(dt>0) bloodStep(g,ch,dt); else bloodStep(g,ch,0);
  const left=["LA","LV","AO","PV"], right=["RA","RV","PA","SVC"];
  const all=[...left,...right].map((n)=>ccw(ch[n]));
  const pl=left.map((n)=>pathAB(ccw(ch[n]))).join(""), pr=right.map((n)=>pathAB(ccw(ch[n]))).join("");
  clipP.setAttribute("d",pl+pr);
  // myocardium: fibre layers following each ventricle, closed loops round the cavity (the lumens hide the inner runs)
  const layer=(fn,av,end,o)=>{ const n=30, Lp=[], Rp=[]; for(let i=0;i<=n;i++){ const a=av+2+(end+o*0.8-av-2)*i/n; const [l,r]=fn(g,Math.min(a,end-0.01)); const u=(a-av)/(end+o*0.8-av); const k=Math.sqrt(Math.max(0,1-Math.pow(Math.max(0,u),3))); const c=(l+r)/2, hw=Math.max(0,(r-l)/2+o)*k; Lp.push([a,c-hw]); Rp.push([a,c+hw]); } return pathAB([...Lp,...Rp.reverse()]); };
  let fib=''; for(const o of [2.6,5.2,7.8]) fib+=layer(lvSlice,g.avL,LVEND,o); for(const o of [2.2]) fib+=layer(rvSlice,g.avR,RVEND,o);
  let h='<g clip-path="url(#hrt-face)">'+sg("eosin",0.5,K.lineSvg(fib,{tone:"faint"}))+'</g>';
  h+='<path class="hrt-endo" d="'+pl+pr+'"/>';
  h+='<path class="hrt-lumen" data-side="L" d="'+pl+'"/><path class="hrt-lumen" data-side="R" d="'+pr+'"/>';
  let inside='';
  const depth={LV:30,RV:22,LA:20,RA:20,AO:12,PA:11,SVC:7,PV:7};
  inside+=K.lineSvg(Object.keys(depth).map((n)=>bowl(ch[n],depth[n])).join(""),{tone:"faint"});
  // papillary muscles: cones standing from the chamber floor, chordae from their tips to the leaflet edges
  const paps=papillaryOf(g), vs=valvesOf(g);
  const papSvg=[], chord=[];
  for(const pm of paps){ const base=Wd(pm.p[0],pm.p[1],ZC-24*MM), tip=Wd(pm.p[0]-3,pm.p[1],ZC-9*MM);
    papSvg.push([K.depthOf(base,P),sg("eosin",0.5,K.solidSvg(G.solidOf([[0,5.5*MM,1],[G.len3(G.sub3(tip,base))*0.55,4*MM,1],[G.len3(G.sub3(tip,base)),2.2*MM]],G.frameAlong(base,G.sub3(tip,base)),P,{smooth:true}),{tone:"hi"}))]);
    for(const v of vs.filter((v)=>v.name===pm.v)){ const lf=leafletOf(v); for(const f of [0.55,0.8,1]){ const e=[v.a+(lf.tip[0]-v.a)*f, v.b+(lf.tip[1]-v.b)*f]; chord.push(K.pathOf([at(Wd(e[0],e[1],ZC-6*MM)),at(G.add3(tip,[0,0,0]))])); } } }
  inside+=papSvg.sort((a,b)=>a[0]-b[0]).map((x)=>x[1]).join("");
  inside+=K.lineSvg(chord.join(""),{tone:"mid"});
  // blood
  const bl={L:[],R:[]};
  for(const d of dots){ const p=dotXY(d,g,ch); const s=at(Wd(p[0],p[1],ZC-3*MM)); bl[d.S===LEFT?"L":"R"].push('<circle cx="'+f1(s[0])+'" cy="'+f1(s[1])+'" r="2.3"/>'); }
  inside+=sg("oxy",1,'<g fill="var(--stain-oxy)">'+bl.L.join("")+'</g>')+sg("deoxy",1,'<g fill="var(--stain-deoxy)">'+bl.R.join("")+'</g>');
  // leaflets: curtains hanging from the valve ring into the half-heart, their cut edges in the section plane
  const lfs=vs.map((v)=>{ const lf=leafletOf(v); const t=0.8, w=0.45; const q=[[lf.h[0]+lf.n[0]*t,lf.h[1]+lf.n[1]*t],[lf.tip[0]+lf.n[0]*w,lf.tip[1]+lf.n[1]*w],[lf.tip[0]-lf.n[0]*w,lf.tip[1]-lf.n[1]*w],[lf.h[0]-lf.n[0]*t,lf.h[1]-lf.n[1]*t]];
    const ring=q.map(([a,b])=>{ const p=Wd(a,b); return [p[0],p[1]]; }); const deep=(v.name==="A"||v.name==="P"?6:9)*MM;
    const lit=v.open>0.5&&v.open<0.98;
    return [K.depthOf(Wd(lf.tip[0],lf.tip[1]),P),K.solidSvg(K.extrude(ring,ZC-deep,deep-0.4,P),{tone:"mid",crease:"none"})]; });
  inside+=sg("hema",0.75,lfs.sort((a,b)=>a[0]-b[0]).map((x)=>x[1]).join(""));
  h+='<g clip-path="url(#hrt-lumen)">'+inside+'</g>';
  // the cut edges of the leaflets, and the fibrous rings at each hinge
  h+=sg("hema",0.6,K.dotsSvg(vs.map((v)=>at(Wd(v.a,v.b))),{size:1.3,tone:"mid"}));
  // coronary vessels in the AV groove, cut across: right coronary artery, circumflex, coronary sinus
  const cor=[[g.avR+3,edgeAt(g.avR+3)[0]+2.2,1.7,"oxy"],[g.avL+3,edgeAt(g.avL+3)[1]-2.2,1.5,"oxy"],[g.avL-6,edgeAt(g.avL-6)[1]-2.4,1.9,"deoxy"]];
  h+=cor.map(([a,b,rr,st])=>sg(st,0.9,'<path class="hrt-cor" d="'+K.ring(b*MM,(a-A0)*MM,rr*MM,ZC,P,18)+'"/>'+K.dotsSvg([at(Wd(a,b))],{size:0.8,tone:"mid"}))).join("");
  cutG.innerHTML=h;
  // the catheter inside: lies in the aortic lumen, crosses the aortic valve, ends in a pigtail in the LV
  const cz=ZC+1.2; const tipA=g.avL+30, pig=[]; for(let i=0;i<=20;i++){ const th=i/20*Math.PI*1.7; pig.push(Wd(tipA+5-5*Math.cos(th),15+5*Math.sin(th),cz)); }
  const route=[Wd(-44,9,cz),Wd(g.avL-12,8.5,cz),Wd(g.avL+4,9,cz),Wd(tipA-4,13,cz),...pig];
  let c=''; for(const pc of T.tubePieces(route,1.1*MM,P,{maxLength:400})) c+=T.tubeSvg(pc,{tone:"mid"});
  const sAo=at(Wd(g.avL-22,8.6,cz+1)), sLv=at(Wd(tipA-6,12.4,cz+1));
  c+='<circle class="hrt-sensor" cx="'+f1(sAo[0])+'" cy="'+f1(sAo[1])+'" r="2.2"/><circle class="hrt-sensor" data-lv cx="'+f1(sLv[0])+'" cy="'+f1(sLv[1])+'" r="2.2"/>';
  cathG.innerHTML=c;
  // the monitor: sweep traces up to now; the previous beat fades ahead of the erase bar
  const tr=(key,a,b)=>{ const pts=[]; for(let i=0;i<TAB.length;i++){ const t=TAB[i][0]; if(t>=a&&t<=b) pts.push(onScreen(t,TAB[i][COLS.indexOf(key)])); } return pts.length>1?K.pathOf(pts):""; };
  const now=r.t, gap=0.05;
  let s='';
  for(const [key,tone,cls] of [["la","lo","hrt-la"],["ao","mid","hrt-ao"],["lv","lit","hrt-lv"]]){
    s+='<g class="'+cls+'">'+K.lineSvg(tr(key,0,now),{tone,free:true})+'<g opacity=".28">'+K.lineSvg(tr(key,now+gap,TC),{tone,free:true})+'</g></g>'; }
  const cur=[onScreen(now,r.lv),onScreen(now,r.ao)];
  s+='<circle class="hrt-cur" cx="'+f1(cur[0][0])+'" cy="'+f1(cur[0][1])+'" r="1.8"/>'+sg("oxy",1,'<circle cx="'+f1(cur[1][0])+'" cy="'+f1(cur[1][1])+'" r="1.6" fill="var(--stain-oxy)"/>');
  traceG.innerHTML=s;
  return {r,g};
}
function phaseOf(r){ if(r.av>0.5) return "ejection"; if(r.mi>0.5) return r.aa>0.15?"atrial kick":(r.t<0.52?"rapid filling":"diastasis"); return r.t<0.3||r.t>0.7?"isovol. contraction":"isovol. relaxation"; }
function say(o){ const r=o.r; vitaSay(stage,readout,r.t.toFixed(2)+" s · "+phaseOf(r)+" · LV "+Math.round(r.lv)+" / Ao "+Math.round(r.ao)+" mmHg"); stage.setAttribute("aria-valuenow",Math.round(r.t*1000)); }
const SLOW=4;
vitaLoop({ stage, idleMs:6000,
  frame(dt,st){
    if(st.still){ tNow=0.2; say(draw(0)); return; }
    let step=0;
    if(st.touring){ step=dt/SLOW; tNow=(tNow+step)%TC; tT=tNow; }
    else { let d=tT-tNow; if(d>TC/2) d-=TC; if(d<-TC/2) d+=TC; step=d*(1-Math.exp(-dt/0.12)); tNow=((tNow+step)%TC+TC)%TC; }
    lastT+=dt; say(draw(Math.abs(step)>1e-5?Math.min(0.05,Math.abs(step)*SLOW):0)); },
  pointer(x){ tT=x*TC*0.999; },
  keys(key){ if(key==="ArrowRight"||key==="ArrowUp"){ tT=(tT+0.02)%TC; return true; } if(key==="ArrowLeft"||key==="ArrowDown"){ tT=(tT-0.02+TC)%TC; return true; } if(key===" "){ tT=(tT+0.1)%TC; return true; } return false; },
});
`;

const CSS = `<style>
.hrt-cut{fill:color-mix(in oklab,var(--anatomy-top),var(--stain-eosin) 11%);stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight)}
.hrt-endo{fill:none;stroke:color-mix(in oklab,var(--anatomy-hi),var(--stain-eosin) 45%);stroke-width:calc(var(--anatomy-weight)*2.4);stroke-linejoin:round}
.hrt-lumen{stroke:none}
.hrt-lumen[data-side=L]{fill:color-mix(in oklab,color-mix(in oklab,var(--anatomy-paper),var(--anatomy-shade-1) 45%),var(--stain-oxy) 13%)}
.hrt-lumen[data-side=R]{fill:color-mix(in oklab,color-mix(in oklab,var(--anatomy-paper),var(--anatomy-shade-1) 45%),var(--stain-deoxy) 11%)}
.hrt-screen{fill:color-mix(in oklab,var(--anatomy-paper),var(--anatomy-shade-0) 18%)}
.hrt-bezel{fill:color-mix(in oklab,var(--anatomy-paper),var(--anatomy-shade-1) 40%)}
.hrt-lv .iso-line{stroke-width:calc(var(--anatomy-weight)*1.6)}
.hrt-ao .iso-line{stroke:var(--stain-oxy);stroke-width:calc(var(--anatomy-weight)*1.4)}
.hrt-la .iso-line{stroke-dasharray:2 2}
.hrt-cor{fill:var(--anatomy-paper);stroke:var(--stain);stroke-width:var(--anatomy-weight)}
.hrt-cur{fill:var(--anatomy-lit)}
.hrt-sensor{fill:var(--anatomy-paper);stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight)}
.hrt-sensor[data-lv]{fill:var(--anatomy-lit)}
</style>`;
const body = CSS + k.plateHtml({
  fig: "Fig 14", title: "Heart · one beat", hint: "Hover ↔ time in the beat",
  readout: "0.00 s · isovol. contraction · LV 8 / Ao 79 mmHg",
  keys: [{ mark: "oxy", label: "Oxygenated blood (left heart), 1 dot = 5 mL; aortic pressure" }, { mark: "deoxy", label: "Venous blood (right heart)" }, { mark: "hema", label: "Valve leaflets" }, { mark: "line", label: "LV pressure (catheter tip), black on the monitor" }],
  caption: `The back half of an adult human heart cut in the frontal plane, through all four chambers (ruler: 1 tick = 5 mm). The outflow tracts and great vessels, which really lie in front of the atria, are folded into the same section so all four valves show at once. One beat at 75 per minute, from a lumped model (time-varying elastance chambers, pressure-driven valves, Windkessel arteries): the left ventricle fills to ${EDV.toFixed(0)} mL and ejects ${SV.toFixed(0)} mL (ejection fraction ${(EF * 100).toFixed(0)}%), peaking at ${LVmax.toFixed(0)} mmHg against an aortic pressure of ${AOmax.toFixed(0)}/${AOmin.toFixed(0)}; the right ventricle moves the same volume at ${RVmax.toFixed(0)}/${RVmin.toFixed(0)} mmHg. Each valve opens only when the pressure behind it is higher than the pressure ahead: the mitral and tricuspid close as the ventricles start to squeeze, the aortic and pulmonary open once ventricular pressure passes arterial pressure and close as it falls back. The apex stays still while the valve plane slides about 14 mm (mitral) and 21 mm (tricuspid) toward it, so the atria refill while the ventricles empty. The dual-sensor catheter reads LV pressure at its pigtail tip and aortic pressure 5 cm back; the monitor sweeps both with left-atrial pressure dashed. The tour plays the beat 4× slower than life; hover to scrub through it.`,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Heart: arrow keys step through one heartbeat" aria-valuemin="0" aria-valuemax="800" aria-valuenow="0">${svg}</div>`,
});
const page = vitaPage({ n: "14", title: "Heart · one beat", zh: "心脏 · 一次心跳中的四腔与瓣膜", en: "Heart · four chambers, four valves, one beat", body, script: liveScript() + LOOP_SRC + live,
  facts: [["75 bpm · 0.8 s", "静息心率与心动周期", "resting heart rate, cycle length"], [`${LVmax.toFixed(0)} / ${LVmin.toFixed(0)} mmHg`, "左心室压（收缩峰 / 舒张最低）", "LV pressure, systolic peak / diastolic low"], [`${AOmax.toFixed(0)} / ${AOmin.toFixed(0)} mmHg`, "主动脉压（收缩 / 舒张）", "aortic pressure, systolic / diastolic"], [`${SV.toFixed(0)} mL · ${(EF * 100).toFixed(0)}%`, "每搏输出量 · 射血分数", "stroke volume · ejection fraction"], [`${CO.toFixed(1)} L/min`, "心输出量", "cardiac output"], ["~14 / ~21 mm", "二尖瓣 / 三尖瓣环收缩期位移（MAPSE / TAPSE）", "mitral / tricuspid annular descent (MAPSE / TAPSE)"]] });
writeFileSync(join(OUT, "14-heart.html"), page);
console.log("wrote 14-heart.html", (page.length / 1024).toFixed(0) + " KB", { EDV: EDV.toFixed(0), ESV: ESV.toFixed(0), LV: [LVmin, LVmax].map((x) => x.toFixed(0)), AO: [AOmin, AOmax].map((x) => x.toFixed(0)), RV: [RVmin, RVmax].map((x) => x.toFixed(0)), PA: [PAmin, PAmax].map((x) => x.toFixed(0)), APEX: APEX.toFixed(0), events: EVENTS, g0: { D: g0.D.toFixed(1), wF: g0.wF.toFixed(1), DR: g0.DR.toFixed(1), wR: g0.wR.toFixed(1) } });
