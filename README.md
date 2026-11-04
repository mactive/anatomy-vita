# Anatomy Vita

An Agent Skill (Claude Code, and any harness that reads `SKILL.md`) that builds crafted, interactive isometric figures
explaining **living things**, from molecules to planets. It extends [Anatomy](https://github.com/wheresryan22/anatomy)
(Ryan · @wheresryan22, MIT) and keeps its kit unchanged.

- `SKILL.md` — the skill: laws of life, scale → object table, workflow
- `references/bio-craft.md`, `references/bio-api.md` — craft and API; `references/anatomy/` — the original Anatomy docs (vendored, MIT)
- `bio/` — the bio layer: `bio.mjs` (stains, shells, benches, cutaways, live runtime, bilingual page), `soft.mjs` (soft bodies, packed cells),
  `branch.mjs` (Murray branching), `shapes.mjs` (helices, coil springs), `check.mjs` (life-law checker), `tools/` (screenshots, timed moments, thumbnails)
- `demos/*/build.mjs` — fifteen example figures, 01–15 (`node demos/<name>/build.mjs`); `demos/lab` tests the primitives
- `kit/`, `scripts/` — Anatomy's kit and scripts, unchanged (see `LICENSE-anatomy`)
- `evals/evals.json` — test prompts (figures 10–15 were each built blind from the skill by a fresh agent)
- `site/` — the showcase site: `node build-index.mjs`, then deploy the folder (`wrangler deploy` with `assets.directory = "./site"`, Netlify, GitHub Pages)
- `agent.md` — iteration log for agents working on this repo

Live site: https://anatomy-vita.mactive.workers.dev/ (English by default, 中文 for Chinese browsers, toggle in the nav)

Install as a skill:

```bash
npx skills add mactive/anatomy-vita
# or
git clone https://github.com/mactive/anatomy-vita ~/.claude/skills/anatomy-vita
```

Then: `/anatomy-vita explain how a sarcomere contracts, interactive`
Check figures: `node bio/check.mjs site/demos/*.html` (needs Playwright).
