// 17 · Reflex arc — the knee jerk on a teaching rig. A model leg rests on two cradles with the shank hanging from a hinged
// knee; a pendulum reflex hammer on a stand taps the patellar tendon. Two cables carry the arc to a slice of the lumbar
// spinal cord (L3–L4, enlarged) held on a stand behind: a GFP-stained sensory (Ia) cable from the muscle spindle in the
// quadriceps to the dorsal root, and an RFP-stained motor cable from the ventral horn back to the quadriceps. A thin
// unstained branch runs from an inhibitory interneuron to the hamstrings. A two-channel scope records the Ia volley and
// the quadriceps EMG. What moves: the hammer, one impulse round the arc, then the shank kicking forward. What the motion
// means: one synapse in the cord (monosynaptic), so the EMG starts ~20 ms after the tap; the kick follows the EMG.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, liveScript, LOOP_SRC, plinth, standRod, stain, vitaPage, scene } from "../../bio/bio.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../site/demos");
const W = 740, H = 480;
const CM = 3.3; // the leg: 1 cm = 3.3 units (thigh 45 cm)
const PLATE = { x: -205, y: -165, w: 360, d: 225, r: 12 };
const ZT = 96;                       // thigh axis height
const HIP = [-170, 0, ZT], KNEE = [0, 0, ZT];
const SHANK = 80;        // shank drawn shorter than the thigh so the rig stays low (named in the caption)
const CORD = [-92, -128, 124], CORD_R = 20, CORD_LEN = 16; // a 1 cm cord drawn ~6× life size
const MON = { x: 18, y: -150, w: 112, d: 26, r: 2 }, MON_H = 58;
const PIV = [44, -4, ZT + 46];           // hammer pivot
const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [CORD[0], CORD[1], CORD[2] + CORD_R + 6], ...k.boxCorners(MON, 0, MON_H + 6), [PIV[0], PIV[1], PIV[2] + 8], [KNEE[0] + SHANK, 0, ZT + 10]], W, H, { pad: 16, azimuth: 42 });
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);

// ---- the leg: thigh on two cradles, a hinge pin at the knee, kneecap and tendon ----
const THIGH = [[0, 13.5, 1], [30, 15.5, 1], [90, 14, 1], [140, 11.5, 1], [170, 10]];
function cradles() {
  const out = [];
  for (const x of [-140, -62]) {
    out.push(S(k.slabOf({ x: x - 9, y: -11, w: 18, d: 22, r: 2 }, 0, 3, P, 4, 0.5), { tone: "mid" }));
    out.push(S(k.cylinder(x, 0, 3, 3, ZT - 17, P, 20), { tone: "mid", crease: "none" }));
    out.push(S(k.slabOf({ x: x - 7, y: -15, w: 14, d: 30, r: 2 }, ZT - 15, 3.5, P, 4, 0.4), { tone: "mid" }));
  }
  return out.join("");
}
const thigh = S(G.solidOf(THIGH, G.frameAlong(HIP, [1, 0, 0]), P, { smooth: true }), { tone: "mid" });
// the quadriceps: a stained muscle belly on top of the thigh, with the spindle (the sensor) as a small lit capsule
const quad = stain("eosin", S(G.solidOf([[0, 5, 1], [40, 9, 1], [95, 8, 1], [130, 4]], G.frameAlong([-150, 0, ZT + 9], [1, 0, -0.02]), P, { smooth: true }), { tone: "hi" }), 0.4);
const SPINDLE = [-78, 0, ZT + 18.5];
const spindle = S(G.solidOf([[0, 0.6, 1], [5, 2.2, 1], [10, 0.6]], G.frameAlong(G.add3(SPINDLE, [-5, 0, 0]), [1, 0, 0]), P), { tone: "hi", lit: true });
// hamstrings underneath (the antagonist the interneuron inhibits)
const ham = S(G.solidOf([[0, 4, 1], [50, 7, 1], [110, 5, 1], [140, 3]], G.frameAlong([-155, 0, ZT - 10], [1, 0, 0.02]), P, { smooth: true }), { tone: "mid" });
const pinF = G.frameAlong([KNEE[0], -13, KNEE[2]], [0, 1, 0]);
const pin = S(G.solidOf([[0, 3.2, 1], [26, 3.2]], pinF, P), { tone: "mid" }) + L(G.circleOf(pinF, 26, 1.4, P), { tone: "lo" });

