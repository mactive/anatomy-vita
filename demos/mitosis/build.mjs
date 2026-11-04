// 03 · Mitosis — one rounded cell on a microscope slide, held by two stage clips.
// What moves: time. Scrub through the hour of mitosis: chromosomes condense, line up on the plate, sisters are
// pulled apart along the spindle, and the contractile ring pinches one cell into two.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, liveScript, RNG_SRC, plinth, vitaPage, byDepth } from "../../bio/bio.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../site/demos");
const W = 720, H = 440;
const UM = 8; // 1 µm = 8 units
const PLATE = { x: -128, y: -66, w: 256, d: 124, r: 10 };
const SLIDE = { x: -114, y: -36, w: 228, d: 72, r: 1.2 }; // 75 × 25 mm slide, drawn short
const SZ = 2.4; // slide thickness
const R0 = 7.2 * UM; // a 14.4 µm rounded mitotic cell
const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [0, 0, SZ + 2 * R0 + 4], [-R0 * 1.75, 0, SZ + R0 * 1.6], [R0 * 1.75, 0, SZ + R0 * 1.6]], W, H, { pad: 20, azimuth: 34 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);

function stage() {
  const out = [plinth(PLATE, P, { h: 9, scale: { x: -114, y: PLATE.y + PLATE.d - 15, w: 176, step: UM, every: 5 }, label: { x: 76, y: PLATE.y + PLATE.d - 20, w: 36 } })];
  // aperture under the specimen: a stepped bore in the stage
  out.push(L(k.ring(0, 0, 36, 0, P, 64), { tone: "lo" }), L(k.ring(0, 0, 30, 0, P, 64), { tone: "faint" }));
  // the slide: glass, with a frosted label end
  out.push(`<g class="bio-glass-slide">${S(k.slabOf(SLIDE, 0, SZ, P, 3, 0.4), { tone: "hi" })}</g>`);
  const frost = { x: SLIDE.x + 4, y: SLIDE.y + 4, w: 34, d: SLIDE.d - 8, r: 1 };
  out.push(S(k.slabOf(frost, SZ, 0.3, P, 2), { tone: "lo", crease: "none" }));
  for (let i = 0; i < 4; i++) out.push(L(k.lineOnTop([frost.x + 4, frost.y + 8 + i * 9], [frost.x + frost.w - 6 - (i % 2) * 8, frost.y + 8 + i * 9], SZ + 0.3, P), { tone: "faint", free: true }));
  // two stage clips: a turned pillar with a thumb nut and a spring strip pressing the slide
  for (const sx of [-1, 1]) {
    const px = sx * 96, py = -52;
    out.push(S(k.cylinder(px, py, 6, 0, 3, P, 28), { tone: "mid" }));
    out.push(S(k.cylinder(px, py, 3.6, 3, 7, P, 22, 0.4), { tone: "mid" }));
    out.push(L(k.knurl(px, py, 3.6, 4, 9.5, 18, P), { tone: "faint" }));
    out.push(S(k.slabOf({ x: px - 3, y: py, w: 6, d: 34, r: 1.4 }, 8, 1.1, P, 3, 0.3), { tone: "mid" }));
    out.push(S(k.slabOf({ x: px - 3, y: py + 30, w: 6, d: 6, r: 1.4 }, SZ, 8 - SZ, P, 3), { tone: "mid" }));
    out.push(D([at([px, py, 10]), at([px, py + 6, 9.1])], { size: 0.5, tone: "hi" }));
  }
  return out.join("");
}

const svg = k.figureSvg({
  width: W, height: H, label: "A rounded animal cell on a glass microscope slide held by two stage clips. Scrubbing time takes it through mitosis: chromosomes condense, line up across the middle, the sister chromatids are pulled to opposite poles by the spindle, and the cell pinches into two daughters, each with its own nucleus.",
  body: [stage(), `<g data-part="cell"></g>`],
});

