// 05 · Ribosome — a tape reader. The mRNA runs from a guide block on the left (5′) through the reader to a guide
// on the right (3′). The small subunit carries the tape; the large subunit (near half cut away) holds three bays, E P A.
// What moves: tRNAs dock in A only if their teeth key into the codon's teeth; the chain passes to the new tRNA; the tape
// advances one codon; the spent tRNA leaves from E. The chain is real GFP, and it grows out of the exit tunnel.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, liveScript, LOOP_SRC, plinth, stain, vitaPage, byDepth } from "../../bio/bio.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../site/demos");
const W = 720, H = 480;
const NT = 7, CU = 3 * NT; // one nucleotide, one codon (the tape is drawn ~3× stretched)
const ZT = 58; // top of the small subunit, where the tape runs
const TOP = ZT + 104, DECK = 10;
const EXIT = [-34, -22];
const PLATE = { x: -192, y: -78, w: 384, d: 150, r: 10 };
const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [-140, -60, TOP + DECK + 44], [CU + 40, 90, ZT + 50]], W, H, { pad: 12, azimuth: 40 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);

// GFP (Aequorea victoria, 238 aa), one common E. coli codon per amino acid
const GFP = "MSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITHGMDELYK";
const CODON = { A: "GCG", R: "CGU", N: "AAC", D: "GAU", C: "UGC", Q: "CAG", E: "GAA", G: "GGC", H: "CAU", I: "AUU", L: "CUG", K: "AAA", M: "AUG", F: "UUU", P: "CCG", S: "AGC", T: "ACC", W: "UGG", Y: "UAU", V: "GUG" };
const NAME = { A: "Ala", R: "Arg", N: "Asn", D: "Asp", C: "Cys", Q: "Gln", E: "Glu", G: "Gly", H: "His", I: "Ile", L: "Leu", K: "Lys", M: "Met", F: "Phe", P: "Pro", S: "Ser", T: "Thr", W: "Trp", Y: "Tyr", V: "Val" };
const CODONS = [...GFP].map((a) => CODON[a]).concat(["UAA"]);
if (CODONS.length !== 239) throw new Error("GFP length");

