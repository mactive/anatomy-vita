// Anatomy Vita — soft bodies. What the kit can't draw: things made of many round parts that touch, press and fuse.
// Every shape here is a set of spheres in world space. The camera is orthographic, so a sphere is a circle on screen and
// its normal is known at every pixel; we rasterise on a coarse screen grid, then trace the edges with marching squares,
// the same field-and-contour method the Anatomy spot-plate uses for its merging drops. Output has the shape of a kit
// solid ({ fill, outline, shades[4], top, seamless }) so solidSvg, the four tones and the stains all apply unchanged.
//
//   blobOf(spheres, P, { merge })      one smooth body: a nucleus, a lobed organ, a dividing cell, a bleb
//   clusterOf(spheres, P, { press })   packed cells: each shaded by its own sphere, membranes drawn where cells meet
//   packSpheres(seed, list, R, opts)   relax spheres inside a container (zona, capsule, dish) without overlap
//
// Pure functions of their inputs; they run in Node at build time and in the page (as SOFT) per frame.
import * as K from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";

const BANDS = [0, 0.2, 0.42, 0.62]; // the kit's tone thresholds (lathe.mjs)

// ---- camera helpers: the screen basis (right, down, toward viewer) in world space
function basisOf(P) {
  const { sinA, cosA, sinE, cosE, k } = K.cameraOf(P);
  const right = [sinA, -cosA, 0], down = [cosA * sinE, sinA * sinE, -cosE], view = [cosA * cosE, sinA * cosE, sinE];
  const L = G.lightOf(P);
  return { k, light: [G.dot3(L, right), G.dot3(L, down), G.dot3(L, view)] };
}
// spheres → screen circles {x, y, r, z(depth px), i}
function circlesOf(spheres, P) {
  const { k } = basisOf(P);
  return spheres.map((s, i) => { const [x, y] = K.iso([s[0], s[1], s[2]], P); return { x, y, r: s[3] * k, z: K.depthOf([s[0], s[1], s[2]], P) * k, i }; });
}

// ---- marching squares on a grid, returning closed rings (outside the grid counts as below the level)
const SEG = { 1: [[3, 2]], 2: [[2, 1]], 3: [[3, 1]], 4: [[0, 1]], 6: [[0, 2]], 7: [[3, 0]], 8: [[3, 0]], 9: [[0, 2]], 11: [[0, 1]], 12: [[3, 1]], 13: [[2, 1]], 14: [[3, 2]] };
export function ringsOf(grid, level) {
  const { nx, ny, x0, y0, step, v } = grid;
  const at = (i, j) => v[j * nx + i];
  const pts = new Map(), links = new Map();
  const point = (id) => {
    if (pts.has(id)) return;
    const cell = id >> 1, i = cell % nx, j = (cell - i) / nx, down = id & 1;
    const a = at(i, j), b = down ? at(i, j + 1) : at(i + 1, j);
    const t = Math.min(1, Math.max(0, (level - a) / (b - a || 1e-9)));
    pts.set(id, down ? [x0 + i * step, y0 + (j + t) * step] : [x0 + (i + t) * step, y0 + j * step]);
  };
  const link = (a, b) => { point(a); point(b); (links.get(a) || links.set(a, []).get(a)).push(b); (links.get(b) || links.set(b, []).get(b)).push(a); };
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const tl = at(i, j), tr = at(i + 1, j), br = at(i + 1, j + 1), bl = at(i, j + 1);
    const code = (tl >= level ? 8 : 0) | (tr >= level ? 4 : 0) | (br >= level ? 2 : 0) | (bl >= level ? 1 : 0);
    if (code === 0 || code === 15) continue;
    const e = [(j * nx + i) * 2, ((j * nx + i + 1) * 2) | 1, ((j + 1) * nx + i) * 2, ((j * nx + i) * 2) | 1];
    let pairs = SEG[code];
    if (!pairs) { const c = (tl + tr + br + bl) / 4 >= level; pairs = code === 5 ? (c ? [[3, 0], [2, 1]] : [[0, 1], [3, 2]]) : (c ? [[0, 1], [3, 2]] : [[3, 0], [2, 1]]); }
    for (const [a, b] of pairs) link(e[a], e[b]);
  }
  const seen = new Set(), out = [];
  for (const start of links.keys()) {
    if (seen.has(start)) continue;
    const ring = []; let prev = -1, cur = start;
    while (!seen.has(cur)) { seen.add(cur); ring.push(pts.get(cur)); const nx2 = links.get(cur).find((c) => c !== prev && !seen.has(c)); if (nx2 === undefined) break; prev = cur; cur = nx2; }
    if (ring.length > 3) out.push(ring);
  }
  return out;
}
const f1 = (n) => Math.round(n * 10) / 10;
// Chaikin corner cutting: grid steps become smooth curves (closed rings or open lines)
export function chaikin(pts, closed = true, passes = 2) {
  for (let k = 0; k < passes; k++) {
    const out = []; const n = pts.length; if (n < 3) return pts;
    const last = closed ? n : n - 1;
    if (!closed) out.push(pts[0]);
    for (let i = 0; i < last; i++) { const a = pts[i], b = pts[(i + 1) % n];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
    if (!closed) out.push(pts[n - 1]);
    pts = out;
  }
  return pts;
}
export const ringsPath = (rings, smooth = 2) => rings.map((r) => "M" + chaikin(r, true, smooth).map((p) => f1(p[0]) + " " + f1(p[1])).join("L") + "Z").join("");
// join loose segments that share ends into polylines
function joinSegments(segs) {
  const key = (p) => Math.round(p[0] * 50) + "," + Math.round(p[1] * 50);
  const ends = new Map(); segs.forEach((sg, i) => { for (const e of [0, 1]) { const kk = key(sg[e]); (ends.get(kk) || ends.set(kk, []).get(kk)).push(i); } });
  const used = new Uint8Array(segs.length), lines = [];
  for (let i = 0; i < segs.length; i++) { if (used[i]) continue; used[i] = 1; const line = [segs[i][0], segs[i][1]];
    for (const dir of [1, 0]) { let tip = dir ? line[line.length - 1] : line[0];
      for (;;) { const nb = (ends.get(key(tip)) || []).find((j) => !used[j]); if (nb === undefined) break; used[nb] = 1; const sg = segs[nb];
        const nxt = key(sg[0]) === key(tip) ? sg[1] : sg[0]; if (dir) line.push(nxt); else line.unshift(nxt); tip = nxt; } }
    lines.push(line); }
  return lines;
}

function gridFor(circles, step, pad = 3) {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const s of circles) { a = Math.min(a, s.x - s.r); b = Math.min(b, s.y - s.r); c = Math.max(c, s.x + s.r); d = Math.max(d, s.y + s.r); }
  const x0 = a - pad * step, y0 = b - pad * step;
  const nx = Math.ceil((c - a) / step) + 2 * pad + 1, ny = Math.ceil((d - b) / step) + 2 * pad + 1;
  return { nx, ny, x0, y0, step };
}
const sheet = (g, fill) => ({ ...g, v: new Float32Array(g.nx * g.ny).fill(fill) });

