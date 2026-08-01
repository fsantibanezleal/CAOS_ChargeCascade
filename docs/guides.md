# Guides

Operational guides for ChargeCascade, the interactive 3D tumbling-mill (SAG / ball / rod) charge-motion + power
workbench. The live physics is the TypeScript mill engine (`frontend/src/mill/`); the offline side is the Python
package `pipeline` (the two data contracts + the staged replay pipeline + the torch→ONNX retrain lane).

- [00, how this product was instantiated from the archetype](guides/00_instantiate.md)
- [01, run the precompute / retrain pipeline](guides/01_precompute-pipeline.md)
- [02, bring your own mill operating point](guides/02_bring-your-own-data.md)
- [03, the GPU lane (and why you don't need it at the shipped scale)](guides/03_gpu-lane.md)
- [04, run the API (only if the dormant `app/` is activated)](guides/04_run-the-api.md)
- [05, the in-app Architecture / "How it works" modal (ADR-0058)](guides/05_architecture-modal.md)
