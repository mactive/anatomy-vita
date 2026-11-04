// 06 · Kinesin — a microtubule laid across two cradles like a rail, a two-headed motor walking its top protofilament,
// and a force clamp (a carriage with a spring) holding a constant load against it.
// What moves: the heads, hand over hand, 8 nm a step; each step burns one ATP. The load slows it and stalls it near 6 pN.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, liveScript, LOOP_SRC, plinth, stain, vitaPage, byDepth, scene } from "../../bio/bio.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../site/demos");
const W = 720, H = 470;
const U = 2.5; // 1 nm = 2.5 units
const RMT = 12.5 * U, LUMEN = 7.5 * U; // 25 nm microtubule, 15 nm lumen
const ZM = 74; // microtubule axis height
const MT0 = -150, MT1 = 110; // ends of the cut microtubule (104 nm)
const DIMER = 8 * U; // one αβ-tubulin dimer, one kinesin step
const TOP = ZM + RMT; // the walked protofilament
const RAIL_Y = 74, RAIL_Z = 6;
const PLATE = { x: -200, y: -46, w: 340, d: 146, r: 10 };
const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [-120, 0, 230], [-60, 0, 220], [-180, RAIL_Y, 210], [MT1, 0, ZM + RMT]], W, H, { pad: 18, azimuth: 40 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const FX = G.frameAlong([MT0, 0, ZM], [1, 0, 0]); // u = +y, v = +z

// ---------- static: rail for the clamp, cradles, the microtubule ----------
function rail() {
  const out = [];
  const ends = [PLATE.x + 18, PLATE.x + PLATE.w - 18];
  for (const x of ends) out.push(S(k.slabOf({ x: x - 7, y: RAIL_Y - 14, w: 14, d: 28, r: 2 }, 0, RAIL_Z + 7, P, 6, 0.6), { tone: "mid" }));
  for (const dy of [-8, 8]) {
    const F = G.frameAlong([ends[0] + 7, RAIL_Y + dy, RAIL_Z + 2], [1, 0, 0]);
    out.push(S(G.disc(0, ends[1] - ends[0] - 14, 2.4, F, P), { tone: "mid", crease: "none" }));
  }
  for (const x of ends) out.push(D([at([x - 3.5, RAIL_Y - 9, RAIL_Z + 7]), at([x + 3.5, RAIL_Y + 9, RAIL_Z + 7])], { size: 0.45 }));
  // a ruler strip along the rail, ticks every 10 nm
  const strip = { x: ends[0] + 12, y: RAIL_Y + 16, w: ends[1] - ends[0] - 24, d: 6, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 2, strip.x + strip.w - 2, 2 * U, 5, strip.y + 0.6, 0.6, [1.6, 3.4], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}
function cradles() {
  const out = [];
  for (const x of [MT0 + 34, MT1 - 34]) {
    out.push(S(k.cylinder(x, 0, 9, 0, 2.4, P, 28, 0.4), { tone: "mid" }));
    out.push(S(k.cylinder(x, 0, 3.2, 2.4, ZM - RMT - 12, P, 20), { tone: "mid", crease: "none" }));
    const plan = { x: x - 7, y: -RMT * 0.8, w: 14, d: RMT * 1.6, r: 2 };
    out.push(S(k.slabOf(plan, ZM - RMT - 10, 9.6, P, 6, 0.8), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(plan, 2.4), ZM - RMT - 0.4, P, 6), { tone: "faint" }));
    out.push(D(k.corners(k.insetPlan(plan, 1.6)).map(([a, b]) => at([a, b, ZM - RMT - 0.4])), { size: 0.4 }));
  }
  return out.join("");
}
function microtubule() {
  const len = MT1 - MT0;
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: MT0, y: -RMT, w: len, d: 2 * RMT, r: RMT }, 0, 1, P)}" style="opacity:.25"/>`);
  out.push(stain("trna", S(G.disc(0, len, RMT, FX, P), { tone: "hi" }) , 0.28));
  // 13 protofilaments, one of them exactly on top (angle π/2)
  out.push(stain("trna", L(G.ribsOf(FX, 0.6, len - 0.6, RMT, 13, P, { phase: Math.PI / 2, least: 0.05 }), { tone: "lo" }), 0.6));
  // dimer seams every 8 nm, the α/β boundary between them fainter
  const seams = [], halves = [];
  for (let s = DIMER; s < len - 1; s += DIMER / 2) (Math.round(s / (DIMER / 2)) % 2 ? halves : seams).push(G.arcOf(FX, s, RMT, P));
  out.push(L(halves.join(""), { tone: "faint" }), L(seams.join(""), { tone: "lo" }));
  // the open end: lumen and the 13 protofilament sections
  out.push(`<path class="bio-lumen" d="${G.circleOf(FX, len, LUMEN, P)}"/>`);
  out.push(L(G.circleOf(FX, len, LUMEN, P), { tone: "mid" }));
  out.push(stain("trna", D(G.dotsOf(FX, len, (RMT + LUMEN) / 2, 13, P, { all: true, phase: Math.PI / 2 }), { size: 1.4, tone: "mid" }), 0.8));
  // the walked protofilament: binding sites as tiny dots on the top line
  const sites = [];
  for (let s = DIMER / 4; s < len; s += DIMER) sites.push(at([MT0 + s, 0, TOP + 0.3]));
  out.push(D(sites, { size: 0.42, tone: "hi" }));
  return out.join("");
}

