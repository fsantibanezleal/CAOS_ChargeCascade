# D-LOWFILL, Low fill (J = 0.20)

**Category:** fill / charge regime · **Source of truth:** [`frontend/src/mill/cases.ts`](../../frontend/src/mill/cases.ts) (`D-LOWFILL` = the base `K-BALL` mill at J 0.20) · **synthetic but physically realistic**

**Operating point:** the base 4.0 × 6.0 m ball mill (φc 0.75, 80 mm) at **J 20 %**.

The first of two snapshots that hold speed fixed and vary the **fill** J, the mass of charge in the mill. A lightly charged mill (J 20 %) sits **below the power peak**: there is less mass to lift, so the net draw is lower than the J 35 % reference. Running this lean also risks **ball-on-liner impacts** (the cataract can overshoot a low charge bed and strike the liner), which the engine flags. Useful for showing that more fill is not always less power, the relationship peaks and then falls (see `D-HIGHFILL`).

**Validation anchor:** net power **lower than at J 35 %**; the low-charge / ball-on-liner validity flag may appear (`fill < 15 %` is the hard warning; 20 % is lean but in-band).
