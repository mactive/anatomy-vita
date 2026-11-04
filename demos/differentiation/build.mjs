// 10 · Cell differentiation — Waddington's epigenetic landscape built as a real object: a sliced-rib terrain board.
// A process with no body, so the machine is invented (law 7) and the caption says so.
// The board: 47 plywood ribs stand on a tray, one every half day of human development (days 5–28). Each rib's top edge
// is a cross-section of the landscape, so from back to front the ribs show one shallow valley (the pluripotent epiblast),
// then three (the germ layers at gastrulation), then six (six example fates). The ridges between valleys rise downhill:
// commitment gets harder to undo. Twelve cells, an Oct4-GFP reporter in each, wait behind a lift gate on the plateau.
// What moves: time. At day ~13 the gate (the primitive streak's signal) lifts, the cells roll downhill, each takes its
// fork on the day the real embryo makes that choice, the GFP fades as Oct4 switches off, and they come to rest in six valleys.
// The one control: hover or arrow keys scrub days 5–30.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, liveScript, LOOP_SRC, plinth, vitaPage } from "../../bio/bio.mjs";
import { packSpheres } from "../../bio/soft.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../site/demos");
const W = 720, H = 520;

// ---------- the model: one source string, run here and in the page ----------
// Fork days: human embryo, days after fertilisation (Carnegie-stage textbook ages):
//   primitive streak day 13–14, gastrulation days 14–16 (three germ layers);
//   blood islands in yolk-sac mesoderm ~day 17, heart tube beats ~day 22;
//   neural plate ~day 18, neural tube closes days 22–28; liver bud (hepatic diverticulum) ~day 22–24.
const MODEL = `
const D0=5, D1=28, DAY=14, XW=120, FLOOR=4, RIB=0.5, RT=2.8, RC=7.5;
const sm=(u)=>u<=0?0:u>=1?1:u*u*(3-2*u);
const Yd=(d)=>(d-D0)*DAY;
const base=(d)=>{ const s=Math.min(1,Math.max(0,(d-D0)/(D1-D0))); return 26+92*(0.5+0.5*Math.cos(Math.PI*s)); };
const ridge=(d)=>5+27*sm((d-11)/15);
const GERM=[{x:-68,f:13.5,dur:2.6,name:"ectoderm"},{x:0,f:13.5,dur:2.6,name:"mesoderm"},{x:68,f:13.5,dur:2.6,name:"endoderm"}];
const LEAF=[{g:0,x:-85,f:18,dur:3.5,name:"neuron"},{g:0,x:-51,f:18,dur:3.5,name:"skin"},
  {g:1,x:-17,f:16.8,dur:3,name:"blood"},{g:1,x:17,f:16.8,dur:3,name:"heart muscle"},
  {g:2,x:51,f:21.5,dur:3.5,name:"gut lining"},{g:2,x:85,f:21.5,dur:3.5,name:"liver"}];
const cOf=(l,d)=>{ const L=LEAF[l], Gm=GERM[L.g]; return Gm.x*sm((d-Gm.f)/Gm.dur)+(L.x-Gm.x)*sm((d-L.f)/L.dur); };
const hOf=(d,x)=>{ let m=1e9; for(let l=0;l<6;l++) m=Math.min(m,Math.abs(x-cOf(l,d))); const w=13;
  return base(d)+ridge(d)*(1-Math.exp(-m*m/(w*w)))+34*sm((Math.abs(x)-100)/20); };
const NRIB=Math.round((D1-D0)/RIB)+1;
// where a ball of radius r centred over (x, y) comes to rest on the rib tops
const restZ=(x,y,r)=>{ let z=FLOOR; const j0=Math.floor(y/(RIB*DAY));
  for(let j=Math.max(0,j0-1);j<=Math.min(NRIB-1,j0+2);j++){ const dy=Math.max(0,Math.abs(y-j*RIB*DAY)-RT/2); if(dy>=r) continue;
    for(let q=-4;q<=4;q++){ const dx=q*r/4.5, s=r*r-dx*dx-dy*dy; if(s>0) z=Math.max(z,hOf(D0+j*RIB,x+dx)+Math.sqrt(s)); } }
  return z; };
`;
const M = new Function(MODEL + "return { D0, D1, DAY, XW, FLOOR, RIB, RT, RC, sm, Yd, base, ridge, GERM, LEAF, cOf, hOf, NRIB, restZ };")();
const { D0, D1, DAY, XW, FLOOR, RIB, RT, RC, Yd, hOf, NRIB, restZ, LEAF } = M;

