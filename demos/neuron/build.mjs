// 04 · Neuron — a fluorescent neuron on a coverslip in a recording rig: a stimulating pipette on the soma,
// a recording pipette on the axon terminal, and an amplifier whose screen draws the membrane potential.
// What moves: the action potential. With myelin it jumps node to node; strip the myelin and it crawls.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, liveScript, rng, plinth, stain, vitaPage, byDepth } from "../../bio/bio.mjs";
import { tubePieces, tubeSvg } from "../../kit/tube.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../site/demos");
const W = 760, H = 440;
const PLATE = { x: -176, y: -92, w: 352, d: 170, r: 10 };
const SLIP = { x: -150, y: -54, w: 290, d: 104, r: 1.5 };
const SZ = 1.6;
const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [-140, -80, 120], [150, -80, 90]], W, H, { pad: 22, azimuth: 52 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const V = G.viewOf(P);
const rand = rng(1906); // Golgi & Cajal's Nobel year

// ---- neuron geometry (drawn at schematic scale; the axon is compressed, the numbers are not) ----
const SOMA = [-104, -6, SZ + 11];
const SOMA_R = 12;
const items = [];
const put = (depth, html) => items.push([depth, html]);
const tubeInto = (pts, r, tone, wrap = (h) => h, maxLength = 9) => { for (const piece of tubePieces(pts, r, P, { maxLength })) put(G.dot3(piece.mid, V), wrap(tubeSvg(piece, { tone }))); };
const gfp = (h) => stain("gfp", h, 0.7);
// dendrites: a seeded branching tree, tapering, lying on the glass
function branch(from, dir, len, r, depth) {
  const pts = [from]; let p = from, d = dir;
  const n = Math.max(3, Math.round(len / 4));
  for (let i = 0; i < n; i++) { const a = Math.atan2(d[1], d[0]) + (rand() - 0.5) * 0.35; d = [Math.cos(a), Math.sin(a), 0]; p = [p[0] + d[0] * len / n, p[1] + d[1] * len / n, Math.max(SZ + r * 0.8, p[2] - 1.2)]; pts.push(p); }
  const route = G.resample(G.fillet(pts, 4, 5), 1.4);
  tubeInto(route, (t) => r * (1 - 0.45 * t), "hi", gfp, 7);
  const tip = pts[pts.length - 1];
  if (depth > 0) { const a = Math.atan2(d[1], d[0]); for (const s of [-1, 1]) branch(tip, [Math.cos(a + s * (0.38 + rand() * 0.3)), Math.sin(a + s * (0.38 + rand() * 0.3)), 0], len * (0.62 + rand() * 0.15), r * 0.58, depth - 1); }
  else put(G.dot3(tip, V) + 0.1, gfp(D([at(tip)], { size: 0.9, tone: "hi" }))); // a spine head at each tip
}
const DEND = [Math.PI * 0.72, Math.PI * 0.95, Math.PI * 1.2, Math.PI * 1.45, Math.PI * 0.5];
DEND.forEach((a, i) => { const dir = [Math.cos(a), Math.sin(a), 0]; branch(G.add3(SOMA, G.mul3(dir, SOMA_R * 0.8)).map((v, j) => (j === 2 ? SZ + 6 : v)), dir, 30 + rand() * 10, 2.6, i === 4 ? 1 : 2); });
put(G.dot3(SOMA, V), gfp(S(G.sphereOf(SOMA, SOMA_R, P), { tone: "hi" })) + gfp(D([at(G.add3(SOMA, [1.5, 2, 4]))], { size: 2.8, tone: "lo" })));
// axon: hillock, then a long gentle S along the glass, ending in three terminal boutons
const AX_R = 1.5, MY_R = 4.2;
const axonPts = G.resample(G.fillet([[SOMA[0] + SOMA_R - 1, SOMA[1] + 2, SZ + 7], [SOMA[0] + 30, SOMA[1] + 6, SZ + 4.5], [-10, 22, SZ + 4.5], [60, -6, SZ + 4.5], [112, 6, SZ + 4.5]], 34, 10), 1.0);
const AXLEN = G.pathLength(axonPts);
tubeInto(axonPts, (t) => (t < 0.05 ? AX_R * (2.2 - 24 * t) : AX_R), "hi", gfp, 8);
// myelin: internodes with gaps (nodes of Ranvier) between
const NODE_GAP = 3.2, INTER = 26, MY0 = 26, MY1 = AXLEN - 10;
const nodes = [];
const myelin = [];
for (let s = MY0; s + INTER <= MY1 + 0.1; s += INTER + NODE_GAP) {
  const seg = G.cut(axonPts, s, s + INTER);
  for (const piece of tubePieces(seg, (t) => MY_R * Math.min(1, Math.sin(Math.PI * Math.min(1, Math.max(0, t))) * 3 + 0.35), P, { maxLength: 7, rings: { pitch: 2.2, tone: "faint", fade: [0.15, 0.6] } })) myelin.push([G.dot3(piece.mid, V), stain("myelin", tubeSvg(piece, { tone: "hi" }), 0.9)]);
  nodes.push(s + INTER + NODE_GAP / 2);
}
nodes.unshift(MY0 - NODE_GAP / 2);
// terminal arbour and boutons
const tEnd = axonPts[axonPts.length - 1];
const boutons = [];
[[-0.6, 16], [0.1, 20], [0.7, 15]].forEach(([a, len]) => { const d = [Math.cos(a), Math.sin(a), 0]; const end = G.add3(tEnd, G.mul3(d, len)); tubeInto(G.resample([tEnd, G.add3(tEnd, G.mul3(d, len * 0.5)), end], 1), 1.0, "hi", gfp, 30); boutons.push(end); put(G.dot3(end, V) + 0.5, gfp(S(G.sphereOf(G.add3(end, [0, 0, 1.4]), 3.4, P), { tone: "hi" }))); });

// ---- the rig ----
function manipulator(x, y, h) {
  const out = [];
  out.push(S(k.slabOf({ x: x - 12, y: y - 10, w: 24, d: 20, r: 2 }, 0, 8, P, 4, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 4, 8, h - 20, P, 24), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: x - 9, y: y - 8, w: 18, d: 16, r: 2 }, h - 12, 12, P, 4, 0.6), { tone: "mid" }));
  for (const [kx, kz] of [[x + 9, h - 6], [x + 9, 4]]) { out.push(S(k.cylinder(kx + 3, y + 2, 3.2, kz - 3, 6, P, 20), { tone: "mid" })); out.push(L(k.knurl(kx + 3, y + 2, 3.2, kz - 2.5, kz + 2.5, 16, P), { tone: "faint" })); }
  out.push(D([at([x - 6, y + 8, h]), at([x + 6, y + 8, h])], { size: 0.45 }));
  return out.join("");
}
const MANI = [[-150, -76, 96], [150, -76, 80]];
const pipette = (from, tip) => {
  const pts = G.resample([from, G.lerp3(from, tip, 0.55), tip], 1.2);
  return tubePieces(pts, (t) => 2.6 * (1 - t) + 0.45, P, { maxLength: 400 }).map((p) => `<g class="vita-glass">${tubeSvg(p, { tone: "mid" })}</g>`).join("") + D([at(tip)], { size: 0.6, tone: "hi" });
};
const stimTip = G.add3(SOMA, [-3, -4, SOMA_R - 1.2]);
const recTip = G.add3(boutons[1], [0, -1, 4.2]);
const holderA = [MANI[0][0] + 6, MANI[0][1] + 8, MANI[0][2] - 6], holderB = [MANI[1][0] - 6, MANI[1][1] + 8, MANI[1][2] - 6];
// amplifier with a screen on its front face
const AMP = { x: 30, y: -86, w: 80, d: 26, r: 2 }, AMP_H = 40;
const SCR = { x0: AMP.x + 8, x1: AMP.x + AMP.w - 8, z0: 9, z1: AMP_H - 7 };
const scrY = AMP.y + AMP.d + 0.15;
function amplifier() {
  const out = [S(k.slabOf(AMP, 0, AMP_H, P, 4, 0.8), { tone: "mid" })];
  const corner = (x, z) => at([x, scrY, z]);
  out.push(`<path class="iso-fill" d="M${[corner(SCR.x0, SCR.z0), corner(SCR.x1, SCR.z0), corner(SCR.x1, SCR.z1), corner(SCR.x0, SCR.z1)].map((p) => p.map((v) => v.toFixed(1)).join(" ")).join("L")}Z" style="fill:var(--anatomy-shade-0)"/>`);
  out.push(L(`M${[corner(SCR.x0, SCR.z0), corner(SCR.x1, SCR.z0), corner(SCR.x1, SCR.z1), corner(SCR.x0, SCR.z1)].map((p) => p.map((v) => v.toFixed(1)).join(" ")).join("L")}Z`, { tone: "mid" }));
  // graticule: −70 mV and 0 mV rules, edge to edge
  const vz = (mv) => SCR.z0 + 2 + ((mv + 90) / 140) * (SCR.z1 - SCR.z0 - 4);
  out.push(L(k.segment([SCR.x0, scrY, vz(0)], [SCR.x1, scrY, vz(0)], P), { tone: "faint" }), L(k.segment([SCR.x0, scrY, vz(-70)], [SCR.x1, scrY, vz(-70)], P), { tone: "faint", dashed: true }));
  for (const x of [AMP.x + 14, AMP.x + 26, AMP.x + 38]) { out.push(S(k.cylinder(x, AMP.y + 13, 3.4, AMP_H, 3, P, 20), { tone: "mid" })); out.push(L(k.knurl(x, AMP.y + 13, 3.4, AMP_H + 0.5, AMP_H + 2.5, 16, P), { tone: "faint" })); }
  out.push(D([at([AMP.x + 60, AMP.y + 13, AMP_H]), at([AMP.x + 68, AMP.y + 13, AMP_H])], { size: 1.1, tone: "hi" }));
  return out.join("");
}
items.sort((a, b) => a[0] - b[0]);
myelin.sort((a, b) => a[0] - b[0]);
const nodePts = nodes.map((s) => ({ s, p: G.pointAlong(axonPts, s), t: G.tangentAlong(axonPts, s) }));
const nodeSvg = nodePts.map(({ p, t }, i) => { const F = G.frameAlong(p, t); return `<g data-node="${i}" opacity="0">${S(G.disc(-1.4, 1.4, AX_R + 1.1, F, P), { tone: "hi", lit: true })}</g>`; }).join("");
const axScreen = axonPts.map((p) => at(p));
const axS = []; { let acc = 0; axS.push(0); for (let i = 1; i < axonPts.length; i++) { acc += G.len3(G.sub3(axonPts[i], axonPts[i - 1])); axS.push(acc); } }

