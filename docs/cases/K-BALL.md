# K-BALL — Ball mill (the reference)

**Category:** mill type (the machine) · **Source of truth:** [`frontend/src/mill/cases.ts`](../../frontend/src/mill/cases.ts) (`K-BALL`, the base operating point every `S-*` / `D-*` / `C-*` case overrides) · **synthetic but physically realistic**

**Operating point:** D 4.0 × L 6.0 m · J 35 % · φc 0.75 · top ball 80 mm · ball mill · charge density 4.8 t/m³ · ore Wi 14 kWh/t, F80 2000 → P80 150 µm at 120 t/h.

The canonical overflow ball mill: graded steel balls, length ≈ diameter, run at φc ≈ 0.75 so the charge **cascades with a mild cataract** — the bulk rolls down the free surface (abrasion) while the outer layer is thrown in short arcs onto the toe (impact). At this geometry the Hogg-Fuerstenau torque model draws **≈ 1.19 MW** of net charge power. It is the reference machine for the whole product: the three speed-sweep cases (`S-CASCADE/CATARACT/CENTRIFUGE`) and the two fill cases (`D-LOWFILL/HIGHFILL`) are this exact mill with one control changed, so the App's regime/power story is read against a single fixed baseline.

**Validation anchor:** critical speed `Nc = 42.3/√(D − d)` (d = ball diameter, the centre of the outer ball rides at radius (D−d)/2); net power sits inside the published Hogg-Fuerstenau band for a 4 m × 6 m mill at J 35 %.
