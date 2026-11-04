// 09 · Cleavage → blastocyst — a human embryo in its zona pellucida on a coverslip, held by an IVF holding pipette.
// What moves: time, days 0–5.6. The zygote cleaves without growing (each division halves cell volume, radius ×0.79),
// divisions drift out of step, the 8–16-cell morula compacts (cells flatten, borders fade), and from day ~4.5 the outer
// cells pump fluid inward: a cavity opens, the inner cell mass gathers at one pole, the blastocyst swells and the zona thins.
// Built on bio/soft.mjs: packSpheres for the lineage, clusterOf for every frame.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, liveScript, LOOP_SRC, plinth, standRod, stain, vitaPage, scene } from "../../bio/bio.mjs";
import { packSpheres } from "../../bio/soft.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../site/demos");
const W = 720, H = 470;
const UM = 1.6; // 1 µm = 1.6 units
const R1 = 55 * UM;               // zygote radius (110 µm across)
const ZI = 58 * UM, ZO = 73 * UM; // zona pellucida inner / outer (~15 µm thick)
const GLASS = 3;
const C = [40, 0, GLASS + ZO];
const PLATE = { x: -300, y: -150, w: 470, d: 300, r: 12 };
const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [C[0], C[1], C[2] + ZO * 1.25], [C[0] + ZO, C[1] + ZO, C[2]], [-262, 0, C[2] + 66], [-230, 0, C[2] + 66]], W, H, { pad: 14, azimuth: 38 });
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);

// ---------- lineage: 6 generations, each packed inside the zona, daughters placed beside their mother ----------
let seed = 1978; // Louise Brown, the first IVF birth
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const SPLIT = [1.1, 1.6, 2.5, 3.35, 3.95, 4.45]; // day each generation divides (human IVF timings, rounded)
const gens = [[{ p: [0, 0, 0], r: R1, parent: -1, axis: [0, 0, 1] }]];
for (let g = 1; g <= 6; g++) {
  const prev = gens[g - 1], r = R1 * Math.pow(0.5, g / 3), guess = [];
  prev.forEach((m, i) => {
    // cleavage planes turn 90° each round (meridional, then equatorial)
    const a = g === 1 ? [1, 0, 0] : G.unit3(G.cross3(m.axis, [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]));
    for (const s of [-1, 1]) guess.push({ p: G.add3(m.p, G.mul3(a, s * r * 0.75)), r, parent: i, axis: a });
  });
  const packed = packSpheres(100 + g, guess.map((c) => [...c.p, c.r]), ZI, { squeeze: 0.04, iters: 220 });
  gens.push(guess.map((c, i) => ({ ...c, p: packed[i].slice(0, 3) })));
}
// division day of every cell: later generations drift further out of step
gens.forEach((gen, g) => gen.forEach((c) => { c.dv = g < 6 ? SPLIT[g] + (rnd() - 0.5) * 0.05 * (g + 1) : 99; }));
gens.forEach((gen, g) => gen.forEach((c) => { c.born = g === 0 ? -1 : gens[g - 1][c.parent].dv; }));
// blastocyst roles: 14 cells nearest one pole become the inner cell mass, the rest trophectoderm on the shell
const POLE = G.unit3([-0.62, -0.3, 0.42]); // the far wall, upper left: seen through the cut
const g6 = gens[6];
const order = g6.map((c, i) => [G.dot3(G.unit3(c.p), POLE) + G.len3(c.p) / ZI * 0.2, i]).sort((a, b) => b[0] - a[0]);
const ICM = new Set(order.slice(0, 14).map(([, i]) => i));
const RTE = 15 * UM, RICM = g6[0].r * 1.05, SHELL = ZI - RTE * 0.85;
let te = g6.map((c, i) => (ICM.has(i) ? null : G.mul3(G.unit3(G.len3(c.p) > 1 ? c.p : [rnd(), rnd(), rnd()]), SHELL)));
for (let it = 0; it < 200; it++) { // spread the trophectoderm evenly over the shell
  for (let a = 0; a < te.length; a++) for (let b = a + 1; b < te.length; b++) { if (!te[a] || !te[b]) continue;
    const d = G.sub3(te[b], te[a]), L0 = G.len3(d) || 1e-6, want = RTE * 1.85; if (L0 >= want) continue;
    const push = G.mul3(d, (want - L0) / L0 / 2); te[a] = G.sub3(te[a], push); te[b] = G.add3(te[b], push); }
  te = te.map((p) => (p ? G.mul3(G.unit3(p), SHELL) : null));
}
const icmGuess = [...ICM].map((i, j) => [...G.add3(G.mul3(POLE, SHELL - RTE - RICM * 0.6), [(rnd() - 0.5) * 30, (rnd() - 0.5) * 30, (rnd() - 0.5) * 30]), RICM]);
const icm = packSpheres(77, icmGuess, RICM * 2.6, { centre: G.mul3(POLE, SHELL - RTE - RICM * 1.1), squeeze: 0.1, iters: 120 });
let ii = 0; g6.forEach((c, i) => { c.role = ICM.has(i) ? "icm" : "te"; c.t = ICM.has(i) ? icm[ii++].slice(0, 3) : te[i]; c.rt = ICM.has(i) ? RICM : RTE; });
const LIN = gens.map((gen) => gen.map((c) => ({ p: c.p.map((v) => +v.toFixed(2)), r: +c.r.toFixed(2), m: c.parent, dv: +c.dv.toFixed(3), b: +c.born.toFixed(3), ...(c.t ? { t: c.t.map((v) => +v.toFixed(2)), rt: c.rt, role: c.role } : {}) })));
const POLARS = [[R1 * 0.5, -R1 * 0.35, R1 * 0.95], [R1 * 0.72, -R1 * 0.1, R1 * 0.82]].map((p) => G.mul3(G.unit3(p), (R1 + ZI) / 2 + 2));

