---
name: anatomy-vita
description: Build crafted, interactive isometric SVG figures that explain how living things work, from molecules to planets (DNA replication, ribosomes, motor proteins, ion pumps, mitochondria, cell division, embryos, neurons, synapses, muscle, joints, organs, organ systems, ecosystems), each as a real working object on a lab bench with true numbers, a live readout and calm motion. Use this whenever someone wants a biology, physiology, anatomy, cell-biology or life-science explainer figure, diagram or interactive illustration for a lesson, article, docs or a landing page, even if they never say "isometric". Extends the Anatomy skill (wheresryan22/anatomy, MIT) with stains, membranes, soft bodies, packed cells, branching trees, specimen stages and a life-law checker.
license: MIT
compatibility: Node.js 20.10+ for builds; Playwright (or Chrome via CHROME=/path) for bio/check.mjs and screenshots. Kit vendored unchanged from Anatomy.
---

# Anatomy Vita

Anatomy makes figures like a small instrument on a bench: the reader understands the idea because they recognise the
machine. Vita keeps every rule of Anatomy and carries it into living things. Molecules are already machines, so they are
drawn as machines. Cells and everything larger are drawn the way a lab really holds them: on a coverslip, in a holding
pipette, as a cut-open teaching model on cradles, on a stand with a ruler. Every number on the figure comes from one
small model of the real biology, and the figure says how it has changed space and time.

**Read `references/anatomy/ANATOMY-SKILL.md` first.** Its workflow, craft rules, tone hierarchy, painter's order,
motion and verification all apply unchanged. This file only adds what life needs. When the two disagree, Anatomy's
craft wins on drawing; this file wins on biology.

Nine finished figures ship in `demos/`; open the closest one before you start. Each builds with
`node demos/<name>/build.mjs` into `site/demos/`.

| Figure | Scale | Object | Shows how to |
|---|---|---|---|
| `dna/` 01 replication fork | 2 nm | helix on three stands, unzipped by a ring | helices, strands that split, true bp geometry |
| `atp/` 02 ATP synthase | 10 nm | rotary motor in a notched membrane | a membrane cut face, counted protons, a motor that reverses |
| `mitosis/` 03 mitosis | 20 µm | one cell on a slide | topology change, membrane shells |
| `neuron/` 04 action potential | 1 mm | GFP neuron + recording amplifier | branching, an instrument trace, myelin toggle |
| `ribosome/` 05 translation | 21 nm | tape reader, real GFP gene | sequence-driven motion, key-and-lock teeth, rejection |
| `kinesin/` 06 kinesin | 8 nm | walker on a microtubule + force clamp | a load you set, stall, hand-over-hand |
| `pump/` 07 Na⁺/K⁺ pump | 10 nm | two-gate airlock + leak channels | conserved ions, a drug switch, gradients that run down |
| `mito/` 08 mitochondrion | 1 µm | lengthwise cut teaching model | a curved cutaway (clipPath), lamellae with `G.prismOf` |
| `cleavage/` 09 cleavage → blastocyst | 100 µm | embryo in a holding pipette | `bio/soft.mjs`: packed cells, compaction, a cavity |

`demos/lab/` is a test bench for the soft-body and branching primitives.

## The one idea, for living things

**The object is the explanation, and the specimen is the object.** Pick the form by scale:

| Scale | What the thing is | How to draw it | Examples |
|---|---|---|---|
| < 50 nm | a molecular machine | as the machine it already is, at true size, in a membrane patch or on a track | pump → airlock, ATP synthase → water wheel, ribosome → tape reader, kinesin → walker, polymerase → zipper |
| 50 nm – 1 mm | an organelle, a cell, a small tissue | a specimen: on a coverslip, in a pipette, as a cut-open teaching model on cradles | mitochondrion → lengthwise cut model, embryo → holding pipette, neuron → GFP cell + recording rig |
| 1 mm – 2 m | an organ, a joint, a system | an anatomical teaching model: on a stand, opening on a hinge or sliding apart, with ports and tubing | knee → skeleton model 0–135°, heart → four-chamber cut model, nephron → plumbing on a board |
| > 2 m | an ecosystem, a planet | a laboratory model of it: a sealed terrarium, a stream table, a globe on a stand | carbon cycle → three sealed tanks with flow meters, Daisyworld → a globe with a thermostat |
| no body at all | a process with no physical form (differentiation, evolution, feedback) | invent a machine, and say in the caption that it is a metaphor | Waddington landscape → marble on a deformable tray |

