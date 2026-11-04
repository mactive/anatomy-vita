// 02 · ATP synthase — a patch of inner mitochondrial membrane on four posts, with one rotary motor in a cut notch.
// What moves: the rotor (c-ring + γ stalk). Protons from the intermembrane space below ride the c-ring once round
// and leave into the matrix; every 120° of γ forces one β subunit to release an ATP. Below ~140 mV it runs backwards.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, liveScript, LOOP_SRC, RNG_SRC, plinth, stain, vitaPage, byDepth } from "../../bio/bio.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../site/demos");
const W = 720, H = 460;
const NM = 8; // 1 nm = 8 units
const MZ0 = 42, MZ1 = MZ0 + 4 * NM; // a 4 nm bilayer
const PLATE = { x: -112, y: -66, w: 230, d: 132, r: 8 };
const MEM = { x0: -92, x1: 100, y0: -50, y1: 40 };
const C = [14, MEM.y1]; // rotor axis sits on the cut edge
const RN = 31; // notch radius
const CR = 2.75 * NM, CSUB = 0.72 * NM, NC = 8; // bovine c8 ring
const RING0 = MZ0 - 4, RING1 = MZ1 + 7;
const F1Z = RING1 + 4 + 4.2 * NM + 2.2 * NM, LOBE_R = 1.9 * NM, LOBE_H = 4.4 * NM, LOBE_RING = 2.9 * NM;
const A_ANG = Math.PI; // the a subunit sits on the −x side
const AS = [C[0] - 40, C[1] - 6];
const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [C[0], C[1], F1Z + LOBE_H / 2 + 14], [MEM.x0, MEM.y0, MZ1]], W, H, { pad: 26, azimuth: 50 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);

