// 07 · Na⁺/K⁺-ATPase — a patch of plasma membrane on four posts with a two-gate airlock in a notch at its front edge,
// plus two leak channels. What moves: the gates, never both open: inside gate open → 3 Na⁺ in, ATP locks it, outside
// gate opens → Na⁺ out, 2 K⁺ in, phosphate off, inside opens → K⁺ in. Leaks run the gradients down; the pump runs them up.
// Click drops ouabain on the outside face: the pump stops and the gradients slowly vanish.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, liveScript, LOOP_SRC, plinth, stain, vitaPage, byDepth } from "../../bio/bio.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../site/demos");
const W = 720, H = 470;
const NM = 6; // 1 nm = 6 units
const MZ0 = 64, MZ1 = MZ0 + 4 * NM; // 4 nm bilayer
const PLATE = { x: -106, y: -74, w: 206, d: 136, r: 9 };
const MEM = { x0: -86, x1: 80, y0: -56, y1: 40 };
const C = [0, MEM.y1 - 15]; // pump centre, its front open to the cut edge
const HX = 22, HY = 15; // half sizes of the housing (≈ 7 × 5 nm)
const WALL = 4.2;
const GZ0 = MZ0 - 10, GZ1 = MZ1 + 6; // gates sit just outside the bilayer
const NOTCH = { x0: C[0] - HX - 2, x1: C[0] + HX + 2, y0: C[1] - HY - 2 };
const LEAK = { potassium: [-56, -30], sodium: [52, -36] }; // keys are stain names
const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [MEM.x0, MEM.y0, MZ1 + 42], [MEM.x1, MEM.y1, MZ1 + 42]], W, H, { pad: 22, azimuth: 48 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);