// ---------- static: bench, coverslip, the holding pipette on its manipulator ----------
function bench() {
  const out = [];
  const slip = { x: C[0] - 150, y: -140, w: 290, d: 270, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(slip, 0, 1, P)}" style="opacity:.2"/>`);
  out.push(S(k.slabOf(slip, 0, GLASS, P, 4, 0.4), { tone: "lo" }));
  out.push(`<path class="bio-glass" d="${k.slabOf(slip, 0, GLASS, P, 4, 0.4).fill}"/>`);
  out.push(L(k.planOutline(k.insetPlan(slip, 6), GLASS, P, 4), { tone: "faint" }));
  return out.join("");
}
// holding pipette: OD ~80 µm glass, fire-polished tip, ~15 µm lumen, bent so its last length lies flat
const PR = 40 * UM * 0.5, TIP = [C[0] - ZO - PR * 0.15, 0, C[2]];
const route = G.fillet([[-250, 0, C[2] + 34], [-150, 0, C[2] + 8], [TIP[0] - 60, 0, C[2]], TIP], 40, 10);
function pipette() {
  const sc = scene(P);
  sc.tube(G.resample(route, 1.5), PR, { tone: "mid" }, { maxLength: 60, wrap: (h) => `<g class="bio-pipette">${h}</g>` });
  const F = G.frameAlong(TIP, [1, 0, 0]);
  sc.put(k.depthOf(TIP, P) + 1, `<path class="bio-lumen" d="${G.circleOf(F, 0, 7.5 * UM, P)}"/>` + L(G.circleOf(F, 0, 7.5 * UM, P), { tone: "mid" }));
  // manipulator: a collar clamped on the glass, on a stand
  const back = [-250, 0, C[2] + 34], dir = G.unit3(G.sub3(route[1], route[0]));
  const Fc = G.frameAlong(G.sub3(back, G.mul3(dir, 6)), dir);
  sc.put(k.depthOf(back, P) - 2, S(G.disc(0, 30, PR + 5, Fc, P), { tone: "mid" }) + L(G.ribsOf(Fc, 4, 26, PR + 5, 24, P), { tone: "faint" }));
  return standRod(-262, 0, C[2] + 22, P, { r: 3.2, clampAt: C[2] - 6 }) + sc.svg();
}

const svg = k.figureSvg({
  width: W, height: H,
  label: "A human embryo inside its clear zona pellucida, resting on a coverslip and held by a glass holding pipette from the left. Over five and a half days the single cell divides into two, four, eight, compacts into a morula, then opens a fluid cavity: an outer shell of trophectoderm and an inner cell mass at one pole.",
  body: [plinth(PLATE, P, { scale: { x: PLATE.x + 20, y: PLATE.y + PLATE.d - 15, w: 200, step: 10 * UM, every: 5 }, label: { x: PLATE.x + PLATE.w - 54, y: PLATE.y + PLATE.d - 20, w: 36 } }),
    bench(), pipette(), `<g data-part="zback"></g>`, `<g data-part="cells"></g>`, `<g data-part="zfront"></g>`],
});

