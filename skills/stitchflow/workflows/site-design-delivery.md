---
description: Run a complete website design delivery in Stitch: logo, homepage variants, selection, full screen set, QA, and implementation handoff.
---

# Workflow: Site Design Delivery

Use this workflow when the user wants a serious website/product design process,
not a single generated screen. The goal is a reviewed Stitch project that can be
used as the design source of truth before frontend implementation.

## Principles

1. Start from product context, not aesthetics alone.
2. Keep all final screens in one Stitch project.
3. Explore broadly for the homepage, then converge before generating the rest.
4. Treat the selected homepage as the visual source for the remaining screens.
5. Verify screen inventory coverage before calling the design finished.
6. A final screen must have a recorded Stitch screen id and local screenshot or
   code checkpoint. A pretty image without an id is inspiration, not delivery.
7. Generated HTML is an implementation reference; production code still needs
   the app's native routing, components, accessibility, and asset pipeline.

## Inputs To Gather

- product PRD, design brief, brand notes, routes, personas, and screen inventory
- the site goal and primary conversion/action
- required states: anonymous, authenticated, paid/unpaid, empty, error, success
- brand name, slogan, domains, logo constraints, and forbidden directions
- implementation stack constraints such as Django templates, Tailwind, HTMX, or
  existing component libraries

## Phase 1: Product And Screen Inventory

Create a compact design brief before generating:

- audience and core promise
- page/screen list with required route or role
- required sections per screen
- role-specific UX checks
- visual rules: palette, typography, imagery, spacing, icon style, component
  radius, CTA hierarchy, motion rules
- content constraints: real product terms, no fake features unless marked as
  roadmap, no unsupported active filters

For a product site, define at minimum:

- homepage
- login/sign-up or account entry
- pricing/payment explanation if relevant
- product demo/public example page
- organizer onboarding
- help/contact/legal pages if they are in scope
- responsive mobile states for the homepage and primary conversion flow

## Phase 2: Logo Exploration

Generate or edit logo directions before the final homepage pass when the brand
identity is not settled.

Expected output:

- at least 5 logo options unless the user asked for fewer
- one-page rationale for each option: symbol idea, wordmark feel, scalability,
  dark/light usability, favicon/app icon potential
- selected logo direction recorded with artifact path and usage notes

Do not let logo exploration block the screen workflow forever. If the user has
not selected a logo, choose the strongest candidate temporarily and mark it as
provisional.

## Phase 3: Homepage Exploration

Generate at least 5 homepage directions in one Stitch project.

Each candidate should vary meaningfully:

- hero composition and imagery
- CTA hierarchy
- proof section
- product workflow explanation
- role value framing
- roadmap/future capability framing

For each candidate, save:

- Stitch screen id
- screenshot
- HTML/code artifact when available
- short assessment: strongest use case, weaknesses, and what to reuse

Reject candidates that are only standalone illustrations, fake app mockups with
no product meaning, or screens that contradict the PRD.

## Phase 4: Selection Gate

Do not generate the rest of the site until a homepage direction is selected or a
temporary winner is explicitly recorded.

Selection notes must include:

- selected screen id
- why it won
- which parts to merge from other variants
- known copy/design changes before expansion
- approved design tokens and imagery direction

If no candidate is good enough, edit the strongest one before expanding.

## Phase 5: Full Screen Generation

Use the selected homepage as the visual source. For every screen in the
inventory:

1. Prompt with the selected screen id, product role, route goal, required
   sections, state, and visual inheritance.
2. Generate the screen in the same Stitch project.
3. Edit until the screen is coherent and matches the source direction.
4. Record screen id and local artifact paths.
5. Mark whether the screen is final, draft, or blocked.

Screen prompts should say what the screen is for, not just how it should look.
For example, "organizer creates a draft tournament and sees readiness checks" is
better than "dashboard with cards."

## Phase 6: Prototype And Code Checkpoint

When all screens exist:

```bash
cd "${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}"
npm run download-project -- --project-id 123
```

The CLI first uses the SDK downloader. If it fails because the hosted screen
title produced an overlong local directory name, the CLI falls back to a safe
local downloader with short screen directories and records `downloadMode` plus a
warning in `download-project.json`.

Then inspect `download-project.json`:

- warnings
- `downloadMode`
- unexpected scratch/design-system screens
- missing selected screen ids
- which folder maps to each approved screen

If Stitch Play/prototype links or developer-tool export are required and are not
available through MCP/SDK, complete that in the Stitch UI and record the UI-only
step. Still keep `download-project` as the local code/assets checkpoint.

If `download-project.json` does not include one or more approved screen ids,
export the approved inventory explicitly:

```bash
cd "${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}"
npm run export-screens -- --project-id 123 --screen-ids abc123,def456,ghi789
```

If you use this fallback in handoff, make it explicit in the audit config with
`"allowExportFallbackForApprovedScreens": true`. Otherwise, the audit should
fail when an approved screen is absent from `download-project`.

## Phase 7: Product QA

Review every final screen against:

- PRD and route inventory
- role scenarios
- content truthfulness
- accessibility basics: contrast, readable text, visible focus/CTA states
- responsive feasibility
- implementation constraints
- brand consistency
- no unsupported feature promises
- no generated copy that sounds like placeholder marketing filler

Run the local audit when handoff artifacts are available:

```bash
cd "${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}"
npm run site-design-audit -- --file ./site-design-audit.json
```

Start from [site-design-audit.example](../templates/site-design-audit.example.json)
if no audit file exists yet.

The audit config must include:

- `handoffStatus`: `draft`, `final`, or `blocked`
- `qaNotes`: per-area notes with `passed`, `warning`, or `blocked`
- `forbiddenText`: unsupported product claims that must not appear
- `requiredText`: meaningful phrases per screen, not just one generic word
- optional `renderedViewports` for browser checks of overflow, clipped text,
  page errors, and serious axe accessibility violations

When `renderedViewports` is enabled, install Chromium once:

```bash
cd "${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}"
npx playwright install chromium
```

Use the generated report to close gaps, then rerun the audit.

For a full live regression of this workflow, run:

```bash
cd "${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}"
npm run site-design:e2e -- --brand "Turnirka" --timeout-ms 900000
```

The full E2E enables rendered audit by default. Use `--rendered-audit false`
only when the environment cannot run a browser and record that as a QA warning.
Use `--operation-timeout-ms` to cap each direct Stitch generation/edit call and
keep CI from waiting indefinitely on a stalled live operation. Use
`--total-timeout-ms` as the outer parent-process cap for the whole workflow.

## Handoff Checklist

- Product context and design brief are recorded.
- Logo options and selected logo direction are recorded.
- At least 5 homepage variants are recorded.
- Selected homepage screen id is recorded and accessible/exportable by id.
- Full screen inventory exists with screen ids and artifacts.
- `download-project` checkpoint is recorded.
- `download-project` warnings are reviewed.
- Scratch/support screens are separated from approved screens.
- Every required screen is marked final, draft, or blocked.
- Product QA notes are attached to each screen or route.
- Required phrases, forbidden claims, artifact quality, responsive overflow,
  and accessibility checks are captured in the audit report.
- Known implementation adaptations are explicit.