function membrane() {
  const out = [];
  const ring = [[MEM.x0, MEM.y0], [MEM.x1, MEM.y0], [MEM.x1, MEM.y1], [NOTCH.x1, MEM.y1], [NOTCH.x1, NOTCH.y0], [NOTCH.x0, NOTCH.y0], [NOTCH.x0, MEM.y1], [MEM.x0, MEM.y1]];
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: MEM.x0, y: MEM.y0, w: MEM.x1 - MEM.x0, d: MEM.y1 - MEM.y0, r: 2 }, MZ0, 2, P)}" style="opacity:.16"/>`);
  out.push(stain("myelin", S(k.extrude(ring, MZ0, MZ1 - MZ0, P, { convex: false }), { tone: "mid" }), 0.5));
  const heads = [];
  for (let x = MEM.x0 + 3; x < MEM.x1 - 1; x += 4.4) for (let y = MEM.y0 + 3; y < MEM.y1 - 1; y += 4.4) {
    if (x > NOTCH.x0 - 2 && x < NOTCH.x1 + 2 && y > NOTCH.y0 - 2) continue;
    if (Object.values(LEAK).some(([a, b]) => Math.hypot(x - a, y - b) < 11)) continue;
    heads.push(at([x, y, MZ1]));
  }
  out.push(D(heads, { size: 0.5, tone: "lo" }));
  // bilayer on the visible cut faces: head groups as dots, tails as two short rules
  const faceRow = (pts) => {
    const top = [], bot = [], tails = [];
    for (const [x, y] of pts) {
      top.push(at([x, y, MZ1 - 2.2])); bot.push(at([x, y, MZ0 + 2.2]));
      tails.push(k.segment([x, y, MZ1 - 4.2], [x, y, (MZ0 + MZ1) / 2 + 1.4], P), k.segment([x, y, (MZ0 + MZ1) / 2 - 1.4], [x, y, MZ0 + 4.2], P));
    }
    return D(top, { size: 1.05, tone: "mid" }) + D(bot, { size: 1.05, tone: "mid" }) + L(tails.join(""), { tone: "faint", free: true });
  };
  const front = [], right = [], notchBack = [], notchSide = [];
  for (let x = MEM.x0 + 2.6; x < MEM.x1 - 1; x += 3.8) if (x < NOTCH.x0 - 1.5 || x > NOTCH.x1 + 1.5) front.push([x, MEM.y1]);
  for (let y = MEM.y0 + 2.6; y < MEM.y1 - 1; y += 3.8) right.push([MEM.x1, y]);
  for (let y = NOTCH.y0 + 2.6; y < MEM.y1 - 1; y += 3.8) notchSide.push([NOTCH.x0, y]);
  out.push(stain("myelin", faceRow(front) + faceRow(right) + faceRow(notchSide), 0.8));
  out.push(L(k.onTop(ring, MZ1, P, true), { tone: "faint" }));
  // two leak channels: a short barrel with a pore through the bilayer
  for (const [name, [x, y]] of Object.entries(LEAK)) {
    out.push(S(k.cylinder(x, y, 8, MZ1, 2.4, P, 32, 0.5), { tone: "mid" }));
    out.push(`<path class="bio-lumen" d="${k.ring(x, y, 3.2, MZ1 + 2.4, P, 24)}"/>`);
    out.push(L(k.ring(x, y, 3.2, MZ1 + 2.4, P, 24), { tone: "mid" }));
    out.push(stain(name, L(k.ring(x, y, 6, MZ1 + 2.4, P, 28), { tone: "lo" }), 0.9));
  }
  return out.join("");
}
function posts() {
  const out = [];
  const spots = [[MEM.x0 + 14, MEM.y0 + 14], [MEM.x1 - 14, MEM.y0 + 14], [MEM.x0 + 14, MEM.y1 - 12], [MEM.x1 - 14, MEM.y1 - 12]];
  for (const [x, y] of byDepth(spots, P)) {
    out.push(S(k.cylinder(x, y, 5.5, 0, 2, P, 24), { tone: "mid" }));
    out.push(S(k.cylinder(x, y, 2.4, 2, MZ0 - 4, P, 18), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(x, y, 4.4, MZ0 - 2, 2, P, 20), { tone: "mid" }));
  }
  return out.join("");
}
// the housing: back wall, two side walls (left behind the contents, right in front), and gate tracks
const hx0 = C[0] - HX, hx1 = C[0] + HX, hy0 = C[1] - HY, hy1 = C[1] + HY;
const back = S(k.slabOf({ x: hx0, y: hy0, w: 2 * HX, d: WALL, r: 1 }, GZ0, GZ1 - GZ0, P, 4, 0.5), { tone: "hi" });
const sideL = S(k.slabOf({ x: hx0, y: hy0, w: WALL, d: 2 * HY, r: 1 }, GZ0, GZ1 - GZ0, P, 4, 0.5), { tone: "hi" });
const sideR = S(k.slabOf({ x: hx1 - WALL, y: hy0, w: WALL, d: 2 * HY, r: 1 }, GZ0, GZ1 - GZ0, P, 4, 0.5), { tone: "hi" })
  + D([at([hx1 - WALL / 2, hy1 - 2.4, GZ1]), at([hx1 - WALL / 2, hy0 + 2.4, GZ1])], { size: 0.45 });
// the outer gate's rails: two rods from the housing to a bracket on the membrane, the slot the gate slides into
const BR = hx1 + 2 * HX - 2;
const rails = S(k.slabOf({ x: BR - 2, y: hy0 + 1, w: 6, d: 2 * HY - 2, r: 1 }, MZ1, GZ1 - MZ1 - 1.6, P, 4, 0.4), { tone: "mid" })
  + [hy0 + 3, hy1 - 3].map((y) => S(G.disc(0, BR + 2 - hx0, 1.4, G.frameAlong([hx0, y, GZ1 - 1.4], [1, 0, 0]), P), { tone: "mid", crease: "none" })).join("")
  + D([at([BR + 1, hy0 + 3, GZ1 - 1.6]), at([BR + 1, hy1 - 3, GZ1 - 1.6])], { size: 0.5 });
// the site pockets on the back wall: three for Na⁺, two for K⁺
const SITES = { sodium: [[-11, MZ0 + 9], [0, MZ0 + 9], [11, MZ0 + 9]], potassium: [[-6, MZ0 + 17], [6, MZ0 + 17]] };
const pockets = Object.entries(SITES).map(([n, list]) => stain(n, D(list.map(([x, z]) => at([C[0] + x, hy0 + WALL + 0.1, z])), { size: 2.6, tone: "faint" }), 0.35)).join("");
// P-domain under the housing, where ATP docks (Asp369 in the real enzyme)
const PD = [C[0] - 8, C[1] - 4, GZ0 - 12];
const pdom = S(G.sphereOf(PD, 10, P), { tone: "hi" }) + L(k.ring(PD[0] + 8, PD[1] + 6, 1.6, PD[2] + 2, P, 14), { tone: "lo" });
const NDOM = [C[0] + 12, C[1] + 2, GZ0 - 16];
const ndom = S(G.sphereOf(NDOM, 8, P), { tone: "hi" });

