"""LIVE lane note. ChargeCascade's live lane is the dependency-free TypeScript engine (frontend/src/mill/) running in the
browser - the mill physics recompute on every control + the 3D viz, plus the power surrogate + OOD autoencoder via
onnxruntime-web. There is NO Python live lane (no Pyodide): this module is intentionally dormant. The offline Python
side is the two data contracts + the numpy-light replay pipeline + the torch->ONNX retrain lane only."""
from __future__ import annotations
