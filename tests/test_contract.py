"""CONTRACT 1 (ingestion) tests: good mill operating points validate; ill-formed ones are rejected with a reason; a
phiC>=1 / high-fill / large-ball case is flagged (accepted); the committed example passes."""
from pathlib import Path

from pipeline.io.contract import validate_mill, validate_records
from pipeline.io.formats import read_csv_rows


def _row(**over):
    base = {"mill_id": "m", "mill_type": "ball", "diameter_m": 4.0, "length_m": 6.0, "fill": 0.35,
            "phi_c": 0.75, "ball_top_mm": 80, "charge_density": 4.8}
    base.update(over)
    return base


def test_good_descriptor_accepted():
    rep = validate_records([_row()])
    assert rep.ok and len(rep.accepted) == 1 and not rep.rejected
    assert rep.accepted[0].diameter_m == 4.0


def test_bad_descriptors_rejected_not_coerced():
    rows = [
        _row(diameter_m=0),               # non-positive
        _row(fill=0.9),                   # fill out of range
        _row(phi_c=2.0),                  # phiC out of range
        _row(ball_top_mm=5000),           # ball >= diameter
        _row(mill_type="grinder"),        # unknown type
        _row(length_m="lots"),            # non-numeric
        {"mill_id": "x", "mill_type": "ball"},  # missing columns
    ]
    rep = validate_records(rows)
    assert len(rep.accepted) == 0 and len(rep.rejected) == len(rows)
    assert all("reason" in r for r in rep.rejected)


def test_honesty_relevant_cases_flagged():
    cent = validate_records([_row(phi_c=1.0)])
    assert cent.ok and cent.flagged and "centrifuges" in " ".join(cent.flagged[0]["flags"])
    high = validate_records([_row(fill=0.5)])
    assert high.ok and high.flagged and "45%" in " ".join(high.flagged[0]["flags"])
    low = validate_records([_row(fill=0.1)])
    assert low.ok and low.flagged and "15%" in " ".join(low.flagged[0]["flags"])


def test_validate_mill_gate():
    assert validate_mill(_row()).ok
    bad = validate_mill(_row(diameter_m=0))
    assert not bad.ok and bad.rejected


def test_committed_example_passes_contract():
    csv = Path(__file__).resolve().parents[1] / "data" / "examples" / "mills.csv"
    rep = validate_records(read_csv_rows(csv))
    assert rep.ok and not rep.rejected, f"mills.csv should pass Contract 1: {rep.summary()}"
    assert len(rep.accepted) == 10
