# Vendored Anatomy references

These files are copied unchanged from [wheresryan22/anatomy](https://github.com/wheresryan22/anatomy)
(MIT, © Ryan · @wheresryan22; see `LICENSE-anatomy` at the repo root), commit `1482e84` (2026-10-18).

- `ANATOMY-SKILL.md` — the original SKILL.md. Its workflow, craft rules and verification still apply to every Vita figure.
- `craft.md`, `kit.md`, `motion.md`, `verify.md`, `webgl.md`, `3d.md`, `react.md`, `print.md`, `publish.md`, `walkthrough.md`.

Paths inside them point at the upstream layout (`examples/…`). The kit itself is vendored at `kit/` and `scripts/`, also unchanged.
To update: copy the upstream `kit/`, `scripts/`, `SKILL.md` and `references/` over these, then run `node bio/check.mjs site/demos/*.html`.
