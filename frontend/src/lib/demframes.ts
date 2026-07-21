// Decoder for the `chargecascade.demframes/v1` baked DEM charge-motion artifact (Unit 7). Real DEM is computed
// OFFLINE by the milldem thin-3D-slab engine (data-pipeline/cclab/dem) and only the per-frame particle positions are
// shipped and replayed here; a browser cannot run DEM time-integration (Govender 2015: 4 M particles = 1.16 h per
// simulated second on a GPU). See the viz dossier and docs/frameworks/02_viz.md.
//
// The bake is a thin axial slab with periodic axial boundaries. The full-length mill charge is statistically
// identical in every axial slab of thickness w (that is what the periodic boundary asserts), so the render TILES the
// slab `tiles = round(L / w)` times along the axis, each tile at a different time-phase (the motion is stationary, so
// showing tiles at different cycle phases is physically valid and removes visual lockstep). Positions are Uint16,
// quantized to the mill AABB (x,y in [-R,R], z in [0,w)); per-particle speed for colour is derived from frame deltas.
//
// Binary layout (little-endian):
//   [4]  magic 'CDM1'
//   [4]  uint32 headerLen
//   [headerLen] UTF-8 JSON header (DemFramesHeader)
//   [N]  uint8  sizeClass (0..3, static)
//   [F*N*3] uint16 body, frame-major then particle then xyz

export interface DemFramesHeader {
  schema: 'chargecascade.demframes/v1';
  caseId: string;
  N: number; F: number; fps: number; quant: 16;
  aabb: { min: [number, number, number]; max: [number, number, number] };
  tiles: number; slabThicknessM: number; lengthM: number;
  radiusM: number; ballDiameterM: number;
  dt_sim: number; revsCovered: number; sizeClassBytes: number;
  engine: string; engineVersion: string;
  bytes?: number;
}

export interface DemFrames {
  header: DemFramesHeader;
  sizeClass: Uint8Array;               // [N] static size class 0..3
  /** Decode slab frame `f` into `out` (length N*3, metres, xyz interleaved). Reuse one scratch array across frames. */
  readFrame(f: number, out: Float32Array): void;
  /** Per-tile time-phase offset in frames, so axial tiles are not in lockstep (physically valid: stationary motion). */
  tilePhase(tileIndex: number): number;
}

const MAGIC = 0x314d4443; // 'CDM1' little-endian

export function decodeDemFrames(buf: ArrayBuffer): DemFrames {
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== MAGIC) throw new Error('demframes: bad magic');
  const headerLen = dv.getUint32(4, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, headerLen))) as DemFramesHeader;
  const { N, F } = header;
  let off = 8 + headerLen;
  const sizeClass = new Uint8Array(buf, off, N);
  off += N;
  // `off` (8 + headerLen + N) is not guaranteed 2-byte aligned, and `new Uint16Array(buf, off, ...)` REQUIRES a
  // multiple-of-2 byte offset (else RangeError). Slice into a fresh 0-aligned buffer so the view is always valid.
  const body = new Uint16Array(buf.slice(off, off + F * N * 3 * 2));

  const lo = header.aabb.min;
  const hi = header.aabb.max;
  const sx = (hi[0] - lo[0] || 1) / 65535, sy = (hi[1] - lo[1] || 1) / 65535, sz = (hi[2] - lo[2] || 1) / 65535;

  const readFrame = (f: number, out: Float32Array): void => {
    const fi = ((f % F) + F) % F;
    let b = fi * N * 3;
    for (let i = 0; i < N; i++) {
      const o = i * 3;
      out[o] = lo[0] + body[b++] * sx;
      out[o + 1] = lo[1] + body[b++] * sy;
      out[o + 2] = lo[2] + body[b++] * sz;
    }
  };

  // spread the tiles evenly across the frame cycle
  const phaseStep = header.tiles > 1 ? Math.max(1, Math.floor(F / header.tiles)) : 0;
  const tilePhase = (t: number): number => (t * phaseStep) % F;

  return { header, sizeClass, readFrame, tilePhase };
}

export async function fetchDemFrames(caseId: string, baseUrl: string): Promise<DemFrames | null> {
  const url = `${baseUrl}data/dem/${caseId}.demframes.bin`;
  const r = await fetch(url);
  if (!r.ok) return null;
  return decodeDemFrames(await r.arrayBuffer());
}

export interface DemPower {
  schema: string; net_power_kw: number; arm_m: number; n_particles: number;
  power_series_kw: number[]; impact_ke_hist: { counts: number[]; edges_j: number[] };
}
export interface DemOutline {
  schema: string; nr: number; nth: number; r_range: [number, number]; theta_range_deg: [number, number];
  occupancy: number[][]; toe_deg: number; shoulder_deg: number; note: string;
}
export interface DemPowerGrid {
  schema: string; ref_mill: { diameter_m: number; length_m: number; ball_diameter_m: number; charge_density_bulk: number };
  phi_c_nodes: number[]; fill_nodes: number[]; power_kw: number[][]; engine: string; engineVersion: string; sim_time_s: number; note: string;
}

async function tryJSON<T>(url: string): Promise<T | null> {
  const r = await fetch(url);
  if (!r.ok) return null;
  return (await r.json()) as T;
}
export const fetchDemPower = (caseId: string, base: string) => tryJSON<DemPower>(`${base}data/dem/${caseId}.power.json`);
export const fetchDemOutline = (caseId: string, base: string) => tryJSON<DemOutline>(`${base}data/dem/${caseId}.outline.json`);
export const fetchDemPowerGrid = (base: string) => tryJSON<DemPowerGrid>(`${base}data/dem/power-grid.json`);