// ---- one smooth body: polynomial smooth-min of sphere distances; normals blended by the same weights
export function blobOf(spheres, P, { merge = 0.35, step = 1.1 } = {}) {
  const C = circlesOf(spheres, P);
  const { light } = basisOf(P);
  const kk = merge * Math.max(...C.map((c) => c.r)); // blend width in px
  const g = gridFor(C, step, 4);
  const inside = sheet(g, -1), lit = sheet(g, -2);
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
    const px = g.x0 + i * step, py = g.y0 + j * step;
    let d = Infinity, nx = 0, ny = 0, nz = 0, wsum = 0;
    for (const c of C) {
      const dd = Math.hypot(px - c.x, py - c.y) - c.r;
      if (d === Infinity) d = dd; else { const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (dd - d)) / (kk || 1e-6))); d = dd * (1 - h) + d * h - kk * h * (1 - h); }
      const w = Math.exp(-Math.max(0, dd) / (kk * 0.5 + 1)) * (dd < kk ? 1 : 0.0001);
      const u = (px - c.x) / c.r, vv = (py - c.y) / c.r, q = Math.min(1, u * u + vv * vv);
      nx += w * u; ny += w * vv; nz += w * Math.sqrt(1 - q) ; wsum += w;
    }
    inside.v[j * g.nx + i] = -d;
    if (d < 0.5 && wsum > 0) { const m = Math.hypot(nx, ny, nz) || 1; lit.v[j * g.nx + i] = (nx * light[0] + ny * light[1] + nz * light[2]) / m; }
  }
  const outline = ringsPath(ringsOf(inside, 0));
  const shades = [outline, ...[1, 2, 3].map((b) => ringsPath(ringsOf(lit, BANDS[b])))];
  return { fill: outline, outline, crease: "", top: "", shades, seamless: true };
}

