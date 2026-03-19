# StitchFlow

[![Node.js](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Agent Skills](https://img.shields.io/badge/format-Agent%20Skills-7B61FF)](https://agentskills.io)
[![Codex](https://img.shields.io/badge/OpenAI-Codex-10A37F)](https://developers.openai.com/codex/skills)
[![Claude Code](https://img.shields.io/badge/Anthropic-Claude%20Code-D97706)](https://code.claude.com/docs/en/slash-commands)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-ClawHub-2563EB)](https://docs.openclaw.ai/tools/clawhub)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](./LICENSE)

> Turn product briefs into UI screens, variants, HTML, and screenshots in minutes.
>
> Now design can be programmed.

`brief -> StitchFlow -> local HTML + screenshots`

StitchFlow is a portable Stitch skill bundle for:

- Codex
- Claude Code
- OpenClaw
- other clients that understand `SKILL.md` or `AGENTS.md`

![Generated Stitch dashboard demo](./assets/demo/stitch-dashboard-demo.png)

Generated locally from a natural-language prompt with the bundled Stitch workflow.

Try this first:

```text
Use $stitch-design-local to generate a premium desktop analytics dashboard for a product team, with a left sidebar, KPI cards, trend charts, and clean Tailwind-ready HTML.
```

Compatibility note:

- brand name: `StitchFlow`
- current skill slug: `stitch-design-local`

## 60-second setup

```bash
git clone https://github.com/yshishenya/stitchflow.git
cd stitchflow
bash install.sh --target all
```

Then add `STITCH_API_KEY` to:

```text
${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}/.env
```

Then restart your client.

<details open>
<summary><strong>English</strong></summary>

## Why this exists

The Stitch SDK is powerful, but most teams still need a repeatable workflow around it.

This repo removes the friction between:

- a rough product brief
- a useful UI direction
- local artifacts the team can review immediately

StitchFlow packages Stitch as a reusable agent skill, installs a local toolkit, and saves HTML, screenshots, and run metadata on your machine instead of behind another hosted workflow.

## Who this is for

- product engineers who want to explore UI before writing frontend code
- design engineers who want faster prompt-to-HTML loops
- founders who need strong first-pass screens from natural-language briefs
- AI-agent builders who want a ready-to-run Stitch workflow across multiple clients

## What you get

- one canonical skill: `stitch-design-local`
- one shared local toolkit: `stitch-starter`
- one installer for Codex, Claude Code, and OpenClaw
- local HTML, screenshots, and run artifacts
- one canonical setup under `~/.agents` with compatibility links for native clients

Canonical install paths:

- skill: `${AGENT_SKILLS_HOME:-$HOME/.agents}/skills/stitch-design-local`
- toolkit: `${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}`

Optional compatibility links:

- `${CODEX_HOME:-$HOME/.codex}/skills/stitch-design-local`
- `${CLAUDE_HOME:-$HOME/.claude}/skills/stitch-design-local`
- `${OPENCLAW_HOME:-$HOME/.openclaw}/skills/stitch-design-local`

## Why not just use the raw SDK?

The raw Stitch SDK is flexible.

This repo is for when you want:

- a ready-to-run local workflow instead of wiring the SDK yourself
- portable skill packaging across multiple agent clients
- HTML, screenshots, and run artifacts saved locally by default

## How to use it

In Codex:

```text
Use $stitch-design-local to generate a premium desktop dashboard for an internal analytics product.
```

In Claude Code:

```text
/stitch-design-local landing page for a design tool aimed at enterprise product teams
```

In OpenClaw:

```text
Use the stitch-design-local skill to explore three mobile-first UI directions for a checkout experience.
```

Direct CLI usage:

```bash
cd "${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}"
npm run list
npm run generate -- --prompt "A modern SaaS dashboard with sidebar and stat cards"
npm run edit -- --prompt "Make it more premium and add stronger typography"
npm run variants -- --prompt "Explore three different visual directions" --variant-count 3
```

## Results you can get fast

- explore 3 landing page directions before writing code
- turn a PM brief into HTML and screenshots for review
- iterate on a dashboard without opening Figma
- generate local artifacts a team can review without adopting a new hosted service

Ready-to-use prompt ideas:

- [examples/prompt-recipes.md](./examples/prompt-recipes.md)

If you want to record a demo or launch video:

- [docs/demo-script.md](./docs/demo-script.md)
- [docs/launch-kit.md](./docs/launch-kit.md)

## What gets saved

Outputs go to:

```text
${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}/runs/<timestamp>-<operation>-<slug>/
```

Typical files:

- `result.json` or `variants.json`
- `screen.html`
- `screen.png`, `screen.jpeg`, or `screen.webp`
- `html-url.txt`
- `image-url.txt`

Latest single-screen pointer:

```text
${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}/runs/latest-screen.json
```

## Discovery and trust

- built on Google's [Stitch SDK](https://github.com/google-labs-code/stitch-sdk)
- exports clean HTML and screenshots programmatically
- works across Codex, Claude Code, and OpenClaw
- includes [AGENTS.md](./AGENTS.md), [SKILL.md](./skills/stitch-design-local/SKILL.md), and agent-specific manifests
- licensed under [Apache-2.0](./LICENSE)

## Contributing

- contribution guide: [CONTRIBUTING.md](./CONTRIBUTING.md)
- toolkit details: [stitch-starter/README.md](./stitch-starter/README.md)

Install it, generate one screen, and ship the best direction into code.

</details>

<details>
<summary><strong>Русский</strong></summary>

## Зачем это нужно

Stitch SDK мощный, но большинству команд нужен не просто SDK, а готовый workflow вокруг него.

Этот репозиторий убирает трение между:

- сырым продуктовым брифом
- первым сильным UI-направлением
- локальными артефактами, которые можно сразу показать команде

StitchFlow упаковывает Stitch в reusable skill для агента, ставит локальный toolkit и сохраняет HTML, скриншоты и run metadata на вашей машине.

## Для кого это

- product engineers, которые хотят исследовать UI до написания фронтенда
- design engineers, которым нужен быстрый prompt-to-HTML цикл
- founders, которым нужны сильные первые экраны из текстового брифа
- builders агентных workflow, которым нужен готовый Stitch setup для нескольких клиентов

## Что вы получаете

- один канонический skill: `stitch-design-local`
- один локальный toolkit: `stitch-starter`
- один installer для Codex, Claude Code и OpenClaw
- локальные HTML, скриншоты и run artifacts
- каноническую установку в `~/.agents` и compatibility links для нативных клиентов

Канонические пути:

- skill: `${AGENT_SKILLS_HOME:-$HOME/.agents}/skills/stitch-design-local`
- toolkit: `${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}`

Compatibility links:

- `${CODEX_HOME:-$HOME/.codex}/skills/stitch-design-local`
- `${CLAUDE_HOME:-$HOME/.claude}/skills/stitch-design-local`
- `${OPENCLAW_HOME:-$HOME/.openclaw}/skills/stitch-design-local`

## Почему не просто raw SDK

Raw Stitch SDK гибкий.

Этот репозиторий нужен, когда вы хотите:

- готовый локальный workflow, а не собирать обвязку самому
- переносимую skill-упаковку для нескольких agent clients
- локальные HTML, скриншоты и run artifacts по умолчанию

## Как использовать

Быстрый старт:

```bash
git clone https://github.com/yshishenya/stitchflow.git
cd stitchflow
bash install.sh --target all
```

Потом добавьте `STITCH_API_KEY` в:

```text
${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}/.env
```

И перезапустите клиент.

В Codex:

```text
Use $stitch-design-local to generate a premium desktop dashboard for an internal analytics product.
```

В Claude Code:

```text
/stitch-design-local landing page for a design tool aimed at enterprise product teams
```

В OpenClaw:

```text
Use the stitch-design-local skill to explore three mobile-first UI directions for a checkout experience.
```

Через CLI:

```bash
cd "${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}"
npm run list
npm run generate -- --prompt "A modern SaaS dashboard with sidebar and stat cards"
npm run edit -- --prompt "Make it more premium and add stronger typography"
npm run variants -- --prompt "Explore three different visual directions" --variant-count 3
```

## Что можно сделать быстро

- исследовать 3 направления лендинга до написания кода
- превратить PM brief в HTML и скриншоты для ревью
- итерировать dashboard без Figma
- получать локальные артефакты, которые команда может смотреть без нового hosted-сервиса

Готовые prompt ideas:

- [examples/prompt-recipes.md](./examples/prompt-recipes.md)

Для demo и запуска:

- [docs/demo-script.md](./docs/demo-script.md)
- [docs/launch-kit.md](./docs/launch-kit.md)

## Что сохраняется

Все результаты попадают в:

```text
${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}/runs/<timestamp>-<operation>-<slug>/
```

Обычно внутри:

- `result.json` или `variants.json`
- `screen.html`
- `screen.png`, `screen.jpeg` или `screen.webp`
- `html-url.txt`
- `image-url.txt`

Указатель на последний single-screen run:

```text
${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}/runs/latest-screen.json
```

## Доверие и discoverability

- построен на [Google Stitch SDK](https://github.com/google-labs-code/stitch-sdk)
- программно экспортирует HTML и screenshots
- работает в Codex, Claude Code и OpenClaw
- содержит [AGENTS.md](./AGENTS.md), [SKILL.md](./skills/stitch-design-local/SKILL.md) и platform manifests
- лицензия: [Apache-2.0](./LICENSE)

## Контрибьютинг

- гайд: [CONTRIBUTING.md](./CONTRIBUTING.md)
- toolkit details: [stitch-starter/README.md](./stitch-starter/README.md)

Установите, сгенерируйте один экран и протащите лучший вариант в код.

</details>