// the membrane: a concave slab, bilayer on every cut face (head groups as dots, tails as short rules)
const notch = Array.from({ length: 25 }, (_, i) => { const t = (i / 24) * Math.PI; return [C[0] + RN * Math.cos(t), MEM.y1 - RN * Math.sin(t)]; });
const memRing = [[MEM.x0, MEM.y0], [MEM.x1, MEM.y0], [MEM.x1, MEM.y1], ...notch, [MEM.x0, MEM.y1]];
function membrane() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: MEM.x0, y: MEM.y0, w: MEM.x1 - MEM.x0, d: MEM.y1 - MEM.y0, r: 2 }, MZ0, 2, P)}" style="opacity:.18"/>`);
  out.push(stain("myelin", S(k.extrude(memRing, MZ0, MZ1 - MZ0, P, { convex: false }), { tone: "mid" }), 0.55));
  // head groups on top, a dense grid
  const heads = [];
  for (let x = MEM.x0 + 3; x < MEM.x1 - 1; x += 4.2) for (let y = MEM.y0 + 3; y < MEM.y1 - 1; y += 4.2) {
    if (Math.hypot(x - C[0], y - MEM.y1) < RN + 3) continue;
    if (x > AS[0] - 14 && x < AS[0] + 14 && y > AS[1] - 14 && y < AS[1] + 14) continue;
    heads.push(at([x, y, MZ1]));
  }
  out.push(D(heads, { size: 0.55, tone: "lo" }));
  // the cut faces that face the viewer: front edge (y1), right edge (x1) and the far wall of the notch
  const faceRow = (pts) => {
    const top = [], bot = [], tails = [];
    for (const [x, y] of pts) {
      top.push(at([x, y, MZ1 - 2.2])); bot.push(at([x, y, MZ0 + 2.2]));
      tails.push(k.segment([x, y, MZ1 - 4], [x, y, (MZ0 + MZ1) / 2 + 1.5], P), k.segment([x, y, (MZ0 + MZ1) / 2 - 1.5], [x, y, MZ0 + 4], P));
    }
    return D(top, { size: 1.1, tone: "mid" }) + D(bot, { size: 1.1, tone: "mid" }) + L(tails.join(""), { tone: "faint", free: true });
  };
  const front = [], right = [], wall = [];
  for (let x = MEM.x0 + 2.4; x < MEM.x1 - 1; x += 3.6) if (Math.abs(x - C[0]) > RN + 1.5) front.push([x, MEM.y1]);
  for (let y = MEM.y0 + 2.4; y < MEM.y1 - 1; y += 3.6) right.push([MEM.x1, y]);
  for (let i = 1; i < 34; i++) { const t = (i / 34) * Math.PI; wall.push([C[0] + RN * Math.cos(t), MEM.y1 - RN * Math.sin(t)]); }
  const vis = wall.filter(([x, y]) => { const n = [C[0] - x, MEM.y1 - y]; const v = k.towardViewer(P); return n[0] * v[0] + n[1] * v[1] > 0.05; });
  out.push(stain("myelin", faceRow(front) + faceRow(right) + faceRow(vis), 0.8));
  out.push(L(k.onTop(memRing, MZ1, P, true), { tone: "faint" }));
  return out.join("");
}
function posts() {
  const out = [];
  const spots = [[MEM.x0 + 12, MEM.y0 + 12], [MEM.x1 - 12, MEM.y0 + 12], [MEM.x0 + 12, MEM.y1 - 12], [MEM.x1 - 12, MEM.y1 - 12]];
  for (const [x, y] of byDepth(spots, P)) {
    out.push(S(k.cylinder(x, y, 5.5, 0, 2, P, 24), { tone: "mid" }));
    out.push(S(k.cylinder(x, y, 2.6, 2, MZ0 - 4, P, 18), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(x, y, 4.6, MZ0 - 2, 2, P, 20), { tone: "mid" }));
  }
  return out.join("");
}
function aSubunit() {
  const plan = { x: AS[0] - 10, y: AS[1] - 11, w: 20, d: 22, r: 6 };
  return S(k.slabOf(plan, MZ1 - 2, 6, P, 8, 0.6), { tone: "mid" }) + L(k.planOutline(k.insetPlan(plan, 3), MZ1 + 4, P, 8), { tone: "faint" });
}
// the stator: α3β3 head, the b stalk and its cap
const lobe = (ang) => { const c = [C[0] + LOBE_RING * Math.cos(ang), C[1] + LOBE_RING * Math.sin(ang), F1Z]; return c; };
function lobePaths(c, beta) {
  const F = G.frameAlong([c[0], c[1], c[2] - LOBE_H / 2], [0, 0, 1]);
  const prof = []; const n = 14;
  for (let i = 0; i <= n; i++) { const s = (i / n) * LOBE_H; const u = (s / LOBE_H) * 2 - 1; prof.push([s, Math.max(0.01, LOBE_R * Math.sqrt(Math.max(0, 1 - u ** 4 * (beta ? 0.92 : 0.86)))), 1]); }
  return S(G.solidOf(prof, F, P, { smooth: true }), { tone: "hi" });
}
const lobes = Array.from({ length: 6 }, (_, j) => ({ j, ang: (j / 6) * Math.PI * 2 + Math.PI / 6, beta: j % 2 === 1 }));
lobes.forEach((l) => { l.c = lobe(l.ang); l.d = k.depthOf(l.c, P); l.svg = l.beta ? lobePaths(l.c, true) : stain("gfp", lobePaths(l.c, false), 0.5); });
const CD = k.depthOf([C[0], C[1], F1Z], P);
const backLobes = lobes.filter((l) => l.d < CD).sort((a, b) => a.d - b.d);
const frontLobes = lobes.filter((l) => l.d >= CD).sort((a, b) => a.d - b.d);
const TOPZ = F1Z + LOBE_H / 2;
const capC = [C[0], C[1], TOPZ + 5];
const stalkPts = G.fillet([[AS[0], AS[1], MZ1 + 4], [AS[0] - 4, AS[1], F1Z - 6], [AS[0] - 4, AS[1], TOPZ + 2], [capC[0] - 9, capC[1], TOPZ + 5]], 9, 7, { P, tube: 2.6 });
const stalk = G.resample(stalkPts, 1.5);
const { tubePieces, tubeSvg } = await import("../../kit/tube.mjs");
const stalkSvg = tubePieces(stalk, 2.6, P, { maxLength: 400 }).map((p) => tubeSvg(p, { tone: "hi" })).join("");
const cap = S(G.sphereOf(capC, 9, P), { tone: "hi" });
const betaSites = lobes.filter((l) => l.beta).map((l) => ({ j: l.j, c: l.c, ang: l.ang, d: l.d }));