// ---- packed cells: a z-buffer of spheres. press > 0 inflates every cell a little, so neighbours meet along flat
// faces (the shapes compacted cells take) while each keeps its own shading; membranes are traced between labels.
export function clusterOf(spheres, P, { press = 0, step = 1.1, membranes = true } = {}) {
  const C = circlesOf(spheres, P).map((c) => ({ ...c, r: c.r * (1 + press) }));
  const { light } = basisOf(P);
  const g = gridFor(C, step, 3);
  const n = g.nx * g.ny;
  const H = new Float32Array(n).fill(-Infinity), LB = new Int32Array(n).fill(-1);
  const cover = sheet(g, -2);
  for (const c of C) {
    const i0 = Math.max(0, Math.floor((c.x - c.r - g.x0) / step) - 2), i1 = Math.min(g.nx - 1, Math.ceil((c.x + c.r - g.x0) / step) + 2);
    const j0 = Math.max(0, Math.floor((c.y - c.r - g.y0) / step) - 2), j1 = Math.min(g.ny - 1, Math.ceil((c.y + c.r - g.y0) / step) + 2);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const px = g.x0 + i * step - c.x, py = g.y0 + j * step - c.y, q = c.r * c.r - px * px - py * py, id = j * g.nx + i;
      const sd = q / (2 * c.r); if (sd > cover.v[id]) cover.v[id] = sd; // ≈ signed distance near the rim
      if (q > 0) { const h = c.z + Math.sqrt(q); if (h > H[id]) { H[id] = h; LB[id] = c.i; } }
    }
  }
  const lit = sheet(g, -2);
  for (let id = 0; id < n; id++) { const l = LB[id]; if (l < 0) continue; const c = C[l]; const i = id % g.nx, j = (id - i) / g.nx;
    const u = (g.x0 + i * step - c.x) / c.r, v = (g.y0 + j * step - c.y) / c.r; const w = Math.sqrt(Math.max(0, 1 - u * u - v * v));
    lit.v[id] = u * light[0] + v * light[1] + w * light[2]; }
  const outline = ringsPath(ringsOf(cover, 0));
  const shades = [outline, ...[1, 2, 3].map((b) => ringsPath(ringsOf(lit, BANDS[b])))];
  // membranes: in every grid square whose corners belong to exactly two cells, trace where their fronts are level
  let seams = "";
  if (membranes) {
    const hOf = (c, px, py) => { const q = c.r * c.r - (px - c.x) ** 2 - (py - c.y) ** 2; return q > 0 ? c.z + Math.sqrt(q) : c.z - c.r * 2; };
    const segs = [];
    for (let j = 0; j < g.ny - 1; j++) for (let i = 0; i < g.nx - 1; i++) {
      const ids = [j * g.nx + i, j * g.nx + i + 1, (j + 1) * g.nx + i + 1, (j + 1) * g.nx + i];
      const ls = ids.map((x) => LB[x]); if (ls.some((l) => l < 0)) continue;
      const a = ls[0], b = ls.find((l) => l !== a); if (b === undefined || ls.some((l) => l !== a && l !== b)) continue;
      const corners = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([ci, cj]) => [g.x0 + ci * step, g.y0 + cj * step]);
      const val = corners.map(([px, py]) => hOf(C[a], px, py) - hOf(C[b], px, py));
      const cross = [];
      for (let e = 0; e < 4; e++) { const p = corners[e], q = corners[(e + 1) % 4], va = val[e], vb = val[(e + 1) % 4];
        if ((va >= 0) !== (vb >= 0)) { const t = va / (va - vb); cross.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); } }
      if (cross.length >= 2) segs.push([cross[0], cross[1]]);
    }
    seams = joinSegments(segs).filter((l) => l.length > 2).map((l) => "M" + chaikin(l, false, 2).map((p) => f1(p[0]) + " " + f1(p[1])).join("L")).join("");
  }
  return { fill: outline, outline, crease: "", top: "", shades, seamless: true, seams, labels: { grid: g, LB } };
}
// a cluster as kit SVG: the solid, then its membranes as a line under the outline
export function clusterSvg(paths, style = {}, { seamTone = "lo", seamOpacity = 1 } = {}) {
  const inner = paths.seams ? `<path class="iso-line bio-seam" data-tone="${seamTone}" style="opacity:${seamOpacity}" d="${paths.seams}"/>` : "";
  return K.solidSvg(paths, { ...style, inner });
}

// ---- relax spheres inside a sphere of radius R (or any container test) so none overlap by more than `squeeze`
//   list: [[x,y,z,r], ...] starting guesses (e.g. daughters placed beside their mother). Returns a new list.
export function packSpheres(seed, list, R, { centre = [0, 0, 0], squeeze = 0.06, iters = 160, wall = 1 } = {}) {
  let s = seed >>> 0 || 1; const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pts = list.map((p) => [p[0] + (rand() - 0.5) * 1e-3, p[1] + (rand() - 0.5) * 1e-3, p[2] + (rand() - 0.5) * 1e-3, p[3]]);
  for (let it = 0; it < iters; it++) {
    for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) {
      const A = pts[a], B = pts[b]; const d = [B[0] - A[0], B[1] - A[1], B[2] - A[2]]; const L = Math.hypot(...d) || 1e-6;
      const want = (A[3] + B[3]) * (1 - squeeze); if (L >= want) continue;
      const push = (want - L) / 2; for (let c = 0; c < 3; c++) { A[c] -= (d[c] / L) * push; B[c] += (d[c] / L) * push; }
    }
    for (const p of pts) { const d = [p[0] - centre[0], p[1] - centre[1], p[2] - centre[2]]; const L = Math.hypot(...d) || 1e-6; const lim = (R - p[3]) * wall;
      if (L > lim) for (let c = 0; c < 3; c++) p[c] = centre[c] + (d[c] / L) * lim; }
  }
  return pts;
}
