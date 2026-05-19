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
- `--model-id GEMINI_3_1_PRO|GEMINI_3_FLASH|MODEL_ID_UNSPECIFIED`
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
availability errors. Add `--model-id GEMINI_3_1_PRO` or
`--model-id GEMINI_3_FLASH` to select a live Stitch model explicitly.

## Generate variants

```bash
npm run variants -- --prompt "..." --variant-count 3
```

Useful options:

- `--creative-range REFINE|EXPLORE|REIMAGINE`
- `--aspects LAYOUT,COLOR_SCHEME,IMAGES,TEXT_FONT,TEXT_CONTENT`
- `--project-id 123 --screen-id abc`
- `--model-id GEMINI_3_1_PRO|GEMINI_3_FLASH|MODEL_ID_UNSPECIFIED`
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

## Manage design systems

Use this when you need the raw live MCP design-system capabilities as a local
fallback: list, create, update, or apply a project design system to specific
screens. Although the live schema marks `list_design_systems.projectId` as
optional, the current service rejects global list requests, so the CLI requires
`--project-id` for `list`.

```bash
npm run design-system -- --action list --project-id 123
npm run design-system -- --action create --project-id 123 --file ./design-system.json
npm run design-system -- --action update --project-id 123 --asset-id 15996705518239280238 --file ./design-system.json
npm run design-system -- --action apply --project-id 123 --asset-id 15996705518239280238 --screen-ids abc,def
npm run design-system -- --action apply --project-id 123 --asset-id 15996705518239280238 --screen-ids abc,def --allow-screen-id-fallback
```

The JSON file for `create` and `update` may be either the design-system object
itself or `{ "designSystem": { ... } }`. If `apply` cannot resolve screen
instances from `get_project`, pass `--screen-instances-file ./instances.json`
with a `selectedScreenInstances` array from the project info. The live MCP
currently accepts a screen-id fallback for some generated screens; use
`--allow-screen-id-fallback` with `--screen-ids` only when that fallback is an
intentional smoke-test or recovery path.

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
- `--safe-download` to bypass the SDK downloader and use StitchFlow's local
  safe downloader with short screen directories

Use this when the user asks for code with styles and images. It is still
screen-level HTML handoff, not a guaranteed runnable multi-route app bundle.
Generated HTML may still reference external runtime scripts such as Tailwind CDN
or font preconnects; production implementation must vendor/build those
dependencies or adapt the design into the app's native stack. The CLI tries the
official SDK `downloadAssets()` helper first and automatically falls back to the
safe downloader if the SDK hits filesystem path-length errors from long screen
titles or image prompts.

## Audit full site design delivery

```bash
npm run site-design-audit -- --file ./site-design-audit.json
```

The JSON file should describe the Stitch project id, selected logo, homepage
variants, selected homepage screen id, expected screen inventory, local artifact
paths, `handoffStatus`, `qaNotes`, unsupported claim terms in `forbiddenText`,
and optional `download-project.json` / `export-screens.json` paths. The command
checks that the required design decisions are recorded, HTML/image artifacts are
non-empty and parseable, screen ids are accessible through `getScreen` when
`STITCH_API_KEY` is available, required text appears in code artifacts,
unsupported claims are absent, static accessibility/responsive rules pass, and
the download manifest has no warnings. If a required screen is covered by
`export-screens` instead of `download-project`, set
`"allowExportFallbackForApprovedScreens": true` so the fallback is explicit.

Add `renderedViewports` to run browser-level checks for horizontal overflow,
clipped text, browser page errors, and serious axe accessibility violations:

```bash
npx playwright install chromium
npm run site-design-audit -- --file ./site-design-audit.json
```

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
`design-md`, `design-system` create/list/update/apply, `edit`, `variants`,
`export-screen`, `export-screens`, `export-project`, `download-project`, and
`list`. It writes
`regression-e2e.json` under
`runs/<timestamp>-regression-e2e/` with step logs, assertions, artifact paths,
warnings, and the scratch project id. The runner reads each child command's
printed output directory instead of the shared `latest-screen.json`, applies a
per-step timeout, validates HTML/image artifacts, and records any
`download-project` omissions. Pass `--require-download-approved-screens` when
the download must include every approved screen without relying on
`export-screens`.

## Full Site Design E2E

To verify the complete design-delivery workflow against the live Stitch API:

```bash
npm run site-design:e2e -- --brand "Turnirka" --slogan "Tournament management that feels clear to everyone" --timeout-ms 900000
```

This creates a scratch project and exercises the full flow: logo exploration
board, 5 homepage candidates, provisional selection, remaining screens in the
selected style, approved screen export, `download-project`, audit config, and
`site-design-audit`. It enables rendered viewport/a11y checks by default; run
`npx playwright install chromium` first or pass `--rendered-audit false` in
constrained environments. Use `--operation-timeout-ms 900000` to cap each
direct Stitch operation and `--step-timeout-ms 1020000` to cap child audit
processes. The command runs through a parent/worker wrapper, so
`--total-timeout-ms 3600000` can kill a stuck worker process. Use
`--screens-file ./screens.json` to replace the default remaining screen
inventory.