// ---- the cord slice on its stand: grey-matter butterfly on the cut face, roots top (dorsal) and bottom (ventral) ----
const V = G.viewOf(P);
const CF = G.frameAlong(CORD, [1, 0, 0]); // u → +y, v → +z (dorsal up)
const face = (u, v) => G.add3(G.add3(CORD, [CORD_LEN, 0, 0]), [0, u, v]);
function cordSlice() {
  const out = [standRod(CORD[0] + CORD_LEN / 2, CORD[1], CORD[2] - CORD_R + 1, P, { clampAt: CORD[2] - CORD_R - 10 })];
  out.push(stain("myelin", S(G.solidOf([[0, CORD_R, 1], [CORD_LEN, CORD_R]], CF, P), { tone: "hi" }), 0.35)); // white matter
  // the butterfly: dorsal horns up and narrow, ventral horns down and broad, joined across the central canal
  const wing = (sx) => [[0, 2], [sx * 4, 5], [sx * 6, 13], [sx * 8, 14], [sx * 8.5, 9], [sx * 7, 2], [sx * 11, -5], [sx * 12, -11], [sx * 8, -13], [sx * 4, -8], [0, -3]];
  const poly = (pts) => k.pathOf(pts.map(([u, v]) => at(face(u * 1.1, v * 1.1))), true);
  out.push(stain("hema", `<path d="${poly(wing(1))}${poly(wing(-1))}" style="fill:var(--stain);fill-opacity:.32"/>` + L(poly(wing(1)) + poly(wing(-1)), { tone: "mid" }), 0.7));
  out.push(D([at(face(0, -0.5))], { size: 0.9, tone: "lo" })); // central canal
  // motor neuron somata in the ventral horn (RFP) and the interneuron (unstained), where the arc turns round
  out.push(stain("rfp", D([[9.5, -9], [8, -11], [10.5, -6]].map(([u, v]) => at(face(u * 1.1, v * 1.1))), { size: 1.4, tone: "hi" }), 0.9));
  out.push(D([at(face(5 * 1.1, -2 * 1.1))], { size: 1.2, tone: "mid" }));
  return out.join("");
}
const DRG = [CORD[0] + CORD_LEN * 0.5, CORD[1] + 12, CORD[2] + CORD_R + 6]; // dorsal root ganglion, above and in front
const VR = [CORD[0] + CORD_LEN * 0.5, CORD[1] + 12, CORD[2] - CORD_R - 2];  // ventral root exit, below and in front
const drg = stain("gfp", S(G.sphereOf(DRG, 5, P), { tone: "hi" }), 0.5);

// ---- the cables: sensory (GFP) spindle → DRG, motor (RFP) ventral root → quadriceps, inhibitory branch → hamstrings ----
const AFF = G.resample(G.fillet([SPINDLE, [-78, 0, ZT + 34], [-80, -40, ZT + 66], [DRG[0], DRG[1] + 26, DRG[2] + 16], [DRG[0], DRG[1], DRG[2] + 4]], 12, 8), 2);
const EFF = G.resample(G.fillet([[VR[0], VR[1], VR[2] + 2], [VR[0], VR[1] + 8, VR[2] - 14], [-60, -50, ZT - 12], [-48, -10, ZT + 26], [-48, 0, ZT + 16]], 12, 8), 2);
const INH = G.resample(G.fillet([[VR[0] - 4, VR[1], VR[2] + 2], [VR[0] - 6, VR[1] + 10, VR[2] - 20], [-110, -40, ZT - 30], [-104, -8, ZT - 18], [-104, 0, ZT - 14]], 12, 8), 2);
function cables() {
  const sc = scene(P);
  sc.tube(AFF, 1.6, { tone: "hi" }, { maxLength: 14, wrap: (h) => stain("gfp", h, 0.7) });
  sc.tube(EFF, 1.8, { tone: "hi" }, { maxLength: 14, wrap: (h) => stain("rfp", h, 0.6) });
  sc.tube(INH, 1.0, { tone: "mid" }, { maxLength: 14 });
  // end plates where the motor and inhibitory cables reach their muscles
  sc.put(k.depthOf(EFF[EFF.length - 1], P) + 1, stain("rfp", S(G.sphereOf(EFF[EFF.length - 1], 2.4, P), { tone: "hi" }), 0.7));
  sc.put(k.depthOf(INH[INH.length - 1], P) + 1, S(G.sphereOf(INH[INH.length - 1], 1.8, P), { tone: "mid" }));
  return sc.svg();
}