const svg = k.figureSvg({
  width: W, height: H, label: "A patch of inner mitochondrial membrane on four posts with an ATP synthase in a notch cut at its front edge. Protons from the space below ride the eight-subunit c-ring round and leave above; the ring turns the central γ stalk inside a head of six lobes, and every third of a turn one catalytic lobe releases an ATP.",
  body: [plinth(PLATE, P, { scale: { x: -98, y: PLATE.y + PLATE.d - 15, w: 160, step: NM, every: 5 }, label: { x: 72, y: PLATE.y + PLATE.d - 20, w: 34 } }), `<g data-part="below"></g>`, posts(), membrane(), aSubunit(), `<g data-part="rotor"></g>`, backLobes.map((l) => l.svg).join(""), `<g data-part="gamma"></g>`, stalkSvg, frontLobes.map((l) => l.svg).join(""), cap, `<g data-part="above"></g>`],
});

const live = `
const P=${JSON.stringify(P)}; const C=${JSON.stringify(C)}; const NM=${NM}, MZ0=${MZ0}, MZ1=${MZ1}, CR=${CR}, CSUB=${CSUB}, NC=${NC}, RING0=${RING0}, RING1=${RING1}, F1Z=${F1Z}, LOBE_H=${LOBE_H}, LOBE_R=${LOBE_R};
const MEM=${JSON.stringify(MEM)}; const BETA=${JSON.stringify(betaSites)}; const A_ANG=${A_ANG};
${RNG_SRC}
const rand = rng(1961);
const stage=document.querySelector(".iso-stage"), svg=stage.querySelector("svg"), readout=document.querySelector("[data-readout]");
const rotorG=svg.querySelector('[data-part="rotor"]'), gammaG=svg.querySelector('[data-part="gamma"]'), belowG=svg.querySelector('[data-part="below"]'), aboveG=svg.querySelector('[data-part="above"]');
const V=G.viewOf(P), at=(p)=>K.iso(p,P);
// truth: c8 ring → 8 H+ per turn, 3 ATP per turn. ΔG(ATP) ≈ 52 kJ/mol ≈ 0.54 eV; with ~3.7 H+ per ATP (incl. phosphate import) the motor stalls near 145 mV
const STALL=145, VMAX=45, SLOW=1/120;
const rpsOf=(dp)=>VMAX*Math.tanh((dp-STALL)/45);
let dp=190, dpTarget=190, phi=0, clock=0;
const carry=Array.from({length:NC},(_,j)=>j%2===0);
const prevAng=Array.from({length:NC},()=>null);
const free=[]; // released protons and ATPs: {p, v, life, kind}
const cloud=Array.from({length:40},()=>[MEM.x0+8+rand()*(MEM.x1-MEM.x0-16), MEM.y0+8+rand()*(MEM.y1-MEM.y0-10), 8+rand()*(MZ0-14)]);
const TAU=Math.PI*2, wrap=(a)=>((a%TAU)+TAU)%TAU;
const EXIT=wrap(A_ANG-0.75);
let made=0, betaPhase=0;
function drawRotor(){
  const items=[];
  for(let j=0;j<NC;j++){
    const a=phi+j*TAU/NC; const c=[C[0]+CR*Math.cos(a), C[1]+CR*Math.sin(a)];
    let html=K.solidSvg(K.cylinder(c[0],c[1],CSUB,RING0,RING1-RING0,P,22,0.4),{tone:"hi"})+K.lineSvg(K.sideArc(c[0],c[1],CSUB,(MZ0+MZ1)/2,P,10),{tone:"faint"});
    if(carry[j]){ const q=[C[0]+(CR+CSUB+1.2)*Math.cos(a), C[1]+(CR+CSUB+1.2)*Math.sin(a),(MZ0+MZ1)/2]; if(G.dot3([Math.cos(a),Math.sin(a),0],V)>-0.2) html+='<g class="bio-stain" style="--stain:var(--stain-rfp)">'+K.dotsSvg([at(q)],{size:1.6,tone:"hi"})+'</g>'; }
    items.push([K.depthOf([c[0],c[1],RING1],P),html]);
  }
  items.sort((a,b)=>a[0]-b[0]);
  // the ε foot that the ring turns, with one mark so the turn reads
  const foot=K.solidSvg(K.cylinder(C[0],C[1],CR-2,RING1,4,P,48,0.6),{tone:"hi",lit:true});
  const mark=K.lineSvg(K.lineOnTop([C[0],C[1]],[C[0]+(CR-5)*Math.cos(phi),C[1]+(CR-5)*Math.sin(phi)],RING1+4,P),{tone:"mid",free:"end"});
  rotorG.innerHTML=items.map((x)=>x[1]).join("")+foot+mark;
  // γ: a bent coiled-coil; drawn as a rod with an eccentric cam inside the head, so its turn shows
  const g0=[C[0],C[1],RING1+4], cam=[C[0]+5*Math.cos(phi),C[1]+5*Math.sin(phi),F1Z-6];
  const pts=G.resample([g0,[C[0],C[1],RING1+14],cam,[C[0]+2*Math.cos(phi),C[1]+2*Math.sin(phi),F1Z+LOBE_H*0.35]],1.2);
  gammaG.innerHTML=T.tubePieces(pts,3.4,P,{maxLength:400}).map((p)=>T.tubeSvg(p,{tone:"lit"})).join("");
}
function drawBelow(dt){
  for(const p of cloud){ p[0]+=(rand()-0.5)*14*dt; p[1]+=(rand()-0.5)*14*dt; p[2]+=(rand()-0.5)*10*dt; p[0]=Math.min(MEM.x1-6,Math.max(MEM.x0+6,p[0])); p[1]=Math.min(MEM.y1+8,Math.max(MEM.y0+6,p[1])); p[2]=Math.min(MZ0-5,Math.max(5,p[2])); }
  const n=Math.round(14+32*Math.min(1,Math.max(0,(dp-80)/160)));
  belowG.innerHTML='<g class="bio-stain" style="--stain:var(--stain-rfp)">'+K.dotsSvg(cloud.slice(0,n).sort((a,b)=>K.depthOf(a,P)-K.depthOf(b,P)).map(at),{size:1.5,tone:"mid"})+'</g>';
}
function drawAbove(dt){
  let html="";
  for(let i=free.length-1;i>=0;i--){ const f=free[i]; f.life-=dt; f.p=G.add3(f.p,G.mul3(f.v,dt)); if(f.life<=0){free.splice(i,1);continue;} }
  const hs=free.filter((f)=>f.kind==="h"), as=free.filter((f)=>f.kind==="atp");
  html+='<g class="bio-stain" style="--stain:var(--stain-rfp)" fill="var(--stain-rfp)">'+hs.map((f)=>'<circle cx="'+at(f.p)[0].toFixed(1)+'" cy="'+at(f.p)[1].toFixed(1)+'" r="1.5" fill-opacity="'+Math.min(1,f.life).toFixed(2)+'"/>').join("")+'</g>';
  html+='<g class="bio-stain" style="--stain:var(--stain-atp)" fill="var(--stain-atp)">'+as.map((f)=>{const s=at(f.p);const o=Math.min(1,f.life/1.2).toFixed(2);return '<g opacity="'+o+'"><circle cx="'+s[0].toFixed(1)+'" cy="'+s[1].toFixed(1)+'" r="2.6"/><circle cx="'+(s[0]+4.2).toFixed(1)+'" cy="'+(s[1]-0.6).toFixed(1)+'" r="1.3"/><circle cx="'+(s[0]+6.8).toFixed(1)+'" cy="'+(s[1]-1).toFixed(1)+'" r="1.3"/><circle cx="'+(s[0]+9.4).toFixed(1)+'" cy="'+(s[1]-1.4).toFixed(1)+'" r="1.3"/></g>';}).join("")+'</g>';
  // the β subunit in its tight state holds a bound nucleotide on its face
  for(const b of BETA){ const st=Math.floor(wrap(phi-b.ang+0.3)/(TAU/3)); if(st===2&&G.dot3([Math.cos(b.ang),Math.sin(b.ang),0],V)>0){ const q=[C[0]+(Math.hypot(b.c[0]-C[0],b.c[1]-C[1])+LOBE_R+0.5)*Math.cos(b.ang),C[1]+(Math.hypot(b.c[0]-C[0],b.c[1]-C[1])+LOBE_R+0.5)*Math.sin(b.ang),F1Z+2]; html+='<g class="bio-stain" style="--stain:var(--stain-atp)">'+K.dotsSvg([at(q)],{size:2.1,tone:"hi"})+'</g>'; } }
  aboveG.innerHTML=html;
}
function step(dt){
  const rps=rpsOf(dp); const dphi=rps*TAU*dt*SLOW; const before=phi; phi+=dphi;
  for(let j=0;j<NC;j++){ const a0=wrap(before+j*TAU/NC), a1=wrap(phi+j*TAU/NC);
    const crossed=(t)=> dphi>0 ? (a0<t&&a1>=t)||(a0>a1&&(a0<t||a1>=t)) : (a0>t&&a1<=t)||(a0<a1&&(a0>t||a1<=t));
    if(dphi>0){ if(crossed(A_ANG)) carry[j]=true; if(crossed(EXIT)&&carry[j]){carry[j]=false; const a=a1; free.push({kind:"h",p:[C[0]+(CR+CSUB)*Math.cos(a),C[1]+(CR+CSUB)*Math.sin(a),MZ1+2],v:[(rand()-0.5)*6,(rand()-0.5)*6,9],life:2.2});} }
    else if(dphi<0){ if(crossed(EXIT)) carry[j]=true; if(crossed(A_ANG)&&carry[j]){carry[j]=false; const a=a1; free.push({kind:"h",p:[C[0]+(CR+CSUB)*Math.cos(a),C[1]+(CR+CSUB)*Math.sin(a),MZ0-2],v:[(rand()-0.5)*6,(rand()-0.5)*6,-8],life:2});} } }
  const third=Math.floor(phi/(TAU/3)), prev=Math.floor(before/(TAU/3));
  if(third!==prev){ const b=BETA[((third%3)+3)%3]; if(dphi>0){ made++; free.push({kind:"atp",p:[b.c[0]+(b.c[0]-C[0])*0.5,b.c[1]+(b.c[1]-C[1])*0.5,F1Z+4],v:[(b.c[0]-C[0])*0.35,(b.c[1]-C[1])*0.35,7],life:3}); } else { made--; } }
}
function say(){ const rps=rpsOf(dp); const mode=rps>=0?"ATP made":"ATP burned, H⁺ pumped"; const text="Δp "+Math.round(dp)+" mV · "+Math.abs(rps).toFixed(0)+" rev/s · "+Math.abs(rps*3).toFixed(0)+" "+mode+"/s";
  vitaSay(stage,readout,text); stage.setAttribute("aria-valuenow",String(Math.round(dp))); }
vitaLoop({ stage, idleMs:4500,
  frame(dt,st){ if(st.touring){ clock+=dt; dpTarget=172+58*Math.sin(clock*TAU/36); }
    dp=st.still? dpTarget : dp+(dpTarget-dp)*(1-Math.exp(-dt/0.4));
    if(!st.still) step(dt);
    drawRotor(); drawBelow(st.still?0:dt); drawAbove(dt); say(); },
  pointer(x){ dpTarget=80+x*160; },
  keys(key){ if(key==="ArrowRight"||key==="ArrowUp"){ dpTarget=Math.min(240,dpTarget+10); return true; } if(key==="ArrowLeft"||key==="ArrowDown"){ dpTarget=Math.max(80,dpTarget-10); return true; } return false; },
  resume(){ clock=Math.asin(Math.max(-1,Math.min(1,(dp-172)/58)))*36/TAU; },
});
`;
const body = k.plateHtml({
  fig: "Fig 02", title: "ATP synthase", hint: "Hover ↔ proton-motive force",
  readout: "Δp 190 mV", keys: [{ mark: "lit", label: "Rotor: c-ring foot and γ stalk" }, { mark: "red", label: "Protons (H⁺)" }, { mark: "dotted", label: "ATP released from the head" }],
  caption: "Bovine ATP synthase at true scale (ruler: 1 tick = 1 nm). Eight c-subunits form the rotor ring, so one turn carries 8 protons from the intermembrane space below to the matrix above, and the three catalytic β lobes each release one ATP per turn: 8/3 ≈ 2.7 H⁺ per ATP. Above about 145 mV it makes ~100 ATP a second; lower the force and the same motor runs backwards, burning ATP to pump protons. Motion shown 120× slower.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="ATP synthase: arrow keys change the proton-motive force" aria-valuemin="80" aria-valuemax="240" aria-valuenow="190">${svg}</div>`,
});
const page = vitaPage({ n: "02", title: "ATP synthase", zh: "ATP 合酶 · 分子马达", en: "ATP synthase · molecular motor", body, script: liveScript() + LOOP_SRC + live,
  facts: [["8 H⁺", "每转（牛 c8 环）", "per turn (bovine c8 ring)"], ["3 ATP", "每转", "per turn"], ["~100 /s", "每个酶的 ATP 产率", "ATP per enzyme"], ["~145 mV", "停转/反转阈值", "stall / reversal threshold"], ["~65 kg", "人每天周转的 ATP", "ATP a human turns over daily"]] });
writeFileSync(join(OUT, "02-atp-synthase.html"), page);
console.log("wrote 02-atp-synthase.html", (page.length / 1024).toFixed(0) + " KB");