// ---------- the cells: 12, four per germ layer, two per fate; lineage fixed at build time ----------
const GATE_D = 11.25, PEN_D = 8.7;
const cells = [];
for (let g = 0; g < 3; g++) for (let r = 0; r < 4; r++) cells.push({ g, r, leaf: g * 2 + (r % 2), lag: r * 0.9 + g * 0.3, lane: [-34, 0, 34][g] + (r - 1.5) * 4, park: r < 2 ? 27.55 : 26.65 });
const LIT = cells.findIndex((c) => c.g === 1 && c.r === 1); // the heart-muscle cell
// the epiblast clump behind the gate: relaxed into a ball, then dropped until it rests on the plateau ribs
const guess = cells.map((c, i) => [c.lane * 0.35 + Math.cos(i * 2.4) * 6, Yd(PEN_D) + Math.sin(i * 2.4) * 6, (i % 3) * 5, RC]);
const packed = packSpheres(2006, guess, 17, { centre: [0, Yd(PEN_D), 0], squeeze: 0.08, iters: 240 }); // 2006: Takahashi & Yamanaka
let lift = -Infinity; for (const p of packed) lift = Math.max(lift, restZ(p[0], p[1], RC) - p[2]);
cells.forEach((c, i) => { c.pen = [packed[i][0], packed[i][1], packed[i][2] + lift].map((v) => +v.toFixed(2)); c.p = +(D0 + c.pen[1] / DAY).toFixed(3); });

// ---------- camera ----------
const YE = Yd(D1);
const PLATE = { x: -160, y: -40, w: 320, d: YE + 80, r: 12 };
const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [-131, Yd(GATE_D), 178], [131, Yd(GATE_D), 178], [-128, -20, 150], [128, -20, 150]], W, H, { pad: 16, azimuth: 52, elevation: 40 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const V = G.viewOf(P), LT = G.lightOf(P);

// ---------- a rib: a plywood slice whose top edge is one cross-section of the landscape ----------
const area = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a; };
const poly = (pts3) => { let s = pts3.map(at); if (area(s) < 0) s = s.reverse(); return k.pathOf(s, true); };
const bandOfN = (n) => G.bandOf(G.dot3(G.unit3(n), LT));
const seenN = (n) => G.dot3(n, V) > 1e-6;
function rib(j) {
  const d = D0 + j * RIB, y = Yd(d), yb = y - RT / 2, yf = y + RT / 2;
  const xs = []; for (let x = -XW; x <= XW + 1e-6; x += 2.5) xs.push(x);
  const hs = xs.map((x) => hOf(d, x));
  // top edge: runs of segments that share a tone band become one strip polygon
  const buckets = [[], [], [], [], []], fill = [];
  let run = null;
  const flush = () => { if (!run) return; const a = run.i0, b = run.i1;
    const pts = [...xs.slice(a, b + 1).map((x, q) => [x, yb, hs[a + q]]), ...xs.slice(a, b + 1).map((x, q) => [x, yf, hs[a + q]]).reverse()];
    const d2 = poly(pts); buckets[run.band].push(d2); fill.push(d2); run = null; };
  for (let i = 0; i < xs.length - 1; i++) {
    const n = [-(hs[i + 1] - hs[i]) / (xs[i + 1] - xs[i]), 0, 1];
    if (!seenN(n)) { flush(); continue; }
    const band = bandOfN(n);
    if (run && run.band === band) run.i1 = i + 1; else { flush(); run = { band, i0: i, i1: i + 1 }; }
  }
  flush();
  // the near end grain (+x), seen on every rib
  const cap = [[XW, yb, FLOOR], [XW, yf, FLOOR], [XW, yf, hs[hs.length - 1]], [XW, yb, hs[hs.length - 1]]];
  const capD = poly(cap); buckets[bandOfN([1, 0, 0])].push(capD); fill.push(capD);
  const back = k.pathOf(xs.map((x, i) => at([x, yb, hs[i]]))) + k.pathOf([at([XW, yb, hs[hs.length - 1]]), at([XW, yb, FLOOR]), at([XW, yf, FLOOR])]);
  const strips = { fill: fill.join(""), outline: back, crease: "", top: buckets[4].join(""), shades: buckets.slice(0, 4).map((b) => b.join("")) };
  // the face toward the viewer (+y)
  const facePts = [[-XW, yf, FLOOR], ...xs.map((x, i) => [x, yf, hs[i]]), [XW, yf, FLOOR]];
  const faceD = poly(facePts), fb = bandOfN([0, 1, 0]);
  const face = { fill: faceD, outline: faceD, crease: "", top: fb === 4 ? faceD : "", shades: [0, 1, 2, 3].map((b) => (b === fb ? faceD : "")) };
  // dowels: two spines run the length of the board through every rib (end grain dot in a ring on each face)
  const dow = [-104, 104].map((x) => { const F = G.frameAlong([x, yf + 0.05, FLOOR + 10], [0, 1, 0]); return G.circleOf(F, 0, 2.2, P); }).join("");
  const dowDots = [-104, 104].map((x) => at([x, yf + 0.05, FLOOR + 10]));
  // ply laminations on the near end grain: two rules that run edge to edge
  const lam = [0.33, 0.66].map((u) => k.pathOf([at([XW, yb + RT * u, FLOOR]), at([XW, yb + RT * u, hs[hs.length - 1]])])).join("");
  return S(strips, { tone: "mid", crease: "none" }) + S(face, { tone: "mid", crease: "none", inner: L(lam, { tone: "faint" }) }) + L(dow, { tone: "lo" }) + D(dowDots, { size: 0.55, tone: "mid" });
}

