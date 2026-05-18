---
name: stitchflow
slug: stitchflow
version: 1.4.0
description: Turn briefs, mockups, and product context into Stitch UI screens, design systems, variants, prototypes, Tailwind-friendly HTML, and screenshots. Use when the user wants to explore a screen, edit an existing Stitch project, compare visual directions, build a multi-screen prototype, or save local design/code-export artifacts from natural-language input.
homepage: "https://github.com/yshishenya/stitchflow"
category: "design"
platforms: "codex, claude-code, openclaw, github-copilot, gemini-cli"
install: "bash install.sh --target all"
toolkit_root: "${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}"
compatibility: "Requires Node.js 22+, a configured STITCH_API_KEY, and either native Stitch MCP tools or the local stitch-starter toolkit installed by this repository."
legacy_aliases: "stitch-design-local"
---

# StitchFlow

Use this skill when the user wants to create a new Stitch screen, refine an existing one, generate design variants, build a multi-screen prototype, run a complete website design process, use `DESIGN.md` / design systems, or export local HTML and screenshots through Stitch.

It prefers native Stitch MCP tools when they are available in the current agent session, and falls back to the local toolkit at `${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}` when they are not.

## Local setup

- Toolkit root: `${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}`
- API key is expected in `${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}/.env`
- Outputs are saved to `${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}/runs`
- The latest single-screen result is tracked in `${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}/runs/latest-screen.json`
- For final multi-screen work, the Stitch project is the source of truth; local HTML/screenshots are evidence and handoff artifacts.
- When code with styles/images is requested, prefer `download-project` over `export-project`.
- `download-project` uses `Project.downloadAssets()`: it downloads every project screen's `code.html`, referenced remote images and stylesheet links into per-screen `assets/`, screenshots when available, top-level `DESIGN.md` when exposed, and `download-project.json` with screen metadata and warnings.
- Treat `download-project` output as a local code/assets checkpoint for implementation handoff. It can include scratch/design-system screens and may still reference external runtime scripts such as Tailwind CDN, so filter to approved screen ids in handoff notes and vendor/build external dependencies during production implementation.

## Native MCP setup

If the current client exposes Stitch MCP tools such as `create_project`, `generate_screen_from_text`, `generate_variants`, `upload_design_md`, `create_design_system_from_design_md`, `apply_design_system`, and `get_screen`, use those tools first. Native MCP avoids local SDK transport issues and is the most reliable path in Codex after the client has been restarted with the Stitch MCP server configured.

For Codex, a minimal MCP config looks like this:

```toml
[mcp_servers.stitch]
url = "https://stitch.googleapis.com/mcp"
enabled = true

[mcp_servers.stitch.http_headers]
"X-Goog-Api-Key" = "<your Stitch API key>"
```

Restart the client after changing MCP config so the `stitch` tools are loaded into the session.

## When to use

- The user says to use Stitch or StitchFlow
- The user wants a screen generated from a brief, spec, or rough idea
- The user wants design variants before implementation
- The user wants targeted visual edits to a generated screen
- The user wants a full multi-screen Stitch project, clickable prototype, or code export
- The user wants to import or reuse a `DESIGN.md` design system
- The user wants HTML and screenshots exported locally for review

## Workflow routing

- Full project prototype, `DESIGN.md`, or final code handoff:
  Read [project-prototype-export](workflows/project-prototype-export.md)
- End-to-end website design delivery from logo and homepage variants to all screens and QA:
  Read [site-design-delivery](workflows/site-design-delivery.md)
- New screen from a prompt or brief:
  Read [text-to-design](workflows/text-to-design.md)
- Targeted changes to an existing Stitch screen:
  Read [edit-design](workflows/edit-design.md)
- Multiple directions from one base screen:
  Read [variants](workflows/variants.md)

## Core rules

1. Before any Stitch command, rewrite the user request into a stronger design prompt.
2. If the user already has a codebase or UI context, inspect it first and carry that context into the prompt.
3. Prefer `DESKTOP` by default unless the user clearly asks for mobile or tablet.
4. For first-pass exploration, prefer one generated screen plus `3` variants.
5. If a screen is already close, prefer `edit` over full regeneration.
6. For final selected designs, do not replace Stitch with hand-written HTML or locally generated imagery. Keep the Stitch project/prototype as the design source, then export or checkpoint it.
7. When the user asks for an interactive prototype or whole-site app export and the SDK/MCP does not expose the needed endpoint, use the Stitch web UI with Browser/Chrome/Computer Use and record the exact manual/UI handoff step. Still run `download-project` afterward for local code/assets where possible.
8. Always tell the user where the resulting files were saved.
9. Never print or expose `STITCH_API_KEY` or `.env` contents.
10. When native MCP returns `downloadUrl` values, save the HTML and screenshot locally into the normal `runs/` artifact layout before reporting completion.
11. After `download-project`, inspect `download-project.json` and report any warnings or unexpected extra screens before treating the checkpoint as final.
12. For full website design work, do not jump from a single homepage to implementation. Generate logo directions if brand identity is open, create at least five homepage variants, record the selected homepage screen id, then generate every required screen from a screen inventory and audit coverage.

## What good output looks like

- the brief is rewritten into a stronger design prompt
- the right Stitch workflow is chosen: generate, edit, variants, design system, prototype, or export
- the command completes and saves artifacts locally
- the response includes project id, screen id(s), output folder, and what to do next
- final project handoff identifies whether code came from Stitch UI export, SDK screen export, or a local evidence checkpoint
- full website design handoff includes logo decision, homepage selection notes, screen inventory coverage, and product QA status

## Prompt shaping

Use [prompt-keywords](references/prompt-keywords.md) to translate vague requests into design language Stitch understands better.

Structure prompts like this:

```md
[overall vibe, product intent, and audience]

Platform: [web/mobile], [desktop/mobile]-first

Page goal:
- what the screen is for
- what primary action matters most

Page structure:
1. Header / navigation
2. Main content / hero / dashboard body
3. Secondary content
4. Footer / actions / supporting detail

Visual direction:
- palette roles
- typography tone
- spacing density
- component style
```

## After running Stitch

Report:

- the command used at a high level, not the secret env
- the project and screen ids
- the output folder under `${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}/runs`
- the HTML and image artifact paths if they were downloaded
- whether `DESIGN.md` / design system was created or applied
- whether prototype/code export was completed in Stitch UI or only a screen-level SDK checkpoint is available
- a short design assessment and the best next step

## References

- [cli-usage](references/cli-usage.md)
- [prompt-keywords](references/prompt-keywords.md)
