---
name: anatomy-vita
description: Draw living processes (DNA replication, molecular motors, ion pumps, cell division, neurons, organelles, tissues, organs, physiological systems, ecosystems) as crafted, interactive isometric SVG specimens with true numbers, real stains and conserved particles. Use this whenever someone wants a biology, biochemistry, cell-biology, physiology or life-science explainer, diagram, figure or interactive illustration — for docs, a lesson, a blog post or a landing page — even if they never say "isometric". Built on the Anatomy skill (MIT) and reuses its kit unchanged; adds a bio layer of stains, see-through membranes, specimen plinths, seeded variation, a live in-page kit for growth and topology change, a shared motion runtime and bilingual (Chinese/English) page shells.
license: MIT
compatibility: Written for Claude Code. Needs Node.js 20.10+, and Chrome or Chromium for the screenshot and line checks.
metadata:
  opencode/slash: "true"
---

# Anatomy Vita

Anatomy Vita draws life the way [Anatomy](https://github.com/wheresryan22/anatomy) draws machines: a real, well-made object whose motion *is* the concept, built from many small solid parts, with every number coming from the same small model that moves them. Molecules really are machines and are drawn as such. Cells, tissues and organs are drawn as **specimens** — on slides, stands and teaching-model plinths, beside the instruments that would record them.

Eight finished figures ship in `demos/`. Open the closest one before you start; each is built with `node demos/<name>/build.mjs`, which writes `site/demos/NN-name.html`.

| Demo | Scale | The object | Shows how to |
|---|---|---|---|
| `demos/dna/` | 2 nm | A double-helix zipper on three stands | stand rods, a helicase ring, strands rebuilt per frame |
| `demos/atp/` | 10 nm | A water wheel in a membrane patch | a rotor driven by a counted proton pool, reversal below a threshold |
| `demos/mitosis/` | 20 µm | One cell on a slide becoming two | topology change: the cell outline as a union of cross-sections |
| `demos/neuron/` | 1 mm | A GFP neuron and a recording amplifier | stains, a live trace, myelinated vs unmyelinated conduction |
| `demos/ribosome/` | 21 nm | A tape reader reading the real GFP gene | `scene()` depth collection, `vitaLoop()`, codon/anticodon teeth |
| `demos/kinesin/` | 8 nm | A two-legged walker with a force-clamp spring | a force–velocity law driving the gait and the readout |
| `demos/pump/` | 10 nm | A two-door airlock in a membrane | conserved, countable ions; leak channels; a blocking switch |
| `demos/mito/` | 1 µm | A cut-open mitochondrion teaching model | clipped cutaways, cristae as prisms, demand-driven states |

## Read Anatomy first

Everything in Anatomy still applies: the ten-step workflow, the craft rules, the painter's order, the audit and line checks. The kit in `kit/` and the tools in `scripts/` are Anatomy's, copied unchanged — never edit them; put extensions in `bio/`.

- `references/craft.md` — the look: parts vocabulary, tones, painter's order, round parts, pipes. Read before designing.
- `references/kit.md` — the kit API.
- `references/motion.md` — live behaviour, springs, tours, input, reduced motion.
- `references/verify.md` — `scripts/capture.mjs`, `scripts/drive.mjs`, the review checklist.
- `references/walkthrough.md`, `webgl.md`, `3d.md`, `react.md`, `print.md`, `publish.md` — as in Anatomy.

The upstream skill, with its own examples, lives at https://github.com/wheresryan22/anatomy.

## The seven laws of life

These sit on top of Anatomy's rules. Each is enforced by a call in `bio/bio.mjs`.

1. **Scale is truth.** Every base carries a calibrated ruler in real units (nm, µm, mm, cm), and the caption says what one tick is. → `plinth(PLATE, P, { scale })`
2. **Stains, not palettes.** Colour only where a real dye or fluorescent protein would put it: DNA is DAPI blue, neurons GFP green, protons RFP red. The four facing tones stay. → `stain(name, svg, k)`, `STAINS`
3. **Admit the time warp.** Action potentials take µs and mitosis an hour; the readout always says "slowed N×" or "sped up N×". → the readout via `vitaSay()`
4. **Conserve particles.** Ions, protons and nucleotides jiggle, but they are countable and conserved through every state. → a fixed pool, painted with `scene(P).put(...)`
5. **Topology may change.** One cell really becomes two: draw the outline as the union of cross-sections, rebuilt every frame. → `liveScript()` (see `demos/mitosis/`)
6. **Specimens, not cartoons.** Above the scale of a molecule, things sit on slides, coverslips, stands or teaching-model bases, as in a lab. → `plinth()`, `standRod()`, `shellOf()`
7. **Declare metaphors.** Only processes with no body (a fate landscape, a feedback loop) get an invented machine, and the caption says it is a metaphor.

## Workflow

Follow Anatomy's workflow, with these changes:

1. **Size it** (Figure 40–80 parts, Hero 80–150, Epic: ask first).
2. **Truth first.** Collect the real numbers — sizes, rates, potentials, stoichiometry, concentrations — and write them as a small pure model. These also become the page's facts strip.
3. **Invent the object.** One sentence: what moves, and what that motion means. Molecules → a machine. Cells and up → a specimen on a stage. Bodiless processes → a declared metaphor.
4. **Parts list ≥ 40**, including the specimen stage: plinth with ruler and name plate, stand rods, slide or coverslip, recording instrument.
5. **Plan the world.** One world unit ≈ one true unit at the figure's scale; say which in the caption.
6. **Build geometry once**; rebuild per frame only what grows, deforms or splits (inline the kit with `liveScript()`).
7. **Paint back to front.** Collect particles, tube pieces and parts in `scene(P)` and call `svg()`; split membranes with `shellOf()` into back and front halves.
8. **Frame it** with `vitaPage({ n, title, zh, en, body, script, facts })`. Card text (title, hint, readout, caption) is English; the facts strip is `[value, 中文, English]`, true numbers only.
9. **Make it live** with `vitaLoop({ stage, frame, pointer, click, keys })`: offscreen pause, idle tour, pointer and keys, still under reduced motion.
10. **Verify like a critic.** `node scripts/capture.mjs page.html --width 820` and `--width 390`, a mid-motion shot, a 4× close-up, and `node scripts/lines.mjs page.html` to zero. Check that particle counts stay conserved by driving the page.

The caption must state the scale (1 tick = ?), the key true numbers and the time scaling.

## The bio layer (`bio/bio.mjs`)

| API | What it does |
|---|---|
| `liveScript()` | Inlines `kit/iso-kit.mjs`, `lathe.mjs`, `tube.mjs` as `K`, `G`, `T` inside the page, so geometry can be rebuilt every frame |
| `rng(seed)` / `RNG_SRC` | Seeded variation: no two cells alike, every build identical |
| `STAINS`, `stain(name, svg, k)` | 13 dyes (`dapi gfp rfp eosin hema atp myelin oxy deoxy na k trna cyt`) mixed into the four tones with `color-mix`; legend swatches take a dye name (`mark: "na"`) |
| `shellOf(c, r, P)` | A translucent membrane in two halves: `back` before the contents, `front` after |
| `plinth(PLATE, P, { scale, label })` / `standRod(x, y, z, P)` | Specimen base with feet, screws, calibrated ruler and name plate; a stand rod with a knurled clamp |
| `byDepth(points, P)` | Painter's order for particles and cells |
| `scene(P)` | Depth collector: `put(depth, html)`, `at(point, html)`, `tube(points, r)`, then `svg()` |
| `LOOP_SRC` → `vitaLoop()`, `vitaSay()` | The shared live runtime and the accessible readout |
| `vitaPage({...})` | Page shell: nav, card, facts strip, `#embed` mode, language toggle |
| `t(zh, en)`, `LANG_SRC`, `LANG_CSS`, `LANG_BUTTON` | Bilingual shells: both languages in the page; `html[data-lang]` picks one; `?lang=en` / `?lang=zh` |

## Building the site

```bash
for d in demos/*/; do node $d/build.mjs; done && node build-index.mjs
```

`site/` is a static folder (each page self-contained). Register a new figure in the `demos` array of `build-index.mjs` (the 7th column is its file name). Deploy anywhere static, for example `wrangler deploy` with the included `wrangler.jsonc`.

## Credits

Anatomy Vita is built on Anatomy by Ryan (@wheresryan22), MIT License — see `LICENSE-anatomy`. `kit/`, `scripts/` and `references/` are Anatomy's, unchanged.
