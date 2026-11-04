// 16 · Nephron — one juxtamedullary nephron laid out as glass plumbing on a teaching board. The board is the kidney in
// section: the back third is cortex, the front two thirds medulla, inlaid in bands that darken with the interstitial
// osmolality (300 → 1200 mOsm/kg) and read off a second ruler on the left edge. A glass Bowman's capsule holds the
// glomerular knot; the tubule runs as the real sequence of segments to a collecting duct that drains into a graduated
// cylinder. What moves: filtrate, one dot per 1% of what the glomerulus filters. Each dot leaves the tubule where water
// is really reabsorbed (two thirds in the proximal tubule, ~15% in the descending limb, none in the ascending limb, the
// rest in the collecting duct as ADH allows). The control is ADH: it sets how many aquaporin-2 channels the collecting
// duct carries, and so how much of the last 18% comes back; the cylinder fills at the true urine flow.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { blobOf } from "../../bio/soft.mjs";
import { k, G, liveScript, LOOP_SRC, plinth, stain, vitaPage, scene } from "../../bio/bio.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../site/demos");
const W = 740, H = 470;
const MM = 10; // 1 mm of kidney = 10 units along the board
// ---- truth (human; Boron & Boulpaep, Guyton & Hall) ----
// segment lengths: proximal tubule ~14 mm, thin descending + ascending limbs of a long loop ~10 + 10 mm,
// distal tubule ~5 mm, collecting duct ~20 mm. Tubule ~30–60 µm across: drawn 0.8 mm (~15× wide).
const TR = 4.6;              // tubule radius in units (0.4 mm drawn)
const TZ = 7;              // tube centre height above the board
const PLATE = { x: -210, y: -150, w: 420, d: 300, r: 12 };
const CORTEX_Y = -50;      // cortex behind this line, medulla in front
const CAP = [-150, -95, 18], CAP_R = 15; // Bowman's capsule ~200 µm: drawn 3 mm (15× like the tubule)
const CYL = { x: 140, y: 95, r: 16, h: 58 }; // graduated cylinder at the duct's outlet
const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [CYL.x, CYL.y, CYL.h + 4], [CAP[0], CAP[1], CAP[2] + CAP_R + 4]], W, H, { pad: 18, azimuth: 38 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);

// ---- the tubule as one route, segment by segment ----
const z = TZ;
const seg = {
  pct: [[CAP[0] + CAP_R - 2, CAP[1] + 4, CAP[2] - 4], [-128, -92, z], [-112, -112, z], [-92, -100, z], [-104, -78, z], [-86, -66, z], [-66, -86, z], [-52, -110, z], [-38, -94, z], [-48, -72, z], [-40, -56, z]],
  dtl: [[-40, -36, z], [-40, 108, z]],
  bend: [[-40, 122, z], [-20, 122, z]],
  tal: [[-20, 108, z], [-20, -56, z]],
  dct: [[-14, -76, z], [0, -96, z], [18, -82, z], [30, -106, z], [48, -118, z], [66, -104, z]],
  cd: [[80, -90, z], [80, 92, z]],
  out: [[86, 112, z + 4], [CYL.x - 4, CYL.y, CYL.h + 10], [CYL.x, CYL.y, CYL.h - 2]],
};
const order = ["pct", "dtl", "bend", "tal", "dct", "cd", "out"];
const raw = order.flatMap((s) => seg[s]);
const route = G.resample(G.fillet(raw, 7, 8), 2);
// arc length and segment boundaries: each named segment ends at the route point nearest its last corner
const sAt = [0]; for (let i = 1; i < route.length; i++) sAt.push(sAt[i - 1] + G.len3(G.sub3(route[i], route[i - 1])));
const nearest = (p) => { let bi = 0, bd = Infinity; route.forEach((q, i) => { const d = G.len3(G.sub3(p, q)); if (d < bd) { bd = d; bi = i; } }); return sAt[bi]; };
const ends = Object.fromEntries(order.map((s) => [s, nearest(seg[s][seg[s].length - 1])]));
const SEG = { pct: [6, ends.pct], dtl: [ends.pct, ends.dtl], tal: [ends.bend, ends.tal], dct: [ends.tal, ends.dct], cd: [ends.dct + 10, ends.cd], end: sAt[sAt.length - 1] };