Two ways this fails, in addition to Anatomy's two:

- **Cartoon biology.** Smiling cells, glossy blobs, textbook arrows, a floating "mitochondrion" bean. Draw the specimen as it is held and measured, or as the machine it is.
- **The machine swallows the biology.** A housing so large the subject hides inside it (an early ribosome draft was a closed cabinet). Cut it open, cut away the near half, and keep the subject the largest lit thing.

## Laws of life (in addition to Anatomy's craft rules)

1. **The ruler is the truth.** Every bench carries a calibrated ruler (`plinth(…, { scale })`). The caption states it: "ruler: 1 tick = 10 µm". If the figure compresses space, say so: "not to scale: the axon stands for 10 mm", "the tape is drawn ~3× stretched".
2. **Stain, don't colour.** Colour comes only from a real dye or reporter: DAPI blue for DNA, GFP green for a neuron or a protein product, RFP red for protons, eosin, haematoxylin, a myelin tint, oxy/deoxy blood, ATP orange, Na⁺ amber, K⁺ violet. `stain(name, svg, k)` mixes the four tones toward the dye and keeps the light. Anatomy's "exactly one lit part" still holds.
3. **Admit what time does.** Molecular events are µs–ms, development is days. The caption says how time is changed: "shown 600× slower", "about 250× faster", "days 0–5.6". If the flow is schematic, say "relative rates, not real time".
4. **Conserve what is counted.** Ions, protons, tRNAs, cells and volumes are counted, not sprinkled. A pump moves 3 Na⁺ out and 2 K⁺ in, and the count on each side changes by exactly that. Cleavage halves volume, so radius × 0.79. Leaks run at a rate set by the gradient. The readout shows the counts.
5. **Topology can change.** One cell becomes two; a ball of cells opens a cavity; a membrane fuses. Draw this with soft bodies (`bio/soft.mjs`), never as two circles laid over each other.
6. **Specimens, not cartoons.** Anything larger than a molecule rests on something real: a coverslip, a dish, a pipette, a stand, cradles, a hinge. Every support touches what it holds.
7. **Declare every metaphor.** Only a process with no body gets an invented machine, and the caption says it is one.

## Workflow

Follow Anatomy's ten steps (`references/anatomy/ANATOMY-SKILL.md`, "Workflow"). The Vita changes:

1. **Size it.** Figure / Hero / Epic as in Anatomy. A whole-body system or a planet is an Epic: propose a Hero first.
2. **Truth first, from the literature.** Collect sizes, counts, rates, thresholds and timings, and note each one's source as you go: they become the caption, the facts row and the readout. Write the model as a small pure function of time and one control. Look up anything you aren't sure of; biology numbers vary by organism, so name the organism ("human IVF timings", "bovine c8 ring", "E. coli elongation").
3. **Pick the form from the scale table**, then say in one sentence what moves and what the motion means. Choose the one control the reader gets (hover/arrow keys): a concentration, a load, a demand, a drug on/off, time itself.
4. **Parts list ≥ 40**, grouped as in Anatomy, plus the specimen stage: plinth with ruler and label plate, the holder (coverslip, pipette, cradles, posts), the cut faces, and the stained subject.
5. **Plan the world in true units.** Pick a world scale per unit (`const UM = 1.6`, `const NM = 8`) and build every size from real numbers through it. Camera as Anatomy; choose the azimuth so the subject's long side and its open cut face toward the viewer.
6. **Build static geometry once; rebuild only what changes shape.** Soft bodies and packed cells are rebuilt per frame through `SOFT` in the page (cheap at `step: 1.5`); guard redraws with a change threshold.
7. **Paint in order.** Use `scene(P)` for anything that can overlap; split shells into back and front (`shellOf`); draw what sits inside a cut after the cavity fill and clip it to the cut (`clipPath`, see `demos/mito`).
8. **Frame it** with `vitaPage({ n, title, zh, body, script, facts })`: card, true caption (ruler, organism, time scaling), and a facts row of at least three real numbers.
9. **Make it live with `vitaLoop`** (`LOOP_SRC` in the page script): idle tour, pointer and keys, offscreen pause and reduced-motion still frame come for free. Keep the readout short enough not to collide with the hint (about 45 characters).
10. **Verify.** Screenshot at 820 and 390 px and several moments of the tour; 4× close-ups of the subject; then `node bio/check.mjs site/demos/<page>.html` must end `vita check passed`. Rigid pipework still goes through Anatomy's `audit.mjs`.

## The bio layer

Everything lives in `bio/`; the kit in `kit/` is never edited. Full signatures in `references/bio-api.md`.

- `bio/bio.mjs`: `liveScript({ soft, branch })` (kit and bio modules inlined as K, G, T, SOFT, BR), `LOOP_SRC` → `vitaLoop()` and `vitaSay()`, `scene(P)`, `STAINS` / `stain()`, `shellOf()` (see-through membrane shells), `plinth()` (bench with ruler and label), `standRod()`, `rng(seed)` / `RNG_SRC`, `byDepth()`, `vitaPage()`, `BIO_CSS`.
- `bio/soft.mjs`: `blobOf(spheres, P, { merge })` one smooth body (a dividing cell, a nucleus, a lobed organ); `clusterOf(spheres, P, { press })` + `clusterSvg()` packed cells, each shaded as its own sphere with membranes traced where cells meet, `press` flattens contacts (compaction); `packSpheres(seed, list, R)` relaxes cells into a container. Output is a kit solid, so stains and tones apply.
- `bio/branch.mjs`: `treeOf(seed, root, dir, opts)` tapering trees with Murray's-law radii (dendrites, vessels, airways, roots); `treeItems(tree, P)` draws them with ball tees at every fork and caps at every tip.
- `bio/check.mjs`: the life-law checker (errors, live readout, keys, reduced motion, 390 px, ruler, stains, time statement, facts). Exit code 1 on any failure.

## Craft for living things

`references/bio-craft.md` has the details and the faults earlier figures were rejected for. The short form:

- **The subject is the biggest lit thing.** Housings, holders and tracks are `mid`; if they hide the subject, cut them open or move them (a clamp behind a vesicle projects straight up and vanishes; move it to the front).
- **Cut faces tell the biology.** A membrane cut shows head groups as dots and tails as short rules; a double membrane shows both lines and the space between; a cut organ shows its wall layers. Cut faces are lighter than the outside.
- **Cells are packed, not scattered.** Neighbours touch; compaction flattens contacts and fades membranes; cleavage keeps total volume.
- **Particles are few, counted and stained**, sized so they read at 1× (≥ 2 px), with depth-correct groups above, inside and below a membrane.
- **Show the instrument that measures it**: a recording amplifier and trace, a force clamp, a ruler, a flow meter. The readout then reads off that instrument.
- **Every true number gets one home**: caption, readout or facts row, not all three.

## When the request is not a figure

A poster or handout of a finished figure: Anatomy's print flow (`references/anatomy/print.md`). A whole site of figures:
`node build-index.mjs` writes `site/index.html` (essay + embedded figures + roadmap); deploy `site/` to any static host
(`wrangler deploy` with `assets.directory = "./site"`, Netlify, GitHub Pages).
