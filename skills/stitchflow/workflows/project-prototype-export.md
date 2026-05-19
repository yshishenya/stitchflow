---
description: Build a multi-screen Stitch project, keep Stitch as the design source of truth, and export prototype/code handoff artifacts.
---

# Workflow: Project Prototype Export

Use this workflow when the user wants a final website/app direction, multiple screens, a clickable prototype, `DESIGN.md` consistency, or code handoff from Stitch.

## Principles

1. Keep the Stitch project as the source of truth for final design decisions.
2. Do not hand-code a replacement HTML page as the design artifact.
3. Do not download unrelated images or regenerate assets outside Stitch unless the user explicitly asks for external bitmap assets.
4. Use local HTML/screenshots as review evidence, QA checkpoints, or implementation references.
5. If Stitch UI exposes a capability that the SDK/MCP does not expose, use Browser/Chrome/Computer Use and document that UI step.

## Steps

1. Gather the product context.
- Read the product brief, PRD, screen list, selected design direction, brand notes, and UX constraints.
- Convert that context into a concise `DESIGN.md` when the project needs visual consistency across screens.

2. Create or reuse one Stitch project.
- Use `create_project` when native MCP tools are available.
- Otherwise use the local toolkit and `npm run list` to find an existing project.
- Keep all screens for the same flow in that project.

3. Import the design system.
- Prefer native MCP tools: `upload_design_md`, then `create_design_system_from_design_md`.
- Local fallback:

```bash
cd "${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}"
npm run design-md -- --project-id 123 --file ./DESIGN.md --device DESKTOP
```

- If the user already has a design system in Stitch, use it instead of creating a duplicate.
- If design-system creation fails but upload succeeds, keep the uploaded `DESIGN.md` evidence and use Stitch UI to finish the design-system step.

4. Generate the screens inside Stitch.
- Start from the highest-value screen, usually home/dashboard/main workflow.
- Generate each additional screen in the same project with prompts that repeat the product goal, role, and visual rules.
- For final site work, generate actual screens the product needs, not decorative fake app chrome.

5. Link and review the prototype in Stitch UI.
- Use Stitch Play/prototype linking when the user needs clickable journeys.
- If the SDK/MCP session does not expose prototype-linking tools, open Stitch UI through Browser/Chrome/Computer Use and complete the linking there.
- Record the project id, selected screens, and any UI-only action in the handoff notes.

6. Export or checkpoint the result.
- If Stitch UI exposes full code export to developer tools, use that for the final source export.
- When the user asks for code with styles and images, download the local code/assets checkpoint:

```bash
cd "${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}"
npm run download-project -- --project-id 123
```

- This produces per-screen `code.html`, local `assets/`, screenshots when available, and `DESIGN.md` when exposed by the project design system.
- It uses `Project.downloadAssets()`, which downloads all project screens, including scratch/design-system screens if they remain in the project. Use `download-project.json` to map screen ids/names, record warnings, and mark the approved screens for implementation.
- If approved generated/edit/variant screen ids are missing from `download-project.json`, export that approved set explicitly:

```bash
cd "${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}"
npm run export-screens -- --project-id 123 --screen-ids abc,def
```

- Inspect the exported HTML for remaining external runtime dependencies such as Tailwind CDN or font preconnects. Treat those as implementation dependencies to vendor/build, not as proof that the export is production-ready.
- For a lighter evidence-only checkpoint after final screen review:

```bash
cd "${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}"
npm run export-project -- --project-id 123
```

- For one screen only:

```bash
npm run export-screen -- --project-id 123 --screen-id abc
```

7. Review before implementation.
- Check desktop and mobile screenshots for layout, text overflow, role clarity, real product meaning, visual consistency, and accessibility risks.
- Compare the Stitch output to the PRD and design brief before moving to app implementation.

## Handoff Checklist

- Stitch project id is recorded.
- Screen ids and screen names are recorded.
- `DESIGN.md` upload/design-system status is recorded.
- Prototype linking status is recorded.
- Full Stitch UI code export status is recorded.
- Local `download-project` code/assets checkpoint path is recorded when code is requested.
- Local `export-project` evidence checkpoint path is recorded when screenshots/HTML URLs are enough.
- Known limitations are explicit, especially any SDK/MCP capability gap.