// ---------- tray, rails, end boards, ruler, lift gate ----------
const TRAY = { x: -136, y: -24, w: 272, d: YE + 52, r: 4 };
const RAIL = 22;
function trayBack() {
  const out = [];
  out.push(S(k.slabOf(TRAY, 0, FLOOR, P, 4, 0.6), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(TRAY, 3), FLOOR, P, 4), { tone: "faint" }));
  // far rail and back board (behind every rib)
  out.push(S(k.slabOf({ x: -136, y: -24, w: 8, d: YE + 52, r: 1.5 }, FLOOR, RAIL, P, 3, 0.5), { tone: "mid" }));
  const backH = hOf(D0, XW) + 10;
  out.push(S(k.slabOf({ x: -128, y: -24, w: 256, d: 7, r: 1 }, FLOOR, backH - FLOOR, P, 3, 0.5), { tone: "mid" }));
  out.push(D([-110, -60, 0, 60, 110].map((x) => at([x, -17, backH - 4])), { size: 0.5, tone: "mid" }));
  return out.join("");
}
function trayFront() {
  const out = [];
  // near rail
  out.push(S(k.slabOf({ x: 128, y: -24, w: 8, d: YE + 52, r: 1.5 }, FLOOR, RAIL, P, 3, 0.5), { tone: "mid" }));
  out.push(D([0, 0.25, 0.5, 0.75, 1].map((u) => at([132, -16 + u * (YE + 36), FLOOR + RAIL])), { size: 0.5, tone: "mid" }));
  // front lip with six fate plates, one under each valley mouth
  const lip = { x: -128, y: YE + 14, w: 256, d: 9, r: 1 };
  out.push(S(k.slabOf(lip, FLOOR, 18, P, 3, 0.5), { tone: "mid" }));
  LEAF.forEach((l, i) => {
    const pl = { x: l.x - 11, y: lip.y + 1.5, w: 22, d: 6, r: 0.8 };
    out.push(S(k.slabOf(pl, FLOOR + 18, 0.7, P, 3, 0.2), { tone: "lo" }));
    out.push(L(k.lineOnTop([pl.x + 3, pl.y + 3], [pl.x + pl.w - 3 - (i % 3) * 3, pl.y + 3], FLOOR + 18.7, P), { tone: "faint", free: true }));
    out.push(D([at([pl.x + 1.6, pl.y + 3, FLOOR + 18.7]), at([pl.x + pl.w - 1.6, pl.y + 3, FLOOR + 18.7])], { size: 0.4 }));
  });
  // the ruler: one tick per day, along the near side of the bench
  const strip = { x: 140, y: -4, w: 9, d: YE + 8, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(0, YE, DAY, 5, strip.x + 0.8, 0.6, [2.6, 4.8], P, "y");
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  const half = k.topTicks(DAY / 2, YE, DAY, 1, strip.x + 0.8, 0.6, [1.2, 1.2], P, "y");
  out.push(L(half.major, { tone: "faint" }));
  out.push(D([at([strip.x + 4.5, strip.y + 1.8, 0.6]), at([strip.x + 4.5, strip.y + strip.d - 1.8, 0.6])], { size: 0.45 }));
  return out.join("");
}
// lift gate: two turned posts on the rails, a bar riding up them in collars, a knurled knob on the near post
const GY = Yd(GATE_D), POST_TOP = 172;
function gatePost(x) {
  const out = [];
  out.push(S(k.cylinder(x, GY, 5.5, FLOOR + RAIL, 3, P, 28, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(x, GY, 2.6, FLOOR + RAIL + 3, POST_TOP - FLOOR - RAIL - 3, P, 22), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x, GY, 4, POST_TOP, 3, P, 24, 0.4), { tone: "mid" }));
  return out.join("");
}
const knob = S(k.cylinder(131, GY, 4.6, POST_TOP + 3, 6, P, 28, 0.5), { tone: "mid" }) + L(k.knurl(131, GY, 4.6, POST_TOP + 4, POST_TOP + 8, 22, P), { tone: "faint" });
const BAR_LO = hOf(GATE_D, 0) + 8.5, BAR_HI = 156;

// ---------- static drawing with live slots between ribs ----------
const ribs = [];
for (let j = 0; j < NRIB; j++) ribs.push(rib(j) + `<g data-slot="${j}"></g>`);
const svg = k.figureSvg({
  width: W, height: H,
  label: "A metaphor for cell differentiation: a sliced wooden landscape on a tray, 47 ribs from back to front, one per half day of human development. At the back a single shallow valley holds a clump of twelve green-glowing cells behind a lift gate. Downhill the valley forks into three, then six, deepening as it goes. When the gate lifts the cells roll down, each taking a fork, lose their green glow and come to rest in six valleys: neuron, skin, blood, heart muscle, gut lining, liver.",
  body: [plinth(PLATE, P, { h: 10, label: { x: PLATE.x + 14, y: PLATE.y + PLATE.d - 26, w: 40 } }), trayBack(), `<g data-part="farpost">${gatePost(-131)}</g>`, `<g data-slot="-1"></g>`, ...ribs, trayFront(), `<g data-part="nearpost">${gatePost(131)}${knob}</g>`],
});

const live = `
${MODEL}
const P=${JSON.stringify(P)}; const CELLS=${JSON.stringify(cells.map(({ g, leaf, lag, lane, park, pen, p }) => ({ g, leaf, lag, lane, park, pen, p })))}; const LIT=${LIT};
const GY=${GY}, GATE_D=${GATE_D}, BAR_LO=${BAR_LO.toFixed(2)}, BAR_HI=${BAR_HI}, POST_TOP=${POST_TOP};
const stage=document.querySelector(".iso-stage"), svg=stage.querySelector("svg"), readout=document.querySelector("[data-readout]");
const slots=[...svg.querySelectorAll("[data-slot]")].reduce((m,e)=>(m[+e.dataset.slot]=e,m),{});
const BAR_SLOT=Math.floor(Yd(GATE_D)/(RIB*DAY));
const lerp=(a,b,t)=>a+(b-a)*t;
const T_A=5, T_B=30;
const gateUp=(t)=>sm((t-12.4)/0.6);
// a cell's developmental day: held behind the gate, then rolling, then caught up with its own clock, then parked
function dayOf(c,t){ const T0=13+c.lag; let d=c.p+Math.max(0,t-T0)*2.5; d=Math.min(d,Math.max(c.p,t-c.lag)); return Math.min(d,c.park); }
function posOf(c,t){ const d=dayOf(c,t); if(t<13+c.lag) return {d,pen:true,p:c.pen};
  const y=Yd(d), x=lerp(c.lane,cOf(c.leaf,d),sm((d-12.5)/3.2)), z=restZ(x,y,RC);
  const s=sm((d-c.p)/1.4); return {d,pen:false,p:[lerp(c.pen[0],x,s),lerp(c.pen[1],y,s),lerp(c.pen[2],z,s)]}; }
const oct4=(d)=>0.06+0.84*(1-sm((d-13.5)/3)); // Oct4-GFP: on in the epiblast, off by the end of gastrulation
const slotOf=(y,r)=>Math.max(-1,Math.min(NRIB-1,Math.floor((y+r+RT/2)/(RIB*DAY))));
const gfp=(k,h)=>'<g class="bio-stain" style="--stain:var(--stain-gfp);--stain-k:'+k.toFixed(2)+'">'+h+'</g>';
let penKey="", penSvg="", penSlot=-1, filled=new Set(), last=-1;
function bar(t){ const z=lerp(BAR_LO,BAR_HI,gateUp(t)); const F=G.frameAlong([-131,GY,z],[1,0,0]);
  let h=K.solidSvg(G.disc(-1,263,1.9,F,P),{tone:"mid"});
  for(const x of [-131,131]){ h+=K.solidSvg(K.cylinder(x,GY,4.2,z-4,8,P,24,0.4),{tone:"mid"}); h+=K.dotsSvg([K.iso([x+(x<0?3:-3),GY+3.6,z],P)],{size:0.5,tone:"mid"}); }
  return h; }
function draw(t){
  if(Math.abs(t-last)<0.004) return; last=t;
  const put={}; const add=(j,h)=>{ (put[j]=put[j]||[]).push(h); };
  add(BAR_SLOT,[1e9,bar(t)]);
  const inPen=[]; let litState=null;
  CELLS.forEach((c,i)=>{ const q=posOf(c,t); if(i===LIT) litState=q;
    if(q.pen){ inPen.push(i); return; }
    const sp=K.solidSvg(G.sphereOf(q.p,RC,P,{steps:40}),{tone:"hi",lit:i===LIT});
    add(slotOf(q.p[1],RC), [K.depthOf(q.p,P), gfp(oct4(q.d),sp)]); });
  const key=inPen.join(",");
  if(key!==penKey){ penKey=key; penSvg=""; penSlot=-1;
    if(inPen.length){ const sph=inPen.map((i)=>[...CELLS[i].pen,RC]);
      const pp=SOFT.clusterOf(sph,P,{press:0.06,step:1.2});
      penSvg=gfp(oct4(t<13?5:13),SOFT.clusterSvg(pp,{tone:"hi"},{seamOpacity:0.85}));
      penSlot=slotOf(Math.max(...sph.map((s)=>s[1])),RC); } }
  if(penSvg) add(penSlot,[-1e9,penSvg]);
  const now=new Set(Object.keys(put).map(Number));
  for(const j of filled) if(!now.has(j)) slots[j].innerHTML="";
  for(const j of now) slots[j].innerHTML=put[j].sort((a,b)=>a[0]-b[0]).map((x)=>x[1]).join("");
  filled=now;
  // readout: the lit cell's own day and what it has become
  const c=CELLS[LIT], d=litState.d, Lf=LEAF[c.leaf], Gm=GERM[c.g];
  const T="day "+t.toFixed(1)+" · ";
  let s;
  if(litState.pen) s=T+(t<12.4?"epiblast · pluripotent, Oct4 on":"the gate lifts");
  else if(d<Gm.f+Gm.dur*0.6) s=T+"lit cell rolls off the plateau";
  else if(d<Lf.f+Lf.dur*0.5) s=T+"lit cell: "+Gm.name+(oct4(d)<0.2?" · Oct4 off":"");
  else if(d<22) s=T+"lit cell: "+Gm.name+" → heart";
  else s=T+"lit cell: heart muscle, beating";
  vitaSay(stage,readout,s);
  stage.setAttribute("aria-valuenow",t.toFixed(1));
}
let tt=T_A, tg=T_A;
vitaLoop({ stage, idleMs:5000,
  frame(dt,st){ if(st.touring){ tg+=dt*2.1; if(tg>T_B+3) tg=T_A; } const g=Math.min(T_B,tg);
    tt+=(g-tt)*(st.touring&&tg<T_A+0.05?1:1-Math.exp(-dt/0.25)); if(st.still) tt=tg=21.5; draw(tt); },
  pointer(x){ tg=T_A+x*(T_B-T_A); },
  keys(key){ if(key==="ArrowRight"||key==="ArrowUp"){ tg=Math.min(T_B,tg+0.5); return true; } if(key==="ArrowLeft"||key==="ArrowDown"){ tg=Math.max(T_A,tg-0.5); return true; } return false; },
  resume(){ tg=tt; },
});
`;
// a stained part can still be the lit one: the kit's lit tones, mixed toward the stain (BIO_CSS's stain rules otherwise win)
const LIT_CSS = [".iso-fill", ".iso-top", ".iso-shade[data-shade]"].map((sel, i) => `.bio-stain .iso-solid[data-lit][data-seamless]>${sel}{fill:color-mix(in oklab,var(${["--anatomy-face", "--anatomy-lit-top", "--anatomy-lit-shade"][i]}),var(--stain) calc(var(--stain-k,1)*30%));stroke:none}`).join("")
  + `.bio-stain .iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}`;
const body = k.plateHtml({
  fig: "Fig 10", title: "Differentiation", hint: "Hover ↔ days 5–30",
  readout: "day 5.0 · epiblast · pluripotent, Oct4 on",
  keys: [{ mark: "lit", label: "One tracked cell (it becomes heart muscle)" }, { mark: "gfp", label: "Oct4-GFP: bright while pluripotent" }, { mark: "raised", label: "The landscape: ribs, one per half day" }],
  caption: "A metaphor, not an anatomy: Waddington's 1957 “epigenetic landscape” built as a sliced terrain board. Every cell carries the same genome; which genes it keeps switched on is the valley it rolls into, and the ridges that rise downhill are why a committed cell rarely climbs back. Distance along the board is time, not space: ruler: 1 tick = 1 day of human development, days 5–28 after fertilisation (the board itself is not to scale). The fork days are textbook human ages: gastrulation sorts cells into ectoderm, mesoderm and endoderm on days 14–16; mesoderm splits toward blood (blood islands, ~day 17) and heart (the heart tube beats from ~day 22); ectoderm toward neurons and skin (neural plate ~day 18); endoderm toward gut lining and liver (liver bud ~day 23). The plates on the front lip, left to right: neuron, skin, blood, heart muscle, gut lining, liver, six of more than 400 human cell types. The green is an Oct4-GFP reporter, a real marker of pluripotency that switches off as cells commit. The tour runs about 170,000× faster than development; twelve cells stand in for thousands, real cells keep dividing on the way, and real valleys are chosen by signals from neighbours, not by chance.",
  body: `<style>${LIT_CSS}</style><div class="iso-stage" tabindex="0" role="slider" aria-label="Differentiation landscape: arrow keys move through days 5 to 30" aria-valuemin="5" aria-valuemax="30" aria-valuenow="5">${svg}</div>`,
});
const page = vitaPage({ n: "10", title: "Cell differentiation", zh: "细胞分化 · 沃丁顿表观遗传地形", en: "Cell differentiation · Waddington's landscape", body, script: liveScript({ soft: true }) + LOOP_SRC + live,
  facts: [["~3.6 × 10¹³", "成年男性体内细胞数（Hatton 等, 2023）", "~36 trillion cells in an adult man (Hatton et al., 2023)"], ["400+", "人类细胞类型（同一套基因组）", "human cell types, one genome"], ["~20,000", "蛋白编码基因，几乎每个细胞都相同", "protein-coding genes, the same in almost every cell"], ["day 14–16", "原肠胚形成：三个胚层", "gastrulation: three germ layers"], ["day 22", "心管开始跳动", "the heart tube starts to beat"], ["4 factors", "Oct4 · Sox2 · Klf4 · c-Myc 四个因子可将细胞重编程回多能状态（2006）", "Oct4, Sox2, Klf4, c-Myc push a cell back uphill to pluripotency (2006)"]] });
writeFileSync(join(OUT, "10-differentiation.html"), page);
console.log("wrote 10-differentiation.html", (page.length / 1024).toFixed(0) + " KB", "ribs", NRIB, "lit", LIT);