const svg = k.figureSvg({
  width: W, height: H, label: "A fluorescent neuron lying on a glass coverslip in a recording rig. A stimulating pipette touches the cell body, a recording pipette touches an axon terminal, and an amplifier screen at the back draws the membrane potential. When the neuron fires, the impulse runs down the axon, jumping between the gaps in the myelin sheath.",
  body: [
    plinth(PLATE, P, { h: 10, scale: { x: -160, y: PLATE.y + PLATE.d - 15, w: 240, step: 5, every: 5 }, label: { x: 118, y: PLATE.y + PLATE.d - 20, w: 38 } }),
    `<g class="vita-glass">${S(k.slabOf(SLIP, 0, SZ, P, 3, 0.3), { tone: "hi" })}</g>`,
    manipulator(...MANI[0]), manipulator(...MANI[1]), amplifier(),
    k.wireSvg(at([MANI[0][0], MANI[0][1] - 10, 4]), at([AMP.x, AMP.y + 6, 4]), { via: [at([MANI[0][0] + 40, AMP.y - 2, 0]), at([AMP.x - 20, AMP.y - 2, 0])], tone: "lo" }),
    k.wireSvg(at([MANI[1][0], MANI[1][1] - 10, 4]), at([AMP.x + AMP.w, AMP.y + 6, 4]), { via: [at([MANI[1][0] - 14, AMP.y - 2, 0])], tone: "lo" }),
    items.map((x) => x[1]).join(""),
    `<g data-part="band"></g>`,
    `<g data-part="myelin" class="bio-fade" style="transition:opacity .9s">${myelin.map((x) => x[1]).join("")}</g>`,
    nodeSvg,
    pipette(holderA, stimTip), pipette(holderB, recTip),
    `<path data-part="trace" class="iso-line" data-tone="lit" style="stroke-width:1" d=""/>`,
    `<g data-part="spark"></g>`,
  ],
});

