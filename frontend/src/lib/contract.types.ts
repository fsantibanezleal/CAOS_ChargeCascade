// CONTRACT 2 mirror (frontend side). MUST stay in lock-step with the Python schemas in
// data-pipeline/cclab/core/{trace.py, manifest.py}. A drift here makes `tsc` fail -> the contract is enforced at
// BUILD time (the web cannot ship reading a shape the pipeline does not produce).

export interface PowerPoint { phiC: number; phf: number; morrell: number; }

export interface Trace {
  schema: string; // "chargecascade.trace/v1"
  case_id: string;
  name: string;
  category: string;
  real_or_synthetic: string;
  expected_band: string;
  validation_anchor: string;
  operating: unknown; // the mill Operating point, the browser re-evaluates live
  nc_rpm: number;
  phi_c: number;
  regime: string;
  frac_centrifuging: number;
  shoulder_deg: number;
  toe_deg: number;
  phf_kw: number;
  p_morrell_kw: number;
  bond_w_kwh_t: number;
  charge_mass_t: number;
  power_curve: PowerPoint[];
  flags: string[];
  learned: { status: string; surrogate: Record<string, number> | null; ood: Record<string, number> | null };
}

export interface ArtifactRef {
  path: string;
  format: string;
  trace_schema: string;
  bytes: number;
}

export interface GateVerdict {
  lane: string;
  client_side: boolean;
  runtimes: string[];
  trace_bytes: number;
  run_ms_budget: number;
  trace_bytes_budget: number;
  reasons: string[];
}

export interface SharedArtifacts {
  models: Array<{ id: string; file: string; opset: number; kind: string }>;
  learned_metrics: string;
  case_results: string;
}

export interface CaseManifest {
  schema: string; // "chargecascade.manifest/v2"
  case_id: string;
  name: string;
  category: string;
  real_or_synthetic: string;
  expected_band: string;
  validation_anchor: string;
  engine: { package: string; version: string; model: string };
  seed: number;
  shared: SharedArtifacts;
  artifact: ArtifactRef;
  lane: 'live' | 'precompute';
  gate: GateVerdict;
  flags: Array<Record<string, unknown>>;
  metrics: Record<string, number | string>;
  honesty: string;
}

export interface CaseIndexEntry {
  case_id: string;
  category: string;
  manifest_path: string;
}

export interface CaseIndex {
  schema: string; // "chargecascade.index/v1"
  engine_version: string;
  n_cases: number;
  cases: CaseIndexEntry[];
}
