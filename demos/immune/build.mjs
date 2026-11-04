// 19 · Immune response — clonal selection on a coverslip. The field is ~150 µm of a lymph-node follicle laid out as a
// lawn of naive B cells at true scale on a coverslip on a stage, each cell carrying its own receptor (drawn as a different
// key on its top). RFP-labelled antigen drifts in; only the one cell whose receptor fits binds it. That cell turns GFP
// (activated), swells and divides every ~8 h into a clone that crowds the field; some of the clone become plasma cells
// (haematoxylin-dark, eccentric nucleus) that shed antibodies, which find and coat the antigen. A titer monitor behind
// plots serum antibody against days. Time is the control: hover scrubs days 0–35; a second dose on day 21 meets memory
// cells, and the secondary response comes sooner and 10–100× higher.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, liveScript, LOOP_SRC, rng, plinth, stain, vitaPage } from "../../bio/bio.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../site/demos");
const W = 740, H = 470;
const UM = 2;                       // 1 µm = 2 units
const CELL_R = 3.6 * UM;            // a resting B cell is ~7 µm across
const PLATE = { x: -190, y: -150, w: 380, d: 290, r: 12 };
const SLIP = { x: -165, y: -112, w: 300, d: 230, r: 3 }, SLIP_Z = 4, SLIP_T = 1.2;
const CZ = SLIP_Z + SLIP_T;          // cells sit on the glass
const CLONE_C = [-30, 10];           // where the matching cell sits
const MON = { x: 30, y: -146, w: 120, d: 24, r: 2 }, MON_H = 60;
const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), ...k.boxCorners(MON, 0, MON_H + 6), [SLIP.x, SLIP.y + SLIP.d, CZ + 20], [SLIP.x - 10, SLIP.y - 98, 44]], W, H, { pad: 16, azimuth: 46 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const rand = rng(1957); // Burnet's clonal selection theory, 1957

// ---- positions: the clone fills a hex disc around the matching cell; 23 other naive cells are scattered elsewhere ----
const clone = [];
{ const s = CELL_R * 1.92; for (let i = -7; i <= 7; i++) for (let j = -7; j <= 7; j++) { const x = CLONE_C[0] + s * (i + j / 2), y = CLONE_C[1] + s * j * 0.866; clone.push([x + (rand() - 0.5) * 1.6, y + (rand() - 0.5) * 1.6]); } }
clone.sort((a, b) => Math.hypot(a[0] - CLONE_C[0], a[1] - CLONE_C[1]) - Math.hypot(b[0] - CLONE_C[0], b[1] - CLONE_C[1]));
clone.length = 64; clone[0] = [...CLONE_C];
const naive = [];
while (naive.length < 23) { const x = SLIP.x + 18 + rand() * (SLIP.w - 36), y = SLIP.y + 18 + rand() * (SLIP.d - 36);
  if (Math.hypot(x - CLONE_C[0], y - CLONE_C[1]) < 92 || naive.some((p) => Math.hypot(p[0] - x, p[1] - y) < 34)) continue; naive.push([x, y]); }
// each naive cell's receptor: a key with its own notch pattern (bits); the matching cell's key is the antigen's lock
const keyOf = (n) => [0, 1, 2, 3].map((b) => (n >> b) & 1);
const MATCH = 0b1011;
function cellSvg([x, y], { r = CELL_R, name = null, kk = 0.5, key = null, plasma = false } = {}) {
  const c = [x, y, CZ + r * 0.82];
  let h = S(G.sphereOf(c, r, P, { steps: 28 }), { tone: "hi" });
  // nucleus: a B cell is mostly nucleus; a plasma cell's sits to one side (cartwheel chromatin)
  const nuc = plasma ? [x - r * 0.38, y + r * 0.2, c[2] + r * 0.62] : [x, y, c[2] + r * 0.7];
  h += stain("dapi", D([at(nuc)], { size: plasma ? 2.4 : 3.1, tone: "lo" }), 0.8);
  if (key) { // the receptor: a bar on top with two to four teeth, read from the bits
    const z = c[2] + r + 0.4, pts = [];
    for (let b = 0; b < 4; b++) pts.push(k.segment([x - 4.5 + b * 3, y, z], [x - 4.5 + b * 3, y, z + (key[b] ? 3.2 : 1.4)], P));
    h += L(k.segment([x - 5.5, y, z], [x + 5.5, y, z], P) + pts.join(""), { tone: "mid" });
  }
  return name ? stain(name, h, kk) : h;
}
const depthAt = ([x, y]) => k.depthOf([x, y, CZ], P);
const NAIVE = naive.map((p, i) => ({ d: depthAt(p), svg: cellSvg(p, { key: keyOf((i * 7 + 3) % 16 === MATCH ? 5 : (i * 7 + 3) % 16) }) }));
const MATCHED = { naive: cellSvg(clone[0], { key: keyOf(MATCH) }), blast: cellSvg(clone[0], { r: CELL_R * 1.25, name: "gfp", kk: 0.55, key: keyOf(MATCH) }) };
const CLONE = clone.map((p, i) => ({ d: depthAt(p), b: cellSvg(p, { name: "gfp", kk: 0.5 }), pc: cellSvg(p, { r: CELL_R * 1.2, name: "hema", kk: 0.55, plasma: true }) }));

// ---- the stage: coverslip, clips, the titer monitor ----
function stage() {
  const out = [S(k.slabOf({ x: SLIP.x - 14, y: SLIP.y - 10, w: SLIP.w + 28, d: SLIP.d + 20, r: 6 }, 0, SLIP_Z, P, 6, 0.6), { tone: "mid" })];
  out.push(`<g class="bio-ghost">${S(k.slabOf(SLIP, SLIP_Z, SLIP_T, P, 4, 0.2), { tone: "hi" })}</g>`);
  // a counting grid etched into the glass: 50 µm squares
  const g = []; for (let x = SLIP.x + 50; x < SLIP.x + SLIP.w; x += 50 * UM / 2) g.push(k.lineOnTop([x, SLIP.y + 4], [x, SLIP.y + SLIP.d - 4], CZ, P));
  for (let y = SLIP.y + 40; y < SLIP.y + SLIP.d; y += 50 * UM / 2) g.push(k.lineOnTop([SLIP.x + 4, y], [SLIP.x + SLIP.w - 4, y], CZ, P));
  out.push(L(g.join(""), { tone: "faint" }));
  // two spring clips holding the slip
  for (const y of [SLIP.y + 30, SLIP.y + SLIP.d - 30]) { out.push(S(k.slabOf({ x: SLIP.x - 12, y: y - 6, w: 28, d: 12, r: 2 }, CZ, 1.6, P, 3, 0.3), { tone: "mid" })); out.push(S(k.cylinder(SLIP.x - 6, y, 3, CZ + 1.6, 2.4, P, 18), { tone: "mid" })); }
  return out.join("");
}
const SCR = { x0: MON.x + 8, x1: MON.x + MON.w - 8, z0: 9, z1: MON_H - 9 };
const scrY = MON.y + MON.d + 0.15;
const sxDay = (d) => SCR.x0 + 3 + (d / 35) * (SCR.x1 - SCR.x0 - 6), szLog = (l) => SCR.z0 + 3 + (l / 5) * (SCR.z1 - SCR.z0 - 6);
function monitor() {
  const out = [S(k.slabOf(MON, 0, MON_H, P, 4, 0.8), { tone: "mid" }), L(k.sideSeam(k.insetPlan(MON, 0), 6, P), { tone: "faint" })];
  const quad = (x0, x1, z0, z1) => k.pathOf([at([x0, scrY, z0]), at([x1, scrY, z0]), at([x1, scrY, z1]), at([x0, scrY, z1])], true);
  out.push(`<path d="${quad(SCR.x0, SCR.x1, SCR.z0, SCR.z1)}" style="fill:var(--anatomy-shade-0)"/>`, L(quad(SCR.x0, SCR.x1, SCR.z0, SCR.z1), { tone: "mid" }), L(quad(SCR.x0 - 2.5, SCR.x1 + 2.5, SCR.z0 - 2.5, SCR.z1 + 2.5), { tone: "faint" }));
  for (let l = 1; l <= 4; l++) out.push(L(k.segment([SCR.x0, scrY, szLog(l)], [SCR.x1, scrY, szLog(l)], P), { tone: "faint", dotted: true })); // 1:10 … 1:10⁴
  out.push(L(k.segment([sxDay(21), scrY, SCR.z0], [sxDay(21), scrY, SCR.z1], P), { tone: "faint", dashed: true })); // the second dose
  const ticks = []; for (let d = 0; d <= 35; d += 7) ticks.push(k.segment([sxDay(d), scrY, SCR.z0], [sxDay(d), scrY, SCR.z0 + 2.4], P));
  out.push(L(ticks.join(""), { tone: "lo" }));
  for (const x of [MON.x + 14, MON.x + 28]) { out.push(S(k.cylinder(x, MON.y + 12, 4, MON_H, 3.4, P, 22), { tone: "mid" })); out.push(L(k.knurl(x, MON.y + 12, 4, MON_H + 0.6, MON_H + 2.8, 16, P), { tone: "faint" })); }
  out.push(S(k.slabOf({ x: MON.x + 52, y: MON.y + 6, w: 50, d: 12, r: 1.4 }, MON_H, 0.8, P, 3, 0.3), { tone: "lo" }));
  for (const [x, y] of k.corners(k.insetPlan(MON, 4), 0)) out.push(D([at([x, y, MON_H])], { size: 0.45 }));
  return out.join("");
}
// an antigen injector: a glass micropipette on a stand over the field's back edge
const TIP = [SLIP.x + 40, SLIP.y + 30, CZ + 10];
const pipette = (() => { const base = [SLIP.x - 4, SLIP.y - 92, 34];
  return `<g class="bio-pipette">${S(G.solidOf([[0, 4, 1], [60, 3.6, 1], [80, 1.6, 1], [G.len3(G.sub3(TIP, base)), 0.5]], G.frameAlong(base, G.sub3(TIP, base)), P, { smooth: true }), { tone: "mid" })}</g>`
    + S(k.cylinder(base[0] - 6, base[1] - 6, 6, 0, 3, P, 24, 0.5), { tone: "mid" }) + S(k.cylinder(base[0] - 6, base[1] - 6, 2.2, 3, base[2] - 6, P, 18), { tone: "mid", crease: "none" })
    + S(G.solidOf([[0, 4.6, 1], [10, 4.6]], G.frameAlong(G.add3(base, G.mul3(G.unit3(G.sub3(TIP, base)), -6)), G.sub3(TIP, base)), P), { tone: "mid" }); })();

const svg = k.figureSvg({
  width: W, height: H,
  label: "A coverslip on a stage carrying a lawn of round B cells, each with a small key-shaped receptor on top. A micropipette at the back releases red antigen particles. One cell whose key fits turns green, swells and divides into a growing cluster; some of its daughters become darker plasma cells that release antibodies. A monitor behind plots antibody level against days, with a second, larger rise after a second dose on day 21.",
  body: [plinth(PLATE, P, { scale: { x: PLATE.x + 24, y: PLATE.y + PLATE.d - 14, w: 200, step: 10 * UM, every: 5 }, label: { x: PLATE.x + PLATE.w - 58, y: PLATE.y + PLATE.d - 20, w: 40 } }),
    monitor(), `<path data-part="trace" class="iso-line" data-tone="lit" style="stroke-width:1.1" d=""/>`, `<g data-part="cursor"></g>`, stage(), pipette, `<g data-part="field"></g>`],
});

const live = `
const P=${JSON.stringify(P)}, CZ=${CZ}, SLIP=${JSON.stringify(SLIP)}, CELL_R=${CELL_R}, TIP=${JSON.stringify(TIP)};
const NAIVE=${JSON.stringify(NAIVE)}, MATCHED=${JSON.stringify(MATCHED)}, CLONE=${JSON.stringify(CLONE)}, CPOS=${JSON.stringify(clone.map((p) => p.map((v) => +v.toFixed(1))))};
const SCR=${JSON.stringify(SCR)}, SCRY=${scrY};
const stage=document.querySelector(".iso-stage"), svg=stage.querySelector("svg"), readout=document.querySelector("[data-readout]");
const field=svg.querySelector('[data-part="field"]'), trace=svg.querySelector('[data-part="trace"]'), cursor=svg.querySelector('[data-part="cursor"]');
const at=(p)=>K.iso(p,P);
// truth (mouse and human, textbook values; Janeway): ~1 in 10⁵ naive B cells fits a given antigen. After activation
// (day 1–2) the clone divides every ~6–8 h for about five days (13–15 divisions, ~10⁴ cells), then most die and memory
// cells remain. Plasma cells each secrete ~2,000 antibodies a second. Primary response: IgM from day ~5, peak ~day 10–14,
// titer ~1:10²–10³. A second dose meets memory cells: IgG within 2–3 days, peak ~1 week later, 10–100× higher.
const bump=(d,on,pk,top,fall)=>d<on?0:d<pk?top*Math.sin((d-on)/(pk-on)*Math.PI/2):top*Math.exp(-(d-pk)/fall);
const igm=(d)=>bump(d,4,11,2.9,6)+(d>21?bump(d,22.5,26,1.6,5):0);
const igg=(d)=>bump(d,8,16,1.8,9)+(d>21?bump(d,22,28,4.7,14):0);
const titer=(d)=>Math.max(igm(d),igg(d)); // log10 of the dilution that still reads positive
const divs=(d)=>{ if(d<1.8) return 0; if(d<21) return Math.min(13.5,(d-1.8)*3); return 13.5; };
function cloneCells(d){ // true clone size, and how many of the 64 places on the field it fills
  let n; if(d<1.8) n=1; else if(d<7) n=Math.pow(2,divs(d)); else if(d<21) n=Math.max(400,11600*Math.exp(-(d-7)/2.6)); else if(d<23) n=400*Math.pow(2,(d-21)*3); else n=Math.min(1.3e5,400*Math.pow(2,6+(d-23)*2.4))*(d>30?Math.exp(-(d-30)/3):1);
  const shown=Math.max(1,Math.min(64,Math.round(Math.log2(n)*4.7)));
  return {n,shown}; }
const plasmaShare=(d)=>d<5?0:d<21?0.3:0.5;
let day=0, dayT=0, tour=0;
let seed=11; const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const AG=Array.from({length:30},()=>({x:SLIP.x+20+rnd()*(SLIP.w-40),y:SLIP.y+20+rnd()*(SLIP.d-40),z:CZ+2+rnd()*10,a:rnd()*6.28,b:rnd()}));
const AB=Array.from({length:60},(_,i)=>({c:Math.floor(rnd()*64),a:rnd()*6.28,r:CELL_R*1.6+rnd()*40,z:CZ+3+rnd()*14,ph:rnd()}));
function antigenLeft(d){ // each dose clears as antibody rises
  const dose=(d0)=>d<d0?0:Math.exp(-Math.max(0,d-d0-3)*Math.pow(10,titer(d)-3)*0.35);
  return Math.min(1,dose(0)+dose(21)); }
function draw(clock){
  const d=day, {n,shown}=cloneCells(d), pc=plasmaShare(d), items=[];
  NAIVE.forEach((c)=>items.push([c.d,c.svg]));
  if(d<1.2) items.push([CLONE[0].d,MATCHED.naive]); else if(d<1.8) items.push([CLONE[0].d,MATCHED.blast]);
  else for(let i=0;i<shown;i++){ const c=CLONE[i]; const isPc=i>0&&((i*37)%100)/100<pc&&d>5; items.push([c.d,isPc?c.pc:c.b]); }
  // antigen: RFP particles drifting over the field; bound ones sit on the matching cell
  const ag=antigenLeft(d), nAg=Math.round(30*ag), bound=d>=0.6&&d<6?Math.min(6,Math.round((d-0.6)*6)):0;
  for(let i=0;i<nAg;i++){ const a=AG[i]; let p;
    if(i<bound){ const t=i/6*6.28; p=[CPOS[0][0]+Math.cos(t)*CELL_R*1.15,CPOS[0][1]+Math.sin(t)*CELL_R*1.15,CZ+CELL_R*1.2]; }
    else { const w=clock*0.6+a.a; p=[a.x+Math.cos(w)*6,a.y+Math.sin(w*1.3)*6,a.z+Math.sin(w*0.7)*2]; if(d<0.6){ const f=Math.min(1,d/0.6+a.b*0.3); p=[TIP[0]+(p[0]-TIP[0])*f,TIP[1]+(p[1]-TIP[1])*f,TIP[2]+(p[2]-TIP[2])*f]; } }
    items.push([K.depthOf(p,P)+0.5,vitaStain("rfp",K.dotsSvg([at(p)],{size:2.1,tone:"hi"}),1)]); }
  // antibodies: Y-shaped, shed by plasma cells; their number follows the titer (log scale)
  const nAb=d>5?Math.min(60,Math.round(Math.max(0,titer(d)-1)*16)):0;
  for(let i=0;i<nAb;i++){ const b=AB[i], src=CPOS[Math.min(shown-1,b.c)], w=clock*0.25+b.a; const rr=b.r*(0.6+0.4*((clock*0.08+b.ph)%1));
    const x=src[0]+Math.cos(w)*rr, y=src[1]+Math.sin(w)*rr, z=b.z; const s=2.2;
    const y0=at([x,y,z]), y1=at([x,y,z+s]), l=at([x-s*0.8,y,z+s*1.8]), r=at([x+s*0.8,y,z+s*1.8]);
    const path="M"+y0[0].toFixed(1)+" "+y0[1].toFixed(1)+"L"+y1[0].toFixed(1)+" "+y1[1].toFixed(1)+"M"+l[0].toFixed(1)+" "+l[1].toFixed(1)+"L"+y1[0].toFixed(1)+" "+y1[1].toFixed(1)+"L"+r[0].toFixed(1)+" "+r[1].toFixed(1);
    items.push([K.depthOf([x,y,z],P)+0.6,'<path class="iso-line" data-tone="lit" d="'+path+'"/>']); }
  items.sort((a,b)=>a[0]-b[0]); field.innerHTML=items.map((x)=>x[1]).join("");
  // monitor: the titer so far, and a cursor at today
  const sx=(dd)=>SCR.x0+3+(dd/35)*(SCR.x1-SCR.x0-6), sz=(l)=>SCR.z0+3+(Math.max(0,l)/5)*(SCR.z1-SCR.z0-6);
  let s="M"; const steps=Math.max(2,Math.round(d/35*140)); for(let i=0;i<=steps;i++){ const dd=d*i/steps; const p=at([sx(dd),SCRY+0.1,sz(titer(dd))]); s+=(i?"L":"")+p[0].toFixed(1)+" "+p[1].toFixed(1); }
  trace.setAttribute("d",s); const c0=at([sx(d),SCRY+0.1,SCR.z0]), c1=at([sx(d),SCRY+0.1,SCR.z1]);
  cursor.innerHTML='<path class="iso-line" data-tone="mid" d="M'+c0[0].toFixed(1)+' '+c0[1].toFixed(1)+'L'+c1[0].toFixed(1)+' '+c1[1].toFixed(1)+'"/>';
  const T=titer(d), iso=igg(d)>igm(d)?"IgG":"IgM";
  const fmt=(v)=>v<1000?String(Math.round(v)):v<1e4?(v/1000).toFixed(1)+"k":Math.round(v/1000)+"k";
  vitaSay(stage,readout,"day "+Math.floor(d)+" · clone "+fmt(n)+" · "+(T<0.3?"no antibody yet":iso+" 1:"+fmt(Math.pow(10,T))));
  stage.setAttribute("aria-valuenow",d.toFixed(1)); }
vitaLoop({ stage, idleMs:5000,
  frame(dt,st){
    if(st.still){ day=dayT=12; draw(0); return; }
    if(st.touring&&dt>0){ tour=(tour+dt)%24; dayT=Math.min(35,tour/21*35); if(tour<0.1) day=0; }
    day+=(dayT-day)*(st.touring?1:1-Math.exp(-dt/0.25)); draw(st.clock); },
  pointer(x){ dayT=x*35; },
  keys(key){ if(key==="ArrowRight"||key==="ArrowUp"){ dayT=Math.min(35,dayT+3.5); return true; } if(key==="ArrowLeft"||key==="ArrowDown"){ dayT=Math.max(0,dayT-3.5); return true; } if(key===" "){ dayT=dayT<21?24:0; return true; } return false; },
  resume(){ tour=day/35*21; },
});
`;
const body = k.plateHtml({
  fig: "Fig 19", title: "Immune response", hint: "Hover ↔ days 0–35 · Space day 24",
  readout: "day 0 · clone 1 · no antibody yet",
  keys: [{ mark: "rfp", label: "Antigen (labelled, drawn ~20× size)" }, { mark: "gfp", label: "The selected clone" }, { mark: "hema", label: "Plasma cells" }, { mark: "lit", label: "Antibodies; titer trace" }],
  caption: "Clonal selection, about 150 µm of a lymph-node follicle at true scale (ruler: 1 tick = 10 µm); the coverslip stands in for the follicle, and the 100 nm antigen particles and antibodies are drawn ~20× size. Every naive B cell carries one receptor, here a key; about one in 10⁵ fits a given antigen. Only that cell is selected: it turns GFP, swells and divides every ~8 h for five days, ~13 divisions and ~10⁴ cells. The field shows 64 places on a log scale of clone size. Some daughters become plasma cells, each secreting ~2,000 antibodies a second; IgM titer peaks near day 11, the clone shrinks to memory cells, and the antigen is cleared. A second dose on day 21 meets those memory cells: IgG rises within days to 10–100× the first peak. Days 0–35 run in 21 s, ~140,000× faster.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Immune response: arrow keys move through days 0 to 35" aria-valuemin="0" aria-valuemax="35" aria-valuenow="0">${svg}</div>`,
});
const page = vitaPage({ n: "19", title: "Immune response", zh: "免疫应答 · 克隆选择", en: "Immune response · clonal selection", body, script: liveScript() + LOOP_SRC + live,
  facts: [["~1 in 10⁵", "能识别某一抗原的初始 B 细胞比例", "naive B cells that fit a given antigen"], ["~6–8 h", "活化后克隆的分裂周期", "clone doubling time after activation"], ["~2,000/s", "每个浆细胞分泌的抗体数", "antibodies secreted per plasma cell"], ["~day 10–14", "初次应答（IgM）峰值", "primary (IgM) response peak"], ["10–100×", "再次应答（IgG）比初次高", "secondary (IgG) response vs primary"], ["~10¹⁰–10¹¹", "人体 B 细胞总数", "B cells in a human body"]] });
writeFileSync(join(OUT, "19-immune.html"), page);
console.log("wrote 19-immune.html", (page.length / 1024).toFixed(0) + " KB");