// ---- the hammer stand and the scope ----
function hammerStand() { // the post stands behind the leg; an arm reaches forward to the pivot over the knee
  const post = [PIV[0], PIV[1] - 34];
  const out = [S(k.cylinder(post[0], post[1], 9, 0, 3, P, 30, 0.5), { tone: "mid" }), S(k.cylinder(post[0], post[1], 2.6, 3, PIV[2] - 5, P, 20), { tone: "mid", crease: "none" })];
  out.push(S(k.cylinder(post[0], post[1], 4.4, PIV[2] - 4, 6, P, 22, 0.4), { tone: "mid" }), L(k.knurl(post[0], post[1], 4.4, PIV[2] - 3.4, PIV[2] + 1.4, 18, P), { tone: "faint" }));
  out.push(S(G.solidOf([[0, 2.2, 1], [30, 2.2]], G.frameAlong([post[0], post[1], PIV[2]], [0, 1, 0]), P), { tone: "mid" }));
  out.push(S(G.solidOf([[0, 4.2, 1], [6, 4.2]], G.frameAlong([PIV[0], PIV[1] - 3, PIV[2]], [0, 1, 0]), P), { tone: "mid" }));
  return out.join("");
}
const SCR = { x0: MON.x + 8, x1: MON.x + MON.w - 8, z0: 9, z1: MON_H - 9 };
const scrY = MON.y + MON.d + 0.15;
function scope() {
  const out = [S(k.slabOf(MON, 0, MON_H, P, 4, 0.8), { tone: "mid" }), L(k.sideSeam(k.insetPlan(MON, 0), 6, P), { tone: "faint" })];
  const quadP = (x0, x1, z0, z1) => k.pathOf([at([x0, scrY, z0]), at([x1, scrY, z0]), at([x1, scrY, z1]), at([x0, scrY, z1])], true);
  out.push(`<path d="${quadP(SCR.x0, SCR.x1, SCR.z0, SCR.z1)}" style="fill:var(--anatomy-shade-0)"/>`, L(quadP(SCR.x0, SCR.x1, SCR.z0, SCR.z1), { tone: "mid" }), L(quadP(SCR.x0 - 2.5, SCR.x1 + 2.5, SCR.z0 - 2.5, SCR.z1 + 2.5), { tone: "faint" }));
  // two channel baselines, and a 10 ms graticule over 0–50 ms
  const mid = (SCR.z0 + SCR.z1) / 2;
  for (const zz of [mid + 9, mid - 9]) out.push(L(k.segment([SCR.x0, scrY, zz], [SCR.x1, scrY, zz], P), { tone: "faint", dashed: true }));
  const sx = (ms) => SCR.x0 + 3 + (ms / 50) * (SCR.x1 - SCR.x0 - 6);
  for (let ms = 10; ms < 50; ms += 10) out.push(L(k.segment([sx(ms), scrY, SCR.z0], [sx(ms), scrY, SCR.z1], P), { tone: "faint", dotted: true }));
  for (const x of [MON.x + 14, MON.x + 28]) { out.push(S(k.cylinder(x, MON.y + 13, 4, MON_H, 3.4, P, 22), { tone: "mid" })); out.push(L(k.knurl(x, MON.y + 13, 4, MON_H + 0.6, MON_H + 2.8, 16, P), { tone: "faint" })); }
  out.push(S(k.slabOf({ x: MON.x + 50, y: MON.y + 7, w: 44, d: 12, r: 1.4 }, MON_H, 0.8, P, 3, 0.3), { tone: "lo" }));
  for (const [x, y] of k.corners(k.insetPlan(MON, 4), 0)) out.push(D([at([x, y, MON_H])], { size: 0.45 }));
  return out.join("");
}
// recording leads: one from the sensory cable near the cord, one from an EMG pad on the quadriceps
const leads = k.wireSvg(at(AFF[Math.floor(AFF.length * 0.7)]), at([MON.x + 4, MON.y + MON.d / 2, 20]), { via: [at([-20, -110, ZT + 20])], tone: "lo" })
  + k.wireSvg(at([-36, 6, ZT + 15]), at([MON.x + 4, MON.y + MON.d / 2 + 4, 12]), { via: [at([-10, -40, 30]), at([MON.x - 6, MON.y + 20, 10])], tone: "lo" });
