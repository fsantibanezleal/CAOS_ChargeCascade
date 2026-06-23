# K-ROD — Rod mill (L > D)

**Category:** mill type (the machine) · **Source of truth:** [`frontend/src/mill/cases.ts`](../../frontend/src/mill/cases.ts) (`K-ROD`) · **synthetic but physically realistic**

**Operating point:** D 3.5 × L 5.5 m · J 38 % · φc 0.65 · top media 90 mm · rod mill · charge density 5.5 t/m³ · 80 t/h.

A rod mill is **long and slim** (L > D) and charged with steel rods that grind by **line contact** along their length — so it is deliberately run **slow** (φc ≈ 0.65, the cascading edge) to keep the rods rolling in an orderly bed rather than being thrown: cataracting would tangle and break them. The high charge density (5.5 t/m³, a dense rod bed) and small diameter give a modest **≈ 738 kW** draw — the lowest of the three machine types. Rod mills are the classic coarse-grind primary, feeding a ball mill downstream.

**Validation anchor:** at the low φc 0.65 the engine classifies the regime as **cascading** (no cataract fan) with `fracCentrifuging = 0` — confirming the slow, orderly rod-bed operation the geometry demands.
