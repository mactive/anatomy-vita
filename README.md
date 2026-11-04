# Anatomy Vita

A Claude Code skill that draws living processes as live isometric specimens — DNA, ATP synthase, mitosis, neurons, ribosomes, kinesin, the Na⁺/K⁺ pump, mitochondria — from molecule to planet. Built on the [Anatomy](https://github.com/wheresryan22/anatomy) skill (MIT).

一个 Claude Code skill：把生命过程画成可交互的等轴测标本，从分子到星球。基于 Anatomy skill（MIT）扩展。

**Live site / 在线站点:** https://anatomy-vita.mactive.workers.dev/

## Install / 安装

```bash
npx skills add mactive/anatomy-vita
```

or / 或者

```bash
git clone https://github.com/mactive/anatomy-vita ~/.claude/skills/anatomy-vita
```

Then / 然后:

```
/anatomy-vita explain how a sarcomere contracts, interactive
```

## Layout / 目录

- `SKILL.md` — the skill instructions
- `bio/bio.mjs` — the bio layer (stains, membranes, plinths, live kit runtime, bilingual page shell)
- `demos/*/build.mjs` — the eight figure sources: `node demos/dna/build.mjs` etc.
- `build-index.mjs` — builds `site/index.html`
- `site/` — the static website (bilingual 中文 / English; `?lang=en` or `?lang=zh`)
- `kit/`, `scripts/`, `references/` — from Anatomy, unchanged (see `LICENSE-anatomy`)
- `agent.md` — working notes and iteration log (Chinese)

## Build & deploy / 构建与部署

```bash
for d in demos/*/; do node $d/build.mjs; done && node build-index.mjs
wrangler deploy
```

## License

MIT. Anatomy Vita builds on Anatomy by Ryan (@wheresryan22), MIT — see `LICENSE-anatomy`.
