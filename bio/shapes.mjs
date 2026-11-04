// Anatomy Vita — line shapes living things keep needing. Each returns its back half and front half separately, so a
// helix or a spring can wrap a solid: draw `back`, then the solid, then `front`.
//
//   helixOf(F, s0, s1, r, pitch, P, { phase, strands, step }) → { back, front }   actin, DNA backbone, tropomyosin, collagen
//   coilAlong(p0, p1, r, turns, P, { phase, step })        → { back, front }   a coil spring between any two points
//
// F is a G.frameAlong frame; s runs along its axis. Pure; in the page as SH (liveScript({ shapes: true })).
import * as K from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";

function split(points3, P, outward) {
  // a point is "front" when its outward normal faces the viewer
  const V = G.viewOf(P);
  const back = [], front = []; let cur = null, side = null;
  points3.forEach((p, i) => {
    const s = G.dot3(outward[i], V) >= 0 ? "front" : "back";
    const q = K.iso(p, P);
    if (s !== side) { if (cur && cur.length > 1) (side === "front" ? front : back).push(cur); cur = cur ? [cur[cur.length - 1], q] : [q]; side = s; }
    else cur.push(q);
  });
  if (cur && cur.length > 1) (side === "front" ? front : back).push(cur);
  const path = (runs) => runs.map((r) => K.pathOf(r)).join("");
  return { back: path(back), front: path(front) };
}

export function helixOf(F, s0, s1, r, pitch, P, { phase = 0, strands = 1, step = 0.6 } = {}) {
  {
    const out = { back: "", front: "" };
    for (let k = 0; k < strands; k++) {
      const pts = [], nrm = [];
      const ph = phase + (k * 2 * Math.PI) / strands;
      for (let s = s0; s <= s1 + 1e-6; s += step) {
        const a = ph + ((s - s0) / pitch) * 2 * Math.PI;
        pts.push(G.pointOf(F, s, r, a));
        nrm.push(G.add3(G.mul3(F.u, Math.cos(a)), G.mul3(F.v, Math.sin(a))));
      }
      const h = split(pts, P, nrm); out.back += h.back; out.front += h.front;
    }
    return out;
  }
}

export function coilAlong(p0, p1, r, turns, P, { phase = 0, step = null } = {}) {
  const d = G.sub3(p1, p0), L = G.len3(d); const F = G.frameAlong(p0, G.unit3(d));
  const n = Math.max(24, Math.ceil(turns * 28));
  const pts = [], nrm = [];
  for (let i = 0; i <= n; i++) {
    const s = (L * i) / n, a = phase + (i / n) * turns * 2 * Math.PI;
    pts.push(G.pointOf(F, s, r, a)); nrm.push(G.add3(G.mul3(F.u, Math.cos(a)), G.mul3(F.v, Math.sin(a))));
  }
  return split(pts, P, nrm);
}
