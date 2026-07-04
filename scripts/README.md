# scripts/ — environment + pipeline orchestration (cross-platform)

Local scripts so **anyone** can configure the env and run the flow. Every script exists in BOTH `*.sh`
(macOS/Linux/Git-Bash) and `*.ps1` (Windows PowerShell).

| Script | What it does |
|---|---|
| `setup.sh` / `setup.ps1` | create `.venv-pipeline` (offline lane: `data-pipeline/requirements.txt` + dev + editable pkg) and `.venv` (runtime/live-thin lane: `requirements.txt`); dormant lanes skipped. Idempotent. |
| `precompute.sh` / `precompute.ps1` | run the staged pipeline: `python -m cclab.pipeline` (all 10 cases, or one: `precompute.sh K-BALL --seed 7`). |
| `dev.sh` / `dev.ps1` | frontend dev server (starts the API on :8000 only if `app/` is activated; it is dormant today). |
| `smoke.sh` / `smoke.ps1` | run `check_artifacts.py` — validate CONTRACT 2 on disk (index → manifests → artifacts consistent). |
| `check_artifacts.py` | stdlib-only artifact/manifest consistency check; used by smoke and CI. |

The torch → ONNX retrain lane uses a separate `.venv-precompute`
(see [docs/guides/01_precompute-pipeline.md](../docs/guides/01_precompute-pipeline.md)).

Rules: idempotent; detect `.venv*/bin/python` vs `.venv*/Scripts/python.exe`; never use global Python/Node.
Pin nothing here — versions live in the `requirements-*.txt` files.
