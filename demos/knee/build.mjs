// 13 · Knee — a human knee teaching model, seated position: the femur lies in two strapped cradles, the tibia hangs from
// it by its ligaments alone, and a protractor goniometer behind the joint reads the bend. The lateral compartment
// (lateral condyle, lateral plateau, lateral meniscus) is glass, so the two cruciate ligaments in the notch stay in view.
// What moves: flexion, 0–135°. The ACL and PCL are drawn as the crossed four-bar linkage they form with the bones
// (O'Connor & Zavatsky): their crossing point is the knee's instant centre, so as the knee bends the femur rolls back on
// the tibia, and the femoral condyle here is *derived* as the envelope of the plateau under that linkage. Each cruciate is
// two bundles whose length comes from the same geometry, so the reader sees one bundle go taut while the other slackens.
// Space / click cycles intact → ACL torn (tibia slides forward under a Lachman-type pull) → PCL torn (tibia sags back).
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, liveScript, LOOP_SRC, plinth, stain, vitaPage, byDepth } from "../../bio/bio.mjs";
import { blobOf } from "../../bio/soft.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../site/demos");
const W = 720, H = 500;
const MM = 3.4;      // 1 mm = 3.4 world units
const ZK = 252;      // height of the joint line (femur axis) above the bench

// ---------- the model: a crossed four-bar in the sagittal plane (mm; u = anterior, w = proximal, tibia frame) ----------
// Attachments chosen to give adult lengths: ACL ≈ 31 mm, PCL ≈ 37 mm (Duthon 2006: ACL 22–41, mean 32 mm; PCL ~38 mm).
const MODEL_SRC = `
const KN={Ta:[5,0],Tp:[-18,-6],A0:[-12,26],B0:[6,22]};
const kd=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]), kang=(a,b)=>Math.atan2(b[1]-a[1],b[0]-a[0]);
const krot=(p,a)=>[p[0]*Math.cos(a)-p[1]*Math.sin(a),p[0]*Math.sin(a)+p[1]*Math.cos(a)];
const KL={a:kd(KN.Ta,KN.A0),p:kd(KN.Tp,KN.B0),f:kd(KN.A0,KN.B0)};
const KTAB=(()=>{ const phi0=kang(KN.Ta,KN.A0), beta0=kang(KN.A0,KN.B0), out=[];
  for(let i=0;i<=700;i++){ const phi=phi0-0.12+i*0.0015; const A=[KN.Ta[0]+KL.a*Math.cos(phi),KN.Ta[1]+KL.a*Math.sin(phi)];
    const D=kd(A,KN.Tp), a=(KL.f*KL.f-KL.p*KL.p+D*D)/(2*D), h=Math.sqrt(Math.max(0,KL.f*KL.f-a*a));
    const ex=[(KN.Tp[0]-A[0])/D,(KN.Tp[1]-A[1])/D]; const B=[A[0]+a*ex[0]-h*ex[1],A[1]+a*ex[1]+h*ex[0]];
    out.push([kang(A,B)-beta0,A,B]); }
  return out; })();
// pose at flexion th (deg); D = extra anterior shift of the tibia (mm) when a cruciate is cut
function kneePose(thDeg,D=0){ const th=thDeg*Math.PI/180; let i=1; while(i<KTAB.length-1&&KTAB[i][0]<th) i++;
  const a=KTAB[i-1], b=KTAB[i], t=Math.max(0,Math.min(1,(th-a[0])/((b[0]-a[0])||1e-9)));
  const A=[a[1][0]+(b[1][0]-a[1][0])*t,a[1][1]+(b[1][1]-a[1][1])*t], B=[a[2][0]+(b[2][0]-a[2][0])*t,a[2][1]+(b[2][1]-a[2][1])*t];
  const r=[A[0]-KN.Ta[0],A[1]-KN.Ta[1]], q=[B[0]-KN.Tp[0],B[1]-KN.Tp[1]], den=r[0]*q[1]-r[1]*q[0];
  const s=((KN.Tp[0]-KN.Ta[0])*q[1]-(KN.Tp[1]-KN.Ta[1])*q[0])/den;
  return {th, A, B, D, I:[KN.Ta[0]+s*r[0],KN.Ta[1]+s*r[1]]}; }
// a tibia-frame point [u,w] into the femur frame
function tibToFem(p,S){ const r=krot([p[0]+S.D-S.A[0],p[1]-S.A[1]],-S.th); return [r[0]+KN.A0[0],r[1]+KN.A0[1]]; }
// two bundles per cruciate (tibial [u,w,y], femoral [u,w,y]); reciprocal tension falls out of the geometry
const BUNDLES=[
  {lig:"PCL",name:"PM",t:[-20.5,-6,-5],f:[3.5,24.5,-6]},
  {lig:"PCL",name:"AL",t:[-15.5,-6,-2],f:[6,19.5,-3]},
  {lig:"ACL",name:"PL",t:[2.5,0,3],f:[-14.5,26,6]},
  {lig:"ACL",name:"AM",t:[6,0,-1],f:[-9.5,23.5,4]}];
`;
const M = new Function(MODEL_SRC + "; return { KN, KL, kneePose, tibToFem, BUNDLES, krot };")();
const LMAX = M.BUNDLES.map((b) => { let mx = 0; for (let th = 0; th <= 135; th += 1) { const S = M.kneePose(th); const f = M.tibToFem(b.t, S); mx = Math.max(mx, Math.hypot(f[0] - b.f[0], f[1] - b.f[1], b.t[2] - b.f[2])); } return +mx.toFixed(2); });
const roll = (th) => -M.kneePose(th).I[0]; // contact point behind the plateau centre, mm
const ROLL0 = roll(0), ROLL135 = roll(135);

