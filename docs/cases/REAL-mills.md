# Real industrial mills (measured power) and the validation

Source of truth: [`frontend/src/mill/realmills.ts`](../../frontend/src/mill/realmills.ts) (`REAL_MILLS`), provenance
persisted in CAOS_MANAGE `wip/mining-analytics-hub/products/chargecascade/real-anchor-set-2026-07-11.md`.

The App's Real-sample lane runs the SAME engine on 11 VERIFIED industrial mills with MEASURED power draw, and
reports the model's real skill. Every row was read from a resolving open source with the table/page named:

- 8 mills from Alex Doll's open SAG-survey compilations (IMPC 2016 Paper 123 / Procemin 2013 on sagmilling.com),
  power basis PDCS (motor input): Cadia Hill 40 ft SAG (19.3 MW), Meadowbank, Fimiston KCGM, Yanacocha, LKAB KA2
  autogenous, Porgera, Los Bronces Confluencia, Inco Clarabelle autogenous.
- 3 mills from Golpayegani & Rezai (2022) PPMP review (reproducing Rajamani et al. 2019), power basis NET:
  Constancia SAG, Constancia ball, Tongon ball.

## The validation (the novel rung)

The Hogg-Fuerstenau NET power is a first-principles charge-motion model. It is CALIBRATED to the 8 Doll motor-basis
mills (`measured = a + b * HFnet`, absorbing the average no-load + drivetrain grossing HF net does not include),
and its generalization is measured by LEAVE-ONE-OUT cross-validation: refit without each mill, predict it, report
the error. Result: mean 7.8%, max 17%, R^2 0.994, +-1.1 MW (1.96 sigma) prediction band, comparable to the
published Morrell E-model benchmark (Doll 2013: 9.2% mean on 21 SAG surveys). The 3 PPMP mills are net-basis, so
HF net is compared to them directly.

## Honesty

- The reported error is the REAL leave-one-out number on real mills; no paper accuracy is transplanted.
- Nominal / assumed values in the sources (e.g. Doll's italic diameters, the Constancia power range) are noted
  per mill in `REAL_MILLS[].note` and shown in-app.
- Morrell's full continuum C-model is NOT implemented: the Z packing function and the kinetic-energy coefficient
  are OCR-degraded/unrecoverable in every open source and need the Napier-Munn (1996) textbook. That remains the
  documented upgrade; the App does not ship a fabricated model to stand in for it.
