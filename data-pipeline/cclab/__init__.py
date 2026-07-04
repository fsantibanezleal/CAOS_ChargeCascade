"""cclab, the offline+light engine for ChargeCascade (tumbling-mill charge motion + power draw), instantiated on the
CAOS product-repo template (ADR-0057).

The live + bake science is the dependency-free TypeScript engine (frontend/src/mill/). This Python package is the
FROZEN base: the two data contracts (mill operating-point ingestion + the artifact), the staged pipeline, the lane
gate, the manifest/trace, and the cases-by-category registry. The numpy-LIGHT pipeline reshapes the committed bake
(case-results.json, produced by the SAME TS engine the browser runs) into per-case CONTRACT-2 traces + manifests;
`--retrain` runs the heavy lane (torch -> ONNX) in cclab/science/.
"""

__version__ = "0.12.004"  # display X.XX.XXX; PEP 440 form in pyproject.toml (0.12.4)
