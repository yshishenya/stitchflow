# Stitch Starter

Minimal local starter for the official `@google/stitch-sdk`.

If your agent client exposes native Stitch MCP tools, prefer those tools for generation, variants, design-system work, and screen inspection. Use this local starter as the portable fallback path, artifact downloader, and project evidence checkpoint.

## Setup

```bash
cd "${STITCH_STARTER_ROOT:-$HOME/.agents/stitch-starter}"
cp .env.example .env
# add STITCH_API_KEY to .env
npm install
```

## Commands

Discover the live MCP tools exposed by Stitch:

```bash
npm run tools
```

Generate a new screen:

```bash
npm run generate -- --prompt "A modern SaaS dashboard with sidebar and stat cards"
```

For complex image-led prompts, increase the MCP timeout:

```bash
npm run generate -- --prompt "A cinematic product homepage" --timeout-ms 900000
```

Use a specific Stitch model when needed:

```bash
npm run generate -- --prompt "A cinematic product homepage" --model-id GEMINI_3_1_PRO
```

Generate into an existing project:

```bash
npm run generate -- --project-id 123456789 --prompt "Pricing page with 3 plans"
```

Edit the latest generated screen:

```bash
npm run edit -- --prompt "Make it more premium and add stronger typography"
```

Generate variants from the latest screen:

```bash
npm run variants -- --prompt "Explore three different visual directions" --variant-count 3
```

`generate`, `edit`, and `variants` also accept `--timeout-ms 900000` for long-running Stitch jobs.
They also accept `--retries 2 --retry-delay-ms 5000` for transient Stitch
availability errors.

List available projects and screens:

```bash
npm run list
npm run list -- --project-id 123456789
```

Upload `DESIGN.md` and create a Stitch design system:

```bash
npm run design-md -- --project-id 123456789 --file ./DESIGN.md --device DESKTOP
```

List, create, update or apply project design systems through the live Stitch MCP tools:

```bash
npm run design-system -- --action list --project-id 123456789
npm run design-system -- --action create --project-id 123456789 --file ./design-system.json
npm run design-system -- --action update --project-id 123456789 --asset-id 15996705518239280238 --file ./design-system.json
npm run design-system -- --action apply --project-id 123456789 --asset-id 15996705518239280238 --screen-ids abc,def
npm run design-system -- --action apply --project-id 123456789 --asset-id 15996705518239280238 --screen-ids abc,def --allow-screen-id-fallback
```

Export one screen:

```bash
npm run export-screen -- --project-id 123456789 --screen-id abc
```

Export a specific approved set of screens:

```bash
npm run export-screens -- --project-id 123456789 --screen-ids abc,def
```

Export every screen in a project:

```bash
npm run export-project -- --project-id 123456789
```

Download project code with referenced styles/images rewritten to local assets:

```bash
npm run download-project -- --project-id 123456789
```

`download-project` uses the SDK downloader first and automatically falls back
to a safe local downloader with short screen directories if the SDK hits a
filesystem path-length issue. Use `--safe-download` to force that fallback.

Audit a completed website design handoff:

```bash
npm run site-design-audit -- --file ./site-design-audit.json
```

If the audit config enables `renderedViewports`, install the Chromium browser
once before running rendered overflow/a11y checks:

```bash
npx playwright install chromium
```

Run the full StitchFlow regression against the live Stitch API:

```bash
npm run regression:e2e -- --timeout-ms 900000
```

Run the full website design delivery E2E:

```bash
npm run site-design:e2e -- --brand "Turnirka" --timeout-ms 900000
```

## Codex MCP setup

Codex can call Stitch directly when the MCP server is configured. Add the server to `~/.codex/config.toml` and restart Codex:

```toml
[mcp_servers.stitch]
url = "https://stitch.googleapis.com/mcp"
enabled = true

[mcp_servers.stitch.http_headers]
"X-Goog-Api-Key" = "<your Stitch API key>"
```

After restart, Codex should expose Stitch tools such as `create_project`, `generate_screen_from_text`, `generate_variants`, `upload_design_md`, `create_design_system_from_design_md`, `apply_design_system`, and `get_screen`.

## Output

Each run is saved under `runs/<timestamp>-<operation>/` with:

- `result.json` or `variants.json`
- `screen.html` / `screen.<image-ext>` when available
- `html-url.txt`
- `image-url.txt`

The latest single-screen result is also written to:

```bash
runs/latest-screen.json
```

For a final multi-screen flow, keep the hosted Stitch project/prototype as the design source of truth. Use `download-project` after review when you need local `code.html` files with referenced assets downloaded and rewritten. Use `export-project` when you only need screen-level HTML/screenshot evidence. If Stitch Play or whole-project developer-tool export is only available in the Stitch web UI, complete that step in the UI and record it in your handoff.

For release checks, run `npm run regression:e2e -- --timeout-ms 900000`. It
creates a scratch Stitch project, exercises tools, generate, DESIGN.md,
design-system create/list/update/apply, edit, variants, export-screen,
export-screens, export-project, download-project, and list, then writes a
`regression-e2e.json` report under `runs/`. The regression reads each child
command's own output directory instead of `runs/latest-screen.json`, validates
HTML/image artifacts, and enforces a per-step timeout. Add
`--require-download-approved-screens` when a release must fail unless
`download-project` itself contains every approved screen.

For full website design delivery, use `site-design-audit` after choosing the
logo and homepage direction. The audit checks the selected homepage, all
expected screens, local artifact quality, required text, unsupported claims,
static accessibility/responsive rules, screen id accessibility, the
`download-project` manifest, and the explicit `export-screens` fallback when
project-wide downloads omit approved screens. Audit configs should record
`handoffStatus`, `qaNotes`, `forbiddenText`, and optional `renderedViewports`.

Use `npm run site-design:e2e -- --brand "Turnirka" --timeout-ms 900000` when
you need to test the whole design-delivery process end to end: logo board,
5 homepage candidates, selected homepage, remaining screens, exports, rendered
viewport/a11y audit, and handoff status checks. Pass `--rendered-audit false`
to skip browser checks in constrained environments. Use
`--operation-timeout-ms 900000` to cap each direct Stitch operation and
`--step-timeout-ms 1020000` to cap child audit processes. The script also runs
through a parent/worker wrapper; `--total-timeout-ms 3600000` caps the whole
workflow and can kill a stuck worker process.