// ---- the board: cortex and medulla inlays, the osmolality ruler ----
function board() {
  const out = [];
  const inlay = (y0, y1, a) => { const pl = { x: PLATE.x + 34, y: y0, w: PLATE.w - 96, d: y1 - y0, r: 2 };
    return `<path d="${k.planOutline(pl, 0.05, P)}" style="fill:var(--anatomy-shade-0);opacity:${a}"/>` + L(k.planOutline(pl, 0.05, P), { tone: "faint" }); };
  out.push(inlay(PLATE.y + 16, CORTEX_Y, 0.06));
  // medulla in four bands, outer → inner: 300–600, 600–900, 900–1200 mOsm/kg, plus the papilla tip
  const bands = 4, span = PLATE.y + PLATE.d - 14 - CORTEX_Y;
  for (let i = 0; i < bands; i++) out.push(inlay(CORTEX_Y + (span * i) / bands, CORTEX_Y + (span * (i + 1)) / bands, 0.15 + i * 0.13));
  // the cortex is crowded with other glomeruli: faint rings, seeded so every build is the same
  let sd = 1842; const r01 = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296); const rings = [];
  for (let i = 0; i < 70; i++) { const x = PLATE.x + 44 + r01() * (PLATE.w - 116), y = PLATE.y + 24 + r01() * (CORTEX_Y - PLATE.y - 32);
    if (Math.hypot(x - CAP[0], y - CAP[1]) < 26 || route.some((q) => Math.hypot(q[0] - x, q[1] - y) < 10)) continue; rings.push(k.ring(x, y, 2.2 + r01() * 1.2, 0.05, P, 14)); }
  out.push(stain("oxy", L(rings.join(""), { tone: "lo" }), 0.35));
  // osmolality ruler on the left edge: one tick per 100 mOsm/kg, major every 300, running front to back
  const strip = { x: PLATE.x + 10, y: CORTEX_Y - 4, w: 9, d: span + 4, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const osmY = (m) => CORTEX_Y + ((m - 300) / 900) * (span - 6);
  const minor = [], major = [];
  for (let m = 300; m <= 1200; m += 100) (m % 300 ? minor : major).push(k.lineOnTop([strip.x + 0.8, osmY(m)], [strip.x + (m % 300 ? 4 : 7), osmY(m)], 0.6, P));
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  return out.join("");
}
// small saddles under the straight runs, and posts holding the capsule
function saddles() {
  const out = [];
  const spots = [[-40, -20], [-40, 40], [-40, 100], [-20, 100], [-20, 40], [-20, -20], [80, -70], [80, -10], [80, 50], [-100, -100], [10, -88]];
  for (const [x, y] of spots.sort((a, b) => k.depthOf([...a, 0], P) - k.depthOf([...b, 0], P))) {
    out.push(S(k.slabOf({ x: x - 5, y: y - 3, w: 10, d: 6, r: 1 }, 0, TZ - TR + 0.6, P, 3, 0.3), { tone: "mid" }));
  }
  out.push(S(k.cylinder(CAP[0], CAP[1], 7, 0, 2, P, 26, 0.4), { tone: "mid" }), S(k.cylinder(CAP[0], CAP[1], 2.4, 2, CAP[2] - CAP_R - 1, P, 18), { tone: "mid", crease: "none" }));
  return out.join("");
}
// afferent and efferent arterioles: in from the back edge, out to the left
function arterioles() {
  const sc = scene(P);
  const aff = G.resample(G.fillet([[PLATE.x + 24, PLATE.y + 22, 4], [-176, -128, 4], [-160, -112, CAP[2] - 6], [CAP[0] - 6, CAP[1] - 6, CAP[2] - 2]], 8, 8), 2);
  const eff = G.resample(G.fillet([[CAP[0] - 8, CAP[1] + 4, CAP[2] - 4], [-170, -84, CAP[2] - 6], [-186, -70, 4], [PLATE.x + 24, -40, 4]], 8, 8), 2);
  sc.tube(aff, 3.4, { tone: "hi" }, { maxLength: 14, wrap: (h) => stain("oxy", h, 0.55) });
  sc.tube(eff, 2.6, { tone: "hi" }, { maxLength: 14, wrap: (h) => stain("oxy", h, 0.45) });
  for (const p of [aff[0], eff[eff.length - 1]]) sc.put(k.depthOf(p, P) - 1, S(k.cylinder(p[0], p[1], 5.6, 0, 3, P, 24, 0.5), { tone: "mid" }));
  return sc.svg();
}
// vasa recta: the loop's own hairpin capillary, outside each limb, so the medulla keeps its gradient
function vasaRecta() {
  const sc = scene(P), vz = 4.2;
  const down = G.resample(G.fillet([[-176, -40, 4], [-56, -40, vz], [-56, 132, vz], [-4, 132, vz], [-4, -40, vz], [60, -40, vz], [60, -136, 4]], 8, 8), 2);
  const n = down.length;
  const half = Math.floor(n / 2);
  sc.tube(down.slice(0, half + 1), 1.8, { tone: "hi" }, { maxLength: 14, wrap: (h) => stain("oxy", h, 0.5) });
  sc.tube(down.slice(half), 1.8, { tone: "hi" }, { maxLength: 14, wrap: (h) => stain("deoxy", h, 0.45) });
  for (const p of [down[0], down[n - 1]]) sc.put(k.depthOf(p, P) - 1, S(k.cylinder(p[0], p[1], 4.4, 0, 2.6, P, 22, 0.4), { tone: "mid" }));
  return sc.svg();
}
// the glomerulus: a knot of capillary loops (blobs) inside a glass capsule
function glomerulus() {
  const lobes = [[0, 0, 0, 6.5], [5, 3, 2, 5], [-5, 2, 3, 5], [2, -5, 1, 5], [-3, -4, -3, 4.5], [4, 4, -4, 4.5], [-4, 4, -2, 4.2]].map(([x, y, zz, r]) => [CAP[0] + x, CAP[1] + y, CAP[2] + zz, r]);
  const knot = stain("oxy", S(blobOf(lobes, P, { merge: 0.3, step: 0.7 }), { tone: "hi" }), 0.6);
  // podocyte nuclei on the knot
  const nuc = stain("dapi", D([[3, -2, 6], [-4, 1, 5], [1, 5, 4], [-1, -6, 3]].map(([x, y, zz]) => at([CAP[0] + x, CAP[1] + y, CAP[2] + zz])), { size: 1.1, tone: "lo" }), 0.9);
  const cap = `<g class="bio-ghost">${S(G.sphereOf(CAP, CAP_R, P), { tone: "mid" })}</g>`;
  return knot + nuc + cap;
}
// the tubule: glass, so the dots show through; the collecting duct is the one lit part (ADH acts there)
function tubule() {
  const sc = scene(P);
  const piece = (a, b) => route.filter((_, i) => sAt[i] >= a - 2 && sAt[i] <= b + 2);
  sc.tube(piece(0, SEG.cd[0] - 4), TR, { tone: "mid" }, { maxLength: 12, wrap: (h) => `<g class="bio-ghost">${h}</g>` });
  sc.tube(piece(SEG.cd[0] - 4, SEG.cd[1]), TR + 0.6, { tone: "hi" }, { maxLength: 12, wrap: (h) => `<g class="bio-ghost">${h}</g>` });
  sc.tube(piece(SEG.cd[1], SEG.end), TR - 0.6, { tone: "mid" }, { maxLength: 12, wrap: (h) => `<g class="bio-ghost">${h}</g>` });
  return sc.svg();
}
// the cylinder: base, glass wall, graduations; the urine column is live
function cylinderBack() {
  return S(k.cylinder(CYL.x, CYL.y, CYL.r + 6, 0, 3, P, 36, 0.6), { tone: "mid" });
}
function cylinderFront() {
  const ticks = []; for (let i = 1; i <= 10; i++) { const zz = 3 + (i / 10) * (CYL.h - 8); ticks.push(G.arcOf(G.frameAlong([CYL.x, CYL.y, 0], [0, 0, 1]), zz, CYL.r + 0.2, P, { from: 0.2, to: i % 5 ? 1.0 : 1.5 })); }
  return `<g class="bio-ghost">${S(k.cylinder(CYL.x, CYL.y, CYL.r, 3, CYL.h - 3, P, 40), { tone: "mid" })}</g>` + L(ticks.join(""), { tone: "lo" });
}