const pad = S(k.slabOf({ x: -42, y: -2, w: 12, d: 10, r: 2 }, ZT + 14.5, 1, P, 3, 0.3), { tone: "lo" });

const svg = k.figureSvg({
  width: W, height: H,
  label: "A knee-jerk teaching rig. A model leg rests on two cradles with its lower leg hanging from a hinged knee. A pendulum reflex hammer on a stand taps the tendon below the kneecap. A green sensory cable runs from the thigh muscle to a slice of spinal cord on a stand behind, and a red motor cable runs back from the cord to the thigh. A scope at the back shows the sensory volley and the muscle's electrical response.",
  body: [plinth(PLATE, P, { scale: { x: PLATE.x + 20, y: PLATE.y + PLATE.d - 14, w: 170, step: 5 * CM, every: 2 }, label: { x: PLATE.x + PLATE.w - 58, y: PLATE.y + PLATE.d - 20, w: 40 } }),
    scope(), `<path data-part="ch1" class="iso-line" data-tone="lit" d=""/>`, `<path data-part="ch2" class="iso-line" data-tone="lit" d=""/>`,
    cordSlice(), drg, cables(), `<g data-part="spikes0"></g>`, leads,
    hammerStand(), cradles(), ham, thigh, quad, pad, spindle, `<g data-part="shank"></g>`, pin, `<g data-part="hammer"></g>`, `<g data-part="spikes1"></g>`],
});

