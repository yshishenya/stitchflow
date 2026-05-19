---
name: stitch-design-local
slug: stitch-design-local
version: 1.4.0
description: Legacy compatibility alias for StitchFlow. Use when a user explicitly references stitch-design-local, or when older prompts and setups still call that skill name.
homepage: "https://github.com/yshishenya/stitchflow"
category: "design"
platforms: "codex, claude-code, openclaw, github-copilot, gemini-cli"
install: "bash install.sh --target all"
compatibility: "Deprecated alias for the StitchFlow skill."
---

# Legacy Alias: stitch-design-local

This skill name is kept only for backward compatibility.

Canonical skill:

- `stitchflow`

If this alias is invoked, follow the same workflow and rules as the canonical StitchFlow skill:

- Read [../stitchflow/SKILL.md](../stitchflow/SKILL.md)
- Use the same toolkit at `${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}`
- Prefer the `stitchflow` name in new prompts, docs, and examples

## Migration note

- old name: `stitch-design-local`
- current name: `stitchflow`
