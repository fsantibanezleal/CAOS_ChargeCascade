# Real industrial mills (measured power) and the validation

Source of truth: [`frontend/src/mill/realmills.ts`](../../frontend/src/mill/realmills.ts) (`REAL_MILLS`), provenance
persisted in CAOS_MANAGE `wip/mining-analytics-hub/products/chargecascade/real-anchor-set-2026-07-11.md`.

The App's Real-sample lane runs the SAME engine on 22 VERIFIED industrial mills with MEASURED power draw, and
reports the model's real skill. Every row was read from a resolving open source with the table/page named:

- 19 mills from Alex Doll's open SAG-survey compilations (IMPC 2016 Paper 123 / Procemin 2013 on sagmilling.com),
  power basis PDCS (motor input): Cadia Hill 40 ft SAG (19.3 MW), Meadowbank, Fimiston KCGM, Yanacocha, LKAB KA2/KA3, Porgera, Los Bronces
  (2 lines), Inco Clarabelle (AG + SAG), Phoenix, Driefontein, St Ives, Navachab, Santa Rita, Sossego, El Soldado,
  Cyprus Bagdad. Distinct-geometry mills from the full IMPC 2016 Table 1, each per-row cited. (The Doll table's
  mine-NAME labels carry a small OCR one-line-shift risk; geometry + power + fill are read-verified.)
- 3 mills from Golpayegani & Rezai (2022) PPMP review (reproducing Rajamani et al. 2019), power basis NET:
  Constancia SAG, Constancia ball, Tongon ball.

## The validation (the novel rung)

The Hogg-Fuerstenau NET power is a first-principles charge-motion model. It is CALIBRATED to the 8 Doll motor-basis
mills (`measured = a + b * HFnet`, absorbing the average no-load + drivetrain grossing HF net does not include),
and its generalization is measured by LEAVE-ONE-OUT cross-validation: refit without each mill, predict it, report
the error. Result: mean 7.6%, R^2 0.992 on 19 motor-basis mills, comparable to the published Morrell E-model
benchmark (Doll 2013: 9.2% mean on 21 SAG surveys). The 3 PPMP mills are net-basis (HF net compared directly).

## The Morrell C-model (the independent SOTA reference)

The App also runs the REAL Morrell (1996) C-model (`mill/morrell.ts`), UNCALIBRATED, as an independent physics
model beside the calibrated HF. It reproduces the Erdem (2004) cement-mill worked example (no-load 41.94/72.35 kW
exact; charge-motion net 341.97 kW at the published density, 0.04%), which validates the full integral + the
(2*pi)^3 kinetic coefficient. Its two previously-unrecoverable terms were pinned from primary sources:
z = (1-Jt)^0.4532 (CEEC/SAG-2019, Morrell-affiliated) and the kinetic constant (2*pi)^3. On the real mills it has
a ~16.5% mean absolute error; the honest residual is the Napier-Munn charge-density packing convention (~+/-10%
loose, so Morrell tends to over-predict). The Real-validation panel shows both models against measured.

## Honesty

- The reported error is the REAL leave-one-out number on real mills; no paper accuracy is transplanted.
- Nominal / assumed values in the sources (e.g. Doll's italic diameters, the Constancia power range) are noted
  per mill in `REAL_MILLS[].note` and shown in-app.
- Morrell's full continuum C-model IS now implemented and validated against a published worked example (see above);
  the sole residual is the charge-density packing convention (~+/-10%), which is documented, not hidden.
