# Changelog

All notable changes to StitchFlow are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

No unreleased changes yet.

## [1.4.0] - 2026-05-19

### Added

- Added `npm run design-system` with `list`, `create`, `update`, and `apply`
  actions for the live Stitch MCP design-system tools.
- Added `npm run site-design:e2e`, a full live website design workflow that
  covers logo exploration, homepage variants, selected homepage expansion,
  approved screen export, project download, and handoff audit generation.
- Added `--model-id` support to `generate`, `edit`, `variants`,
  `regression:e2e`, and `site-design:e2e`.
- Added `site-design-audit` coverage for handoff status, QA notes, required
  phrases, unsupported claims, static accessibility checks, responsive CSS
  signals, browser page errors, rendered horizontal overflow, clipped text, and
  serious axe accessibility violations.
- Added Playwright and axe-based rendered viewport audit support for full site
  handoffs.
- Added a safe `download-project` fallback path that uses short local screen
  directories when the SDK downloader fails on filesystem path-length limits.
- Added live regression workflow support through GitHub Actions
  `workflow_dispatch`, including optional full site-design E2E artifacts.
- Added a GitHub release-notes configuration so generated release notes group
  features, fixes, documentation, validation, and dependencies consistently.

### Changed

- Reworked the root README into a concise GitHub-first entry point with quick
  start, supported clients, CLI commands, validation, release policy, and links
  into detailed docs.
- Expanded the CLI reference and website design workflow docs for design-system
  usage, safe downloads, audit config fields, rendered audit requirements, and
  timeout controls.
- Updated the site-design audit template to include `handoffStatus`,
  `qaNotes`, `forbiddenText`, `allowExportFallbackForApprovedScreens`, and
  rendered viewport checks.
- Updated installer validation to verify required scripts and prevent local
  state from being copied into installed toolkits.
- Updated metadata across plugin and extension manifests to version `1.4.0`.
- Made `design-system apply` screen-id fallback explicit with
  `--allow-screen-id-fallback` and recorded the resolution mode in output
  metadata.

### Fixed

- Fixed a race in `regression:e2e` where steps could read a global
  `runs/latest-screen.json` written by another concurrent run. The regression
  now reads each child command's own output directory.
- Fixed CI and local regression hangs by adding child-process timeout handling
  and worker-level timeout support for the full site-design E2E.
- Fixed `download-project` failures caused by long Stitch-generated screen
  titles or image prompts by falling back to short local directory names.
- Fixed overly weak artifact checks by validating HTML parseability, artifact
  size, meaningful text, image type, and image dimensions.
- Fixed overly implicit download coverage by recording when
  `download-project` omits approved screens and requiring explicit
  `export-screens` fallback coverage.
- Fixed installer leakage risk by copying only the toolkit allowlist instead of
  copying `.env`, `runs/`, or `node_modules/`.
- Fixed stale catalog/version references from `1.3.x` to `1.4.0`.

### Validation

- `npm ci`
- `node --check scripts/*.mjs`
- required package script validation
- `bash -n install.sh`
- installer layout smoke with isolated temp homes
- `git diff --check`
- offline rendered `site-design-audit` smoke: `64/64` checks passed
- live `download-project --safe-download` smoke against a real Stitch project
- live automatic `download-project` safe fallback smoke against a real Stitch
  project
- live `regression:e2e`: `88/88` assertions passed against Stitch project
  `2181787718089577151`

### Known Notes

- Full `site-design:e2e` is intentionally heavier than `regression:e2e`.
  During validation, live logo generation exposed a long-running Stitch call;
  `site-design:e2e` now runs through a parent/worker wrapper so
  `--total-timeout-ms` can kill a stuck worker process.
- `download-project` can still omit generated/edit/variant screens that are
  accessible by id but not listed by the project listing API. The supported
  handoff path is to make that explicit with `export-screens` coverage.

## [1.3.1] - 2026-03-19

### Changed

- Documentation and demo polish for the StitchFlow launch flow.

## [1.3.0] - 2026-03-19

### Added

- Native Stitch MCP workflow documentation and local fallback guidance.

## [1.2.0] - 2026-03-19

### Added

- Multi-client skill packaging and installer improvements.

## [1.1.0] - 2026-03-19

### Added

- Initial StitchFlow local toolkit workflow for prompt-to-design generation,
  edits, variants, and local artifacts.

## [1.0.4] - 2026-03-19

### Fixed

- Packaging and documentation fixes.

## [1.0.3] - 2026-03-19

### Fixed

- Installer and compatibility fixes.

## [1.0.2] - 2026-03-19

### Fixed

- Skill metadata and distribution fixes.

## [1.0.1] - 2026-03-19

### Fixed

- Initial release follow-up fixes.

## [1.0.0] - 2026-03-19

### Added

- Initial public release.

[Unreleased]: https://github.com/yshishenya/stitchflow/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/yshishenya/stitchflow/compare/v1.3.1...v1.4.0
[1.3.1]: https://github.com/yshishenya/stitchflow/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/yshishenya/stitchflow/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/yshishenya/stitchflow/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/yshishenya/stitchflow/compare/v1.0.4...v1.1.0
[1.0.4]: https://github.com/yshishenya/stitchflow/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/yshishenya/stitchflow/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/yshishenya/stitchflow/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/yshishenya/stitchflow/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/yshishenya/stitchflow/releases/tag/v1.0.0
