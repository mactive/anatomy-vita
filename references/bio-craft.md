# Bio craft

The detail behind the laws in `SKILL.md`, with the faults earlier Vita figures were sent back for. Anatomy's
`references/anatomy/craft.md` still governs the drawing; read it first.

## 1. Choosing the object

Map the concept to an object one-to-one, and say what moves and what the motion means before any geometry.

| Concept | Object that worked | Why it works |
|---|---|---|
| DNA replication | a helix on three stands, a ring unzipping it, two polymerases following | the fork *is* a zipper; leading vs lagging strand is visible as continuous vs gapped |
| Translation | a tape reader: toothed mRNA tape through guides, three bays E P A | codon reading becomes teeth keying into teeth; a wrong tRNA visibly doesn't fit |
| Rotary catalysis | a water wheel in a notched membrane | protons ride the ring once round; 120° per ATP is countable |
| Motor protein under load | a walker on a rail plus a force clamp on a carriage | the load is a spring you can see stretch; stall is the walker stopping |
| Active transport | a two-gate airlock with leak channels beside it | "never both gates open" is the mechanism; leaks explain why it must keep running |
| Organelle structure | a lengthwise cut teaching model on cradles | cristae read as radiator plates; the cut face shows both membranes |
| Early development | an embryo held by a holding pipette on a coverslip | the IVF bench is the real instrument; time is the control |
| Nerve impulse | a GFP neuron with a stimulating and a recording pipette and an amplifier trace | the trace is the measurement; the myelin toggle is the experiment |

Rejected or weak first drafts and what fixed them:

- **Ribosome as a closed cabinet** (large subunit as a box): the tRNAs vanished. Fix: towers and a deck, near half cut away, bays marked on the back wall.
- **Kinesin with the clamp behind the vesicle**: from a 45–52° camera, "back and behind" projects straight up, hidden by the cargo. Fix: rail at the front, stalk leaning back so the spring runs sideways on screen.
- **Pump lost on a huge membrane**: shrink the patch until the pump is a third of the membrane's width; enlarge ions to ≥ 2 px.
- **Blastocyst read as a ball of cells**: a cavity needs a cut. Fix: ghost the near trophectoderm, fill the cavity with a fluid tint, draw the cut rim, put the inner cell mass on the far wall where the cut reveals it.
- **Readout colliding with the hint**: keep readouts ≤ ~45 characters; shorten state names ("E2-P · Na⁺ out").

## 2. Scale and units

- Pick one world unit per real unit at the top of the build (`const NM = 6`, `const UM = 200`), and derive every dimension from real values through it. Comment the source next to the number.
- The plinth ruler uses the same unit: `scale: { step: NM, every: 5 }` = 1 tick per nm, a major tick every 5 nm.
- When legibility forces a distortion (a stretched mRNA tape, a shortened stalk, a compressed axon), apply it to one thing only and name it in the caption.
- Real sizes worth remembering: membrane bilayer 4 nm; ATP synthase head ~10 nm; ribosome 21 nm (70S); microtubule 25 nm, 8 nm per dimer; mitochondrion 0.5 × 1–2 µm, membranes ~7 nm, intermembrane space ~20 nm; human zygote ~110 µm, zona ~15 µm; red cell 7.5 µm; sarcomere ~2.5 µm.

## 3. Time

- Choose a slow-down or speed-up factor so the key event takes 1–3 s on screen; put it in the caption.
- Prefer real kinetics driven by the control: `v(F) = v0(1 − (F/Fs)^1.4)` for kinesin, `20·S/(S+0.4)` aa/s for tRNA supply, gradient-proportional leaks.
- For development, time *is* the control: hover scrubs days, the idle tour plays forward and loops.

## 4. Stains

`STAINS` (bio.mjs): `dapi gfp rfp eosin hema atp myelin oxy deoxy na k trna cyt`. Use `stain(name, svg, amount)`; amount 0.2–0.5 for bodies, 0.8–1 for small particles and lines. Legend keys can use stain names as marks (`{ mark: "na", label: "Na⁺" }`). One stain per meaning across the whole site (Na⁺ is always amber).

## 5. Membranes and cuts

- A bilayer slab: `extrude` the patch with the cut notch, head groups as a dot grid on top, and on every visible cut face two rows of head-group dots with short tail rules between (`demos/atp`, `demos/pump`).
- A see-through shell: `shellOf(c, r, P)` → draw `.back`, then the contents, then `.front` (glass, gleam, outline).
- A curved cutaway (lower half of a capsule): draw the whole lathe body clipped to the screen region below the rim's upper arc, fill the rim interior with `.bio-cavity`, clip everything inside to the inner rim, then draw the cut face ring on top (`demos/mito`, `belowUpperArc`).
- Lamellae across a cavity: `G.prismOf(frameAlong(p, axis), polygon, -t/2, t/2, P)` with a convex polygon in the cross-section plane.

## 6. Soft bodies and packed cells (`bio/soft.mjs`)

- `blobOf` for one continuous body. `merge` ≈ 0.1–0.15 keeps a cleavage furrow; 0.3+ makes a capsule.
- `clusterOf` for many cells. Each cell keeps its own sphere shading and membranes are traced where neighbours meet. `press` 0 = loose blastomeres, 0.12–0.16 = compacted; fade `seamOpacity` with it.
- `packSpheres(seed, guesses, R)` from daughters placed beside their mother: lineage stays continuous between generations. Keep total volume when cells divide (`r × 2^(−1/3)`).
- Per-frame cost scales with total cell area / step². `step: 1.5` for live, 1.1 (default) for static. Guard redraws with a time threshold.

## 7. Branching (`bio/branch.mjs`)

- Murray's law sets child radii (`r_parent³ = Σ r_child³`, 0.79 for two equal children).
- Every fork sits on a ball tee and every tip on a cap; a branch never leaves a tube wall directly (Anatomy's pipe rule).
- Use `up` and `bend` for gravity (roots) or light (canopies); `wobble` 0.15–0.25 for dendrites, lower for vessels.

## 8. Particles

- Few and counted: 20–50 per compartment, each kind a stain, size ≥ 2 px at 1×.
- Group them by where they are in depth: below the membrane (drawn first), inside the machine, above (drawn last).
- Brownian jitter bounded to the compartment; directed motion only along a real path (a pore, a gate, a tunnel).

## 9. Verification

1. Build; screenshot at 820 and 390 px, plus several tour moments (hover at fractions of the width).
2. 4× close-ups of the subject and every junction.
3. `node bio/check.mjs site/demos/<page>.html` → `vita check passed`.
4. For pipework or rigid assemblies, Anatomy's `--audit` as well.
