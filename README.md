# codex-stitch-local

[![Node.js](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Agent Skills](https://img.shields.io/badge/format-Agent%20Skills-7B61FF)](https://agentskills.io)
[![Codex](https://img.shields.io/badge/OpenAI-Codex-10A37F)](https://developers.openai.com/codex/skills)
[![Claude Code](https://img.shields.io/badge/Anthropic-Claude%20Code-D97706)](https://code.claude.com/docs/en/slash-commands)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-ClawHub-2563EB)](https://docs.openclaw.ai/tools/clawhub)

> Now design can be programmed.

`codex-stitch-local` turns Google's Stitch SDK into a ready-to-use agent skill for Codex, Claude Code, and OpenClaw.

What it gives you:

- prompt-to-UI generation from natural language
- fast design iteration with edits and variants
- local HTML, screenshots, and run artifacts
- one install flow for multiple agent clients

![Generated Stitch dashboard demo](./assets/demo/stitch-dashboard-demo.png)

Работает как portable skill bundle для:

- Codex
- Claude Code
- OpenClaw
- других клиентов, которые понимают `SKILL.md` или `AGENTS.md`

Core files:

- [README.md](./README.md)
- [AGENTS.md](./AGENTS.md)
- [SKILL.md](./skills/stitch-design-local/SKILL.md)
- [install.sh](./install.sh)
- [stitch-starter](./stitch-starter)

<details open>
<summary><strong>English</strong></summary>

## Why this exists

The Stitch SDK is powerful, but raw SDK access is not yet a smooth day-to-day workflow for most teams.

This repo solves that gap:

- it packages Stitch as a reusable agent skill
- it gives you a local toolkit with simple commands
- it makes the setup portable across multiple agent clients
- it saves outputs locally so design exploration becomes part of the real dev workflow

## What it is

This repository contains:

- one canonical skill: `stitch-design-local`
- one shared local toolkit: `stitch-starter`
- one installer for Codex, Claude Code, and OpenClaw

Canonical install paths:

- skill: `${AGENT_SKILLS_HOME:-$HOME/.agents}/skills/stitch-design-local`
- toolkit: `${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}`

Compatibility links can also be created for:

- `${CODEX_HOME:-$HOME/.codex}/skills/stitch-design-local`
- `${CLAUDE_HOME:-$HOME/.claude}/skills/stitch-design-local`
- `${OPENCLAW_HOME:-$HOME/.openclaw}/skills/stitch-design-local`

## Quick start

```bash
git clone https://github.com/yshishenya/codex-stitch-local.git
cd codex-stitch-local
bash install.sh --target all
```

Then add `STITCH_API_KEY` to:

```text
${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}/.env
```

Then restart your client.

## Install targets

All clients:

```bash
bash install.sh --target all
```

Only canonical Agent Skills layout:

```bash
bash install.sh --target universal
```

Only one client:

```bash
bash install.sh --target codex
bash install.sh --target claude
bash install.sh --target openclaw
```

Useful flags:

```bash
bash install.sh --target all --force
bash install.sh --target all --skip-npm
bash install.sh --target all --skip-smoke
```

## Use

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

## Example outcomes

What people can actually do with this:

- generate three landing page directions before writing frontend code
- turn a rough dashboard brief into HTML and screenshot artifacts
- iterate on an internal tool UI from real product context instead of blank-canvas design work
- use Stitch output as a fast bridge between product thinking and implementation

Ready-to-use prompts:

- [examples/prompt-recipes.md](./examples/prompt-recipes.md)

If you want to record a short demo or launch video:

- [docs/demo-script.md](./docs/demo-script.md)

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

## Why this repo is discoverable

- strong `description` in `SKILL.md`
- root-level [AGENTS.md](./AGENTS.md)
- Codex metadata in [agents/openai.yaml](./skills/stitch-design-local/agents/openai.yaml)
- Claude plugin manifest in [`.claude-plugin/plugin.json`](./.claude-plugin/plugin.json)
- GitHub topics and release tags

## Important notes

- do not commit `.env`
- do not expose `STITCH_API_KEY`
- generated `runs/` may contain internal UI concepts
- current repository state is `UNLICENSED`

## More

- contribution guide: [CONTRIBUTING.md](./CONTRIBUTING.md)
- toolkit details: [stitch-starter/README.md](./stitch-starter/README.md)
- launch and messaging kit: [docs/launch-kit.md](./docs/launch-kit.md)

</details>

<details>
<summary><strong>Русский</strong></summary>

## Зачем это нужно

Сам Stitch SDK мощный, но в сыром виде это еще не очень удобный ежедневный workflow для команды.

Этот репозиторий закрывает именно этот разрыв:

- упаковывает Stitch в reusable skill для агента
- дает простой локальный toolkit с понятными командами
- делает setup переносимым между несколькими агентными клиентами
- сохраняет HTML, скриншоты и run artifacts локально, чтобы дизайн стал частью реального dev-процесса

## Что это

В репозитории есть:

- один канонический skill: `stitch-design-local`
- один общий локальный toolkit: `stitch-starter`
- один installer для Codex, Claude Code и OpenClaw

Канонические пути установки:

- skill: `${AGENT_SKILLS_HOME:-$HOME/.agents}/skills/stitch-design-local`
- toolkit: `${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}`

При необходимости installer создает compatibility links для:

- `${CODEX_HOME:-$HOME/.codex}/skills/stitch-design-local`
- `${CLAUDE_HOME:-$HOME/.claude}/skills/stitch-design-local`
- `${OPENCLAW_HOME:-$HOME/.openclaw}/skills/stitch-design-local`

## Быстрый старт

```bash
git clone https://github.com/yshishenya/codex-stitch-local.git
cd codex-stitch-local
bash install.sh --target all
```

Потом добавьте `STITCH_API_KEY` в:

```text
${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}/.env
```

И перезапустите свой клиент.

## Таргеты установки

Для всех клиентов:

```bash
bash install.sh --target all
```

Только канонический Agent Skills layout:

```bash
bash install.sh --target universal
```

Только под один клиент:

```bash
bash install.sh --target codex
bash install.sh --target claude
bash install.sh --target openclaw
```

Полезные флаги:

```bash
bash install.sh --target all --force
bash install.sh --target all --skip-npm
bash install.sh --target all --skip-smoke
```

## Использование

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

## Примеры результата

Что с этим реально можно делать:

- быстро генерировать три направления лендинга до написания фронтенда
- превращать сырой бриф по dashboard в HTML и скриншоты
- итерировать UI внутреннего инструмента из продуктового контекста, а не с пустого листа
- использовать Stitch как быстрый мост между product thinking и implementation

Готовые prompt recipes:

- [examples/prompt-recipes.md](./examples/prompt-recipes.md)

Если хочешь записать короткое demo/video:

- [docs/demo-script.md](./docs/demo-script.md)

## Что сохраняется

Все результаты попадают в:

```text
${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}/runs/<timestamp>-<operation>-<slug>/
```

Обычно там будут:

- `result.json` или `variants.json`
- `screen.html`
- `screen.png`, `screen.jpeg` или `screen.webp`
- `html-url.txt`
- `image-url.txt`

Файл с указателем на последний single-screen run:

```text
${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}/runs/latest-screen.json
```

## Почему репозиторий хорошо находится

- сильный `description` в `SKILL.md`
- root-level [AGENTS.md](./AGENTS.md)
- метаданные для Codex в [agents/openai.yaml](./skills/stitch-design-local/agents/openai.yaml)
- Claude plugin manifest в [`.claude-plugin/plugin.json`](./.claude-plugin/plugin.json)
- GitHub topics и release tags

## Важно

- не коммитьте `.env`
- не светите `STITCH_API_KEY`
- папка `runs/` может содержать внутренние UI-концепты
- сейчас репозиторий помечен как `UNLICENSED`

## Еще

- guide по вкладу: [CONTRIBUTING.md](./CONTRIBUTING.md)
- детали toolkit-а: [stitch-starter/README.md](./stitch-starter/README.md)
- launch и messaging kit: [docs/launch-kit.md](./docs/launch-kit.md)

</details>