// femur frame [u, w, y] (mm) → world. The femur lies along −x (hip behind the knee), its front face up.
const F2W = ([u, w, y]) => [-w * MM, y * MM, ZK + u * MM];
const w2x = (w) => -w * MM;

// ---------- the femur, derived: condyle = envelope of the plateau under the linkage ----------
const RC = 13; // condyle half-width (sphere radius, mm): each condyle ~26 mm wide, notch ~18 mm
const centreCurve = [];
for (let th = -6; th <= 122; th += 4) {
  const S = M.kneePose(th); const c = M.tibToFem([S.I[0], 0], S); const n = M.krot([0, RC], -S.th); // inward normal
  centreCurve.push([c[0] + n[0], c[1] + n[1]]);
}
// close it: posterior condyle up toward the shaft, and forward round the trochlea
const last = centreCurve[centreCurve.length - 1];
for (let i = 1; i <= 3; i++) centreCurve.push([last[0] + i * 2.4, last[1] + i * 2.2]);
const trochlea = []; for (let a = -110; a <= 10; a += 12) { const r = a * Math.PI / 180; trochlea.push([2 + 10 * Math.cos(r), 20 + 10 * Math.sin(r)]); }
const condyle = (y, rr = RC) => [...centreCurve, ...trochlea].map(([u, w]) => [...F2W([u, w, y]), rr * MM]);
const metaphysis = (ys) => ys.flatMap((y) => [[8, 30, 16], [2, 38, 15], [0, 46, 14], [10, 24, 14], [-8, 30, 14]].map(([u, w, r]) => [...F2W([u, w, y]), r * MM]));

