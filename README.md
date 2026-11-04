# Anatomy Vita

An Agent Skill (Claude Code, and any harness that reads `SKILL.md`) that builds crafted, interactive isometric figures
explaining **living things**, from molecules to planets. It extends [Anatomy](https://github.com/wheresryan22/anatomy)
(Ryan · @wheresryan22, MIT) and keeps its kit unchanged.

- `SKILL.md` — the skill: laws of life, scale → object table, workflow
- `references/bio-craft.md`, `references/bio-api.md` — craft and API; `references/anatomy/` — the original Anatomy docs (vendored, MIT)
- `bio/` — the bio layer: `bio.mjs` (stains, shells, benches, live runtime, page), `soft.mjs` (soft bodies, packed cells),
  `branch.mjs` (Murray branching), `check.mjs` (life-law checker)
- `demos/*/build.mjs` — nine example figures (`node demos/<name>/build.mjs`); `demos/lab` tests the primitives
- `kit/`, `scripts/` — Anatomy's kit and scripts, unchanged (see `LICENSE-anatomy`)
- `evals/evals.json` — test prompts
- `site/` — the showcase site: `node build-index.mjs`, then deploy the folder (`wrangler deploy` with `assets.directory = "./site"`, Netlify, GitHub Pages)
- `agent.md` — iteration log for agents working on this repo

Install as a skill: copy or symlink this folder into `~/.claude/skills/anatomy-vita/`.
Check figures: `node bio/check.mjs site/demos/*.html` (needs Playwright).
