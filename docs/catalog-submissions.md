# Catalog Submissions

This file turns distribution into an execution checklist instead of a vague launch idea.

## Goal

Maximize discoverability for `StitchFlow` across:

- official registries
- official plugin and extension install flows
- community discovery catalogs
- high-signal GitHub collections with existing traffic

## Current status

Snapshot as of 2026-03-19:

- ClawHub: live for `stitchflow` and `stitch-design-local`
- askill: live at `https://askill.sh/skills/gh/yshishenya/stitchflow/@stitchflow` and `https://askill.sh/skills/gh/yshishenya/stitchflow/@stitch-design-local`
- `skills.sh`: live at `https://skills.sh/yshishenya/stitchflow/stitchflow`
- `agentskill.sh`: live at `https://agentskill.sh/@yshishenya/stitchflow` and `https://agentskill.sh/@yshishenya/stitch-design-local`
- `SkillsMP`: not yet indexable because the public FAQ says they filter out repositories with fewer than `2` GitHub stars; repo metadata was updated to improve matching once the scraper picks it up
- `awesome-llm-skills`: PR opened at `https://github.com/Prat011/awesome-llm-skills/pull/51`
- `awesome-claude-skills`: PR opened at `https://github.com/ComposioHQ/awesome-claude-skills/pull/429`
- `netresearch/claude-code-marketplace`: PR opened at `https://github.com/netresearch/claude-code-marketplace/pull/34`
- `heilcheng/awesome-agent-skills`: PR opened at `https://github.com/heilcheng/awesome-agent-skills/pull/117`
- `rohitg00/awesome-claude-code-toolkit`: PR opened at `https://github.com/rohitg00/awesome-claude-code-toolkit/pull/67`
- `github/awesome-copilot`: not submitted because their contribution policy rejects non-GitHub and non-Microsoft external plugins from remote sources
- `hesreallyhim/awesome-claude-code`: recommends submissions only via the GitHub web UI issue form; CLI/programmatic submission is explicitly disallowed
- `Skillstore`: submit page exists, but automated submission endpoint was not exposed in the public page bundle; treat as a manual follow-up unless we sign in and use the web UI

## Popular surfaces by ecosystem

Use this section to prioritize channels by actual distribution power, not by how often they get mentioned on X.

### Claude ecosystem

1. `anthropics/skills`
   Why it matters:
   - official Anthropic skills repository
   - installable in Claude Code via `/plugin marketplace add anthropics/skills`
   - very large audience and trust
   Popularity:
   - GitHub stars: `97000`
   Fit for StitchFlow:
   - high strategic value
   - not an obvious open external listing surface; treat more like a partner or reference channel than an easy community directory

2. Claude Skills Directory at `claude.com/connectors`
   Why it matters:
   - first-party discovery surface mentioned by Anthropic support docs
   - users can browse partner skills and download linked repositories
   Fit for StitchFlow:
   - huge trust surface
   - likely requires stronger partner-style positioning and MCP connector relevance

3. `ComposioHQ/awesome-claude-skills`
   Why it matters:
   - largest community Claude skills list we found
   - PR-friendly
   Popularity:
   - GitHub stars: `45779`
   Fit for StitchFlow:
   - very strong target
   - good for backlink, discovery, and social proof

4. `mhattingpete/claude-skills-marketplace`
   Why it matters:
   - actual Claude Code marketplace-style repo with install flow
   Popularity:
   - GitHub stars: `475`
   Fit for StitchFlow:
   - relevant but much smaller than the two lists above

### GitHub Copilot ecosystem

1. `github/awesome-copilot`
   Why it matters:
   - default high-traffic community marketplace for Copilot
   - officially referenced by GitHub docs as a marketplace example
   Popularity:
   - GitHub stars: `25931`
   Fit for StitchFlow:
   - huge distribution potential
   - current blocker is contribution policy around remote external plugins

2. `github/copilot-plugins`
   Why it matters:
   - official GitHub plugin collection
   - referenced in GitHub docs as a marketplace example
   Popularity:
   - GitHub stars: `141`
   Fit for StitchFlow:
   - authoritative but likely curated and harder to enter than community catalogs

### Codex and cross-agent ecosystem

1. `askill`
   Why it matters:
   - purpose-built cross-agent registry for `SKILL.md`
   - explicit support for Codex, Claude Code, OpenClaw, Cursor, and many more agents
   Fit for StitchFlow:
   - excellent product fit
   - popularity is still early, but it is one of the cleanest universal registries for our packaging format

2. `Prat011/awesome-llm-skills`
   Why it matters:
   - broad multi-agent list, not tied to one vendor
   - strong fit for Codex, Claude Code, and Gemini CLI all at once
   Popularity:
   - GitHub stars: `1010`
   Fit for StitchFlow:
   - already in progress via PR

