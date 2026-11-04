// Lab · the v3 bio primitives on one bench: a blob (smooth union), a packed cluster before and after compaction,
// and a Murray's-law branching tree. Not a figure; a test sheet that shows each primitive at 1× and proves it renders.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, plinth, stain, vitaPage, scene } from "../../bio/bio.mjs";
import { blobOf, clusterOf, clusterSvg, packSpheres } from "../../bio/soft.mjs";
import { treeOf, treeItems } from "../../bio/branch.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../site/demos");
const W = 720, H = 420;
const PLATE = { x: -230, y: -70, w: 460, d: 140, r: 10 };
const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [-200, 0, 110], [200, 0, 110]], W, H, { pad: 18, azimuth: 30 });
const S = (paths, style) => k.solidSvg(paths, style);
const sc = scene(P);
// 1. blob: a dividing cell mid-furrow, two lobes fused
const blob = blobOf([[-168, 0, 40, 24], [-140, 0, 40, 24]], P, { merge: 0.14 });
sc.at([-154, 0, 40], stain("gfp", S(blob, { tone: "hi" }), 0.5));
// 2. clusters: 8 cells loose, then compacted
const eight = packSpheres(8, Array.from({ length: 8 }, (_, i) => [Math.cos(i) * 10, Math.sin(i * 1.7) * 10, Math.cos(i * 2.3) * 10, 17]), 38, { squeeze: 0.05 });
const at = (c) => eight.map(([x, y, z, r]) => [x + c[0], y + c[1], z + c[2], r]);
sc.at([-60, 0, 44], stain("dapi", clusterSvg(clusterOf(at([-60, 0, 44]), P, { press: 0 }), { tone: "hi" }), 0.35));
sc.at([30, 0, 44], stain("dapi", clusterSvg(clusterOf(at([30, 0, 44]), P, { press: 0.16 }), { tone: "hi" }, { seamOpacity: 0.45 }), 0.35));
// 3. a tree: Murray branching from a ball on a post
const tree = treeOf(42, [150, 0, 20], [0, 0, 1], { length: 34, radius: 4.2, levels: 4, spread: 0.6, wobble: 0.18, up: [0, 0, 1], bend: 0.05 });
for (const [d, h] of treeItems(tree, P, { wrap: (h) => stain("rfp", h, 0.45) })) sc.put(d, h);
for (const x of [-154, -60, 30]) sc.put(k.depthOf([x, 0, 0], P) - 50, S(k.cylinder(x, 0, 12, 0, 2.4, P, 32, 0.5), { tone: "mid" }) + S(k.cylinder(x, 0, 3, 2.4, 10, P, 18), { tone: "mid", crease: "none" }));
sc.put(k.depthOf([150, 0, 0], P) - 50, S(k.cylinder(150, 0, 12, 0, 2.4, P, 32, 0.5), { tone: "mid" }) + S(k.cylinder(150, 0, 4.2, 2.4, 18, P, 18), { tone: "mid", crease: "none" }));
const svg = k.figureSvg({ width: W, height: H, label: "Test bench for the soft-body and branching primitives.", body: [plinth(PLATE, P), sc.svg()] });
const body = k.plateHtml({ fig: "Lab", title: "Bio primitives", hint: "blobOf · clusterOf · treeOf", readout: "v3", caption: "Left to right: blobOf (a dividing cell as one smooth body), clusterOf with press 0 (eight loose blastomeres, each shaded as its own sphere, membranes traced where they meet), clusterOf with press 0.16 (the same cells compacted: flat contacts, faint membranes), treeOf (four levels of Murray's-law branching, each fork on a ball tee).", body: `<div class="iso-stage">${svg}</div>` });
writeFileSync(join(OUT, "lab-primitives.html"), vitaPage({ n: "Lab", title: "Bio primitives", zh: "v3 原语试验台", body, script: "" }));
console.log("wrote lab-primitives.html");