// ---------- static ----------
function smallSubunit() {
  const out = [];
  for (const x of [-60, 60]) {
    out.push(S(k.cylinder(x, 0, 14, 0, 2.4, P, 32, 0.5), { tone: "mid" }));
    out.push(S(k.cylinder(x, 0, 7, 2.4, 16, P, 24), { tone: "mid", crease: "none" }));
  }
  const body = { x: -104, y: -58, w: 208, d: 116, r: 18 };
  out.push(`<path class="iso-halo" d="${k.haloOf(body, 18, 2, P)}" style="opacity:.2"/>`);
  out.push(stain("hema", S(k.slabOf(body, 18, ZT - 20, P, 10, 1.6), { tone: "hi" }), 0.08));
  out.push(stain("hema", L(k.sideSeam(body, 30, P, 10), { tone: "faint" }), 0.3));
  // the mRNA channel: two low rails either side of the tape, with screws
  for (const y of [-16, 11]) {
    const rail = { x: -98, y, w: 196, d: 5, r: 1.5 };
    out.push(S(k.slabOf(rail, ZT - 2, 4, P, 4, 0.5), { tone: "mid" }));
    out.push(D([-80, -40, 0, 40, 80].map((x) => at([x, y + 2.5, ZT + 2])), { size: 0.42 }));
  }
  out.push(L(k.planOutline(k.insetPlan(body, 5), ZT - 2, P, 10), { tone: "faint" }));
  // guide tables and slotted blocks at both ends
  for (const s of [-1, 1]) {
    const tab = { x: s < 0 ? -150 : 104, y: -14, w: 46, d: 28, r: 2 };
    out.push(S(k.cylinder(tab.x + tab.w / 2, 0, 3.4, 0, ZT - 6, P, 18), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(tab.x + tab.w / 2, 0, 8, 0, 2, P, 24), { tone: "mid" }));
    out.push(S(k.slabOf(tab, ZT - 6, 4, P, 4, 0.5), { tone: "mid" }));
  }
  return out.join("");
}
function guide(s) { // a block the tape passes through; drawn after the tape
  const b = { x: s < 0 ? -168 : 150, y: -20, w: 18, d: 40, r: 2 };
  const out = [S(k.slabOf(b, ZT - 6, 24, P, 4, 0.6), { tone: "mid" })];
  out.push(L(k.planOutline(k.insetPlan(b, 3), ZT + 18, P, 4), { tone: "faint" }));
  out.push(D(k.corners(k.insetPlan(b, 3)).map(([x, y]) => at([x, y, ZT + 18])), { size: 0.45 }));
  // the slot on the face toward the reader
  const fx = s < 0 ? b.x + b.w : b.x;
  if (s > 0) out.push(`<path class="bio-lumen" d="${k.pathOf([at([fx, -9, ZT - 3]), at([fx, 9, ZT - 3]), at([fx, 9, ZT + 9]), at([fx, -9, ZT + 9])], true)}"/>`);
  return out.join("");
}
// the large subunit: back wall, two towers cantilevered over the tape, and a deck with the exit tunnel
const backWall = S(k.slabOf({ x: -104, y: -58, w: 208, d: 20, r: 3 }, ZT + 2, TOP - ZT - 2, P, 6, 1.2), { tone: "hi" });
const tower = (x0) => S(k.slabOf({ x: x0, y: -40, w: 22, d: 54, r: 3 }, ZT + 14, TOP - ZT - 14, P, 6, 1.2), { tone: "hi" }) + L(k.sideSeam({ x: x0, y: -40, w: 22, d: 54, r: 3 }, ZT + 34, P, 6), { tone: "faint" });
const deckPlan = { x: -108, y: -60, w: 216, d: 76, r: 6 };
const deck = S(k.slabOf(deckPlan, TOP, DECK, P, 8, 1.4), { tone: "hi" })
  + `<path class="bio-lumen" d="${k.ring(EXIT[0], EXIT[1], 7, TOP + DECK, P, 32)}"/>` + L(k.ring(EXIT[0], EXIT[1], 7, TOP + DECK, P, 32), { tone: "mid" })
  + L(k.ring(EXIT[0], EXIT[1], 11, TOP + DECK, P, 36), { tone: "faint" })
  + L(k.planOutline(k.insetPlan(deckPlan, 5), TOP + DECK, P, 8), { tone: "faint" })
  + D(k.corners(k.insetPlan(deckPlan, 4)).map(([x, y]) => at([x, y, TOP + DECK])), { size: 0.45 })
  + L(k.sideSeam(deckPlan, TOP + 4, P, 8), { tone: "faint" });
// bay marks on the back wall: E P A
const bays = L([-CU, 0, CU].map((x) => k.segment([x, -38, ZT + 30], [x, -38, ZT + 96], P)).join(""), { tone: "faint", free: true });

const svg = k.figureSvg({
  width: W, height: H,
  label: "A ribosome drawn as a tape reader. The messenger RNA runs as a toothed tape from a guide block on the left, across the small subunit, to a guide block on the right. Above it the large subunit, its near half cut away, holds three bays. L-shaped transfer RNAs dock in the right-hand bay when their teeth key into the codon, pass the growing chain along, shift left with the tape, and leave. The green chain, the first residues of GFP, grows out of a tunnel in the top deck.",
  body: [
    plinth(PLATE, P, { scale: { x: PLATE.x + 14, y: PLATE.y + PLATE.d - 14, w: 150, step: 7, every: 5 }, label: { x: PLATE.x + PLATE.w - 50, y: PLATE.y + PLATE.d - 20, w: 34 } }),
    smallSubunit(), guide(-1), `<g data-part="tape"></g>`, guide(1), backWall, bays, `<g data-part="inside"></g>`, tower(-104), tower(82), deck, `<g data-part="chain"></g>`, `<g data-part="front"></g>`,
  ],
});

