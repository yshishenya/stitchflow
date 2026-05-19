## Summary

- 

## Why

- 

## What changed

- 

## Validation

- [ ] `cd stitch-starter && npm ci`
- [ ] `cd stitch-starter && for script in scripts/*.mjs; do node --check "$script"; done`
- [ ] `bash -n install.sh`
- [ ] installer layout smoke, when install paths changed
- [ ] live `npm run regression:e2e -- --timeout-ms 900000`, when Stitch behavior changed
- [ ] browser/rendered audit, when website handoff behavior changed
- [ ] `git diff --check`

## Release Notes

- [ ] `CHANGELOG.md` updated for user-visible changes
- [ ] version metadata updated, when preparing a release
- [ ] GitHub release notes category/labels considered

## Safety

- [ ] did not expose secrets
- [ ] did not commit `.env`, `runs/`, or `node_modules/`
- [ ] preserved unrelated user changes

## Notes

- 