const svg = k.figureSvg({
  width: W, height: H,
  label: "A patch of cell membrane on four posts; the outside of the cell is above, the inside below. In a notch at its front edge sits a two-gate airlock, the sodium-potassium pump. Orange sodium ions are crowded above, violet potassium ions below. Each cycle the pump carries three sodium out and two potassium in, paid for with one ATP, while two leak channels let the ions trickle back.",
  body: [
    plinth(PLATE, P, { scale: { x: PLATE.x + 14, y: PLATE.y + PLATE.d - 14, w: 120, step: NM, every: 5 }, label: { x: PLATE.x + PLATE.w - 50, y: PLATE.y + PLATE.d - 20, w: 34 } }),
    `<g data-part="below"></g>`, posts(), ndom, pdom, `<g data-part="atp"></g>`, membrane(),
    `<g data-part="gateIn"></g>`, back, pockets, sideL, `<g data-part="inside"></g>`, sideR, rails, `<g data-part="gateOut"></g>`, `<g data-part="drug"></g>`, `<g data-part="above"></g>`,
  ],
});

const live = `
const P=${JSON.stringify(P)}; const C=${JSON.stringify(C)}; const MEM=${JSON.stringify(MEM)}; const NM=${NM}, MZ0=${MZ0}, MZ1=${MZ1}, GZ0=${GZ0}, GZ1=${GZ1}, HX=${HX}, HY=${HY}, WALL=${WALL};
const SITES=${JSON.stringify(SITES)}, LEAK=${JSON.stringify(LEAK)}, PD=${JSON.stringify(PD)}, NOTCH=${JSON.stringify(NOTCH)};
${"function rng(seed){let s=seed>>>0||1;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296);}"}
const rand=rng(1957); // Skou found the pump in 1957
const stage=document.querySelector(".iso-stage"), svg=stage.querySelector("svg"), readout=document.querySelector("[data-readout]");
const g=(n)=>svg.querySelector('[data-part="'+n+'"]');
const belowG=g("below"), aboveG=g("above"), insideG=g("inside"), gateInG=g("gateIn"), gateOutG=g("gateOut"), atpG=g("atp"), drugG=g("drug");
const at=(p)=>K.iso(p,P), S=(paths,st)=>K.solidSvg(paths,st);
const ease=(t)=>t<0?0:t>1?1:t*t*(3-2*t);
// truth: 3 Na⁺ out, 2 K⁺ in, 1 ATP per cycle (Post–Albers); ~100 cycles/s at 37 °C, shown 600× slower.
// Leaks run in proportion to each gradient; constants chosen so pump and leak balance at the drawn gradients.
const CYCLE=6, kNa=0.034, kK=0.024;
const OUTZ=[MZ1+8,MZ1+40], INZ=[8,MZ0-12];
const inRegion=(z)=>z<MZ0;
const ions=[]; // {kind, where:'out'|'in'|'site'|'move', p, path, t, dur, then}
function spawn(kind,where,n){ for(let i=0;i<n;i++){ const z=where==="out"?OUTZ[0]+rand()*(OUTZ[1]-OUTZ[0]):INZ[0]+rand()*(INZ[1]-INZ[0]); let x,y; do{ x=MEM.x0+8+rand()*(MEM.x1-MEM.x0-16); y=MEM.y0+8+rand()*(MEM.y1-MEM.y0-8); }while(where==="out"&&false); ions.push({kind,where,p:[x,y,z]}); } }
const KEY={na:"sodium",k:"potassium"};
spawn("na","out",20); spawn("na","in",5); spawn("k","in",20); spawn("k","out",5);
const count=(kind,where)=>ions.filter((i)=>i.kind===kind&&(i.where===where||(i.where==="move"&&i.dest===where))).length;
function moveIon(ion,pts,dur,dest){ ion.where="move"; ion.path=pts; ion.t=0; ion.dur=dur; ion.dest=dest; }
function nearest(kind,where,to){ let best=null,bd=1e9; for(const i of ions) if(i.kind===kind&&i.where===where){ const d=Math.hypot(i.p[0]-to[0],i.p[1]-to[1],i.p[2]-to[2]); if(d<bd){bd=d;best=i;} } return best; }
const siteP=(kind,j)=>[C[0]+SITES[KEY[kind]][j][0], C[1]-HY+WALL+3, SITES[KEY[kind]][j][1]];
const below=[C[0],C[1]+2,GZ0-6], above=[C[0],C[1]+2,GZ1+6];
let phase=0.95, cycles=0, blocked=false, drugT=0, leakNa=0, leakK=0, atpFlying=null, phos=false, waiting="";
const held={na:[],k:[]};
// one pump cycle, as phase 0..1; events fire once when phase crosses them
const EV=[[0.02,"bindNa"],[0.20,"atp"],[0.32,"releaseNa"],[0.47,"bindK"],[0.64,"pi"],[0.78,"releaseK"]];
function fire(ev){
  if(ev==="bindNa"){ for(let j=0;j<3;j++){ const ion=nearest("na","in",below); if(!ion) break; held.na.push(ion); moveIon(ion,[ion.p.slice(),[below[0]+(j-1)*8,below[1],below[2]-8],[below[0]+(j-1)*8,below[1],GZ0+4],siteP("na",j)],1.1+j*0.15,"site"); } }
  if(ev==="atp"){ atpFlying={t:0}; }
  if(ev==="releaseNa"){ held.na.forEach((ion,j)=>{ const q=[MEM.x0+12+rand()*(MEM.x1-MEM.x0-24), MEM.y0+10+rand()*(MEM.y1-MEM.y0-16), OUTZ[0]+4+rand()*20]; moveIon(ion,[ion.p.slice(),[above[0]+(j-1)*7,above[1],GZ1-4],[above[0]+(j-1)*7,above[1],GZ1+10],q],1.4+j*0.2,"out"); }); held.na=[]; }
  if(ev==="bindK"){ for(let j=0;j<2;j++){ const ion=nearest("k","out",above); if(!ion) break; held.k.push(ion); moveIon(ion,[ion.p.slice(),[above[0]+(j?6:-6),above[1],GZ1+10],[above[0]+(j?6:-6),above[1],GZ1-4],siteP("k",j)],1.2+j*0.2,"site"); } }
  if(ev==="pi"){ phos=false; }
  if(ev==="releaseK"){ held.k.forEach((ion,j)=>{ const q=[MEM.x0+12+rand()*(MEM.x1-MEM.x0-24), MEM.y0+10+rand()*(MEM.y1-MEM.y0-14), INZ[0]+4+rand()*30]; moveIon(ion,[ion.p.slice(),[below[0]+(j?6:-6),below[1],GZ0+4],[below[0]+(j?6:-6),below[1],GZ0-10],q],1.4+j*0.2,"in"); }); held.k=[]; cycles++; }
}
const gates=(ph)=>{ // 0 closed .. 1 open
  const inner= ph<0.16?1: ph<0.24?1-ease((ph-0.16)/0.08): ph<0.74?0: ph<0.8?ease((ph-0.74)/0.06):1;
  const outer= ph<0.27?0: ph<0.31?ease((ph-0.27)/0.04): ph<0.6?1: ph<0.66?1-ease((ph-0.6)/0.06):0;
  return [inner,outer]; };
function leak(kind,dt){ // a gradient-driven trickle through the leak channel
  const hi=kind==="na"?"out":"in", lo=kind==="na"?"in":"out";
  const rate=(kind==="na"?kNa:kK)*Math.max(0,count(kind,hi)-count(kind,lo));
  if(kind==="na") leakNa+=rate*dt; else leakK+=rate*dt;
  const acc=kind==="na"?leakNa:leakK; if(acc<1) return;
  if(kind==="na") leakNa-=1; else leakK-=1;
  const [x,y]=LEAK[KEY[kind]]; const ion=nearest(kind,hi,[x,y,hi==="out"?MZ1+10:MZ0-10]); if(!ion) return;
  const q=[MEM.x0+12+rand()*(MEM.x1-MEM.x0-24), MEM.y0+10+rand()*(MEM.y1-MEM.y0-14), lo==="out"?OUTZ[0]+4+rand()*20:INZ[0]+4+rand()*30];
  const a=[x,y,hi==="out"?MZ1+6:MZ0-6], b=[x,y,hi==="out"?MZ0-6:MZ1+6];
  moveIon(ion,[ion.p.slice(),a,b,q],2.2,lo);
}
function along(pts,t){ const n=pts.length-1; const s=Math.min(n-1e-6,Math.max(0,t*n)); const i=Math.floor(s), f=s-i; const e=f*f*(3-2*f); return [0,1,2].map((c)=>pts[i][c]+(pts[i+1][c]-pts[i][c])*e); }
function step(dt){
  for(const i of ions){
    if(i.where==="move"){ i.t+=dt/i.dur; i.p=along(i.path,i.t); if(i.t>=1){ i.where=i.dest; i.path=null; } continue; }
    if(i.where==="site") continue;
    const zr=i.where==="out"?OUTZ:INZ; i.p[0]+=(rand()-0.5)*16*dt; i.p[1]+=(rand()-0.5)*16*dt; i.p[2]+=(rand()-0.5)*12*dt;
    i.p[0]=Math.min(MEM.x1-6,Math.max(MEM.x0+6,i.p[0])); i.p[1]=Math.min(MEM.y1+4,Math.max(MEM.y0+6,i.p[1])); i.p[2]=Math.min(zr[1],Math.max(zr[0],i.p[2]));
  }
  leak("na",dt); leak("k",dt);
  if(atpFlying){ atpFlying.t+=dt/1.1; if(atpFlying.t>=1){ atpFlying=null; phos=true; } }
  drugT+=((blocked?1:0)-drugT)*(1-Math.exp(-dt/0.5));
  if(blocked && phase>0.5 && phase<0.56) return; // ouabain locks E2-P: the outside gate jams open, nothing more moves
  // wait for ions if the cell has none to give
  const need = phase<0.02? (count("na","in")>=3?"":"Na⁺") : (phase>0.44&&phase<0.47)? (count("k","out")>=2?"":"K⁺") : "";
  waiting=need; if(need) return;
  const before=phase; phase+=dt/CYCLE;
  for(const [p,ev] of EV){ if(before<p&&phase>=p) fire(ev); }
  if(phase>=1){ phase-=1; if(phase>=EV[0][0]) fire(EV[0][1]); }
}
function gate(z,open,cls){ // a sliding plate on two rails; slides +x into a slot beside the housing
  const dx=open*(2*HX-6); const plan={x:C[0]-HX+dx,y:C[1]-HY,w:2*HX,d:2*HY,r:2};
  let h=S(K.slabOf(plan,z,3.2,P,6,0.6),{tone:"hi",lit:true});
  h+=K.lineSvg(K.planOutline(K.insetPlan(plan,3),z+3.2,P,6),{tone:"faint"});
  return h; }
function draw(){
  const [gi,go]=gates(phase);
  gateInG.innerHTML=gate(GZ0-3.2,gi);
  gateOutG.innerHTML=gate(GZ1,go);
  const stainDots=(n,pts,size,op)=>'<g class="bio-stain" style="--stain:var(--stain-'+n+')"'+(op?' opacity="'+op+'"':'')+'>'+K.dotsSvg(pts,{size,tone:"hi"})+'</g>';
  const groups={below:[],inside:[],above:[]};
  for(const i of ions){ const z=i.p[2]; const inBox=Math.abs(i.p[0]-C[0])<HX&&Math.abs(i.p[1]-C[1])<HY+2&&z>GZ0-2&&z<GZ1+2;
    const grp= inBox?"inside": z<MZ0-1?"below": z>MZ1+1?"above": null; if(!grp) continue; groups[grp].push(i); }
  const paint=(list)=>{ list.sort((a,b)=>K.depthOf(a.p,P)-K.depthOf(b.p,P)); return stainDots("sodium",list.filter((i)=>i.kind==="na").map((i)=>at(i.p)),2.3)+stainDots("potassium",list.filter((i)=>i.kind==="k").map((i)=>at(i.p)),3.0); };
  belowG.innerHTML=paint(groups.below); insideG.innerHTML=paint(groups.inside); aboveG.innerHTML=paint(groups.above);
  // ATP flies in from the cytoplasm to the P-domain; the phosphate sits there until E2
  let a="";
  if(atpFlying){ const t=atpFlying.t; const q=along([[PD[0]-40,PD[1]+30,8],[PD[0]-14,PD[1]+10,PD[2]-8],[PD[0]+6,PD[1]+8,PD[2]+1]],t); a+=stainDots("atp",[at(q)],2.4); a+=stainDots("atp",[at([q[0]+3,q[1],q[2]]),at([q[0]+5.5,q[1],q[2]]),at([q[0]+8,q[1],q[2]])],1.1); }
  if(phos) a+=stainDots("atp",[at([PD[0]+6,PD[1]+8,PD[2]+1.5])],1.6);
  atpG.innerHTML=a;
  // ouabain: a small sugar-steroid wedge in the open outside gate
  if(drugT>0.02){ const c=[C[0]-6,C[1],GZ1+9-4*drugT]; drugG.innerHTML='<g opacity="'+drugT.toFixed(2)+'">'+K.solidSvg(G.sphereOf(c,4.5,P),{tone:"hi"})+K.solidSvg(G.sphereOf([c[0]+7,c[1]+1,c[2]+2],3.4,P),{tone:"hi"})+'</g>'; } else drugG.innerHTML="";
}
const stateName=()=>{ if(blocked&&phase>0.5&&phase<0.56) return "ouabain-jammed";
  if(waiting) return "waiting for "+waiting;
  return phase<0.18?"E1 · 3 Na⁺ bind": phase<0.3?"E1-P · ATP spent": phase<0.46?"E2-P · Na⁺ out": phase<0.62?"E2-P · 2 K⁺ bind": phase<0.76?"E2 · Pi off":"E1 · K⁺ in"; };
function say(){ vitaSay(stage,readout,stateName()+" · in/out Na⁺ "+count("na","in")+"/"+count("na","out")+" K⁺ "+count("k","in")+"/"+count("k","out")); }
let tourBlock=0;
vitaLoop({ stage, idleMs:9000,
  frame(dt,st){ if(st.touring){ tourBlock+=dt; if(tourBlock>(blocked?26:40)){ tourBlock=0; blocked=!blocked; } }
    if(dt>0) step(dt); draw(); say(); },
  click(){ blocked=!blocked; tourBlock=0; },
  keys(key){ if(key===" "||key==="Enter"||key==="o"||key==="O"){ blocked=!blocked; tourBlock=0; return true; } return false; },
});
`;
const body = k.plateHtml({
  fig: "Fig 07", title: "Na⁺/K⁺ pump", hint: "Click · ouabain",
  readout: "E1 · 3 Na⁺ bind inside", keys: [{ mark: "lit", label: "The two gates, never both open" }, { mark: "sodium", label: "Na⁺" }, { mark: "potassium", label: "K⁺" }, { mark: "atp", label: "ATP and its phosphate" }],
  caption: "The outside of the cell is above the membrane, the cytoplasm below (ruler: 1 tick = 1 nm). Every cycle the pump takes 3 Na⁺ from inside, spends one ATP to lock them in, opens outward and lets them go, takes 2 K⁺ from outside, drops the phosphate, and opens inward again: one net charge leaves per cycle. Two leak channels let ions run back down their gradients at a rate set by the gradient; with the pump running the two balance. Click to add ouabain, the plant toxin that jams the pump in its outward-open state: the leaks win and the gradients fade. A real pump turns over about 100 times a second; shown 600× slower, with a dozen ions standing for millions.",
  body: `<div class="iso-stage" tabindex="0" role="button" aria-label="Sodium-potassium pump: Space toggles ouabain">${svg}</div>`,
});
const page = vitaPage({ n: "07", title: "Na⁺/K⁺ pump", zh: "钠钾泵 · 双门气闸", en: "Na⁺/K⁺ pump · two-door airlock", body, script: liveScript() + LOOP_SRC + live,
  facts: [["3 : 2", "Na⁺ 出 : K⁺ 进 / 每个 ATP", "Na⁺ out : K⁺ in per ATP"], ["~100 /s", "37 °C 周转率", "turnover at 37 °C"], ["145 / 12 mM", "Na⁺ 胞外 / 胞内", "Na⁺ outside / inside"], ["4 / 140 mM", "K⁺ 胞外 / 胞内", "K⁺ outside / inside"], ["~20–40%", "静息时细胞 ATP 用在这里（神经元更多）", "of a resting cell's ATP spent here (more in neurons)"], ["1957", "Skou 发现（1997 诺奖）", "discovered by Skou (Nobel 1997)"]] });
writeFileSync(join(OUT, "07-na-k-pump.html"), page);
console.log("wrote 07-na-k-pump.html", (page.length / 1024).toFixed(0) + " KB");
