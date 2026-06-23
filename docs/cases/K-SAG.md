# K-SAG — SAG mill (large D, short L)

**Category:** mill type (the machine) · **Source of truth:** [`frontend/src/mill/cases.ts`](../../frontend/src/mill/cases.ts) (`K-SAG`) · **synthetic but physically realistic**

**Operating point:** D 10.0 × L 5.0 m · J 28 % · φc 0.78 · top ball 125 mm · sag mill · charge density 3.0 t/m³ · F80 100 000 → P80 2000 µm at 2000 t/h.

A semi-autogenous mill is a large-diameter "pancake" (D ≫ L) charged with a few large balls **plus the ore itself as media**, so its bulk charge density (3.0 t/m³) sits below a ball mill's (4.8) — mostly rock, some steel. Run at φc ≈ 0.78 it **cataracts**: the big media are thrown high and impact-break coarse feed (F80 ≈ 100 mm) down to a transfer size. Because charge power scales steeply with diameter, the 10 m mill draws **≈ 6.11 MW** — by far the most of any case, and the reason SAG mills dominate a concentrator's power bill.

**Validation anchor:** net power scales as ≈ D^2.5–D^3.5 (the Hogg-Fuerstenau diameter dependence), giving multi-MW on the 10 m mill — in the SAGMILLING / Doll published ballpark for this geometry.