const live = `
const P=${JSON.stringify(P)}, KNEE=${JSON.stringify(KNEE)}, SHANK=${SHANK}, PIV=${JSON.stringify(PIV)}, ZT=${ZT};
const AFF=${JSON.stringify(AFF.map((p) => p.map((v) => +v.toFixed(1))))}, EFF=${JSON.stringify(EFF.map((p) => p.map((v) => +v.toFixed(1))))}, INH=${JSON.stringify(INH.map((p) => p.map((v) => +v.toFixed(1))))};
const SCR=${JSON.stringify(SCR)}, SCRY=${scrY};
const stage=document.querySelector(".iso-stage"), svg=stage.querySelector("svg"), readout=document.querySelector("[data-readout]");
const shankG=svg.querySelector('[data-part="shank"]'), hamG=svg.querySelector('[data-part="hammer"]'), sp0=svg.querySelector('[data-part="spikes0"]'), sp1=svg.querySelector('[data-part="spikes1"]');
const ch1=svg.querySelector('[data-part="ch1"]'), ch2=svg.querySelector('[data-part="ch2"]');
const at=(p)=>K.iso(p,P);
// truth (adult human, patellar reflex): Ia afferents conduct at ~70 m/s and α motor axons at ~60 m/s over ~0.8 m each
// way (quadriceps → L3–L4 and back); one synapse adds ~0.7 ms and the end plate ~1 ms. So the Ia volley reaches the cord
// at ~11 ms and the EMG starts at ~25 ms. Twitch force peaks ~80 ms after the EMG; the kick is a damped swing back.
const T_CORD=11.4, T_SYN=0.7, T_EMG=11.4+0.7+13.3+1, SLOW=25;
const len=(r)=>{ let s=0; for(let i=1;i<r.length;i++) s+=Math.hypot(r[i][0]-r[i-1][0],r[i][1]-r[i-1][1],r[i][2]-r[i-1][2]); return s; };
const along=(r,f)=>{ const L=len(r)*Math.max(0,Math.min(1,f)); let s=0; for(let i=1;i<r.length;i++){ const d=Math.hypot(r[i][0]-r[i-1][0],r[i][1]-r[i-1][1],r[i][2]-r[i-1][2]); if(s+d>=L){ const t=(L-s)/d; return r[i-1].map((v,j)=>v+(r[i][j]-v)*t); } s+=d; } return r[r.length-1]; };
let strength=0.6, strT=0.6, t=1e9, tour=0, nextTap=1.2, pull=0, amp=0;
const threshold=0.22;
const kickDeg=(ms)=>{ if(ms<T_EMG+15) return 0; const x=(ms-T_EMG-15)/90; return amp*x*Math.exp(1-x)*Math.cos(Math.max(0,x-1.4)*0.9); };
function tap(){ t=-35; amp=strength<threshold?0:8+26*(strength-threshold)/(1-threshold); }
let lastTh=-99;
function drawShank(th){ if(Math.abs(th-lastTh)<0.15) return; lastTh=th; const a=th*Math.PI/180; const dir=[Math.sin(a),0,-Math.cos(a)];
  const F=G.frameAlong(KNEE,dir); const tib=K.solidSvg(G.solidOf([[0,10.5,1],[14,9.5,1],[48,7,1],[SHANK-6,5.5,1],[SHANK,5]],F,P,{smooth:true}),{tone:"mid"});
  const ankle=[KNEE[0]+dir[0]*SHANK,0,KNEE[2]+dir[2]*SHANK]; const fwd=[Math.cos(a),0,Math.sin(a)];
  const foot=K.solidSvg(G.solidOf([[0,5.5,1],[12,6,1],[30,4.2,1],[36,3]],G.frameAlong(G.add3(ankle,G.mul3(fwd,-4)),fwd),P,{smooth:true}),{tone:"mid"});
  // kneecap and tendon: the tendon runs from the patella to the tibial tuberosity on the shank's front
  const pat=[KNEE[0]+8,0,KNEE[2]+4], tub=[KNEE[0]+dir[0]*16+fwd[0]*8,0,KNEE[2]+dir[2]*16+fwd[2]*8];
  const tendon=K.solidSvg(G.solidOf([[0,2.4,1],[Math.hypot(tub[0]-pat[0],tub[2]-pat[2]),2.2]],G.frameAlong(pat,G.sub3(tub,pat)),P),{tone:"hi"});
  shankG.innerHTML=foot+tib+tendon+K.solidSvg(G.sphereOf(pat,6,P),{tone:"mid"}); }
function drawHammer(ang){ // ang: 0 hanging on the tendon, + pulled back
  const a=(ang-28.3)*Math.PI/180; const dir=[Math.sin(a),0,-Math.cos(a)]; const L=59;
  const head=[PIV[0]+dir[0]*L,0,PIV[2]+dir[2]*L];
  const handle=K.solidSvg(G.solidOf([[0,1.3,1],[L,1.3]],G.frameAlong([PIV[0],0,PIV[2]],dir),P),{tone:"mid"});
  const hd=K.solidSvg(G.solidOf([[0,5,1],[3,5.6,1],[13,5.6,1],[16,5]],G.frameAlong(G.add3(head,[0,-8,0]),[0,1,0]),P,{smooth:true}),{tone:"hi",lit:true});
  hamG.innerHTML=handle+hd; }
const spike=(p,stainName)=>vitaStain(stainName,K.dotsSvg([at(p)],{size:2.6,tone:"hi"}),1);
function trace(ms){ // channel 1: Ia volley as it passes the recording lead; channel 2: quadriceps EMG
  const sx=(m)=>SCR.x0+3+(m/50)*(SCR.x1-SCR.x0-6), mid=(SCR.z0+SCR.z1)/2;
  const v1=(m)=>{ const d=m-(T_CORD-1.6); return amp>0||strength>0.1?6*Math.exp(-d*d/0.5)*(d<0?1:Math.cos(d*2)):0; };
  const v2=(m)=>{ const d=m-T_EMG; if(d<0||amp===0) return 0; return 8*Math.exp(-d/5)*Math.sin(d*1.9)*Math.min(1,d/1.5); };
  const path=(f,z0)=>{ const n=Math.max(2,Math.round(Math.min(50,ms)/50*120)); let s="M"; for(let i=0;i<=n;i++){ const m=Math.min(50,ms)*i/n; const p=at([sx(m),SCRY+0.1,z0+f(m)]); s+=(i?"L":"")+p[0].toFixed(1)+" "+p[1].toFixed(1); } return s; };
  ch1.setAttribute("d",ms>0?path(v1,mid+9):""); ch2.setAttribute("d",ms>0?path(v2,mid-9):""); }
function draw(dt,st){
  const ms=t; let a=0, b=[], f=[];
  // the hammer falls for 35 ms of model time before it strikes at t = 0, rebounds, and is drawn back
  const A=12+30*strength; drawHammer(ms<0?A*Math.pow(-ms/35,1.5):ms<60?4*Math.sin(ms/60*Math.PI)*strength:A*Math.min(1,(ms-60)/600));
  if(ms>=0&&ms<T_CORD) f.push(spike(along(AFF,ms/T_CORD),"gfp"));
  if(ms>=T_CORD+T_SYN&&ms<T_EMG-1&&amp>0){ const e=(ms-T_CORD-T_SYN)/(T_EMG-1-T_CORD-T_SYN); f.push(spike(along(EFF,e),"rfp")); b.push(K.dotsSvg([at(along(INH,e))],{size:2,tone:"mid"})); }
  sp0.innerHTML=b.join(""); sp1.innerHTML=f.join("");
  drawShank(kickDeg(ms)); trace(ms);
  const k=kickDeg(ms);
  vitaSay(stage,readout,"tap "+Math.round(strength*100)+"% · "+(amp===0&&ms<500?"below threshold":"EMG at "+T_EMG.toFixed(0)+" ms")+" · kick "+Math.max(0,k).toFixed(0)+"°");
  stage.setAttribute("aria-valuenow",strength.toFixed(2)); }
vitaLoop({ stage, idleMs:5000,
  frame(dt,st){
    if(st.still){ strength=strT=0.6; tap(); t=140; draw(0,st); return; }
    strength+=(strT-strength)*(1-Math.exp(-dt/0.3));
    if(st.touring&&dt>0){ tour+=dt; if(tour>nextTap){ strT=[0.6,0.9,0.15,0.75][Math.floor(tour/7)%4]; tap(); nextTap=tour+7; } }
    t+=dt*1000/SLOW; draw(dt,st); },
  pointer(x){ strT=x; },
  click(){ tap(); },
  keys(key){ if(key==="ArrowRight"||key==="ArrowUp"){ strT=Math.min(1,strT+0.2); return true; } if(key==="ArrowLeft"||key==="ArrowDown"){ strT=Math.max(0,strT-0.2); return true; } if(key===" "||key==="Enter"){ tap(); return true; } return false; },
  resume(){ tour=0; nextTap=0.5; },
});
`;
const body = k.plateHtml({
  fig: "Fig 17", title: "Reflex arc", hint: "Hover ↔ tap strength · click/Space tap",
  readout: "tap 60% · EMG at 26 ms · kick 0°",
  keys: [{ mark: "gfp", label: "Sensory Ia fibre from the spindle" }, { mark: "rfp", label: "α motor neuron to the quadriceps" }, { mark: "hema", label: "Grey matter (cord ~6× life size)" }, { mark: "lit", label: "Spindle, hammer; scope traces" }],
  caption: "The knee jerk (ruler: 1 tick = 5 cm on the leg; the shank is drawn shortened, and the L3–L4 cord slice ~6× life size). Not to scale: each cable stands for ~0.8 m of nerve. Tapping the patellar tendon stretches the quadriceps and its muscle spindles; their Ia fibres fire and the volley runs at ~70 m/s into the dorsal root, reaching the cord in ~11 ms. There it makes one synapse (0.7 ms) directly onto α motor neurons in the ventral horn, and, through an inhibitory interneuron, relaxes the hamstrings. Motor axons conduct at ~60 m/s back to the muscle, so the EMG starts ~25 ms after the tap (lower trace) and the kick follows. A tap below threshold gives a volley but no kick. Everything is shown 25× slower.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Reflex arc: arrow keys set tap strength, Space taps" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0.6">${svg}</div>`,
});
const page = vitaPage({ n: "17", title: "Reflex arc", zh: "反射弧 · 膝跳反射", en: "Reflex arc · the knee jerk", body, script: liveScript() + LOOP_SRC + live,
  facts: [["1", "膝跳反射的突触数（单突触）", "synapse in the knee jerk (monosynaptic)"], ["~70 m/s", "Ia 感觉纤维传导速度", "Ia sensory fibre conduction"], ["~60 m/s", "α 运动纤维传导速度", "α motor fibre conduction"], ["~0.7 ms", "一个突触的延搁", "delay at one synapse"], ["~20–25 ms", "叩击到股四头肌肌电出现", "tap to quadriceps EMG"], ["L2–L4", "参与的脊髓节段", "spinal segments involved"]] });
writeFileSync(join(OUT, "17-reflex-arc.html"), page);
console.log("wrote 17-reflex-arc.html", (page.length / 1024).toFixed(0) + " KB");