const live = `
const P=${JSON.stringify(P)}; const C=${JSON.stringify(C)}; const LIN=${JSON.stringify(LIN)}; const POLARS=${JSON.stringify(POLARS)};
const UM=${UM}, ZI=${ZI}, ZO=${ZO}, R1=${R1};
const stage=document.querySelector(".iso-stage"), svg=stage.querySelector("svg"), readout=document.querySelector("[data-readout]");
const zb=svg.querySelector('[data-part="zback"]'), cellsG=svg.querySelector('[data-part="cells"]'), zf=svg.querySelector('[data-part="zfront"]');
const at=(p)=>K.iso(p,P);
const ease=(t)=>t<=0?0:t>=1?1:t*t*(3-2*t);
const lerp=(a,b,t)=>a+(b-a)*t, lerp3=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
const W_DIV=0.07; // a division takes ~1.5 h
const cav=(t)=>ease((t-4.55)/0.55), expand=(t)=>ease((t-5.0)/0.6), compact=(t)=>ease((t-3.05)/0.5);
function cellsAt(t){ // every visible cell as [x,y,z,r,role]
  const out=[];
  const posOf=(g,i)=>{ const c=LIN[g][i]; return g===6&&c.t? lerp3(c.p,c.t,cav(t)) : c.p; };
  const radOf=(g,i)=>{ const c=LIN[g][i]; return g===6&&c.rt? lerp(c.r,c.rt,cav(t)) : c.r; };
  for(let g=0;g<LIN.length;g++) LIN[g].forEach((c,i)=>{
    if(t<c.b||t>=c.dv) return;
    let p=posOf(g,i), r=radOf(g,i);
    if(g>0&&t<c.b+W_DIV){ const s=ease((t-c.b)/W_DIV); p=lerp3(posOf(g-1,c.m),p,s); r=lerp(LIN[g-1][c.m].r,r,s); }
    const e=1+0.18*expand(t);
    out.push([C[0]+p[0]*e,C[1]+p[1]*e,C[2]+p[2]*e,r*(1+0.1*expand(t)),c.role||"", g]);
  });
  return out; }
function zona(t){ const e=expand(t); const ro=ZO*(1+0.12*e), ri=ZI*(1+0.17*e);
  const back=K.solidSvg(G.sphereOf(C,ro,P),{tone:"mid"});
  const V=G.viewOf(P); const Fv=G.frameAlong(C,V);
  const inner=G.circleOf(Fv,0,ri,P);
  zb.innerHTML='<g class="bio-zona-back">'+back+'</g><path class="bio-cavity" d="'+inner+'"/>';
  const hl=K.iso(G.add3(C,G.mul3(G.unit3(G.add3(G.lightOf(P),V)),ro*0.62)),P), s=G.scaleOf(P)*ro;
  zf.innerHTML='<path class="bio-glass" d="'+G.circleOf(Fv,0,ro,P)+'"/><ellipse class="bio-gleam" cx="'+hl[0].toFixed(1)+'" cy="'+hl[1].toFixed(1)+'" rx="'+(s*0.2).toFixed(1)+'" ry="'+(s*0.09).toFixed(1)+'" transform="rotate(-28 '+hl[0].toFixed(1)+' '+hl[1].toFixed(1)+')"/>'
    +K.lineSvg(inner,{tone:"lo"})+K.lineSvg(G.circleOf(Fv,0,ro,P),{tone:"hi"}); }
let last=-1;
function draw(t){
  if(Math.abs(t-last)<0.002) return; last=t;
  zona(t);
  const cs=cellsAt(t); const cv=cav(t), pr=0.02+0.14*compact(t);
  const Cd=K.depthOf(C,P);
  const near=(c)=>c[4]==="te"&&cv>0.25&&K.depthOf(c,P)>Cd+4;
  const isIcm=(c)=>c[4]==="icm"&&cv>0.25;
  const solid=cs.filter((c)=>!near(c)&&!isIcm(c)).map((c)=>c.slice(0,4)), ghost=cs.filter(near).map((c)=>c.slice(0,4)), inner=cs.filter(isIcm).map((c)=>c.slice(0,4));
  const seam=1-0.6*compact(t);
  let h="";
  if(solid.length) h+='<g class="bio-stain" style="--stain:var(--stain-hema);--stain-k:.32">'+SOFT.clusterSvg(SOFT.clusterOf(solid,P,{press:pr,step:1.5}),{tone:"hi"},{seamOpacity:seam})+'</g>';
  // polar bodies until they fade on day 3
  const pb=1-ease((t-2.6)/0.6); if(pb>0.02) h=POLARS.map((p)=>'<g opacity="'+pb.toFixed(2)+'">'+K.solidSvg(G.sphereOf(G.add3(C,p),5*UM,P),{tone:"hi"})+'</g>').join("")+h;
  // the blastocoel: fluid over the far wall, the inner cell mass on top of it, and the cut edge of the shell
  if(cv>0.25){ const e=1+0.18*expand(t); const Fv=G.frameAlong(C,G.viewOf(P)); const rr=(ZI-15*UM*0.85)*e;
    const k=ease((cv-0.25)/0.5);
    h+='<path class="bio-blastocoel" style="opacity:'+(0.6*k).toFixed(2)+'" d="'+G.circleOf(Fv,0,rr-6,P)+'"/>';
    if(inner.length) h+='<g class="bio-stain" style="--stain:var(--stain-hema);--stain-k:.55">'+SOFT.clusterSvg(SOFT.clusterOf(inner,P,{press:0.12,step:1.3}),{tone:"hi"},{seamOpacity:0.7})+'</g>';
    h+='<g style="opacity:'+k.toFixed(2)+'">'+K.lineSvg(G.circleOf(Fv,0,rr+15*UM*0.4,P),{tone:"mid"})+K.lineSvg(G.circleOf(Fv,0,rr-6,P),{tone:"lo"})+'</g>'; }
  if(ghost.length) h+='<g opacity="'+(0.07+0.6*(1-ease((cv-0.25)/0.5))).toFixed(2)+'"><g class="bio-stain" style="--stain:var(--stain-hema);--stain-k:.32">'+SOFT.clusterSvg(SOFT.clusterOf(ghost,P,{press:pr,step:1.8}),{tone:"hi"},{seamOpacity:seam})+'</g></g>';
  cellsG.innerHTML=h;
  const n=cs.length; const icm=cs.filter((c)=>c[4]==="icm").length;
  const stageName=t<1.1?"zygote":t<3.1?n+"-cell":cv<0.15?"morula":expand(t)>0.3?"expanding blastocyst":"blastocyst";
  const g=Math.max(...cs.map((c)=>c[5]));
  const tail=cv>0.3? " · "+n+" cells, "+icm+" inner" : n>1? " · "+n+" cells · smallest 1/"+Math.pow(2,g)+" vol" : " · 110 µm";
  vitaSay(stage,readout,"day "+t.toFixed(1)+" · "+stageName+tail);
  stage.setAttribute("aria-valuenow",t.toFixed(1));
}
let day=0.3, dayT=0.3;
vitaLoop({ stage, idleMs:5000,
  frame(dt,st){ if(st.touring){ dayT+=dt/6.5; if(dayT>6.3) dayT=0; } day+=(Math.min(5.6,dayT)-day)*(st.touring&&dayT<0.05?1:1-Math.exp(-dt/0.25)); if(st.still) day=dayT=4.2; draw(Math.max(0,day)); },
  pointer(x){ dayT=x*5.6; },
  keys(key){ if(key==="ArrowRight"||key==="ArrowUp"){ dayT=Math.min(5.6,dayT+0.25); return true; } if(key==="ArrowLeft"||key==="ArrowDown"){ dayT=Math.max(0,dayT-0.25); return true; } return false; },
  resume(){ dayT=day; },
});
`;
const body = k.plateHtml({
  fig: "Fig 09", title: "Cleavage", hint: "Hover ↔ days 0–5.6",
  readout: "day 0.3 · zygote · 1 cells", keys: [{ mark: "hema", label: "Zygote and blastomeres; later trophectoderm and the darker inner cell mass" }, { mark: "raised", label: "Zona pellucida; holding pipette" }],
  caption: "A human embryo at true scale (ruler: 1 tick = 10 µm): a zygote about 110 µm across in a zona pellucida about 15 µm thick, held by a fire-polished holding pipette as in an IVF lab. Cleavage divides without growth, so every division halves cell volume and cells shrink to 0.79× their mother's radius. From the 4-cell stage the divisions drift out of step. Around day 3–4 the cells compact: they flatten against each other and their borders fade. From day 4.5 the outer cells pump sodium inward, water follows, and a cavity opens: the trophectoderm becomes a shell (its near half cut away here) and the inner cell mass, the future embryo proper, gathers at one pole. By day 5.5 the blastocyst swells and thins the zona before hatching. Timings are typical IVF averages; real embryos vary by hours.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Embryo: arrow keys move through days 0 to 5.6" aria-valuemin="0" aria-valuemax="5.6" aria-valuenow="0.3">${svg}</div>`,
});
const page = vitaPage({ n: "09", title: "Cleavage → blastocyst", zh: "卵裂与囊胚 · 握持针下的胚胎", en: "Cleavage → blastocyst · an embryo on a holding pipette", body, script: liveScript({ soft: true }) + LOOP_SRC + live,
  facts: [["~110 µm", "人类合子（不含透明带）", "human zygote (without zona)"], ["×0.79", "每次卵裂后细胞半径（体积减半）", "cell radius after each cleavage (half the volume)"], ["day 3–4", "致密化（8–16 细胞）", "compaction (8–16 cells)"], ["day 5", "囊胚，约 70–100 个细胞", "blastocyst, ~70–100 cells"], ["~20–30%", "内细胞团所占比例", "share in the inner cell mass"], ["day 6–7", "孵化出透明带、着床", "hatching from the zona, implantation"]] });
writeFileSync(join(OUT, "09-cleavage.html"), page);
console.log("wrote 09-cleavage.html", (page.length / 1024).toFixed(0) + " KB", "cells per gen", gens.map((g) => g.length).join(","));