const live = `
const P=${JSON.stringify(P)}; const NT=${NT}, CU=${CU}, ZT=${ZT}, TOP=${TOP}, DECK=${DECK}; const EXIT=${JSON.stringify(EXIT)};
const SEQ=${JSON.stringify(GFP)}; const CODONS=${JSON.stringify(CODONS)}; const NAME=${JSON.stringify(NAME)};
${"function rng(seed){let s=seed>>>0||1;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296);}"}
const rand=rng(1961); // the year the code was cracked
const stage=document.querySelector(".iso-stage"), svg=stage.querySelector("svg"), readout=document.querySelector("[data-readout]");
const tapeG=svg.querySelector('[data-part="tape"]'), insideG=svg.querySelector('[data-part="inside"]'), chainG=svg.querySelector('[data-part="chain"]'), frontG=svg.querySelector('[data-part="front"]');
const at=(p)=>K.iso(p,P), S=(paths,st)=>K.solidSvg(paths,st);
const sg=(n,h,a)=>'<g class="bio-stain" style="--stain:var(--stain-'+n+');--stain-k:'+(a??1)+'">'+h+'</g>';
const ease=(t)=>t<0?0:t>1?1:t*t*(3-2*t);
const PUR=(b)=>b==="A"||b==="G"; const TH=(b)=>PUR(b)?6.5:3.5; const PAIR={A:"U",U:"A",G:"C",C:"G"};
// truth: E. coli elongation ~12–20 aa/s; ~1 in 10⁴ residues wrong after proofreading; near-cognate tRNAs are sampled
// and rejected far more often than that. Shown 40× slower.
const SLOW=40;
let iP=4, shift=0, chainLen=5, supply=0.8, supplyT=0.8;
// tRNAs: {codon index, x (bay centre), y offset, z offset, alpha, wrong}
let tP={i:4}, tE={i:3,leave:0}, tA=null, inc=null, ef=0, rf=null, released=0, made=0, wrong=0, rejected=0;
let stage_="deliver", st_t=0;
const rate=()=>20*supply/(supply+0.4);
const tapeX=(j)=>(j-iP)*CU-shift*CU; // centre x of codon j
function tape(){
  const h=[]; const x0=-150, x1=150;
  const j0=Math.floor(iP+shift-150/CU)-1, j1=Math.ceil(iP+shift+150/CU)+1;
  // the strip
  const plan={x:x0,y:-7,w:x1-x0,d:14,r:1};
  h.push(sg("trna",S(K.slabOf(plan,ZT-2,1.6,P,3,0.3),{tone:"mid"}),0.25));
  const grooves=[], teeth=[];
  for(let j=j0;j<=j1;j++){ const cx=tapeX(j); const cod=j>=0&&j<CODONS.length?CODONS[j]:"AAA";
    const b0=cx-CU/2; if(b0>x0+0.5&&b0<x1-0.5) grooves.push(K.lineOnTop([b0,-7],[b0,7],ZT-0.4,P));
    for(let n=0;n<3;n++){ const x=b0+NT*n+NT/2; if(x<x0+2.5||x>x1-2.5) continue; teeth.push([x,TH(cod[n])]); } }
  h.push(K.lineSvg(grooves.join(""),{tone:"lo"}));
  teeth.sort((a,b)=>a[0]-b[0]);
  for(const [x,th] of teeth) h.push(S(K.slabOf({x:x-2.4,y:-3,w:4.8,d:6,r:0.8},ZT-0.4,th,P,3,0.3),{tone:"hi"}));
  tapeG.innerHTML=h.join("");
}
// a tRNA: foot with three teeth over its codon, leg up, elbow, arm back toward the peptidyl centre
function trnaSvg(t, x, dy, dz, alpha, wrongCodon){
  const cod=wrongCodon||CODONS[t.i]||"AAA"; const foot=ZT+10+dz;
  const h=[]; const fx=x;
  const plan={x:fx-CU/2+1.2,y:-6+dy,w:CU-2.4,d:12,r:2};
  for(let n=0;n<3;n++){ const th=10-TH(cod[n]); const tx=fx-CU/2+NT*n+NT/2; h.push(S(K.slabOf({x:tx-2.2,y:-2.8+dy,w:4.4,d:5.6,r:0.8},foot-th,th,P,3,0.3),{tone:"hi"})); }
  h.push(S(K.slabOf(plan,foot,4,P,4,0.6),{tone:"mid"}));
  const xPTC=CU*0.5; const tip=[fx+(xPTC-fx)*0.35,-30+dy*0.6,ZT+88+dz];
  const route=G.fillet([[fx,dy,foot+3],[fx,dy,ZT+66+dz],[fx+(xPTC-fx)*0.2,-26+dy,ZT+76+dz],tip],10,7);
  const items=[]; for(const p of T.tubePieces(G.resample(route,1.4),5.2,P,{maxLength:12})) items.push([K.depthOf(p.mid,P),T.tubeSvg(p,{tone:"hi"})]);
  items.sort((a,b)=>a[0]-b[0]);
  return {svg:'<g opacity="'+alpha.toFixed(2)+'">'+sg("trna",h.join("")+items.map((x)=>x[1]).join(""),0.55)+'</g>', tip};
}
function aaBead(p,r){ return sg("gfp",S(G.sphereOf(p,r,P),{tone:"hi"}),0.6); }
function draw(){
  tape();
  const ins=[], fr=[];
  const put=(t,xx,dy,dz,al,wc,bead)=>{ const r=trnaSvg(t,xx,dy,dz,al,wc); let s=r.svg; if(bead) s+=bead(r.tip); (dy>38?fr:ins).push([K.depthOf([xx,dy,ZT+60],P),s]); return r.tip; };
  // E: leaving up and toward the viewer
  if(tE){ const l=ease(tE.leave); put(tE,tapeX(tE.i)-l*30,l*90,l*40,1-l*0.95); }
  // P holds the chain
  let tipP=null;
  if(tP) tipP=put(tP,tapeX(tP.i),0,0,1, null, (tip)=>chainHeld==="P"?aaBead(tip,4.6):"");
  let tipA=null;
  if(tA) tipA=put(tA,tapeX(tA.i),0,0,1,null,(tip)=>aaBead(tip,4.6));
  // incoming ternary complex: tRNA + EF-Tu (a ball on its arm), or a near-cognate that will be thrown back
  if(inc){ const e=ease(inc.t); const dy=(1-e)*96, dz=(1-e)*22, dx=(1-e)*60; const xx=CU+dx-shift*CU;
    const tip=put({i:iP+1},xx,dy,dz,Math.min(1,inc.t*3)*(inc.out?1-inc.out:1),inc.wrong?inc.codon:null,(tp)=>aaBead(tp,4.6)+'<g opacity="'+(1-ef).toFixed(2)+'">'+K.solidSvg(G.sphereOf([tp[0]+10,tp[1]+12,tp[2]+6],11,P),{tone:"mid"})+'</g>'); }
  // release factor at the stop codon
  if(rf){ const e=ease(rf.t); const q=[CU,(1-e)*90+0,ZT+50+(1-e)*30]; (q[1]>38?fr:ins).push([K.depthOf(q,P),'<g opacity="'+Math.min(1,rf.t*3).toFixed(2)+'">'+K.solidSvg(G.sphereOf(q,13,P),{tone:"mid"})+K.solidSvg(G.sphereOf([q[0],q[1]-4,q[2]-24],7,P),{tone:"mid"})+'</g>']); }
  ins.sort((a,b)=>a[0]-b[0]); fr.sort((a,b)=>a[0]-b[0]);
  // the chain inside: from the holding tRNA's tip up to the tunnel
  const holder=chainHeld==="A"?tipA:tipP;
  let inside="";
  if(holder&&chainLen>0){ const route=G.resample([holder,[holder[0]-6,holder[1]+2,holder[2]+12],[EXIT[0],EXIT[1],TOP-8],[EXIT[0],EXIT[1],TOP+2]],1.4);
    inside=sg("gfp",T.tubePieces(route,2.2,P,{maxLength:40}).map((p)=>T.tubeSvg(p,{tone:"lit"})).join(""),0.5); }
  insideG.innerHTML=inside+ins.map((x)=>x[1]).join("");
  frontG.innerHTML=fr.map((x)=>x[1]).join("");
  // the chain outside: one bead per residue, oldest at the far end; after release it drifts away
  const beads=[]; const off=chainOff; const n=Math.min(chainLen,28);
  for(let j=0;j<n;j++){ const s=(j+off)*8.4; const q=[EXIT[0]-s*0.62-released*60,EXIT[1]-s*0.12+12*Math.sin(s/15),TOP+DECK+4+s*0.36+6*Math.sin(s/9)+released*40]; beads.push([q,j]); }
  const links=beads.length>1?K.lineSvg(K.pathOf(beads.map(([q])=>at(q))),{tone:"lit"}):"";
  const fadeTail=(j)=>chainLen>28&&j>20?Math.max(0,1-(j-20)/8):1;
  beads.sort((a,b)=>K.depthOf(a[0],P)-K.depthOf(b[0],P));
  chainG.innerHTML='<g opacity="'+(1-released).toFixed(2)+'">'+sg("gfp",links+beads.map(([q,j])=>'<g opacity="'+fadeTail(j).toFixed(2)+'">'+K.solidSvg(G.sphereOf(q,4.2,P),{tone:"hi"})+'</g>').join(""),0.75)+'</g>';
}
let chainHeld="P", chainOff=0;
const WRONG={GCG:"GCU",CGU:"CGA",AAC:"AAU",GAU:"GGU",UGC:"UGU",CAG:"CAA",GAA:"GAG",GGC:"GCC",CAU:"CAC",AUU:"AUC",CUG:"CUU",AAA:"AAG",AUG:"AUA",UUU:"UUC",CCG:"CCA",AGC:"AGU",ACC:"ACU",UGG:"UGA",UAU:"UAC",GUG:"GCG",UAA:"UAA"};
function nearCognate(c){ // one wrong base, chosen to change a purine to a pyrimidine so the teeth visibly clash
  const n=Math.floor(rand()*3); const b=c[n]; const nb=PUR(b)?(b==="A"?"C":"U"):(b==="U"?"G":"A"); return c.slice(0,n)+nb+c.slice(n+1); }
function step(dt){
  supply+=(supplyT-supply)*(1-Math.exp(-dt/0.5));
  const per=SLOW/rate(); // seconds of screen time per codon
  const dur={deliver:per*0.38, reject:per*0.3, accommodate:per*0.12, transfer:per*0.14, translocate:per*0.28, release:per*1.2};
  st_t+=dt;
  if(tE&&tE.leave<1){ tE.leave=Math.min(1,tE.leave+dt/(per*0.5)); if(tE.leave>=1) tE=null; }
  if(stage_==="deliver"){
    const stop=CODONS[iP+1]==="UAA";
    if(stop){ if(!rf) rf={t:0}; rf.t=Math.min(1,rf.t+dt/(per*0.4)); if(rf.t>=1){ stage_="release"; st_t=0; } return; }
    if(!inc){ const w=rand()<0.33&&made>1; inc={t:0,wrong:w,codon:w?nearCognate(CODONS[iP+1]):null,out:0}; ef=0; }
    if(inc.wrong){ if(inc.t<0.82) inc.t+=dt/dur.deliver; else { inc.out+=dt/dur.reject; if(inc.out>=1){ inc=null; rejected++; } } return; }
    inc.t=Math.min(1,inc.t+dt/dur.deliver); if(inc.t>=1){ stage_="accommodate"; st_t=0; }
  } else if(stage_==="accommodate"){ ef=Math.min(1,st_t/dur.accommodate); if(st_t>=dur.accommodate){ tA={i:iP+1}; inc=null; stage_="transfer"; st_t=0; } }
  else if(stage_==="transfer"){ if(st_t>=dur.transfer*0.5&&chainHeld==="P"){ chainHeld="A"; chainLen++; made++; } if(st_t>=dur.transfer){ stage_="translocate"; st_t=0; } }
  else if(stage_==="translocate"){ const t=ease(st_t/dur.translocate); shift=t; chainOff=1-t; if(st_t>=dur.translocate){ shift=0; chainOff=0; iP++; tE={i:tP.i,leave:0}; tP=tA; tA=null; chainHeld="P"; stage_="deliver"; st_t=0; } }
  else if(stage_==="release"){ released=Math.min(1,st_t/dur.release); if(st_t>=dur.release){ // start a new round at the start codon
      iP=0; chainLen=1; released=0; rf=null; tP={i:0}; tE=null; tA=null; made=1; stage_="deliver"; st_t=0; } }
}
function say(){ const j=Math.min(iP+1,CODONS.length-1); const c=CODONS[j]; const aa=c==="UAA"?"stop":NAME[SEQ[j]];
  vitaSay(stage,readout,"codon "+(j+1)+" "+c+" → "+aa+" · "+(chainLen)+"/238 aa · "+rate().toFixed(0)+" aa/s"); }
vitaLoop({ stage, idleMs:6000,
  frame(dt,st){ if(st.touring) supplyT=0.8+0.45*Math.sin(st.clock*2*Math.PI/40); if(dt>0) step(dt); draw(); say(); },
  pointer(x){ supplyT=0.05+x*1.4; },
  keys(key){ if(key==="ArrowRight"||key==="ArrowUp"){ supplyT=Math.min(1.45,supplyT+0.15); return true; } if(key==="ArrowLeft"||key==="ArrowDown"){ supplyT=Math.max(0.05,supplyT-0.15); return true; } return false; },
});
`;
const body = k.plateHtml({
  fig: "Fig 05", title: "Ribosome", hint: "Hover ↔ charged tRNA supply",
  readout: "codon 6 GGC → Gly", keys: [{ mark: "lit", label: "The growing chain (GFP)" }, { mark: "trna", label: "mRNA tape and tRNAs" }, { mark: "raised", label: "EF-Tu / release factor" }],
  caption: "A bacterial 70S ribosome, about 21 nm across (ruler: 1 tick = 1 nm), with the near half of the large subunit cut away; the mRNA tape is drawn about 3× stretched so its codons can be read. Each tooth is a base: purines (A, G) tall, pyrimidines (U, C) short, so only the right anticodon closes the gap. A tRNA arrives with EF-Tu, is tested in the A bay, and a near-cognate one is thrown back; the right one takes the chain from the P bay in a new peptide bond, then the tape and both tRNAs shift one codon and the empty one leaves from E. The tape is the real GFP gene, so the chain is GFP, 238 residues, ended by a release factor at UAA. A bacterial ribosome adds about 15–20 residues a second; shown 40× slower.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Ribosome: arrow keys change the tRNA supply" aria-valuemin="0" aria-valuemax="1.5">${svg}</div>`,
});
const page = vitaPage({ n: "05", title: "Ribosome", zh: "核糖体 · 读带机", en: "Ribosome · tape reader", body, script: liveScript() + LOOP_SRC + live,
  facts: [["~21 nm", "细菌 70S 核糖体", "bacterial 70S ribosome"], ["15–20 aa/s", "大肠杆菌延伸速度", "E. coli elongation rate"], ["~10⁻⁴", "每个残基的出错率", "error rate per residue"], ["61 + 3", "有义密码子 + 终止密码子", "sense codons + stop codons"], ["238 aa", "GFP 全长（本图的磁带）", "full-length GFP (this figure's tape)"]] });
writeFileSync(join(OUT, "05-ribosome.html"), page);
console.log("wrote 05-ribosome.html", (page.length / 1024).toFixed(0) + " KB");
