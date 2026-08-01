"""Pipeline smoke + determinism: a case regenerates deterministically (same seed -> byte-identical artifact), the
registry matches the committed bake, and run_all writes the flat index."""
import json

from pipeline import pipeline, registry


def test_case_deterministic_same_seed():
    a = pipeline.precompute("K-BALL", seed=7)
    b = pipeline.precompute("K-BALL", seed=7)
    assert a["artifact"]["bytes"] == b["artifact"]["bytes"]
    trace = json.loads((pipeline.DERIVED / a["artifact"]["path"]).read_text(encoding="utf-8"))
    assert trace["phf_kw"] > 0
    assert trace["schema"].startswith("chargecascade.trace/")


def test_control_case_runs():
    m = pipeline.precompute("C-EMPTY", seed=1)
    trace = json.loads((pipeline.DERIVED / m["artifact"]["path"]).read_text(encoding="utf-8"))
    assert trace["phf_kw"] == 0, "empty mill -> zero power"


def test_registry_matches_committed_bake():
    case_results, _ = pipeline._load_artifacts()
    baked = set(case_results["cases"].keys())
    declared = {c.id for c in registry.list_cases()}
    assert declared == baked, f"registry vs bake drift: only-registry={declared - baked}, only-bake={baked - declared}"


def test_run_all_writes_index():
    entries = pipeline.run_all(seed=42)
    assert len(entries) == len(registry.list_cases()) >= 4
    idx = json.loads((pipeline.MANIFESTS / "index.json").read_text(encoding="utf-8"))
    assert idx["n_cases"] == len(entries)
    assert idx["schema"].startswith("chargecascade.index/")
