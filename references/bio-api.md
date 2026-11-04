# Bio API

Everything in `bio/`. The kit (`kit/`) is Anatomy's, unchanged: see `references/anatomy/kit.md`.

## bio/bio.mjs

```js
import { k, G, liveScript, LOOP_SRC, RNG_SRC, rng, scene, STAINS, stain, shellOf, plinth, standRod, byDepth, vitaPage, BIO_CSS } from "../../bio/bio.mjs";
```

| Export | Signature | Notes |
|---|---|---|
| `k`, `G` | namespaces | `kit/iso-kit.mjs` and `kit/lathe.mjs` re-exported |
| `liveScript` | `({ soft = false, branch = false } = {}) → string` | page source defining `K`, `G`, `T` (tube), and optionally `SOFT`, `BR`, built from the same files as the build |
| `LOOP_SRC` | string | defines `vitaLoop(o)` and `vitaSay(stage, readout, text)` in the page |
| `vitaLoop` | `vitaLoop({ stage, frame(dt, st), pointer?(x01, st), click?(st), keys?(key, st) → bool, resume?(st), idleMs = 5000 })` | `st = { touring, still, clock }`; `frame` gets `dt = 0` once under reduced motion; pointer x is 0–1 across the drawing; return `true` from `keys` when a key is used |
| `scene` | `scene(P) → { put(depth, html), at(point, html), tube(points, r, style, { wrap, maxLength, ...tubeOpts }), depth(p), svg() }` | depth collector; `svg()` paints back to front |
| `STAINS` | `{ dapi, gfp, rfp, eosin, hema, atp, myelin, oxy, deoxy, na, k, trna, cyt }` | hex colours, exposed as `--stain-<name>` |
| `stain` | `stain(name, svg, amount = 1) → svg` | mixes all four tones, edges and dots toward the dye |
| `shellOf` | `shellOf(centre, r, P, { steps = 72 }) → { back, front }` | see-through membrane; draw back, contents, front |
| `plinth` | `plinth(PLATE, P, { h = 10, foot = 5, scale?: { x, y, w, step, every }, label?: { x, y, w?, d? } })` | bench with feet, screws, ruler (1 tick = `step` world units) and label plate |
| `standRod` | `standRod(x, y, z, P, { r = 2.4, clampAt = z - 8 })` | lab stand with knurled clamp |
| `rng` / `RNG_SRC` | `rng(seed) → () => [0,1)` | seeded LCG, same in build and page |
| `byDepth` | `byDepth(points, P)` | sort [x, y] floor points back to front |
| `vitaPage` | `vitaPage({ n, title, zh, body, script, facts = [[value, label]], theme = "light", width = 760 }) → html` | nav, card, facts row, `?embed` / `#embed` mode |

CSS classes added by `BIO_CSS`: `.bio-stain`, `.bio-shell-back/-front`, `.bio-glass`, `.bio-gleam`, `.bio-lumen` (an opening),
`.bio-cavity` (inside a cut), `.bio-rim` (a cut face), `.bio-blastocoel` (fluid), `.bio-zona-back`, `.bio-pipette`, `.bio-seam`,
`.bio-membrane`, and `.iso-swatch[data-mark="<stain>"]` for legend keys.

## bio/soft.mjs (page: `SOFT`)

| Export | Signature | Notes |
|---|---|---|
| `blobOf` | `blobOf(spheres, P, { merge = 0.35, step = 1.1 }) → solid paths` | `spheres = [[x, y, z, r], ...]`; one body, smooth-min union; draw with `k.solidSvg` |
| `clusterOf` | `clusterOf(spheres, P, { press = 0, step = 1.1, membranes = true }) → solid paths + seams` | packed cells, z-buffered; `press` inflates cells so contacts flatten |
| `clusterSvg` | `clusterSvg(paths, style, { seamTone = "lo", seamOpacity = 1 })` | the cluster plus its membranes |
| `packSpheres` | `packSpheres(seed, list, R, { centre = [0,0,0], squeeze = 0.06, iters = 160, wall = 1 }) → list` | relax spheres inside a sphere of radius R |
| `ringsOf`, `ringsPath`, `chaikin` | marching squares on a grid, rings → path, corner cutting | building blocks for other fields |

Cost: proportional to (total cell area in px) / step². 64 cells at 100 px embryo radius, `step: 1.5` ≈ 60 fps.

## bio/branch.mjs (page: `BR`)

| Export | Signature | Notes |
|---|---|---|
| `treeOf` | `treeOf(seed, root, dir, { length = 60, radius = 4, levels = 4, fork = 2, spread = 0.55, shrink = 0.72, wobble = 0.25, bend = 0.3, up = null, minRadius = 0.6, steps = 6 }) → { segments, joints, tips }` | Murray's-law radii |
| `treeItems` | `treeItems(tree, P, { tone = "hi", wrap, tipBall = 1.15, maxLength = 40, runs = 1 }) → [[depth, svg], ...]` | push into `scene().put` |
| `MURRAY` | 0.794 | 2^(−1/3) |

## bio/check.mjs

```bash
node bio/check.mjs site/demos/*.html       # Playwright, or CHROME=/path/to/chrome
```

Columns: `errors live keys still phone scale stains time facts`. Exits 1 if any page fails.