const svg = k.figureSvg({
  width: W, height: H,
  label: "A cut microtubule rests on two cradles above a bench. A kinesin motor with two heads walks along its top protofilament, carrying a vesicle on a long stalk. Behind it a carriage on a rail holds a spring hooked to the vesicle, keeping a constant backward load. Each 8 nm step the trailing head swings past the bound head and one ATP is spent.",
  body: [
    plinth(PLATE, P, { label: { x: PLATE.x + PLATE.w - 52, y: PLATE.y + PLATE.d - 20, w: 36 } }),
    cradles(), microtubule(), `<g data-part="motor"></g>`, rail(), `<g data-part="clamp"></g>`,
  ],
});

const live = `
const P=${JSON.stringify(P)}; const U=${U}, ZM=${ZM}, RMT=${RMT}, TOP=${TOP}, MT0=${MT0}, MT1=${MT1}, DIMER=${DIMER}, RAIL_Y=${RAIL_Y}, RAIL_Z=${RAIL_Z};
const stage=document.querySelector(".iso-stage"), svg=stage.querySelector("svg"), readout=document.querySelector("[data-readout]");
const clampG=svg.querySelector('[data-part="clamp"]'), motorG=svg.querySelector('[data-part="motor"]');
const at=(p)=>K.iso(p,P), S=(paths,st)=>K.solidSvg(paths,st), L=(d,st)=>K.lineSvg(d,st);
const stainG=(n,h,a)=>'<g class="bio-stain" style="--stain:var(--stain-'+n+');--stain-k:'+(a??1)+'">'+h+'</g>';
// truth (kinesin-1, saturating ATP; Visscher, Schnitzer & Block 1999): 8 nm per step, one ATP per step,
// ~800 nm/s unloaded, stalls near 6 pN, steps backwards slowly above stall. ATP gives ~100 pN·nm under cell conditions.
const V0=800, FS=6.2, STEP=8, EATP=100, SLOW=60;
const vOf=(F)=>F<FS? V0*(1-Math.pow(F/FS,1.4)) : -12*(F-FS);
const START=MT0+DIMER*3.25, END=MT1-DIMER*2.75;
let F=1.5, Ft=1.5, site=START, phase=0, dir=1, made=0, fade=1, lean=0;
const HEAD_L=7*U/2, HEAD_R=2.3*U, HEAD_Z=TOP+HEAD_R*0.95;
function headSvg(c, lit){ const Fh=G.frameAlong([c[0]-HEAD_L,c[1],c[2]],[1,0,0]); const prof=[]; for(let i=0;i<=12;i++){ const s=i/12*2*HEAD_L; const u=s/HEAD_L-1; prof.push([s,Math.max(0.01,HEAD_R*Math.sqrt(Math.max(0,1-u*u))),1]); } return S(G.solidOf(prof,Fh,P,{smooth:true}),{tone:"hi",lit}); }
const ease=(t)=>t<0?0:t>1?1:t*t*(3-2*t);
function draw(){
  // heads: A stays bound at site+dir*DIMER/2 ; B swings from site-dir*DIMER/2 to site+dir*1.5*DIMER
  const a=[site+dir*DIMER/2,0,HEAD_Z];
  const sw=ease((phase-0.35)/0.45);
  const bx=site-dir*DIMER/2+dir*2*DIMER*sw, lift=Math.sin(Math.PI*sw)*13, side=Math.sin(Math.PI*sw)*7;
  const b=[bx,side,HEAD_Z+lift];
  const neck=[(a[0]*0.62+b[0]*0.38),side*0.35,TOP+6.5*U+lift*0.25];
  // stalk: leans back with the load; the cargo hangs off its end
  const ang=0.42+lean*0.62, SL=58*U*0.62; // coiled coil, foreshortened by the lean (true length ~60 nm)
  const k1=[neck[0]-Math.sin(ang*0.5)*SL*0.35,0,neck[2]+Math.cos(ang*0.5)*SL*0.35];
  const top=[k1[0]-Math.sin(ang)*SL*0.65,0,k1[2]+Math.cos(ang)*SL*0.65];
  const CR=15*U; const cargo=[top[0]-Math.sin(ang)*CR*0.96,0,top[2]+Math.cos(ang)*CR*0.96];
  const sc={items:[],put(d,h){this.items.push([d,h]);}};
  const tube=(pts,r,st,wrap)=>{ for(const p of T.tubePieces(G.resample(pts,1.2),r,P,{maxLength:10})) sc.put(K.depthOf(p.mid,P),(wrap||((h)=>h))(T.tubeSvg(p,st))); };
  // neck linkers from each head, then the coiled coil
  tube(G.fillet([[a[0],a[1],a[2]+HEAD_R*0.6],[a[0]-dir*2,a[1],a[2]+HEAD_R+4],neck],4,6),1.25,{tone:"lit"});
  tube(G.fillet([[b[0],b[1],b[2]+HEAD_R*0.6],[b[0]+dir*1,b[1],b[2]+HEAD_R+4],neck],4,6),1.25,{tone:"lit"});
  tube(G.fillet([neck,k1,top],12,6),1.6,{tone:"mid"});
  sc.put(K.depthOf(a,P)-0.01,headSvg(a,false));
  sc.put(K.depthOf(b,P)+(lift>2?2:0),headSvg(b,false));
  // ATP on the bound head while it waits, ADP+Pi leaving the swinging one
  let extra="";
  if(phase>0.08&&phase<0.6) extra+=stainG("atp",K.dotsSvg([at([a[0]+dir*2,a[1]+HEAD_R+0.6,a[2]+HEAD_R*0.8])],{size:2.3,tone:"hi"}));
  if(phase>0.6){ const t=(phase-0.6)/0.4; const q=[b[0]-dir*3,b[1]+HEAD_R+2+t*10,b[2]+HEAD_R+t*14]; extra+='<g opacity="'+(1-t).toFixed(2)+'">'+stainG("atp",K.dotsSvg([at(q)],{size:1.3,tone:"mid"}))+'</g>'; }
  sc.put(K.depthOf(a,P)+5,extra);
  // the vesicle: a membrane ball with a few packed molecules
  const ves=G.sphereOf(cargo,CR,P); let vh=S(ves,{tone:"hi"});
  vh+=L(G.arcOf(G.frameAlong(cargo,G.viewOf(P)),0,CR-2.2,P),{tone:"faint"});
  sc.put(K.depthOf(cargo,P)-CR*0.2,stainG("cyt",vh,0.18));
  sc.items.sort((x,y)=>x[0]-y[0]);
  motorG.innerHTML='<g opacity="'+fade.toFixed(2)+'">'+sc.items.map((x)=>x[1]).join("")+'</g>';
  // force clamp: spring from the vesicle back to a post riding the rail; stretch = load
  const hook=[cargo[0]-CR*0.55,CR*0.62,cargo[2]-CR*0.35];
  const len=40+F*12; const post=[Math.max(-176,hook[0]-len),RAIL_Y,hook[2]+2];
  const px=post[0], h=[];
  // carriage + post
  h.push(S(K.slabOf({x:px-12,y:RAIL_Y-12,w:24,d:24,r:3},RAIL_Z+4.6,7,P,6,0.8),{tone:"mid"}));
  h.push(K.dotsSvg([[px-8,RAIL_Y-8],[px+8,RAIL_Y-8],[px-8,RAIL_Y+8],[px+8,RAIL_Y+8]].map(([x,y])=>at([x,y,RAIL_Z+11.6])),{size:0.42}));
  h.push(S(K.cylinder(px,RAIL_Y,3,RAIL_Z+11.6,post[2]-RAIL_Z-14,P,20),{tone:"mid",crease:"none"}));
  h.push(S(K.cylinder(px,RAIL_Y,5.2,post[2]-4,6,P,24,0.5),{tone:"mid"}));
  h.push(L(K.knurl(px,RAIL_Y,5.2,post[2]-3,post[2]+1,18,P),{tone:"faint"}));
  // the spring: a helix along the line from the post to the hook
  const p0=[px+5,RAIL_Y,post[2]-1], d=G.sub3(hook,p0), n=G.unit3(d), Fs=G.frameAlong(p0,n), Ls=Math.hypot(...d);
  const coil=[]; const turns=9+0*F; for(let i=0;i<=turns*20;i++){ const s=6+(Ls-12)*i/(turns*20); coil.push(at(G.pointOf(Fs,s,2.6,i/20*Math.PI*2))); }
  h.push(L(K.pathOf([at(p0),at(G.pointOf(Fs,6,2.6,0))]),{tone:"mid"})+L(K.pathOf(coil),{tone:"mid"})+L(K.pathOf([at(G.pointOf(Fs,Ls-6,2.6,0)),at(hook)]),{tone:"mid"}));
  h.push(K.dotsSvg([at(p0),at(hook)],{size:0.9,tone:"hi"}));
  clampG.innerHTML='<g opacity="'+fade.toFixed(2)+'">'+h.join("")+'</g>';
}
function say(){ const v=vOf(F); const sps=Math.abs(v)/STEP; const eff=v>0?Math.round(F*STEP/EATP*100):0;
  vitaSay(stage,readout,"load "+F.toFixed(1)+" pN · "+Math.round(v)+" nm/s · "+Math.round(sps)+" ATP/s · work "+eff+"% of each ATP"); stage.setAttribute("aria-valuenow",F.toFixed(1)); }
const loop=vitaLoop({ stage, idleMs:5000,
  frame(dt,st){
    if(st.touring) Ft=3.4+3.2*Math.sin(st.clock*2*Math.PI/32-1.2);
    F+=(Ft-F)*(1-Math.exp(-dt/0.35));
    lean+=((F/7)-lean)*(1-Math.exp(-dt/0.6));
    const v=vOf(F); const rate=Math.abs(v)/STEP/SLOW;
    if(dt>0){
      phase+=rate*dt;
      if(phase>=1){ phase-=1; const nd=v>=0?1:-1; site+=nd*DIMER; dir=nd; made++; }
      if(site>END){ fade-=dt*1.4; if(fade<=0){ site=START; fade=0; } } else if(site<START){ site=START; dir=1; }
      else if(fade<1) fade=Math.min(1,fade+dt*1.4);
    }
    draw(); say();
  },
  pointer(x){ Ft=x*7.5; },
  keys(key){ if(key==="ArrowRight"||key==="ArrowUp"){ Ft=Math.min(7.5,Ft+0.5); return true; } if(key==="ArrowLeft"||key==="ArrowDown"){ Ft=Math.max(0,Ft-0.5); return true; } return false; },
});
`;
const body = k.plateHtml({
  fig: "Fig 06", title: "Kinesin", hint: "Hover ↔ load on the spring",
  readout: "load 1.5 pN · 700 nm/s", keys: [{ mark: "lit", label: "Neck linkers: the power stroke" }, { mark: "atp", label: "ATP bound, ADP + Pi leaving" }, { mark: "trna", label: "Microtubule (13 protofilaments)" }],
  caption: "Kinesin-1 on a microtubule at true scale: 25 nm across, one αβ-tubulin dimer (a dark seam) every 8 nm. The motor walks one protofilament hand over hand: the bound head takes an ATP, its neck linker snaps forward and throws the trailing head 16 nm ahead, so the cargo moves 8 nm per ATP. A force clamp on the rail in front keeps the spring at a fixed stretch: unloaded the motor runs about 800 nm/s; it slows under load and stalls near 6 pN, where one step does 48 pN·nm of work, about half the energy of an ATP. Past stall it slips backwards. The stalk is shown shorter than its 60 nm. Motion 60× slower.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Kinesin: arrow keys change the load" aria-valuemin="0" aria-valuemax="7.5" aria-valuenow="1.5">${svg}</div>`,
});
const page = vitaPage({ n: "06", title: "Kinesin", zh: "驱动蛋白 · 分子步行者", en: "Kinesin · molecular walker", body, script: liveScript() + LOOP_SRC + live,
  facts: [["8 nm", "每步（一个微管蛋白二聚体）", "per step (one tubulin dimer)"], ["1 ATP", "每步消耗", "consumed per step"], ["~800 nm/s", "空载速度", "unloaded speed"], ["~6 pN", "失速力", "stall force"], ["~1 µm", "脱落前平均行程", "mean run before detaching"]] });
writeFileSync(join(OUT, "06-kinesin.html"), page);
console.log("wrote 06-kinesin.html", (page.length / 1024).toFixed(0) + " KB");