// ---------- camera ----------
const PLATE = { x: -330, y: -120, w: 540, d: 210, r: 12 };
const fitPts = [...k.boxCorners(PLATE, -15, 0), F2W([18, 88, 0]), F2W([-14, 88, 0]), F2W([0, -66, 0]), F2W([-62, 22, -48]), F2W([48, 40, 0]), F2W([48, 22, 0]), F2W([40, 60, 0])];
const P = k.fitProjection(fitPts, W, H, { pad: 14, azimuth: 72 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);

// ---------- static: the femur, its cradles and straps ----------
const femurBlob = blobOf([...condyle(-22), ...metaphysis([-15, -3])], P, { merge: 0.22, step: 1 });
const femurGhost = blobOf([...condyle(22), ...metaphysis([3, 15])], P, { merge: 0.22, step: 1 });
const SHAFT_R = 14 * MM; // femoral shaft ~28 mm across
const FS = G.frameAlong(F2W([0, 36, 0]), [-1, 0, 0]);
const shaft = S(G.solidOf([[0, SHAFT_R * 0.5, 1], [16, SHAFT_R * 1.04, 1], [50, SHAFT_R, 1], [50 * MM, SHAFT_R * 0.97]], FS, P, { smooth: true }), { tone: "hi" });
// cut end of the shaft faces away from us; a ruled section line marks where the model was sawn
const CRADLES = [w2x(70), w2x(84)];
function cradles() {
  const out = [];
  for (const x of CRADLES) {
    const top = ZK - SHAFT_R;
    out.push(S(k.cylinder(x, 0, 16, 0, 2.6, P, 32, 0.5), { tone: "mid" }));
    out.push(L(k.ring(x, 0, 11, 2.6, P, 28), { tone: "faint" }));
    out.push(D(k.corners({ x: x - 8, y: -8, w: 16, d: 16 }).map(([a, b]) => at([a, b, 2.6])), { size: 0.45 }));
    out.push(S(k.cylinder(x, 0, 4.6, 2.6, top - 30, P, 22), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(x, 0, 7.4, top - 34, 6, P, 24, 0.5), { tone: "mid" }));
    out.push(L(k.knurl(x, 0, 7.4, top - 33, top - 29, 22, P), { tone: "faint" }));
    out.push(S(k.slabOf({ x: x - 10, y: -24, w: 20, d: 48, r: 2 }, top - 28, 22, P, 4, 0.6), { tone: "mid" }));
    out.push(L(k.sideSeam({ x: x - 10, y: -24, w: 20, d: 48, r: 2 }, top - 20, P, 4), { tone: "faint" }));
  }
  return out.join("");
}
function straps() {
  return CRADLES.map((x) => {
    const F = G.frameAlong([x - 7, 0, ZK], [1, 0, 0]);
    const band = S(G.ringBand(2, 12, SHAFT_R, SHAFT_R + 1.6, F, P), { tone: "mid" });
    const ribs = L(G.ribsOf(F, 3, 11, SHAFT_R + 1.6, 4, P, { phase: 0.4 }), { tone: "faint" });
    const screw = D([at([x, SHAFT_R * 0.35 + 6, ZK + SHAFT_R * 0.98])], { size: 0.6, tone: "hi" });
    return band + ribs + screw;
  }).join("");
}

// ---------- static: the goniometer behind the joint (medial side) ----------
const GC = F2W([-4, 22, -48]); // pivot on the flexion axis (centre of the posterior condyle arc)
const GR = 58 * MM, GY = GC[1];
const GF = G.frameOf(GC, [0, 1, 0], [1, 0, 0], [0, 0, -1]); // a = +y (toward us); u = +x (tibia at 0°), v = down
const dialPoly = []; for (let i = 0; i <= 36; i++) { const a = (-8 + (188 * i) / 36) * Math.PI / 180; dialPoly.push([GR * Math.cos(a), GR * Math.sin(a)]); }
const gAt = (deg, r, y = GY + 3) => { const a = deg * Math.PI / 180; return [GC[0] + r * Math.cos(a), y, GC[2] - r * Math.sin(a)]; };
function goniometer() {
  const out = [];
  out.push(S(G.prismOf(GF, dialPoly, -3, 3, P), { tone: "mid" }));
  const minor = [], major = [], zero = [];
  for (let d = 0; d <= 140; d += 5) { const big = d % 15 === 0; (d === 0 ? zero : big ? major : minor).push(k.segment(gAt(d, GR - 3), gAt(d, GR - (big ? 13 : 8)), P)); }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }), L(zero.join(""), { tone: "hi" }));
  out.push(L(k.pathOf(Array.from({ length: 57 }, (_, i) => at(gAt(-6 + i * 2.5, GR - 3))), false), { tone: "faint" }));
  out.push(L(k.pathOf(Array.from({ length: 57 }, (_, i) => at(gAt(-6 + i * 2.5, GR - 26))), false), { tone: "faint" }));
  // fixed arm along the femur, screwed to the dial
  const arm = [[0, -5], [-GR - 30, -5], [-GR - 30, 5], [0, 5]].map(([a, b]) => [a, b - 1]);
  out.push(S(G.prismOf(G.frameOf([GC[0], GY + 3, GC[2]], [0, 1, 0], [1, 0, 0], [0, 0, -1]), arm, 0, 2.4, P), { tone: "mid" }));
  out.push(D([-GR - 24, -GR + 6, -30].map((xo) => at([GC[0] + xo, GY + 5.4, GC[2]])), { size: 0.55 }));
  return out.join("");
}
function gpost() { // a post under the dial, standing on the bench
  const x = GC[0], y = GY, z = GC[2] - GR;
  return S(k.cylinder(x, y, 9, 0, 2.4, P, 28), { tone: "mid" }) + S(k.cylinder(x, y, 3.6, 2.4, z - 2.4 - 6, P, 20), { tone: "mid", crease: "none" })
    + S(k.slabOf({ x: x - 10, y: y - 4, w: 20, d: 8, r: 1 }, z - 7, 7.5, P, 3, 0.4), { tone: "mid" });
}

