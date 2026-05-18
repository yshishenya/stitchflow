# Local CLI Usage

Prefer native Stitch MCP tools when the current client exposes them. Use these local CLI commands as the fallback path when MCP tools are unavailable, or when a user explicitly asks to run the local toolkit.

All commands run from:

```bash
cd "${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}"
```

## Discover live Stitch MCP tools

```bash
npm run tools
```

This writes `runs/latest-tools.json`. Use it before relying on a new Stitch capability, because the hosted MCP schema can move faster than this skill.

## List projects and screens

```bash
npm run list
npm run list -- --project-id 123
```

Use this when you need to discover existing `projectId` and `screenId` values.

## Generate a new screen

```bash
npm run generate -- --prompt "..."
```

Optional flags:

- `--project-id 123456789`
- `--title "Project Name"`
- `--device DESKTOP|MOBILE|TABLET|AGNOSTIC`
- `--timeout-ms 900000` for long image-led generation runs
- `--retries 2 --retry-delay-ms 5000` for transient Stitch availability errors

## Edit a screen

If `latest-screen.json` exists, you can edit without ids:

```bash
npm run edit -- --prompt "..."
```

Or target a specific screen:

```bash
npm run edit -- --project-id 123 --screen-id abc --prompt "..."
```

Add `--timeout-ms 900000` when a complex edit needs more than the SDK default
timeout. Add `--retries 2 --retry-delay-ms 5000` for transient Stitch
availability errors.

## Generate variants

```bash
npm run variants -- --prompt "..." --variant-count 3
```

Useful options:

- `--creative-range REFINE|EXPLORE|REIMAGINE`
- `--aspects LAYOUT,COLOR_SCHEME,IMAGES,TEXT_FONT,TEXT_CONTENT`
- `--project-id 123 --screen-id abc`
- `--timeout-ms 900000`
- `--retries 2 --retry-delay-ms 5000`

## Upload DESIGN.md and create a design system

```bash
npm run design-md -- --project-id 123 --file ./DESIGN.md --device DESKTOP
```

Useful options:

- `--upload-only` uploads the file and saves the selected screen instance without creating the design system.
- `--device DESKTOP|MOBILE|TABLET|AGNOSTIC`

The command saves `result.json` with the upload response, selected screen instance, and created design-system response.

## Export one screen

```bash
npm run export-screen -- --project-id 123 --screen-id abc
```

Without ids, the command exports `runs/latest-screen.json`.

## Export selected screens

```bash
npm run export-screens -- --project-id 123 --screen-ids abc,def
```

Use this for approved screen ids when `export-project` or `download-project`
does not include generated/edit/variant screens in the project listing. It
creates one folder per requested screen plus `export-screens.json`.

## Export every screen in a project

```bash
npm run export-project -- --project-id 123
```

This creates one folder per screen plus a parent `project.json`. Use it as an evidence checkpoint after reviewing a multi-screen Stitch project. It is not a substitute for Stitch UI Play/prototype export when the user asked for a clickable app flow.

## Download project code and local assets

```bash
npm run download-project -- --project-id 123
```

This uses the SDK project downloader. It saves each screen as `code.html`,
downloads referenced remote images/styles into `assets/`, rewrites many asset
URLs to local paths, downloads screenshots when available, and exports
`DESIGN.md` when the project design system exposes it. It downloads all project
screens, so use `download-project.json` to identify approved screens, scratch
screens, and warnings before handing artifacts to engineering.

Useful options:

- `--assets-subdir assets`
- `--output-dir /absolute/path/to/output`

Use this when the user asks for code with styles and images. It is still
screen-level HTML handoff, not a guaranteed runnable multi-route app bundle.
Generated HTML may still reference external runtime scripts such as Tailwind CDN
or font preconnects; production implementation must vendor/build those
dependencies or adapt the design into the app's native stack.

## Audit full site design delivery

```bash
npm run site-design-audit -- --file ./site-design-audit.json
```

The JSON file should describe the Stitch project id, selected logo, homepage
variants, selected homepage screen id, expected screen inventory, local artifact
paths, and optional `download-project.json` / `export-screens.json` paths. The
command checks that the required design decisions are recorded, files exist,
screen ids are accessible through `getScreen` when `STITCH_API_KEY` is
available, required text appears in code artifacts, and the download manifest
has no warnings. A required screen may be covered by either `download-project`
or the `export-screens` fallback.

Use `--check-project false` for an offline artifact-only audit.

## Output layout

Each run creates a folder under:

```text
${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}/runs/<timestamp>-<operation>-<slug>/
```

Typical artifacts:

- `result.json` or `variants.json`
- `screen.html`
- `screen.png` or `screen.jpeg`
- `html-url.txt`
- `image-url.txt`

The most recent single-screen result is tracked in:

```text
${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}/runs/latest-screen.json
```

## Native MCP artifact layout

When using native Stitch MCP tools, mirror the same local output layout manually:

```text
${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}/runs/<timestamp>-generate-<slug>/
${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}/runs/<timestamp>-variants-<slug>/variant-1/
```

For each screen, save:

- `result.json`
- `screen.html`
- `screen.png` or `screen.jpeg`
- `html-url.txt`
- `image-url.txt`

Use `curl --location --retry 4 --retry-all-errors` for `downloadUrl` values if plain Node `fetch` times out.

## Capability boundary

The SDK/MCP path can generate screens, edit screens, create variants, upload `DESIGN.md`, create/apply design systems, list screens, export screen HTML/screenshots, and download screen HTML with referenced assets through the SDK helper. When the user needs Stitch Play links or whole-project developer-tool export to AI Studio/Antigravity and no MCP/SDK endpoint is exposed in `npm run tools`, use the Stitch web UI with Browser/Chrome/Computer Use and then run `download-project` for a local code/assets checkpoint.

## Regression E2E

Before releasing toolkit or skill workflow changes, run:

```bash
npm run regression:e2e -- --timeout-ms 900000
```

This creates a scratch Stitch project and exercises `tools`, `generate`,
`design-md`, `edit`, `variants`, `export-screen`, `export-screens`,
`export-project`, `download-project`, and `list`. It writes
`regression-e2e.json` under
`runs/<timestamp>-regression-e2e/` with step logs, assertions, artifact paths,
and the scratch project id.
