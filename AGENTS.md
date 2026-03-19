# StitchFlow

Cross-agent Stitch skill bundle for Codex, Claude Code, and OpenClaw.

Repository:

- https://github.com/yshishenya/stitchflow

## What this skill is for

Use `stitch-design-local` when the task is:

- design generation from a brief or mockup
- UI prototyping from product context
- prompt-to-HTML workflows
- screen edits and visual iteration
- design variants before implementation
- local screenshots and Tailwind-friendly HTML exports

## Install

```bash
git clone https://github.com/yshishenya/stitchflow.git
cd stitchflow
bash install.sh --target all
```

Canonical install layout:

- skill: `~/.agents/skills/stitch-design-local`
- toolkit: `~/.agents/stitch-starter`

Native compatibility links:

- Codex: `~/.codex/skills/stitch-design-local`
- Claude Code: `~/.claude/skills/stitch-design-local`
- OpenClaw: `~/.openclaw/skills/stitch-design-local`

## How to use

- explicit invocation: `Use $stitch-design-local ...`
- common jobs: generate a new screen, edit an existing screen, create variants, export local artifacts
- toolkit root: `${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}`
- brand: `StitchFlow`

## Skill

- name: `stitch-design-local`
- location: `skills/stitch-design-local`
- install command: `bash install.sh --target all`

## Metadata files

- root discovery: [README.md](./README.md)
- agent bundle: [skills/stitch-design-local/SKILL.md](./skills/stitch-design-local/SKILL.md)
- Codex metadata: [skills/stitch-design-local/agents/openai.yaml](./skills/stitch-design-local/agents/openai.yaml)
- Claude metadata: [.claude-plugin/plugin.json](./.claude-plugin/plugin.json)
