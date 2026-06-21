# Deploy

Default = **GitHub Pages, static** (ADR-0054 deploy class + ADR-0055 Pages-first): `.github/workflows/deploy-pages.yml`
runs `python -m cclab.pipeline all` to regenerate the artifacts deterministically, builds the SPA (`copy-data.mjs`
overlays `data/derived` — including `power-surrogate.onnx`, `scenario-ood.onnx`, `cc-learned.json` and
`case-results.json`), and deploys `frontend/dist`. No backend at request time. Live at
**https://chargecascade.fasl-work.com**.

`.github/workflows/ci.yml` keeps the base honest on every push: it runs the light lane on one case
(`python -m cclab.pipeline K-BALL`), ruff, pytest, and `npm run build`, plus `check_artifacts.py` (CONTRACT 2) and the
guards that fail on a tracked `.env` / venv / native-or-heavy binary / raw data / leaked machine path. The VPS path
(systemd + nginx, in `deploy/`) is **dormant** — activated only when `app/` is (an ADR-0002 trigger).

The small derived artifacts (`data/derived/*.onnx`, `cc-learned.json`, `case-results.json`, the per-case traces and the
manifests) are **committed** so Pages serves them directly; `data/raw/` and the `public/` overlay are git-ignored.

**Pages gotchas (applied up front):** enable Pages with `build_type=workflow`; the repo default branch is `main` (so the
`github-pages` environment allows it); the custom domain is set via
`gh api -X PUT repos/.../pages -f cname=chargecascade.fasl-work.com` — a `CNAME` file alone does **not** set it for
Actions deploys (it 404s the domain).