const svg = k.figureSvg({
  width: W, height: H,
  label: "A teaching model of a human knee, seated: the thigh bone lies strapped in two cradles, the shin bone hangs from it, held only by its ligaments. The outer half of the joint is clear glass, so the two cruciate ligaments that cross in the middle of the knee can be seen. A protractor behind the joint reads the bend. As the knee bends the thigh bone rolls back on the shin, and one band of each cruciate goes tight while the other slackens.",
  body: [plinth(PLATE, P, { scale: { x: PLATE.x + 20, y: PLATE.y + PLATE.d - 15, w: 210, step: 5 * MM, every: 2 }, label: { x: PLATE.x + PLATE.w - 56, y: PLATE.y + PLATE.d - 21, w: 38 } }),
    gpost(), goniometer(), `<g data-part="tarm"></g>`, cradles(), `<g data-part="tibA"></g>`,
    shaft, straps(), S(femurBlob, { tone: "hi" }), `<g data-part="tibB"></g>`, `<g data-part="ligs"></g>`, `<g data-part="lat"></g>`,
    `<g class="knee-ghost">${S(femurGhost, { tone: "mid" })}</g>`, `<g data-part="front"></g>`],
});

// ---------- live ----------
const live = `
${MODEL_SRC}
const P=${JSON.stringify(P)}; const MM=${MM}, ZK=${ZK}; const LMAX=${JSON.stringify(LMAX)}; const ROLL0=${ROLL0.toFixed(3)};
const GC=${JSON.stringify(GC)}; const GR=${GR};
const stage=document.querySelector(".iso-stage"), svg=stage.querySelector("svg"), readout=document.querySelector("[data-readout]");
const slot=(n)=>svg.querySelector('[data-part="'+n+'"]');
const tarmG=slot("tarm"), tibA=slot("tibA"), tibB=slot("tibB"), ligG=slot("ligs"), latG=slot("lat"), frontG=slot("front");
const at=(p)=>K.iso(p,P);
const sg=(n,k,h)=>'<g class="bio-stain" style="--stain:var(--stain-'+n+');--stain-k:'+k+'">'+h+'</g>';
const F2W=([u,w,y])=>[-w*MM,y*MM,ZK+u*MM];
const sub=G.sub3, add=G.add3, mul=G.mul3, unit=G.unit3;
const tube=(pts,r,style)=>{ const out=[]; for(const pc of T.tubePieces(pts,r,P,{maxLength:400})) out.push(T.tubeSvg(pc,style)); return out.join(""); };
const depth=(p)=>K.depthOf(p,P);
function drawerOf(th,mode){ if(mode===1) return 7*Math.exp(-(((th-25)/50)**2)); if(mode===2) return -10*Math.exp(-(((th-90)/45)**2)); return 0; }
// the tibia, in its own frame [u (anterior), w (proximal), y (lateral)] mm
const TIB_BLOB=[[-2,-13,-17,18],[-2,-13,17,18],[3,-24,-6,15],[3,-24,8,15],[19,-29,0,6.5],[0,-38,0,14]];
function plateauSide(sign){ // a D-shaped half plateau, flat edge on the notch (u, y) in mm
  const out=[]; for(let i=0;i<=20;i++){ const a=Math.PI*i/20; out.push([23*Math.cos(a), sign*(2+34*Math.sin(a))]); } return out; }
const PATC=[0,20], PATR=31, TUB=[22,-30];
const PAT0=[PATC[0]+PATR*Math.cos(40*Math.PI/180),PATC[1]+PATR*Math.sin(40*Math.PI/180)];
const PTL=kd(PAT0,TUB);
let mode=0, th=8, thT=8, dr=0;
function frame(){
  const S=kneePose(th,dr);
  const T2W=([u,w,y])=>{ const f=tibToFem([u,w],S); return F2W([f[0],f[1],y]); };
  const prox=unit(sub(T2W([0,10,0]),T2W([0,0,0]))), ant=unit(sub(T2W([10,0,0]),T2W([0,0,0])));
  const dist=mul(prox,-1);
  // --- tibia solid parts
  const parts=[];
  const sh0=T2W([0,-36,0]);
  parts.push([depth(T2W([0,-68,0])), K.solidSvg(G.solidOf([[0,13*MM,1],[30,12.2*MM,1],[30*MM,11.8*MM]],G.frameAlong(sh0,dist),P,{smooth:true}),{tone:"hi"})]);
  const blob=SOFT.blobOf(TIB_BLOB.map(([u,w,y,r])=>[...T2W([u,w,y]),r*MM]),P,{merge:0.45,step:1.6});
  parts.push([depth(T2W([0,-20,0])), K.solidSvg(blob,{tone:"hi"})]);
  const V=G.viewOf(P);
  if(G.dot3(dist,V)>0.05){ const e=add(sh0,mul(dist,30*MM)); const Fe=G.frameAlong(e,dist);
    parts[0][1]+=('<path class="bio-rim" d="'+G.circleOf(Fe,0,11.8*MM,P)+'"/><path class="bio-lumen" d="'+G.circleOf(Fe,0,6.4*MM,P)+'"/>'+K.lineSvg(G.circleOf(Fe,0,6.4*MM,P),{tone:"mid"})+K.lineSvg(G.circleOf(Fe,0,8.4*MM,P),{tone:"faint"})); }
  parts.sort((a,b)=>a[0]-b[0]);
  let tib=parts.map((p)=>p[1]).join("");
  const PF=G.frameOf(T2W([0,0,0]),prox,ant,G.cross3(prox,ant));
  const toF=(poly)=>poly.map(([u,y])=>[u*MM,y*MM]);
  tib+=sg("hema",0.28,K.solidSvg(G.prismOf(PF,toF(plateauSide(-1)),-7*MM,0,P),{tone:"hi"}));
  tib+=[-4,4].map((y)=>K.solidSvg(G.sphereOf(T2W([0,1.2,y]),2.6*MM,P),{tone:"mid"})).join("");
  // menisci: C-shaped fibrocartilage rims that ride back with the condyle (~ half the roll-back)
  const roll=(-S.I[0]-ROLL0);
  const men=(yc,open)=>{ const pts=[]; for(let i=0;i<=26;i++){ const a=(open+25+310*i/26)*Math.PI/180; pts.push(T2W([-2-roll*0.45+16*Math.cos(a),2,yc+12*Math.sin(a)])); } return pts; };
  tib+=sg("hema",0.4,tube(men(-20,0),3*MM,{tone:"mid"}));
  // tibial arm of the goniometer, pegged to the shin
  const Q=T2W([0,-58,-12]); const Qd=[Q[0],GC[1]+5.4,Q[2]]; const dir=unit([Qd[0]-GC[0],0,Qd[2]-GC[2]]); const nrm=[dir[2],0,-dir[0]];
  const ae=add([GC[0],GC[1]+5.4,GC[2]],mul(dir,GR+22));
  const ap=[add([GC[0],GC[1]+5.4,GC[2]],mul(nrm,5)),add(ae,mul(nrm,5)),add(ae,mul(nrm,-5)),add([GC[0],GC[1]+5.4,GC[2]],mul(nrm,-5))];
  const AF=G.frameOf([0,GC[1]+5.4,0],[0,1,0],[1,0,0],[0,0,-1]);
  let arm=K.solidSvg(G.prismOf(AF,ap.map((p)=>[p[0],-p[2]]),0,2.4,P),{tone:"mid"});
  arm+=K.solidSvg(G.disc(0,4.5,9,G.frameAlong([GC[0],GC[1]+5.4,GC[2]],[0,1,0]),P),{tone:"mid"})+K.dotsSvg([at([GC[0],GC[1]+10,GC[2]])],{size:0.9,tone:"hi"});
  arm+=tube([Qd,[Q[0],Q[1]-11*MM,Q[2]]],2.6,{tone:"mid"});
  const ang=Math.atan2(-(Qd[2]-GC[2]),Qd[0]-GC[0])*180/Math.PI;
  arm+=K.lineSvg(K.segment(add(add([GC[0],GC[1]+7.8,GC[2]],mul(dir,GR-12)),mul(nrm,0)),add([GC[0],GC[1]+7.8,GC[2]],mul(dir,GR+16)),P),{tone:"hi",free:true});
  tarmG.innerHTML=arm;
  // the tibia sits in front of the femur while the shin points at us (early flexion), behind it once it hangs
  if(th<45){ tibA.innerHTML=""; tibB.innerHTML=tib; } else { tibA.innerHTML=tib; tibB.innerHTML=""; }
  // --- cruciates
  const lig=[]; let tautACL=[], tautPCL=[];
  BUNDLES.forEach((b,i)=>{ const A=T2W(b.t), B=F2W(b.f); const Lm=G.len3(sub(A,B))/MM; const rho=Lm/LMAX[i];
    const torn=(mode===1&&b.lig==="ACL")||(mode===2&&b.lig==="PCL");
    const r=(b.lig==="PCL"?3.1:2.6)*MM*(b.name==="AL"||b.name==="AM"?1.08:0.92);
    if(torn){ // two frayed stubs, each hanging from its attachment
      let h="";
      for(const [p0,p1] of [[A,B],[B,A]]){ const tip=add(G.lerp3(p0,p1,0.34),[0,0,-7*MM]); h+=tube([p0,G.lerp3(p0,tip,0.6),tip],r*0.9,{tone:"mid"});
        for(let f=-1;f<=1;f++) h+=tube([tip,add(tip,[f*3*MM,f*2,-5*MM-Math.abs(f)*2])],0.9*MM,{tone:"lo"}); }
      lig.push([b.lig==="PCL"?0:1,sg("eosin",0.4,h)]); return; }
    const tk=Math.max(0,Math.min(1,(rho-0.86)/0.12)); const taut=tk>0.7; const best=b.lig==="ACL"?tautACL:tautPCL; if(!best.rho||rho>best.rho){ best.rho=rho; best[0]=b.name; }
    const slack=Math.max(0,1-rho); const sag=Math.min(9*MM,Math.sqrt(0.375*Lm*LMAX[i]*slack)*MM*0.9);
    const ch=sub(B,A); const down=[0,0,-1]; const perp=unit(sub(down,mul(unit(ch),G.dot3(down,unit(ch)))));
    const pts=[]; for(let j=0;j<=8;j++){ const t=j/8; pts.push(add(G.lerp3(A,B,t),mul(perp,sag*4*t*(1-t)))); }
    lig.push([b.lig==="PCL"?0:1,sg("eosin",(0.35+0.65*tk).toFixed(2),tube(pts,r,{tone:taut?"hi":"mid"}))]);
  });
  ligG.innerHTML=lig.sort((a,b)=>a[0]-b[0]).map((x)=>x[1]).join("");
  // --- lateral compartment, in glass: plateau half and meniscus
  latG.innerHTML='<g class="knee-ghost">'+K.solidSvg(G.prismOf(PF,toF(plateauSide(1)),-7*MM,0,P),{tone:"mid"})+tube(men(20,180),3*MM,{tone:"lo"})+'</g>';
  // --- front: fibula, patella and its two tendons
  let fr="";
  fr+=K.solidSvg(G.solidOf([[0,5.5*MM,1],[40,5*MM,1],[36*MM,4.8*MM]],G.frameAlong(T2W([-12,-22,33]),dist),P,{smooth:true}),{tone:"hi"});
  fr+=K.solidSvg(G.sphereOf(T2W([-12,-16,33]),8.5*MM,P),{tone:"hi"});
  const tub=tibToFem(TUB,S); const dd=kd(PATC,tub); const a=(PATR*PATR-PTL*PTL+dd*dd)/(2*dd), hh=Math.sqrt(Math.max(0,PATR*PATR-a*a));
  const ex=[(tub[0]-PATC[0])/dd,(tub[1]-PATC[1])/dd]; const m=[PATC[0]+a*ex[0],PATC[1]+a*ex[1]];
  const c1=[m[0]-hh*ex[1],m[1]+hh*ex[0]], c2=[m[0]+hh*ex[1],m[1]-hh*ex[0]]; let pc=c1[0]>c2[0]?c1:c2;
  { const pa=Math.max(-72*Math.PI/180,Math.atan2(pc[1]-PATC[1],pc[0]-PATC[0])); pc=[PATC[0]+PATR*Math.cos(pa),PATC[1]+PATR*Math.sin(pa)]; } // past ~95° the patella seats in the groove
  const rad=unit([pc[0]-PATC[0],0,pc[1]-PATC[1]]); const tg=[-rad[2],rad[0]]; // tangent (u,w) pointing proximal-ish
  const tgp=tg[1]>0?tg:[-tg[0],-tg[1]];
  const pp=(s,o)=>F2W([pc[0]+tgp[0]*s+rad[0]*o,pc[1]+tgp[1]*s+rad[2]*o,0]);
  { const lo=pp(-14,-2), mid=T2W([28,-8,0]), end=T2W([TUB[0]+2,TUB[1],0]); const via=th>70?[lo,mid,end]:[lo,end];
    fr+=tube(via.length>2?G.fillet(via,6*MM,8):via,3.3*MM,{tone:"mid"}); }
  fr+=K.solidSvg(SOFT.blobOf([[...pp(-9,0),9*MM],[...pp(2,1),11.5*MM],[...pp(12,0),9*MM]],P,{merge:0.25,step:1.4}),{tone:"hi"});
  fr+=tube(G.fillet([pp(14,0),pp(24,-1),F2W([18,50,0]),F2W([17.6,84,0])],10*MM,8),4*MM,{tone:"mid"});
  frontG.innerHTML=fr;
  return { S, roll, tautACL, tautPCL };
}
function say(r){ const d=Math.round(th); let t;
  if(mode===1) t=d+"° · ACL torn · tibia "+dr.toFixed(0)+" mm forward";
  else if(mode===2) t=d+"° · PCL torn · tibia sags "+(-dr).toFixed(0)+" mm";
  else t=d+"° · tight: ACL-"+r.tautACL[0]+", PCL-"+r.tautPCL[0]+" · roll "+r.roll.toFixed(0)+" mm";
  vitaSay(stage,readout,t); stage.setAttribute("aria-valuenow",d); }
let lastKey="";
function draw(){ const key=th.toFixed(2)+"|"+dr.toFixed(2)+"|"+mode; if(key===lastKey) return; lastKey=key; say(frame()); }
vitaLoop({ stage, idleMs:6000,
  frame(dt,st){
    if(st.still){ th=thT=60; mode=0; dr=0; draw(); return; }
    if(st.touring){ const c=st.clock%30; const cyc=c%10; mode=Math.floor(c/10); thT=cyc<5?135*(0.5-0.5*Math.cos(Math.PI*cyc/5)):135*(0.5+0.5*Math.cos(Math.PI*(cyc-5)/5)); }
    th+=(thT-th)*(1-Math.exp(-dt/0.18)); const dT=drawerOf(th,mode); dr+=(dT-dr)*(1-Math.exp(-dt/0.25)); draw(); },
  pointer(x){ thT=x*135; },
  click(){ mode=(mode+1)%3; },
  keys(key){ if(key==="ArrowRight"||key==="ArrowUp"){ thT=Math.min(135,thT+10); return true; } if(key==="ArrowLeft"||key==="ArrowDown"){ thT=Math.max(0,thT-10); return true; }
    if(key===" "||key==="Enter"){ mode=(mode+1)%3; return true; } return false; },
});
`;
const CSS = `<style>.knee-ghost .iso-fill{fill-opacity:.14}.knee-ghost .iso-shade,.knee-ghost .iso-top,.knee-ghost .tb-body,.knee-ghost .tb-shade,.knee-ghost .tb-shine,.knee-ghost .tb-stripe{opacity:.12}.knee-ghost .iso-edge,.knee-ghost .tb-edge,.knee-ghost .iso-crease{opacity:.55}</style>`;
const body = CSS + k.plateHtml({
  fig: "Fig 13", title: "Knee · cruciates", hint: "Hover ↔ bend · click: tear",
  readout: "8° · tight: ACL-PL, PCL-PM · roll 1 mm",
  keys: [{ mark: "eosin", label: "ACL (front) and PCL (back): two bundles each, bright when taut" }, { mark: "hema", label: "Cartilage: plateau and menisci" }, { mark: "raised", label: "Lateral compartment in glass" }],
  caption: `A right human knee, adult size (ruler: 1 tick = 5 mm), as a seated teaching model: the femur is strapped in two cradles and the tibia hangs from the ligaments alone. The collateral ligaments and capsule are removed, and the lateral condyle, plateau and meniscus are drawn in glass. The ACL (about 31 mm long here) runs from the front of the tibia up and back to the femur; the PCL (about 37 mm, thicker) runs from the back of the tibia up and forward. Crossed, they form a four-bar linkage with the bones: the crossing point is the joint's instant centre, so as the knee bends the femur rolls back on the tibia (here ${(ROLL135 - ROLL0).toFixed(0)} mm from 0° to 135°). The condyle's curve is derived from that linkage, not drawn by hand. Bundle lengths come from the same geometry: the ACL's posterolateral bundle is tight near straight and slackens as its anteromedial bundle takes over; the PCL's posteromedial bundle is tight near straight, its anterolateral bundle in deep flexion. Click or Space cuts the ACL, and the tibia slides about 7 mm forward under a Lachman-type pull near 25°; cut the PCL and it sags back about 10 mm at 90°. A planar model: real knees also rotate, and the lateral condyle rolls back more than the medial. The tour bends the knee in 5 s, about 3× slower than standing up from a chair.`,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Knee: arrow keys bend the knee, Space cuts a cruciate" aria-valuemin="0" aria-valuemax="135" aria-valuenow="8">${svg}</div>`,
});
const page = vitaPage({ n: "13", title: "Knee · ACL and PCL", zh: "膝关节 · 交叉韧带四连杆", en: "Knee · the cruciate four-bar", body, script: liveScript({ soft: true }) + LOOP_SRC + live,
  facts: [["~32 mm × 10 mm", "前交叉韧带（ACL）长 × 宽", "ACL length × width"], ["~38 mm × 13 mm", "后交叉韧带（PCL）长 × 宽", "PCL length × width"], ["~2,160 N", "年轻成人 ACL 极限拉力（Woo 1991）", "ACL failure load, young adults (Woo 1991)"], ["0–135°", "主动屈膝范围（被动约 140°+）", "active flexion range (passive ~140°+)"], [`${(ROLL135 - ROLL0).toFixed(0)} mm`, "本模型股骨后滚 0→135°", "femoral roll-back in this model, 0→135°"], ["~2×", "PCL 横截面约为 ACL 的 1.5–2 倍", "PCL cross-section vs ACL (~1.5–2×)"]] });
writeFileSync(join(OUT, "13-knee.html"), page);
console.log("wrote 13-knee.html", (page.length / 1024).toFixed(0) + " KB", "Lmax", LMAX, "roll", ROLL0.toFixed(1), ROLL135.toFixed(1));