const live = `
const P=${JSON.stringify(P)}; const AXS=${JSON.stringify(axS.map((v) => +v.toFixed(2)))}; const AXP=${JSON.stringify(axScreen.map((p) => [+p[0].toFixed(1), +p[1].toFixed(1)]))};
const NODES=${JSON.stringify(nodes.map((v) => +v.toFixed(2)))}; const AXLEN=${AXLEN.toFixed(2)}; const SCR=${JSON.stringify(SCR)}; const SCRY=${scrY}; const STIM=${JSON.stringify(at(stimTip))};
const stage=document.querySelector(".iso-stage"), svg=stage.querySelector("svg"), readout=document.querySelector("[data-readout]");
const band=svg.querySelector('[data-part="band"]'), my=svg.querySelector('[data-part="myelin"]'), trace=svg.querySelector('[data-part="trace"]'), spark=svg.querySelector('[data-part="spark"]');
const nodeEls=[...svg.querySelectorAll("[data-node]")];
const still=matchMedia("(prefers-reduced-motion: reduce)");
// truth: drawn axon stands for 10 mm of a peripheral nerve. Myelinated Aβ fibre ~40 m/s; unmyelinated C fibre ~2 m/s.
const AXON_MM=10, V_MY=40, V_UN=2.0, SLOW=2000; // shown 2000× slower than life
let myelinated=true, fired=[], vmHist=[], clock=0, last=0, frame=0, visible=false, nextAuto=0.8, shots=0, touring=!still.matches;
const apShape=(ms)=>{ // membrane potential (mV) at a point, ms after the impulse arrives
  if(ms<-0.6) return -70; if(ms<0) return -70+8*Math.exp(ms*5);
  if(ms<0.5) return -62+102*Math.sin(ms/0.5*Math.PI/2); if(ms<1.4) return 40-120*((ms-0.5)/0.9); if(ms<5) return -80+10*(1-Math.exp(-(ms-1.4)/1.2)); return -70; };
const arrivalMs=(s,mode)=>{ const mm=s/AXLEN*AXON_MM; if(mode){ // saltatory: the impulse is regenerated only at nodes; ~20 µs per internode
    let i=NODES.findIndex((n)=>n>=s); if(i<0) i=NODES.length-1; const per=(AXON_MM/NODES.length)/V_MY; return 0.3+i*per; } return 0.3+mm/V_UN; };
function pointAt(s){ let i=1; while(i<AXS.length-1&&AXS[i]<s) i++; const t=(s-AXS[i-1])/((AXS[i]-AXS[i-1])||1); return [AXP[i-1][0]+(AXP[i][0]-AXP[i-1][0])*t, AXP[i-1][1]+(AXP[i][1]-AXP[i-1][1])*t]; }
function sub(a,b){ const pts=[pointAt(a)]; for(let i=0;i<AXS.length;i++) if(AXS[i]>a&&AXS[i]<b) pts.push(AXP[i]); pts.push(pointAt(b)); return "M"+pts.map((p)=>p[0].toFixed(1)+" "+p[1].toFixed(1)).join("L"); }
function fire(){ fired.push({t0:clock, mode:myelinated}); shots++; }
function frameDraw(){
  const msNow=(f)=>(clock-f.t0)*1000/SLOW;
  // node flashes and the moving band (only where the membrane is exposed: at nodes if myelinated, everywhere if not)
  const glow=new Array(NODES.length).fill(0); let bandHtml="";
  for(const f of fired){ const ms=msNow(f);
    if(f.mode){ NODES.forEach((n,i)=>{ const a=arrivalMs(n,true); const d=ms-a; if(d>-0.02&&d<1.6) glow[i]=Math.max(glow[i], d<0.08?d/0.08: Math.exp(-(d-0.08)/0.35)); }); }
    else { const mm=(ms-0.3)*V_UN; const s=mm/AXON_MM*AXLEN; if(s>-8&&s<AXLEN+8){ const a=Math.max(0,s-10), b=Math.min(AXLEN,s+2); if(b>a) bandHtml+='<path class="iso-line" data-tone="lit" style="stroke-width:3.2;stroke-linecap:round;opacity:.85" d="'+sub(a,b)+'"/>'; } } }
  band.innerHTML=bandHtml;
  nodeEls.forEach((el,i)=>{ const o=myelinated?glow[i]:0; const v=o.toFixed(2); if(el.getAttribute("opacity")!==v) el.setAttribute("opacity",v); });
  // stimulus spark at the soma
  const recent=fired.length?msNow(fired[fired.length-1]):99; spark.innerHTML=recent<0.3?'<circle cx="'+STIM[0]+'" cy="'+STIM[1]+'" r="'+(3+recent*10).toFixed(1)+'" fill="none" stroke="var(--anatomy-lit)" stroke-width=".8" opacity="'+(1-recent/0.3).toFixed(2)+'"/>':"";
  // membrane potential at the recording pipette (axon end)
  let vm=-70; for(const f of fired){ const a=arrivalMs(AXLEN,f.mode); const v=apShape(msNow(f)-a); if(v!==-70) vm=v; }
  vmHist.push(vm); if(vmHist.length>150) vmHist.shift();
  const vz=(mv)=>SCR.z0+2+((mv+90)/140)*(SCR.z1-SCR.z0-4);
  trace.setAttribute("d","M"+vmHist.map((v,i)=>{ const x=SCR.x0+1+(SCR.x1-SCR.x0-2)*i/149; const p=K.iso([x,SCRY+0.1,vz(v)],P); return p[0].toFixed(1)+" "+p[1].toFixed(1); }).join("L"));
  fired=fired.filter((f)=>msNow(f)<arrivalMs(AXLEN,f.mode)+8);
  const text=(myelinated?"myelinated · "+V_MY+" m/s":"unmyelinated · "+V_UN.toFixed(1)+" m/s")+" · Vm "+Math.round(vm)+" mV";
  if(readout.textContent!==text) readout.textContent=text; stage.setAttribute("aria-valuetext",text);
}
function tick(now){ const dt=last?Math.min((now-last)/1000,1/30):1/60; last=now; clock+=dt;
  if(touring){ nextAuto-=dt; if(nextAuto<=0&&!fired.length){ if(shots>0&&shots%3===0){ setMyelin(!myelinated); nextAuto=1.2; shots++; } else { fire(); nextAuto=myelinated?1.4:1.5; } } }
  frameDraw(); frame=visible&&!still.matches?requestAnimationFrame(tick):0; }
function setMyelin(v){ myelinated=v; my.style.opacity=v?"1":"0.08"; }
const run=()=>{ if(!frame&&visible){ last=0; frame=requestAnimationFrame(tick);} };
let idle=0; const takeOver=()=>{ touring=false; clearTimeout(idle); idle=setTimeout(()=>{ touring=!still.matches; nextAuto=1; },6000); };
new IntersectionObserver((e)=>{visible=e[e.length-1].isIntersecting; if(visible) run();},{rootMargin:"120px 0px"}).observe(stage);
stage.addEventListener("click",()=>{ takeOver(); fire(); run(); });
stage.addEventListener("keydown",(e)=>{ if(e.key===" "||e.key==="Enter"){ takeOver(); fire(); } else if(e.key==="m"||e.key==="M"){ takeOver(); setMyelin(!myelinated); } else return; e.preventDefault(); run(); });
if(still.matches){ touring=false; }
frameDraw();
`;
const body = k.plateHtml({
  fig: "Fig 04", title: "Action potential", hint: "Click or Space fire · M myelin",
  readout: "myelinated · 40 m/s · Vm −70 mV", keys: [{ mark: "lit", label: "The impulse: lit nodes, or the moving band without myelin" }, { mark: "green", label: "Neuron (GFP)" }, { mark: "raised", label: "Myelin internodes" }],
  caption: "Not to scale: the axon stands for 10 mm of nerve, compressed; all speeds are true and shown 2,000× slower. At rest the membrane sits at −70 mV. A stimulus at the soma crosses threshold (about −55 mV) at the axon hillock; sodium channels open and the membrane swings to about +40 mV in half a millisecond, then potassium brings it back past −80 mV. Myelin insulates the internodes, so the impulse is regenerated only at the nodes of Ranvier and jumps between them at about 40 m/s; without myelin (a thin C fibre) it must regenerate everywhere and crawls at about 2 m/s.",
  body: `<div class="iso-stage" tabindex="0" role="button" aria-label="Neuron: Space fires an action potential, M toggles the myelin">${svg}</div>`,
});
const page = vitaPage({ n: "04", title: "Action potential", zh: "神经元 · 动作电位", body, script: liveScript() + live,
  facts: [["−70 mV", "静息膜电位"], ["+40 mV", "峰值"], ["~1 ms", "一次动作电位"], ["40 m/s", "有髓纤维传导"], ["0.5–2 m/s", "无髓纤维传导"], ["~860 亿", "人脑神经元数"]] });
writeFileSync(join(OUT, "04-neuron.html"), page);
console.log("wrote 04-neuron.html", (page.length / 1024).toFixed(0) + " KB");
