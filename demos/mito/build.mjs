// 08 · Mitochondrion — a teaching model cut lengthwise: the lower half on two cradles, its cut face showing the double
// membrane, and a row of lamellar cristae standing in the matrix like the plates of a radiator.
// What moves: demand. Hover raises the cell's ADP: respiration speeds up (O₂ in, ATP out), the membrane potential sags,
// and the ATP-synthase rows along every crista edge run faster. Left alone it idles in state 4 and surges to state 3.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, liveScript, LOOP_SRC, RNG_SRC, rng, plinth, stain, vitaPage, byDepth, scene } from "../../bio/bio.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../site/demos");
const W = 720, H = 470;
const UM = 200; // 1 µm = 200 units
const R = 0.25 * UM, LEN = 1.5 * UM; // 0.5 µm wide, 1.5 µm long
const ZC = 92; // the axis, and the cut plane
const X0 = -LEN / 2;
const MEMB = 7; // cut face: outer membrane, ~20 nm space, inner membrane ≈ 7 units
const PLATE = { x: -186, y: -64, w: 372, d: 128, r: 10 };
const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [X0, -R, ZC + 30], [-X0, R, ZC + 30]], W, H, { pad: 16, azimuth: 30 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const rand = rng(1890); // Altmann saw them in 1890
const FX = G.frameAlong([X0, 0, ZC], [1, 0, 0]); // u = +y, v = +z
const radiusAt = (x) => { const s = x - X0; if (s < R) return Math.sqrt(Math.max(0, R * R - (R - s) ** 2)); if (s > LEN - R) return Math.sqrt(Math.max(0, R * R - (s - LEN + R) ** 2)); return R; };

// the capsule's profile, and the cut rim (a stadium in the plane z = ZC) projected
const profile = [];
for (let i = 0; i <= 64; i++) { const s = (i / 64) * LEN; profile.push([s, Math.max(0.01, radiusAt(X0 + s)), 1]); }
const stadiumAt = (inset, n = 120) => {
  const pts = [];
  for (let i = 0; i <= n; i++) { const x = X0 + inset + ((LEN - 2 * inset) * i) / n; const r = Math.max(0, radiusAt(x) - inset); pts.push([x, -r]); }
  for (let i = n; i >= 0; i--) { const x = X0 + inset + ((LEN - 2 * inset) * i) / n; const r = Math.max(0, radiusAt(x) - inset); pts.push([x, r]); }
  return pts;
};
const rimOuter = stadiumAt(0), rimInner = stadiumAt(MEMB), rimMid = stadiumAt(1.6), rimIn0 = stadiumAt(MEMB - 1.6);
const screen = (pts, z = ZC) => pts.map(([x, y]) => at([x, y, z]));
function belowUpperArc(pts) { // the screen region under the rim's upper arc: where the lower half can show
  const sp = screen(pts);
  let lo = 0, hi = 0; sp.forEach((p, i) => { if (p[0] < sp[lo][0]) lo = i; if (p[0] > sp[hi][0]) hi = i; });
  const n = sp.length; const walk = (a, b, d) => { const out = []; for (let i = a; ; i = (i + d + n) % n) { out.push(sp[i]); if (i === b) break; } return out; };
  const c1 = walk(lo, hi, 1), c2 = walk(lo, hi, -1);
  const mean = (c) => c.reduce((s, p) => s + p[1], 0) / c.length;
  const upper = mean(c1) < mean(c2) ? c1 : c2;
  return k.pathOf([...upper, [sp[hi][0], 2000], [sp[lo][0], 2000]], true);
}

// ---------- the model ----------
function cradles() {
  const out = [];
  for (const x of byDepth([[X0 + LEN * 0.24, 0], [X0 + LEN * 0.76, 0]], P).map(([x]) => x)) {
    out.push(S(k.cylinder(x, 0, 14, 0, 2.6, P, 32, 0.5), { tone: "mid" }));
    out.push(L(k.ring(x, 0, 10, 2.6, P, 28), { tone: "faint" }));
    out.push(S(k.cylinder(x, 0, 4.4, 2.6, ZC - R - 14, P, 22), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(x, 0, 7, ZC - R - 16, 5, P, 24, 0.5), { tone: "mid" }));
    out.push(L(k.knurl(x, 0, 7, ZC - R - 15, ZC - R - 12, 20, P), { tone: "faint" }));
    // a saddle cut to the hull: a short block whose top meets the curve
    const sad = { x: x - 9, y: -16, w: 18, d: 32, r: 2 };
    out.push(S(k.slabOf(sad, ZC - R - 11, 10.4, P, 4, 0.5), { tone: "mid" }));
  }
  return out.join("");
}
const clipId = "mito-lower", clipIn = "mito-inner";
const defs = `<defs><clipPath id="${clipId}"><path d="${belowUpperArc(rimOuter)}"/></clipPath><clipPath id="${clipIn}"><path d="${k.pathOf(screen(rimInner), true)}"/></clipPath></defs>`;
const hull = `<path class="iso-halo" d="${k.haloOf({ x: X0, y: -R, w: LEN, d: 2 * R, r: R }, 0, 1, P)}" style="opacity:.28"/>`
  + `<g clip-path="url(#${clipId})">${stain("myelin", S(G.solidOf(profile, FX, P, { smooth: true }), { tone: "hi" }), 0.55)}</g>`;
// the cavity: the inner membrane's far wall, seen down into the bowl
const cavity = `<path class="bio-cavity" d="${k.pathOf(screen(rimInner), true)}"/>`
  + `<g clip-path="url(#${clipIn})">${L([0.35, 0.62, 0.82].map((f) => k.pathOf(screen(stadiumAt(MEMB + (R - MEMB) * (1 - Math.cos(f * Math.PI / 2))), ZC - (R - MEMB) * Math.sin(f * Math.PI / 2)), true)).join(""), { tone: "faint" })}</g>`;
// cristae: lamellae across the matrix, each attached along the wall and ending in a free edge
const cristae = [];
const NCR = 15;
for (let i = 0; i < NCR; i++) {
  const x = X0 + R * 0.55 + ((LEN - R * 1.1) * (i + 0.5)) / NCR + (rand() - 0.5) * 6;
  const rr = radiusAt(x) - MEMB - 0.6; if (rr < 12) continue;
  const side = i % 2 ? 1 : -1; const reach = 0.35 + rand() * 0.45; // fraction of the width it spans
  const y0 = -side * rr, y1 = side * (-rr + 2 * rr * reach);
  const ys = [], N = 22;
  for (let j = 0; j <= N; j++) ys.push(y0 + ((y1 - y0) * j) / N);
  const poly = ys.map((y) => [y, -Math.sqrt(Math.max(0, rr * rr - y * y))]);
  poly.push([y1, 0], [y0, 0]);
  const t = 3.4;
  const Fc = G.frameAlong([x, 0, ZC], [1, 0, 0]);
  const svg = stain("myelin", S(G.prismOf(Fc, poly, -t / 2, t / 2, P), { tone: "mid" }), 0.75);
  // ATP-synthase dimer rows along the free edge (the curved rim of the crista)
  const edge = []; const zb = -Math.sqrt(Math.max(0, rr * rr - y1 * y1));
  for (let z = -3; z > zb + 2; z -= 3.2) edge.push(at([x + t / 2 + 0.6, y1, ZC + z]));
  cristae.push({ x, svg, edge, top: [[x, y0], [x, y1]] });
}
// matrix contents on the floor between cristae: nucleoids (mtDNA rings) and mitoribosomes
const floor = [];
for (let i = 0; i < 26; i++) { const x = X0 + R * 0.7 + rand() * (LEN - R * 1.4); const rr = radiusAt(x) - MEMB; const y = (rand() * 2 - 1) * rr * 0.7; const z = ZC - Math.sqrt(Math.max(0, rr * rr - y * y)) + 3; floor.push(at([x, y, z])); }
const nucleoids = [[X0 + LEN * 0.36, -12], [X0 + LEN * 0.63, 14]].map(([x, y]) => { const rr = radiusAt(x) - MEMB; const z = ZC - Math.sqrt(Math.max(0, rr * rr - y * y)) + 4; return stain("dapi", L(k.ring(x, y, 5, z, P, 20), { tone: "mid" }) + D([at([x + 3, y, z])], { size: 0.7, tone: "mid" }), 0.9); }).join("");
const interior = `<g clip-path="url(#${clipIn})">${stain("gfp", D(floor, { size: 0.9, tone: "lo" }), 0.4)}${nucleoids}${byDepth(cristae.map((c) => [c.x, 0]), P).map(([x]) => cristae.find((c) => c.x === x).svg).join("")}<g data-part="synthase">${cristae.map((c, i) => `<g data-row="${i}">${stain("atp", D(c.edge, { size: 0.75, tone: "hi" }), 0.9)}</g>`).join("")}</g></g>`;
// the cut face of the double membrane, on top of everything inside
const rimFace = `<path class="bio-rim" fill-rule="evenodd" d="${k.pathOf(screen(rimOuter), true)}${k.pathOf(screen(rimInner), true)}"/>`
  + stain("myelin", L(k.pathOf(screen(rimOuter), true), { tone: "hi" }) + L(k.pathOf(screen(rimMid), true), { tone: "lo" }) + L(k.pathOf(screen(rimIn0), true), { tone: "lo" }) + L(k.pathOf(screen(rimInner), true), { tone: "mid" }), 0.8)
  // cristae junctions: where each lamella meets the inner membrane at the cut, a short tick across the space
  + L(cristae.map((c) => k.segment([c.x, c.top[0][1], ZC], [c.x, c.top[0][1] - Math.sign(c.top[0][1]) * 1.2, ZC], P)).join(""), { tone: "mid", free: true });

const svg = k.figureSvg({
  width: W, height: H,
  label: "The lower half of a mitochondrion, cut lengthwise, resting on two cradles. Its cut edge shows the smooth outer membrane and the folded inner membrane; inside, fifteen lamellar cristae cross the matrix like radiator plates, each lined along its free edge with a row of ATP synthases. Oxygen drifts in, ATP drifts out, faster when the cell's demand rises.",
  body: [defs, plinth(PLATE, P, { scale: { x: PLATE.x + 14, y: PLATE.y + PLATE.d - 14, w: 160, step: UM / 20, every: 4 }, label: { x: PLATE.x + PLATE.w - 50, y: PLATE.y + PLATE.d - 20, w: 34 } }),
    cradles(), `<g data-part="back"></g>`, hull, cavity, interior, rimFace, `<g data-part="front"></g>`],
});

const live = `
const P=${JSON.stringify(P)}; const UM=${UM}, R=${R}, LEN=${LEN}, ZC=${ZC}, X0=${X0};
${RNG_SRC}
const rand=rng(7);
const stage=document.querySelector(".iso-stage"), svg=stage.querySelector("svg"), readout=document.querySelector("[data-readout]");
const backG=svg.querySelector('[data-part="back"]'), frontG=svg.querySelector('[data-part="front"]');
const rows=[...svg.querySelectorAll("[data-row]")];
const at=(p)=>K.iso(p,P);
const sg=(n,h)=>'<g class="bio-stain" style="--stain:var(--stain-'+n+')">'+h+'</g>';
const radiusAt=(x)=>{ const s=x-X0; if(s<R) return Math.sqrt(Math.max(0,R*R-(R-s)**2)); if(s>LEN-R) return Math.sqrt(Math.max(0,R*R-(s-LEN+R)**2)); return R; };
// truth: isolated mitochondria idle in "state 4" (no ADP): high Δψ (~180 mV), slow O₂ use set by proton leak.
// Add ADP ("state 3") and O₂ use rises ~5–8×, Δψ sags to ~150 mV, and ATP is made at ~2.5 per O atom (NADH).
let demand=0.2, demandT=0.2, synth=0;
const parts=[]; // {kind:'o2'|'atp', p, v, life}
function spawn(kind){ const x=X0+R*0.6+rand()*(LEN-R*1.2); const side=rand()<0.5?-1:1; const r=radiusAt(x);
  if(kind==="o2"){ const a=rand()*Math.PI; const p=[x,side*(r+34)*Math.cos(a*0.4),ZC+16+rand()*30]; parts.push({kind,p,to:[x,side*(r-4)*0.4,ZC-2],life:1}); }
  else { const p=[x,side*(r-3),ZC+0.5]; parts.push({kind,p,v:[(rand()-0.5)*10,side*(16+rand()*10),10+rand()*12],life:2.6}); } }
let acc={o2:0,atp:0};
function step(dt,clock){
  demand+=(demandT-demand)*(1-Math.exp(-dt/0.8));
  const o2=1+6.5*demand, atp=2.5*2*(o2-1)/6.5*6.5; // relative rates; ATP ∝ coupled O₂ use
  acc.o2+=dt*o2*0.55; acc.atp+=dt*(o2-1)*1.1;
  while(acc.o2>=1){ acc.o2--; spawn("o2"); } while(acc.atp>=1){ acc.atp--; spawn("atp"); }
  for(let i=parts.length-1;i>=0;i--){ const q=parts[i];
    if(q.kind==="o2"){ q.life-=dt*0.7; for(let c=0;c<3;c++) q.p[c]+=(q.to[c]-q.p[c])*(1-Math.exp(-dt*1.6)); }
    else { q.life-=dt; for(let c=0;c<3;c++) q.p[c]+=q.v[c]*dt; q.v[2]-=4*dt; }
    if(q.life<=0) parts.splice(i,1); }
  synth+=dt*(0.3+demand*5);
}
function draw(){
  const back=[], front=[];
  for(const q of parts){ const o=Math.max(0,Math.min(1,q.life*(q.kind==="o2"?1.6:0.9)));
    const s=at(q.p); const h=q.kind==="o2"
      ? sg("oxy",'<g opacity="'+o.toFixed(2)+'"><circle cx="'+(s[0]-1.3).toFixed(1)+'" cy="'+s[1].toFixed(1)+'" r="1.5" fill="var(--stain-oxy)"/><circle cx="'+(s[0]+1.3).toFixed(1)+'" cy="'+s[1].toFixed(1)+'" r="1.5" fill="var(--stain-oxy)"/></g>')
      : sg("atp",'<g opacity="'+o.toFixed(2)+'" fill="var(--stain-atp)"><circle cx="'+s[0].toFixed(1)+'" cy="'+s[1].toFixed(1)+'" r="2.1"/><circle cx="'+(s[0]+3.4).toFixed(1)+'" cy="'+(s[1]-0.5).toFixed(1)+'" r="1"/><circle cx="'+(s[0]+5.5).toFixed(1)+'" cy="'+(s[1]-0.8).toFixed(1)+'" r="1"/><circle cx="'+(s[0]+7.6).toFixed(1)+'" cy="'+(s[1]-1.1).toFixed(1)+'" r="1"/></g>');
    (q.p[1]<0?back:front).push(h); }
  backG.innerHTML=back.join(""); frontG.innerHTML=front.join("");
  // each crista's synthase row pulses in turn: a travelling wave whose speed is the turnover
  rows.forEach((el,i)=>{ const v=(0.35+0.65*(0.5+0.5*Math.sin(synth-i*0.7))*(0.25+demand*0.75)).toFixed(2); if(el.getAttribute("opacity")!==v) el.setAttribute("opacity",v); });
}
function say(){ const o2=1+6.5*demand; const psi=Math.round(180-30*demand); const state=demand<0.15?"state 4 (idle)":demand>0.75?"state 3 (ADP)":"working";
  vitaSay(stage,readout,state+" · Δψ "+psi+" mV · O₂ use ×"+o2.toFixed(1)+" · ATP/O 2.5"); stage.setAttribute("aria-valuenow",Math.round(demand*100)); }
vitaLoop({ stage, idleMs:6000,
  frame(dt,st){ if(st.touring){ const c=(st.clock%24)/24; demandT=c<0.4?0.05:c<0.85?0.95:0.05; } if(dt>0) step(dt,st.clock); draw(); say(); },
  pointer(x){ demandT=x; },
  keys(key){ if(key==="ArrowRight"||key==="ArrowUp"){ demandT=Math.min(1,demandT+0.1); return true; } if(key==="ArrowLeft"||key==="ArrowDown"){ demandT=Math.max(0,demandT-0.1); return true; } return false; },
});
`;
const body = k.plateHtml({
  fig: "Fig 08", title: "Mitochondrion", hint: "Hover ↔ ADP demand",
  readout: "state 4 (idle) · Δψ 180 mV", keys: [{ mark: "atp", label: "ATP synthase rows / ATP leaving" }, { mark: "oxy", label: "O₂ arriving" }, { mark: "dapi", label: "mtDNA nucleoids" }, { mark: "raised", label: "Cristae (inner membrane folds)" }],
  caption: "A mitochondrion 0.5 µm wide and 1.5 µm long (ruler: 1 tick = 50 nm), cut along its length with the top half removed. The cut edge shows both membranes: the smooth outer one and, about 20 nm inside it, the inner membrane, folded into lamellar cristae that multiply its area several times. The respiratory chain in those folds pumps protons out of the matrix; ATP synthases, lined up in rows along the sharp crista edges, let them back in and make ATP, about 2.5 per oxygen atom. With no ADP the membrane potential sits near 180 mV and oxygen use idles; give it ADP and oxygen use rises 5–8×, the potential sags to about 150 mV and ATP streams out. Particles are not to scale.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Mitochondrion: arrow keys change the ADP demand" aria-valuemin="0" aria-valuemax="100" aria-valuenow="20">${svg}</div>`,
});
const page = vitaPage({ n: "08", title: "Mitochondrion", zh: "线粒体 · 剖开的教学模型", en: "Mitochondrion · cut-open teaching model", body, script: liveScript() + LOOP_SRC + live,
  facts: [["0.5 × 1–2 µm", "典型尺寸", "typical size"], ["~150–180 mV", "内膜电位 Δψ", "inner-membrane potential Δψ"], ["~2.5 ATP / O", "NADH 的 P/O 比", "P/O ratio for NADH"], ["5–8×", "加 ADP 后耗氧上升（state 3 / state 4）", "O₂ uptake rise with ADP (state 3 / state 4)"], ["16,569 bp", "人类 mtDNA，37 个基因", "human mtDNA, 37 genes"], ["100s–1000s", "每个细胞的线粒体数", "mitochondria per cell"]] });
writeFileSync(join(OUT, "08-mitochondrion.html"), page);
console.log("wrote 08-mitochondrion.html", (page.length / 1024).toFixed(0) + " KB");