const svg = k.figureSvg({
  width: W, height: H,
  label: "A teaching board of one kidney nephron in glass tubing. At the back left a glass capsule holds a red knot of capillaries, the glomerulus. A tube winds through the cortex, runs straight down into the medulla as the descending limb, loops and climbs back, winds again, then joins a straight collecting duct that drains into a graduated cylinder. Dots of filtrate flow along the tube and leave it where water is reabsorbed.",
  body: [plinth(PLATE, P, { scale: { x: PLATE.x + 60, y: PLATE.y + PLATE.d - 14, w: 200, step: MM, every: 5 }, label: { x: PLATE.x + PLATE.w - 60, y: PLATE.y + PLATE.d - 20, w: 40 } }),
    board(), vasaRecta(), saddles(), arterioles(), cylinderBack(), `<g data-part="urine"></g>`, glomerulus(), tubule(), `<g data-part="aqp"></g>`, `<g data-part="dots"></g>`, cylinderFront()],
});

const live = `
const P=${JSON.stringify(P)}; const ROUTE=${JSON.stringify(route.map((p) => p.map((v) => +v.toFixed(2))))}; const SAT=${JSON.stringify(sAt.map((v) => +v.toFixed(1)))};
const SEG=${JSON.stringify(SEG)}, CYL=${JSON.stringify(CYL)}, TR=${TR}, CORTEX_Y=${CORTEX_Y};
const stage=document.querySelector(".iso-stage"), svg=stage.querySelector("svg"), readout=document.querySelector("[data-readout]");
const dotsG=svg.querySelector('[data-part="dots"]'), urineG=svg.querySelector('[data-part="urine"]'), aqpG=svg.querySelector('[data-part="aqp"]');
const at=(p)=>K.iso(p,P);
// truth: GFR 125 ml/min = 180 L/day. Water reabsorbed: proximal tubule 67%, thin descending limb 15%, thick ascending
// limb and distal tubule ~0 (they pump salt, not water). What reaches the collecting duct (~18%) is reabsorbed as ADH
// allows: urine runs from ~18 L/day with no ADH (diabetes insipidus) to ~0.5 L/day at maximal ADH. The daily solute load
// (~600 mOsm) fixes urine osmolality = 600 / volume, from ~50 to 1200 mOsm/kg, the inner medulla's ceiling.
const GFR_L=180, SOLUTE=600;
const urineL=(a)=>18*Math.pow(0.5/18,a);
const osm=(a)=>Math.max(50,Math.min(1200,SOLUTE/urineL(a)));
const SPEED=60, RATE=9; // units per s along the tubule; dots filtered per s (1 dot = 1% of filtrate)
const posAt=(s)=>{ let lo=0,hi=SAT.length-1; while(hi-lo>1){ const m=(lo+hi)>>1; if(SAT[m]<s) lo=m; else hi=m; } const f=(s-SAT[lo])/Math.max(1e-6,SAT[hi]-SAT[lo]); const a=ROUTE[lo],b=ROUTE[hi]; return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f]; };
let seed=7; const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
let adh=0.6, adhT=0.6, tour=0, acc=0, level=0.15, nFilt=0, nBack=0, nOut=0;
const dots=[];
function fateOf(){ // where this 1% of filtrate leaves the tubule
  const u=rnd()*100, e=100*urineL(adh)/GFR_L;
  if(u<67) return SEG.pct[0]+rnd()*(SEG.pct[1]-SEG.pct[0]);
  if(u<82) return SEG.dtl[0]+rnd()*(SEG.dtl[1]-SEG.dtl[0]);
  if(u<100-e) return SEG.cd[0]+rnd()*(SEG.cd[1]-SEG.cd[0]);
  return Infinity; }
function spawn(){ dots.push({s:0,fate:fateOf(),out:0,side:rnd()<0.5?-1:1}); nFilt++; }
let lastAqp=-1;
function drawAqp(){ // aquaporin-2 channels inserted into the duct wall: up to 24 lit dots
  const n=Math.round(24*adh); if(n===lastAqp) return; lastAqp=n; const pts=[];
  for(let i=0;i<n;i++){ const s=SEG.cd[0]+(i+0.5)/24*(SEG.cd[1]-SEG.cd[0]); const p=posAt(s); pts.push(at([p[0]+(i%2?TR:-TR)*0.95,p[1],p[2]+1.2])); }
  aqpG.innerHTML=K.dotsSvg(pts,{size:0.9,tone:"hi"}).replace("<g ",'<g style="--anatomy-mid:var(--anatomy-lit)" '); }
function drawUrine(){
  const h=Math.max(0.6,level*(CYL.h-10));
  urineG.innerHTML=vitaStain("myelin",K.solidSvg(K.cylinder(CYL.x,CYL.y,CYL.r-1.2,3,h,P,36),{tone:"hi",crease:"none"}),0.35+0.45*(osm(adh)/1200)); }
function frame(dt){
  if(dt>0){ acc+=dt*RATE; while(acc>=1){ spawn(); acc-=1; } }
  const items=[];
  for(let i=dots.length-1;i>=0;i--){ const d=dots[i];
    if(d.out>0){ d.out+=dt*1.6; if(d.out>=1){ dots.splice(i,1); continue; } }
    else { d.s+=dt*SPEED; if(d.s>=d.fate){ d.out=0.001; d.s=d.fate; nBack++; } else if(d.s>=SEG.end){ dots.splice(i,1); nOut++; continue; } }
    const p=posAt(d.s); const q=d.out>0?[p[0]+d.side*(TR+d.out*9),p[1]+d.side*d.out*3,p[2]+d.out*2]:p;
    items.push([K.depthOf(q,P),at(q),d.out]); }
  items.sort((a,b)=>a[0]-b[0]);
  const inside=items.filter(x=>!x[2]).map(x=>x[1]), leaving=items.filter(x=>x[2]);
  dotsG.innerHTML=K.dotsSvg(inside,{size:1.7,tone:"lo"})+leaving.map(x=>'<g opacity="'+(1-x[2]).toFixed(2)+'">'+K.dotsSvg([x[1]],{size:1.7,tone:"lo"})+'</g>').join("");
  // the cylinder fills at the urine flow (shown sped up with everything else), and is emptied when full
  level+=dt*urineL(adh)/18*0.08; if(level>1) level=0.08;
  drawAqp(); drawUrine();
  const L=urineL(adh);
  vitaSay(stage,readout,"ADH "+Math.round(adh*100)+"% · urine "+(L<2?L.toFixed(1):Math.round(L))+" L/day · "+Math.round(osm(adh))+" mOsm");
  stage.setAttribute("aria-valuenow",adh.toFixed(2)); }
vitaLoop({ stage, idleMs:5000,
  frame(dt,st){
    if(st.touring&&dt>0){ tour+=dt; const c=tour%24; adhT=c<8?0.6:c<12?0.6-0.6*(c-8)/4:c<16?0:c<20?(c-16)/4:1; }
    if(st.still){ adh=adhT=0.6; for(let i=0;i<60;i++) frame(1/30); return; }
    adh+=(adhT-adh)*(1-Math.exp(-dt/0.5)); frame(dt); },
  pointer(x){ adhT=x; },
  keys(key){ if(key==="ArrowRight"||key==="ArrowUp"){ adhT=Math.min(1,adhT+0.25); return true; } if(key==="ArrowLeft"||key==="ArrowDown"){ adhT=Math.max(0,adhT-0.25); return true; } if(key===" "){ adhT=adhT>0.5?0:1; return true; } return false; },
  resume(){ tour=0; },
});
`;
const body = k.plateHtml({
  fig: "Fig 16", title: "Nephron", hint: "Hover ↔ ADH · Space none/max",
  readout: "ADH 60% · urine 2.1 L/day · 290 mOsm",
  keys: [{ mark: "oxy", label: "Glomerulus, arterioles, vasa recta" }, { mark: "lit", label: "Collecting duct: aquaporin-2 set by ADH" }, { mark: "myelin", label: "Urine, deeper as it concentrates" }],
  caption: "One long-looped human nephron laid out on a board that stands for the kidney in section (ruler: 1 tick = 1 mm). Segment lengths are true (proximal tubule 14 mm, loop limbs 10 mm, collecting duct 20 mm); tubes and capsule are drawn ~15× wide. Each dot is 1% of the filtrate, and the kidneys filter 180 L a day. Water leaves where it really does: two thirds in the proximal tubule, ~15% in the descending limb, none in the ascending limb, which pumps out salt and builds the medulla's gradient (300 → 1200 mOsm/kg, left ruler and darkening bands). The last ~18% meets the collecting duct, and ADH decides how much of it returns: none (urine ~18 L/day, 50 mOsm/kg) to almost all (~0.5 L/day, 1200 mOsm/kg). Reabsorbed water passes to the peritubular capillaries. Flow is shown ~40× faster, at relative rates.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Nephron: arrow keys set ADH" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0.6">${svg}</div>`,
});
const page = vitaPage({ n: "16", title: "Nephron", zh: "肾单位 · 过滤与回收", en: "Nephron · filter and reclaim", body, script: liveScript() + LOOP_SRC + live,
  facts: [["180 L/day", "两肾每天滤过的原尿（GFR 125 ml/min）", "filtered by both kidneys (GFR 125 ml/min)"], ["~1.5 L/day", "通常的尿量，滤液的 ~1%", "usual urine output, ~1% of filtrate"], ["67%", "近端小管重吸收的水", "water reabsorbed in the proximal tubule"], ["0.5–18 L/day", "ADH 从最大到为零时的尿量", "urine from maximal to no ADH"], ["50–1200 mOsm/kg", "尿渗透压范围", "urine osmolality range"], ["~1 million", "每个肾的肾单位数", "nephrons per kidney"]] });
writeFileSync(join(OUT, "16-nephron.html"), page);
console.log("wrote 16-nephron.html", (page.length / 1024).toFixed(0) + " KB", "route", sAt[sAt.length - 1].toFixed(0), JSON.stringify(SEG));
