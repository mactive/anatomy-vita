// 18 · Circulation — the two circuits as a mock circulatory loop on a bench, the way physiology labs and pump makers test
// them. Two pump bulbs sit side by side on a cradle: the right heart (deoxygenated blood) and the left heart
// (oxygenated). The right pump drives the pulmonary circuit through a glass lung manifold at the back; the left pump drives
// the systemic circuit through five parallel beds at the front (brain, gut and liver, kidneys, muscle, skin and the rest),
// each with its own rotameter, a glass tube whose float rides at that bed's flow. All tubing is clear, so the blood shows
// inside it. What moves: the pumps beat; the blood runs round both circuits in series, the dots stained by oxygen. The
// control is exercise: heart rate and stroke volume rise, and the output is re-divided, almost all of the extra going to
// muscle. Every litre that leaves the left heart comes back through the lungs: the pulmonary flow is the sum of the beds.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, liveScript, LOOP_SRC, plinth, stain, stainMix, vitaPage, scene } from "../../bio/bio.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../site/demos");
const W = 740, H = 490;
const PLATE = { x: -215, y: -165, w: 430, d: 320, r: 12 };
const TUBE = 2.6;                         // tubing radius
const RP = [-34, -30], LP = [34, -30];    // right and left pump axes (x, y)
const PZ0 = 16, PH = 52;                  // pump bulbs: base height and length
const LUNG = { x0: -86, x1: 86, y: -128, z: 64, n: 6, gap: 5 };
const BEDS = [-120, -60, 0, 60, 120];     // x of the five systemic branches
const AY = 26, VY = 128, HZ = 14;         // aorta header (y), vena cava header (y), header height
const ROT = { y: 44, z0: 22, z1: 72 };    // rotameters stand on the branches
const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [LUNG.x0, LUNG.y, LUNG.z + 14], [LUNG.x1, LUNG.y, LUNG.z + 14], [0, ROT.y, ROT.z1 + 8], [RP[0], RP[1], PZ0 + PH + 28]], W, H, { pad: 16, azimuth: 40 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const glass = (h) => `<g class="bio-ghost">${h}</g>`;
const R = (pts, r = 9) => G.resample(G.fillet(pts, r, 8), 2);

// ---- routes (each starts at a pump outlet or a header and ends at a pump inlet or a header) ----
const top = (p, dz = 0) => [p[0], p[1], PZ0 + PH + 6 + dz];
const PA = R([top(RP), top(RP, 18), [RP[0] - 20, -70, PZ0 + PH + 24], [LUNG.x0 - 16, LUNG.y, LUNG.z], [LUNG.x0, LUNG.y, LUNG.z]]);
const LUNG_MID = [[LUNG.x0, LUNG.y, LUNG.z], [LUNG.x1, LUNG.y, LUNG.z]].map((p) => p);
const PV = R([[LUNG.x1, LUNG.y, LUNG.z], [LUNG.x1 + 16, LUNG.y, LUNG.z], [LP[0] + 20, -70, PZ0 + PH + 24], top(LP, 18), top(LP)]);
const AORTA = R([[LP[0], LP[1] + 9, PZ0 + 10], [LP[0] + 6, 0, PZ0 + 4], [BEDS[4] + 22, AY - 14, HZ], [BEDS[4] + 22, AY, HZ], [BEDS[4], AY, HZ]], 10);
const CAVA = R([[BEDS[0], VY, HZ], [BEDS[0] - 26, VY, HZ], [BEDS[0] - 30, 40, HZ], [RP[0] - 6, 0, PZ0 + 4], [RP[0], RP[1] + 9, PZ0 + 10]], 12);
const headerA = (x0, x1) => G.resample([[x0, AY, HZ], [x1, AY, HZ]], 2);
const branch = (x) => R([[x, AY, HZ], [x, ROT.y, HZ + 2], [x, ROT.y, ROT.z0], [x, ROT.y, ROT.z1], [x, ROT.y + 10, ROT.z1 + 4], [x, ROT.y + 26, 30], [x, 84, 12], [x, VY, HZ]], 7);
const BR = BEDS.map(branch);

// ---- static parts ----
function pumps() { // cradle, base collars and valve rings; the bulbs themselves beat in the page
  const out = [S(k.slabOf({ x: RP[0] - 22, y: RP[1] - 18, w: LP[0] - RP[0] + 44, d: 36, r: 6 }, 0, 6, P, 6, 0.8), { tone: "mid" })];
  for (const [x, y] of [RP, LP]) { out.push(S(k.cylinder(x, y, 13, 6, PZ0 - 6, P, 32, 0.5), { tone: "mid" })); out.push(L(k.knurl(x, y, 13, 7, PZ0 - 1, 28, P), { tone: "faint" })); }
  return out.join("");
}
function pumpCaps() { // outlet/inlet valve housings on top of each bulb (drawn after the bulbs)
  const out = [];
  for (const [x, y] of [RP, LP]) { out.push(S(k.cylinder(x, y, 7, PZ0 + PH - 1, 7, P, 28, 0.6), { tone: "mid" })); out.push(L(k.ring(x, y, 4.8, PZ0 + PH + 6, P, 20), { tone: "lo" })); }
  return out.join("");
}
function lung() { // two headers on posts and six glass capillary tubes between them, blood turning red along them
  const sc = scene(P);
  for (const x of [LUNG.x0, LUNG.x1]) {
    sc.put(k.depthOf([x, LUNG.y, 0], P), S(k.cylinder(x, LUNG.y, 6, 0, 2.4, P, 24, 0.4), { tone: "mid" }) + S(k.cylinder(x, LUNG.y, 2.2, 2.4, LUNG.z - 8, P, 18), { tone: "mid", crease: "none" }));
    sc.put(k.depthOf([x, LUNG.y, LUNG.z], P), S(G.solidOf([[0, 5.2, 1], [LUNG.n * LUNG.gap + 6, 5.2]], G.frameAlong([x, LUNG.y - (LUNG.n * LUNG.gap + 6) / 2, LUNG.z], [0, 1, 0]), P), { tone: "mid" }));
  }
  for (let i = 0; i < LUNG.n; i++) {
    const y = LUNG.y - ((LUNG.n - 1) * LUNG.gap) / 2 + i * LUNG.gap;
    for (let j = 0; j < 4; j++) { const x0 = LUNG.x0 + 5 + ((LUNG.x1 - LUNG.x0 - 10) * j) / 4, x1 = LUNG.x0 + 5 + ((LUNG.x1 - LUNG.x0 - 10) * (j + 1)) / 4;
      sc.tube([[x0, y, LUNG.z], [x1, y, LUNG.z]], 1.3, { tone: "hi" }, { maxLength: 12, wrap: (h) => glass(stainMix("deoxy", "oxy", (j + 0.5) / 4, h, 0.6)) }); }
  }
  // the alveolar side: a frosted glass sleeve over the middle of the bed
  sc.put(k.depthOf([0, LUNG.y + 20, LUNG.z], P), glass(S(G.solidOf([[0, 17, 1], [96, 17]], G.frameAlong([-48, LUNG.y, LUNG.z], [1, 0, 0]), P), { tone: "mid" })));
  return sc.svg();
}
function tubing() { // all the big vessels, glass, lightly stained by what they carry
  const sc = scene(P);
  const tube = (pts, r, name, kk = 0.35) => sc.tube(pts, r, { tone: "hi" }, { maxLength: 14, wrap: (h) => glass(stain(name, h, kk)) });
  tube(PA, TUBE + 0.6, "deoxy"); tube(PV, TUBE + 0.6, "oxy"); tube(AORTA, TUBE + 1, "oxy"); tube(CAVA, TUBE + 1, "deoxy");
  tube(headerA(BEDS[0], BEDS[4]), TUBE + 0.4, "oxy"); tube(G.resample([[BEDS[0], VY, HZ], [BEDS[4], VY, HZ]], 2), TUBE + 0.4, "deoxy");
  BR.forEach((b) => { const n = b.length, cut = Math.floor(n * 0.72);
    tube(b.slice(0, cut + 1), TUBE - 0.6, "oxy"); tube(b.slice(cut), TUBE - 0.6, "deoxy"); });
  // header end caps and tees
  for (const x of BEDS) { sc.at([x, AY, HZ], S(G.sphereOf([x, AY, HZ], TUBE + 1.2, P), { tone: "mid" })); sc.at([x, VY, HZ], S(G.sphereOf([x, VY, HZ], TUBE + 1.2, P), { tone: "mid" })); }
  // saddles under the headers
  for (const x of [-90, -30, 30, 90]) for (const y of [AY, VY]) sc.put(k.depthOf([x, y, 0], P) - 1, S(k.slabOf({ x: x - 4, y: y - 4, w: 8, d: 8, r: 1 }, 0, HZ - TUBE - 0.4, P, 3, 0.3), { tone: "mid" }));
  return sc.svg();
}
// each bed: a capillary block where blood gives up oxygen (a cut sponge of fine tubes) and a rotameter upstream
function bedsAndMeters() {
  const sc = scene(P);
  BEDS.forEach((x) => {
    sc.put(k.depthOf([x, 92, 0], P) - 2, S(k.slabOf({ x: x - 12, y: 82, w: 24, d: 22, r: 3 }, 0, 4, P, 4, 0.5), { tone: "mid" }));
    const loops = []; for (let i = 0; i < 4; i++) loops.push(G.resample(G.fillet([[x - 8 + i * 5.3, 84, 9], [x - 8 + i * 5.3, 100, 9], [x - 5.4 + i * 5.3, 102, 9], [x - 5.4 + i * 5.3, 86, 9]], 2.4, 5), 1.5));
    loops.forEach((lp, i) => sc.tube(lp, 1.1, { tone: "hi" }, { maxLength: 10, wrap: (h) => stainMix("oxy", "deoxy", (i + 0.5) / 4, h, 0.6) }));
    // the rotameter: glass tube, scale ticks, top and bottom fittings; the float is live
    sc.put(k.depthOf([x, ROT.y, ROT.z1], P) + 6, glass(S(k.cylinder(x, ROT.y, 4.6, ROT.z0, ROT.z1 - ROT.z0, P, 26), { tone: "mid" }))
      + S(k.cylinder(x, ROT.y, 6, ROT.z0 - 4, 4, P, 26, 0.5), { tone: "mid" }) + S(k.cylinder(x, ROT.y, 6, ROT.z1, 4, P, 26, 0.5), { tone: "mid" })
      + L(Array.from({ length: 9 }, (_, i) => G.arcOf(G.frameAlong([x, ROT.y, 0], [0, 0, 1]), ROT.z0 + 4 + i * 5.5, 4.7, P, { from: 0.3, to: i % 4 ? 1.1 : 1.6 })).join(""), { tone: "lo" })
      + `<g data-part="float${x}"></g>`);
  });
  return sc.svg();
}

const svg = k.figureSvg({
  width: W, height: H,
  label: "A bench model of the circulation. Two pump bulbs in the middle stand for the right and left heart. Clear tubing carries blue blood from the right pump to a glass lung manifold at the back, where it turns red, and back to the left pump. The left pump sends red blood along a header to five parallel beds at the front, each with a glass flow meter whose float shows its flow; the blood turns blue in each bed and returns along a second header to the right pump.",
  body: [plinth(PLATE, P, { scale: { x: PLATE.x + 24, y: PLATE.y + PLATE.d - 14, w: 200, step: 10, every: 5 }, label: { x: PLATE.x + PLATE.w - 60, y: PLATE.y + PLATE.d - 20, w: 40 } }),
    lung(), pumps(), `<g data-part="pumps"></g>`, pumpCaps(), tubing(), bedsAndMeters(), `<g data-part="dots"></g>`],
});

// ---- dot routes: the pulmonary loop, and each systemic branch with its share of the aorta and cava ----
const cat = (...parts) => parts.reduce((a, b) => a.concat(G.len3(G.sub3(a[a.length - 1] || b[0], b[0])) < 0.5 ? b.slice(1) : b), []);
const lungRoute = cat(PA, G.resample(LUNG_MID, 2), PV);
const sysRoutes = BEDS.map((x, i) => cat(AORTA.slice(0, -1), G.resample([[BEDS[4], AY, HZ], [x, AY, HZ]], 2), BR[i], G.resample([[x, VY, HZ], [BEDS[0], VY, HZ]], 2), CAVA));
const lenOf = (r) => { let s = 0; for (let i = 1; i < r.length; i++) s += G.len3(G.sub3(r[i], r[i - 1])); return s; };
// where the blood changes colour along each route (as a fraction of the route's length)
const fracAt = (r, p) => { let s = 0, best = 0, bd = Infinity; for (let i = 1; i < r.length; i++) { s += G.len3(G.sub3(r[i], r[i - 1])); const d = G.len3(G.sub3(r[i], p)); if (d < bd) { bd = d; best = s; } } return best / lenOf(r); };
const lungSwap = [fracAt(lungRoute, [LUNG.x0, LUNG.y, LUNG.z]), fracAt(lungRoute, [LUNG.x1, LUNG.y, LUNG.z])];
const sysSwap = BEDS.map((x, i) => [fracAt(sysRoutes[i], [x, 84, 12]), fracAt(sysRoutes[i], [x, VY, HZ])]);
const q = (r) => r.map((p) => p.map((v) => +v.toFixed(1)));

const live = `
const P=${JSON.stringify(P)}, RP=${JSON.stringify(RP)}, LP=${JSON.stringify(LP)}, PZ0=${PZ0}, PH=${PH}, ROT=${JSON.stringify(ROT)}, BEDS=${JSON.stringify(BEDS)};
const ROUTES=[${JSON.stringify(q(lungRoute))},${sysRoutes.map((r) => JSON.stringify(q(r))).join(",")}];
const SWAP=[${JSON.stringify(lungSwap)},${sysSwap.map((s) => JSON.stringify(s)).join(",")}];
const stage=document.querySelector(".iso-stage"), svg=stage.querySelector("svg"), readout=document.querySelector("[data-readout]");
const pumpsG=svg.querySelector('[data-part="pumps"]'), dotsG=svg.querySelector('[data-part="dots"]');
const floats=BEDS.map((x)=>svg.querySelector('[data-part="float'+x+'"]'));
const at=(p)=>K.iso(p,P);
// truth (healthy adult; Guyton & Hall, after Wade & Bishop): at rest HR 70, stroke volume 70 ml, output 4.9 L/min shared
// brain 0.75, gut and liver 1.35, kidneys 1.1, muscle 1.0, skin, heart and the rest 0.7 L/min. In heavy exercise HR ~170
// and output ~17.5 L/min: muscle takes ~12.5, the skin and heart ~3, the brain keeps its 0.75, gut and kidneys give some up.
// Blood volume ~5 L, so one lap of the circuit takes 5 / output minutes. The lungs carry the whole output.
const REST=[0.75,1.35,1.1,1.0,0.7], EX=[0.75,0.6,0.6,12.5,3.05], FULL=[1,1.5,1.5,15,4];
const flows=(e)=>REST.map((r,i)=>r+(EX[i]-r)*e);
const hrOf=(e)=>70+100*e;
const lenOf=(r)=>{ let s=0; for(let i=1;i<r.length;i++) s+=Math.hypot(r[i][0]-r[i-1][0],r[i][1]-r[i-1][1],r[i][2]-r[i-1][2]); return s; };
const LEN=ROUTES.map(lenOf);
const cum=ROUTES.map((r)=>{ const c=[0]; for(let i=1;i<r.length;i++) c.push(c[i-1]+Math.hypot(r[i][0]-r[i-1][0],r[i][1]-r[i-1][1],r[i][2]-r[i-1][2])); return c; });
const posAt=(j,s)=>{ const c=cum[j], r=ROUTES[j]; let lo=0,hi=c.length-1; while(hi-lo>1){ const m=(lo+hi)>>1; if(c[m]<s) lo=m; else hi=m; } const f=(s-c[lo])/Math.max(1e-6,c[hi]-c[lo]); return r[lo].map((v,i)=>v+(r[hi][i]-v)*f); };
// dots: the lung loop carries the whole output; each systemic branch carries its own share. One dot per ~0.1 L/min.
const SPEED=26; // units per second per (L/min per dot-lane), shown ~15× faster than life
let ex=0, exT=0, tour=0, beat=0; const phase=ROUTES.map(()=>0);
function pumpSvg(x,y,squeeze,name){ const r0=15, r=r0*(1-0.16*squeeze);
  const prof=[[0,r*0.7,1],[8,r,1],[PH-16,r*0.95,1],[PH-6,r*0.6,1],[PH,6]];
  return vitaStain(name,K.solidSvg(G.solidOf(prof,G.frameAlong([x,y,PZ0],[0,0,1]),P,{smooth:true}),{tone:"hi"}),0.55); }
let lastSq=-1;
function frame(dt){
  const hr=hrOf(ex), Q=flows(ex), CO=Q.reduce((a,b)=>a+b,0);
  beat=(beat+dt*hr/60)%1; const sq=beat<0.35?Math.sin(beat/0.35*Math.PI):0;
  if(Math.abs(sq-lastSq)>0.03){ lastSq=sq; pumpsG.innerHTML=pumpSvg(RP[0],RP[1],sq,"deoxy")+pumpSvg(LP[0],LP[1],sq,"oxy"); }
  // flow pulses with the beat: faster in systole
  const pulse=0.55+0.9*sq;
  const items=[];
  ROUTES.forEach((r,j)=>{ const flow=j===0?CO:Q[j-1]; const lanes=j===0?14:Math.max(1,Math.round(Q[j-1]*2)); const n=Math.max(4,Math.round(LEN[j]/(j===0?16:22)));
    phase[j]=(phase[j]+dt*SPEED*pulse*(j===0?CO/4.9:flow/Math.max(0.3,REST[j-1]))*(j===0?1:0.4)/LEN[j])%1;
    const count=j===0?n:Math.min(n,Math.round(n*Math.min(1,flow/2.5)+2));
    for(let i=0;i<count;i++){ const f=(i/count+phase[j])%1; const p=posAt(j,f*LEN[j]); const sw=SWAP[j];
      const ox=j===0?(f<sw[0]?0:f>sw[1]?1:(f-sw[0])/(sw[1]-sw[0])):(f<sw[0]?1:f>sw[1]?0:1-(f-sw[0])/(sw[1]-sw[0]));
      items.push([K.depthOf(p,P),p,ox]); } });
  items.sort((a,b)=>a[0]-b[0]);
  dotsG.innerHTML=items.map(([,p,ox])=>vitaStainMix("deoxy","oxy",ox,K.dotsSvg([at(p)],{size:1.5,tone:"hi"}),1)).join("");
  floats.forEach((g,i)=>{ const z=ROT.z0+3+Math.min(1,Q[i]/FULL[i])*(ROT.z1-ROT.z0-8); const x=BEDS[i];
    g.innerHTML=K.solidSvg(G.solidOf([[0,1.2,1],[3,4,1],[5,4]],G.frameAlong([x,ROT.y,z-2],[0,0,1]),P),{tone:"hi",lit:true}); });
  const lap=5/CO*60;
  vitaSay(stage,readout,(ex>0.66?"exercise":ex>0.33?"walking":"rest")+" · "+Math.round(hr)+" bpm · "+CO.toFixed(1)+" L/min · lap "+Math.round(lap)+" s");
  stage.setAttribute("aria-valuenow",ex.toFixed(2)); }
vitaLoop({ stage, idleMs:5000,
  frame(dt,st){
    if(st.touring&&dt>0){ tour+=dt; const c=tour%20; exT=c<6?0:c<9?(c-6)/3:c<16?1:1-(c-16)/4; }
    if(st.still){ ex=exT=0; frame(0.1); return; }
    ex+=(exT-ex)*(1-Math.exp(-dt/0.6)); frame(dt); },
  pointer(x){ exT=x; },
  keys(key){ if(key==="ArrowRight"||key==="ArrowUp"){ exT=Math.min(1,exT+0.25); return true; } if(key==="ArrowLeft"||key==="ArrowDown"){ exT=Math.max(0,exT-0.25); return true; } if(key===" "){ exT=exT>0.5?0:1; return true; } return false; },
  resume(){ tour=0; },
});
`;
const body = k.plateHtml({
  fig: "Fig 18", title: "Circulation", hint: "Hover ↔ exercise · Space rest/max",
  readout: "rest · 70 bpm · 4.9 L/min · lap 61 s",
  keys: [{ mark: "oxy", label: "Oxygenated: lungs → left heart → beds" }, { mark: "deoxy", label: "Deoxygenated: beds → right heart → lungs" }, { mark: "lit", label: "Rotameter floats: flow to each bed" }],
  caption: "The two circuits in series, as a mock circulatory loop. Not to scale: a bench model (ruler: 1 tick = 1 cm of the bench); in the body the vessels run ~100,000 km. Right pump → lungs → left pump → five beds in parallel → right pump. Meters, left to right: brain, gut and liver, kidneys, muscle, skin and the rest; each has its own full scale (1, 1.5, 1.5, 15 and 4 L/min). At rest the heart beats 70 times a minute and pumps 4.9 L/min; in heavy exercise ~170 beats and ~17.5 L/min, and muscle's share rises from a fifth to over two thirds while the brain keeps its 0.75 L/min. The lungs always take the whole output. With ~5 L of blood, one lap takes about a minute at rest and 17 s at full effort. The pumps beat at the true rate; the blood is shown ~15× faster.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Circulation: arrow keys set exercise" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0">${svg}</div>`,
});
const page = vitaPage({ n: "18", title: "Circulation", zh: "循环系统 · 串联的两个回路", en: "Circulation · two circuits in series", body, script: liveScript() + LOOP_SRC + live,
  facts: [["~5 L/min", "静息心输出量（70 次 × 70 ml）", "cardiac output at rest (70 beats × 70 ml)"], ["~17–20 L/min", "剧烈运动时的心输出量", "cardiac output in heavy exercise"], ["~5 L", "成人血量", "adult blood volume"], ["~1 min", "静息时血液循环一周", "one lap of the circulation at rest"], ["20% → 70%", "运动时肌肉所占心输出量", "muscle's share of output, rest → exercise"], ["0.75 L/min", "脑血流，运动时基本不变", "brain blood flow, held in exercise"]] });
writeFileSync(join(OUT, "18-circulation.html"), page);
console.log("wrote 18-circulation.html", (page.length / 1024).toFixed(0) + " KB");