const live = `
const P=${JSON.stringify(P)}; const UM=${UM}, R0=${R0}, SZ=${SZ}; const Q=UM/5*1.15;
${RNG_SRC}
const stage=document.querySelector(".iso-stage"), svg=stage.querySelector("svg"), cellG=svg.querySelector('[data-part="cell"]'), readout=document.querySelector("[data-readout]");
const still=matchMedia("(prefers-reduced-motion: reduce)");
const V=G.viewOf(P), at=(p)=>K.iso(p,P), f1=(v)=>v.toFixed(1);
const clamp01=(x)=>Math.max(0,Math.min(1,x)), sm=(a,b,x)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);}, mix=(a,b,t)=>a+(b-a)*t, mix3=(a,b,t)=>[mix(a[0],b[0],t),mix(a[1],b[1],t),mix(a[2],b[2],t)];
// HeLa-like timing, minutes from nuclear envelope breakdown's prelude
const PH=[["G2 · interphase",-8,0],["Prophase",0,15],["Prometaphase",15,25],["Metaphase",25,45],["Anaphase",45,51],["Telophase · cytokinesis",51,68]];
const T0=-8, T1=72;
const phaseOf=(t)=>{for(const p of PH) if(t<p[2]) return p[0]; return "Two daughter cells";};
// 2n = 8: four pairs (two big metacentrics, an acrocentric X, a dot), each pair = two homologues
const rand=rng(1882);
const KINDS=[[9,9],[8.5,8],[10,1.4],[2.2,1.4]].map(([a,b])=>[a*Q,b*Q]);
const CHR=[];
for(let i=0;i<8;i++){ const kind=KINDS[i>>1]; const ring=i<6; const ang=(ring? i/6 : (i-6)/2+0.25)*Math.PI*2+0.3;
  const rad=(ring?12.5:4)*Q; const plate=[0,Math.cos(ang)*rad,Math.sin(ang)*rad]; const tan=[0,-Math.sin(ang),Math.cos(ang)];
  const pro=[(rand()-0.5)*13*Q,(rand()-0.5)*13*Q,(rand()-0.5)*10*Q]; const proDir=G.unit3([rand()-0.5,rand()-0.5,rand()-0.5]);
  CHR.push({kind,plate,tan,pro,proDir,bend:(rand()-0.5)*0.6}); }
function geometry(t){
  const cyto=sm(52,66,t); // furrow
  const Rm=R0*(1-0.206*cyto), dsep=cyto*Rm*0.97; const zc=SZ+mix(R0,Rm*1.0,cyto)+0.2;
  const C=[0,0,zc];
  const early=mix(4*Q,R0*0.7,sm(0,18,t))*(1+0.12*sm(45,51,t)); const poleX=mix(early,Math.max(early,dsep+Rm*0.45),sm(50,62,t));
  const poleOff=[0,mix(-14*Q,0,sm(0,16,t)),mix(10*Q,0,sm(0,16,t))]; // centrosome pair starts beside the nucleus and splits
  const poles=[G.add3(C,[-poleX,poleOff[1]*(1-sm(0,16,t)),poleOff[2]]),G.add3(C,[poleX,poleOff[1]*(1-sm(0,16,t)),poleOff[2]])];
  return {cyto,Rm,dsep,zc,C,poles};
}
// the membrane: a surface of revolution about the spindle axis, r(s) = √(R² − (|s| − d)²), which is one sphere at d = 0
// and two touching daughters at d ≈ R. Its silhouette is the union of its projected cross-sections, so fill, outline,
// neck and contractile ring all come from the same profile.
function membrane(g){
  const Rm=g.Rm, d=g.dsep, eps=4; const s1=d+Rm; const u=K.iso([0,1,0],P), o=K.iso([0,0,0],P), w=K.iso([0,0,1],P);
  const uy=[u[0]-o[0],u[1]-o[1]], uz=[w[0]-o[0],w[1]-o[1]];
  const rOf=(s)=>{ const as=Math.sqrt(s*s+eps*eps)-eps; return Math.sqrt(Math.max(0,Rm*Rm-(as-d)*(as-d))); };
  const polys=[]; const n=Math.ceil(2*s1/2.2);
  for(let i=0;i<=n;i++){ const s=-s1+2*s1*i/n; const r=rOf(s); if(r<0.5) continue; const c=at([g.C[0]+s,g.C[1],g.C[2]]); let dd="M";
    for(let j=0;j<36;j++){ const th=j/36*Math.PI*2; dd+=(c[0]+r*(Math.cos(th)*uy[0]+Math.sin(th)*uz[0])).toFixed(1)+" "+(c[1]+r*(Math.cos(th)*uy[1]+Math.sin(th)*uz[1])).toFixed(1)+(j<35?"L":"Z"); }
    polys.push('<path d="'+dd+'"/>'); }
  const union=polys.join("");
  const c1=at(G.add3(g.C,[-d,0,0])), c2=at(G.add3(g.C,[d,0,0]));
  const tones=[G.sphereOf(G.add3(g.C,[-d,0,0]),Rm,P).shades.slice(1),d>0.5?G.sphereOf(G.add3(g.C,[d,0,0]),Rm,P).shades.slice(1):[]].flat();
  return {union,tones,neck:rOf(0),lobes:d>0.5?[c1,c2]:[c1]};
}
function chromatids(t,g){
  const out=[]; const cond=sm(-2,14,t), toPlate=sm(14,26,t), ana=sm(45,51,t), tel=sm(52,64,t);
  const r=mix(0.45,1.45,cond)*Q*(1-0.55*tel);
  CHR.forEach((c,i)=>{ for(const side of [-1,1]){
    const cen0=mix3(c.pro,c.plate,toPlate); const offset=mix(0.6,1.6,cond)*Q;
    const pole=g.poles[side<0?0:1]; const cenPlate=G.add3(G.add3(g.C,cen0),[side*offset,0,0]);
    const target=G.add3(pole,G.mul3(G.unit3(G.sub3(G.add3(g.C,[side*0,cen0[1]*0.5,cen0[2]*0.5]),pole)),(6+i*0.3)*Q));
    const cen=mix3(cenPlate,mix3(target,G.add3(pole,[ -side*5*Q, cen0[1]*0.25, cen0[2]*0.25]),tel),ana);
    const dir=G.unit3(mix3(c.proDir,c.tan,toPlate));
    const arm=(len,sgn)=>{ const pts=[]; for(let u=0;u<=len+1e-6;u+=Math.max(0.8*Q,len/8)){ const p=G.add3(cen,G.mul3(dir,sgn*u)); const trail=-side*u*0.85*ana*(1-tel*0.5); const bow=c.bend*u*u*0.04/Q; pts.push(G.add3(p,[trail+bow,0,-0.06*u*ana*Math.sign(cen0[2]||1)])); } return pts; };
    const L1=c.kind[0]*mix(1.5,1,cond), L2=c.kind[1]*mix(1.5,1,cond);
    const a1=arm(L1,1), a2=arm(L2,-1);
    const route=[...a2.reverse(),...a1.slice(1)];
    out.push({route,r,cen,side,i});
  }});
  return out;
}
function draw(t){
  const g=geometry(t); const items=[]; const put=(d,h)=>items.push([d,h]);
  const mem=membrane(g);
  const clip='<clipPath id="cellclip">'+mem.union+'</clipPath>';
  const rim='<g class="bio-rim" style="fill:var(--anatomy-hi);stroke:var(--anatomy-hi);stroke-width:2.2;stroke-linejoin:round">'+mem.union+'</g>';
  const back=clip+rim+'<g class="bio-shell-back" style="fill:color-mix(in oklab,var(--anatomy-paper),var(--anatomy-shade-1) 30%)">'+mem.union+'<g clip-path="url(#cellclip)">'+mem.tones.map((d)=>d?'<path class="bio-shell-tone" d="'+d+'"/>':"").join("")+'</g></g>';
  const gleam=mem.lobes.map((c)=>{const r=g.Rm*G.scaleOf(P); const x=c[0]-r*0.38, y=c[1]-r*0.52; return '<ellipse class="bio-gleam" cx="'+f1(x)+'" cy="'+f1(y)+'" rx="'+f1(r*0.22)+'" ry="'+f1(r*0.1)+'" transform="rotate(-28 '+f1(x)+' '+f1(y)+')"/>';}).join("");
  const front='<g class="bio-shell-front"><g style="fill:var(--anatomy-top)" opacity=".16">'+mem.union+'</g><g clip-path="url(#cellclip)">'+gleam+'</g></g>';
  const env=1-sm(12,17,t), reform=sm(54,66,t);
  // interphase nucleus: envelope with pores, nucleolus inside; it breaks down at the end of prophase
  if(env>0.01){ const nc=G.add3(g.C,[0,-2*Q,1*Q]); const nr=mix(4.6*UM,4.1*UM,sm(0,15,t));
    put(K.depthOf(nc,P),'<g opacity="'+env.toFixed(2)+'"><g class="bio-stain" style="--stain:var(--stain-dapi);--stain-k:'+(0.55+0.45*(1-sm(0,12,t))).toFixed(2)+'">'+K.solidSvg(G.sphereOf(nc,nr,P),{tone:"hi"})+'</g>'+K.dotsSvg(G.dotsOf(G.frameAlong(nc,V),0,nr*0.82,22,P,{all:true}),{size:0.45,tone:"lo"})+'</g>'); }
  if(reform>0.01) for(const pole of g.poles){ const nc=G.add3(pole,[pole[0]<g.C[0]?-0.5:0.5,0,-1]).map((v,j)=>j===0?mix(v,g.C[0]+Math.sign(pole[0]-g.C[0])*g.dsep,0.6):v); const nr=reform*2.5*UM;
    put(K.depthOf(nc,P)+3,'<g class="bio-stain" style="--stain:var(--stain-dapi);--stain-k:.8" opacity="'+Math.min(1,reform*1.6).toFixed(2)+'">'+K.solidSvg(G.sphereOf(nc,nr,P),{tone:"hi"})+'</g>'); }
  // spindle: kinetochore fibres from each pole to its chromatid's centromere, and short astral rays
  const spindle=sm(13,20,t)*(1-sm(56,64,t));
  const ch=chromatids(t,g);
  if(spindle>0.01){ for(const c of ch){ const pole=g.poles[c.side<0?0:1]; put((K.depthOf(pole,P)+K.depthOf(c.cen,P))/2-0.5,'<g opacity="'+spindle.toFixed(2)+'">'+K.lineSvg(K.segment(pole,c.cen,P),{tone:"lo"})+'</g>'); }
    for(const [pi,pole] of g.poles.entries()){ for(let j=0;j<9;j++){ const a=j/9*Math.PI*2; const dir=G.unit3([pi?1:-1,Math.cos(a)*1.2,Math.sin(a)*1.2]); put(K.depthOf(pole,P)-1,'<g opacity="'+(spindle*0.7).toFixed(2)+'">'+K.lineSvg(K.segment(G.add3(pole,G.mul3(dir,2*Q)),G.add3(pole,G.mul3(dir,10*Q)),P),{tone:"faint",free:"end"})+'</g>'); } } }
  // centrosomes: two centrioles at right angles at each pole
  for(const pole of g.poles){ const F1=G.frameAlong(pole,[0,1,0]), F2=G.frameAlong(G.add3(pole,[0,0,1.6*Q]),[1,0,0]);
    put(K.depthOf(pole,P),K.solidSvg(G.disc(-1.6*Q,1.6*Q,0.9*Q,F1,P),{tone:"mid"})+K.solidSvg(G.disc(-1.6*Q,1.6*Q,0.9*Q,F2,P),{tone:"mid"})); }
  // chromatids (the subject), stained with haematoxylin's purple
  const fadeCh=1-sm(60,68,t);
  if(sm(-6,4,t)>0.01&&fadeCh>0.01) for(const c of ch){ for(const piece of T.tubePieces(c.route,c.r,P,{maxLength:5})) put(G.dot3(piece.mid,V),'<g class="bio-stain" style="--stain:var(--stain-hema)" opacity="'+(sm(-6,4,t)*fadeCh).toFixed(2)+'">'+T.tubeSvg(piece,{tone:"hi"})+'</g>');
    put(K.depthOf(c.cen,P)+0.3,'<g opacity="'+(sm(10,18,t)*fadeCh).toFixed(2)+'">'+K.dotsSvg([at(c.cen)],{size:0.8*Q,tone:"hi"})+'</g>'); }
  items.sort((a,b)=>a[0]-b[0]);
  // contractile ring: the visible front arc where the furrow pinches, drawn on the membrane
  let ring="";
  if(g.cyto>0.02&&mem.neck>0.6){ const F=G.frameOf(g.C,[1,0,0],[0,1,0],[0,0,1]); ring='<path class="iso-line" data-tone="lit" style="stroke-width:1.3" opacity="'+sm(0.12,0.45,g.cyto).toFixed(2)+'" d="'+G.arcOf(F,0,mem.neck,P,{})+'"/>'; }
  const shadow='<path class="iso-halo" d="'+K.haloOf({x:-g.dsep-g.Rm*0.8,y:-g.Rm*0.8,w:2*(g.dsep+g.Rm*0.8),d:g.Rm*1.6,r:g.Rm*0.8},SZ,1,P)+'" style="opacity:.25"/>';
  cellG.innerHTML=shadow+back+items.map((x)=>x[1]).join("")+front+ring;
  const text=phaseOf(t)+" · "+(t<0?"−"+Math.abs(t).toFixed(0):"+"+t.toFixed(0))+" min";
  if(readout.textContent!==text) readout.textContent=text; stage.setAttribute("aria-valuenow",String(Math.round(t))); stage.setAttribute("aria-valuetext",text);
}
let t=30, target=30, touring=!still.matches, visible=false, frame=0, last=0, idle=0, drawn=null, hold=0, fade=1;
function tick(now){ const dt=last?Math.min((now-last)/1000,1/30):1/60; last=now;
  if(touring){ if(target<T1){ target=Math.min(T1,target+dt*4.2); } else { hold+=dt; if(hold>2.2){ fade=Math.max(0,fade-dt*2.5); if(fade===0){ target=T0; t=T0; hold=0; } } } if(fade<1&&hold===0) fade=Math.min(1,fade+dt*2.5); cellG.setAttribute("opacity",fade.toFixed(2)); }
  t=still.matches?target:t+(target-t)*(1-Math.exp(-dt/0.25)); if(Math.abs(target-t)<0.01) t=target;
  if(drawn===null||Math.abs(t-drawn)>0.02){ draw(t); drawn=t; }
  frame=visible&&(touring||t!==target)?requestAnimationFrame(tick):0; }
const run=()=>{ if(!frame&&visible){ last=0; frame=requestAnimationFrame(tick);} };
const steer=(v)=>{ touring=false; fade=1; hold=0; cellG.setAttribute("opacity","1"); target=Math.max(T0,Math.min(T1,v)); clearTimeout(idle); idle=setTimeout(()=>{touring=!still.matches; run();},4500); run(); };
new IntersectionObserver((e)=>{visible=e[e.length-1].isIntersecting; if(visible) run();},{rootMargin:"120px 0px"}).observe(stage);
stage.addEventListener("pointermove",(e)=>{ const b=svg.getBoundingClientRect(); const s=((e.clientX-b.left)/b.width-0.15)/0.7; steer(T0+Math.min(1,Math.max(0,s))*(T1-T0)); });
stage.addEventListener("keydown",(e)=>{ const starts=PH.map((p)=>p[1]+0.5).concat([T1]); let to=null;
  if(e.key==="ArrowRight") to=starts.find((s)=>s>target+0.6); else if(e.key==="ArrowLeft") to=[...starts].reverse().find((s)=>s<target-0.6); else if(e.key==="Home") to=T0; else if(e.key==="End") to=T1;
  if(to===undefined||to===null) return; e.preventDefault(); steer(to); });
draw(t); drawn=t;
`;
const body = k.plateHtml({
  fig: "Fig 03", title: "Mitosis", hint: "Hover ↔ to scrub time · ← → phase",
  readout: "Metaphase · +30 min", keys: [{ mark: "dotted", label: "Chromatids (2n = 8), stained purple" }, { mark: "blue", label: "Nuclei" }, { mark: "lit", label: "Contractile ring" }],
  caption: "A 14 µm rounded animal cell (ruler: 1 tick = 1 µm) with 2n = 8 chromosomes, as in the fruit fly. Mitosis takes about an hour (shown about 250× faster): the chromosomes condense in prophase, the envelope breaks and the spindle captures every kinetochore, all eight line up on the metaphase plate, then the sisters are pulled apart in about five minutes and an actomyosin ring pinches the cell in two, each daughter half the volume (0.79× the radius).",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Mitosis: arrow keys step from phase to phase" aria-valuemin="-8" aria-valuemax="72" aria-valuenow="30">${svg}</div>`,
});
const page = vitaPage({ n: "03", title: "Mitosis", zh: "有丝分裂 · 细胞尺度", body, script: liveScript() + live,
  facts: [["~60 min", "哺乳动物细胞 M 期"], ["~5 min", "后期姐妹染色单体分离"], ["~1 µm/min", "染色体被拉向两极的速度"], ["2^(−1/3)", "子细胞半径比 = 0.79"], ["~37 万亿", "人体约有的细胞数"]] });
writeFileSync(join(OUT, "03-mitosis.html"), page);
console.log("wrote 03-mitosis.html", (page.length / 1024).toFixed(0) + " KB");
