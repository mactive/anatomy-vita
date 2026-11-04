// Anatomy Vita — branching tubes. Dendrites, axon terminals, vessels, airways, roots: a tree of tapering tubes.
// The kit's rule for pipework holds here too: a branch leaves from a ball tee, never straight out of a pipe wall, and
// every end finishes on something (a cap ball, a terminal bouton, an alveolus). Murray's law sets daughter radii:
// r_parent³ = Σ r_child³, so two equal daughters are each 0.79× their parent — the same ratio as a dividing cell.
//
//   treeOf(seed, root, dir, opts)  → { segments: [{ points, r0, r1, depth }], joints: [{ p, r }], tips: [{ p, r, dir }] }
//   treeItems(tree, P, opts)       → [[depth, svg], ...] ready for a scene() collector (tubes, tees, tip caps)
import * as K from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../kit/tube.mjs";

export const MURRAY = Math.pow(0.5, 1 / 3); // 0.794

export function treeOf(seed, root, dir, {
  length = 60, radius = 4, levels = 4, fork = 2, spread = 0.55, shrink = 0.72, wobble = 0.25, bend = 0.3,
  up = null, // optional bias vector (gravity for roots, [0,0,1] for a canopy)
  minRadius = 0.6, steps = 6,
} = {}) {
  let s = seed >>> 0 || 1; const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const segments = [], joints = [], tips = [];
  const grow = (from, d, len, r, level) => {
    d = G.unit3(d);
    // a gently curved segment: wobble perpendicular to d
    const F = G.frameAlong(from, d);
    const pts = [from];
    const a = rand() * Math.PI * 2, w = wobble * len;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps; const sway = Math.sin(t * Math.PI) * w * (rand() * 0.6 + 0.4);
      let p = G.add3(from, G.mul3(d, len * t));
      p = G.add3(p, G.add3(G.mul3(F.u, Math.cos(a) * sway), G.mul3(F.v, Math.sin(a) * sway)));
      if (up) p = G.add3(p, G.mul3(up, bend * len * t * t));
      pts.push(p);
    }
    const end = pts[pts.length - 1];
    const r1 = level === levels || r * MURRAY < minRadius ? r * 0.75 : r * 0.92;
    segments.push({ points: pts, r0: r, r1, depth: level });
    if (level >= levels || r * MURRAY < minRadius) { tips.push({ p: end, r: r1, dir: G.unit3(G.sub3(end, pts[pts.length - 2])) }); return; }
    joints.push({ p: end, r: r1 * 1.25 });
    const out = G.unit3(G.sub3(end, pts[pts.length - 2])); const E = G.frameAlong(end, out); const a0 = rand() * Math.PI * 2;
    const rc = r1 * Math.pow(1 / fork, 1 / 3); // Murray
    for (let c = 0; c < fork; c++) {
      const ang = a0 + (c / fork) * Math.PI * 2;
      const sp = spread * (0.7 + rand() * 0.6);
      const nd = G.add3(G.mul3(out, Math.cos(sp)), G.mul3(G.add3(G.mul3(E.u, Math.cos(ang)), G.mul3(E.v, Math.sin(ang))), Math.sin(sp)));
      grow(end, nd, len * shrink * (0.8 + rand() * 0.4), rc, level + 1);
    }
  };
  grow(root, dir, length, radius, 1);
  return { segments, joints, tips };
}

// Tubes taper by splitting each segment into short runs of falling radius; tees and caps are balls.
export function treeItems(tree, P, { tone = "hi", wrap = (h) => h, tipBall = 1.15, maxLength = 40, runs = 1 } = {}) {
  const items = [];
  for (const seg of tree.segments) {
    const pts = G.resample(seg.points, 1.2);
    const n = pts.length;
    for (let k = 0; k < runs; k++) {
      const a = Math.floor((k * (n - 1)) / runs), b = Math.floor(((k + 1) * (n - 1)) / runs);
      if (b - a < 1) continue;
      const r = seg.r0 + (seg.r1 - seg.r0) * ((k + 0.5) / runs);
      for (const piece of tubePieces(pts.slice(a, b + 1), r, P, { maxLength, caps: false })) items.push([K.depthOf(piece.mid, P), wrap(tubeSvg(piece, { tone }))]);
      if (k > 0) items.push([K.depthOf(pts[a], P) + 0.01, wrap(K.solidSvg(G.sphereOf(pts[a], r * 1.04, P), { tone }))]); // collar where the radius steps
    }
  }
  for (const j of tree.joints) items.push([K.depthOf(j.p, P) + 0.02, wrap(K.solidSvg(G.sphereOf(j.p, j.r, P), { tone }))]);
  for (const t of tree.tips) items.push([K.depthOf(t.p, P) + 0.02, wrap(K.solidSvg(G.sphereOf(t.p, t.r * tipBall, P), { tone }))]);
  return items;
}