3. `huggingface/skills`
   Why it matters:
   - multi-agent skills repo with explicit support for Claude Code, Codex, Gemini CLI, and Cursor
   Popularity:
   - GitHub stars: `9333`
   Fit for StitchFlow:
   - strategically important
   - more like an ecosystem repo than a generic directory, so submission may require stronger platform fit and packaging alignment

### Gemini CLI ecosystem

Important constraint:

- Gemini CLI has official extension installation from GitHub URL or local path, but we did not find a first-party public extension registry.

Implication:

- For Gemini, the best discovery channels are cross-agent registries and GitHub lists, not a native marketplace.

### OpenClaw ecosystem

1. ClawHub
   Why it matters:
   - official public OpenClaw registry
   - native install and discovery path
   Fit for StitchFlow:
   - already live

## Near-term priority order

1. `ComposioHQ/awesome-claude-skills`
2. keep `awesome-llm-skills` PR moving
3. deepen askill presence and canonical publish flow
4. explore whether `huggingface/skills` is open to a cross-agent design workflow like StitchFlow
5. revisit Copilot only if we can satisfy marketplace policy without a likely rejection

## Canonical metadata

Use these values everywhere unless a catalog forces a different format.

- Project name: `StitchFlow`
- Canonical skill slug: `stitchflow`
- Legacy alias slug: `stitch-design-local`
- GitHub Copilot plugin slug: `stitchflow`
- Gemini CLI extension id: `stitchflow`
- Repository: `https://github.com/yshishenya/stitchflow`
- Tagline: `Turn product briefs into UI screens, variants, Tailwind-ready HTML, and screenshots in minutes.`
- One-line value prop: `StitchFlow turns Google Stitch SDK into a reusable local workflow for agent clients.`

## Tier 1: Official distribution channels

### OpenClaw ClawHub

Why it matters:

- official public registry for OpenClaw skills
- has search, stars, comments, version history, and downloads
- closest thing to a native marketplace for this repo today

Submission path:

```bash
clawhub login
clawhub publish ./skills/stitchflow \
  --slug stitchflow \
  --name "StitchFlow" \
  --version 1.3.0 \
  --tags latest,design,ui,stitch
```

Status:

- repo is ready for publishable metadata
- still needs an authenticated publish from a maintainer account

### GitHub Copilot

Why it matters:

- official plugin install flow from a GitHub repository
- natural audience overlap with devtools, AI coding, and prompt-to-code creators
- can later be submitted to GitHub's `awesome-copilot` marketplace collection

Repo assets used:

- `.github/plugin/plugin.json`
- `skills/stitchflow/`

Install path for users:

```bash
copilot plugin install yshishenya/stitchflow
```

Status:

- repository packaging is now ready
- next manual step is a PR into `github/awesome-copilot`

### Gemini CLI

Why it matters:

- official extension install from a GitHub URL
- good fit for design-generation workflows because the install friction is low
- gives a second native distribution entrypoint outside the agent-skills ecosystem

Repo assets used:

- `gemini-extension.json`
- `GEMINI.md`

Install path for users:

```bash
gemini extensions install https://github.com/yshishenya/stitchflow
```

Status:

- repository packaging is now ready
- next step is validation on a machine with Gemini CLI installed

## Tier 2: High-signal community catalogs

### github/awesome-copilot

Why it matters:

- very large existing audience
- plugin collection is already consumable via Copilot CLI marketplace commands
- strong SEO and internal GitHub discovery

Submission angle:

- add StitchFlow under `plugins/` and possibly `skills/`
- lead with `prompt -> screen -> HTML + screenshot`

Status:

- ready for PR after Copilot install flow is smoke-tested

### askill.sh

Why it matters:

- purpose-built skill registry with GitHub-based install references
- good match for agent-skill discovery across tools

Submission angle:

- publish using the GitHub repo as the canonical source
- reference the canonical skill slug `stitchflow`

Status:

- likely ready, but submission path should be verified from the maintainer side before announcement

## Tier 3: Curated lists and outbound channels

- `awesome-llm-skills`
- agent-skills ecosystem lists and examples
- X / Twitter launch thread
- Reddit posts for AI coding and design engineering communities
- Hacker News launch once demo assets are strong enough

These are not native install channels, but they matter for stars.

## Submission assets checklist

- strong repo tagline in the first screenful of the README
- one static hero screenshot
- one 5 to 15 second GIF: prompt -> screen -> HTML
- one copy-paste install command per platform
- one concrete example prompt
- short maintainer bio and repository link

## Star-growth heuristics

- sell the outcome, not the packaging format
- show local HTML and screenshots immediately
- keep the promise narrow: `brief -> UI -> artifacts`
- every catalog description should mention at least two supported clients
- do not lead with interoperability; lead with visible output

## Weekly operating loop

1. Add one fresh example or screenshot.
2. Publish or update one catalog listing.
3. Post one short clip showing prompt to result.
4. Improve one install friction point from user feedback.
5. Track GitHub stars, installs, and inbound issues.
