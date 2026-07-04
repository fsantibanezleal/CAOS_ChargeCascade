# The live / precompute gate

`cclab/core/gate.py` records, per case, whether it runs **live** (client-side) or falls back to **replay** of the
committed trace (ADR-0054). It is a **measurement written into the manifest**, never a hand-wave; `scripts/
check_artifacts.py` + CI fail on a mislabelled lane.

```python
classify_lane(client_side=True,
              runtimes={"ts-mill", "onnxruntime-web"},
              run_ms=...,            # a full engine evaluate(), measured
              trace_bytes=...)       # the committed per-case trace size
```

A case is **live** iff it is client-side, its runtimes are a subset of the deployed client set
`{ts-mill, onnxruntime-web}` (`LIVE_RUNTIMES`), a full engine evaluation completes within the interaction budget, and
its replay trace stays small. At this scale a full `evaluate(op)`, the critical speed, the per-shell Davis sweep, the
regime classification, the power draw and the power-vs-`φc` curve, is **sub-millisecond** in native TypeScript and the
trace is a few KB, so **every case runs LIVE in the browser**. The verdict + budgets go into the manifest; the raw
wall-clock is used for the decision but never stored.
