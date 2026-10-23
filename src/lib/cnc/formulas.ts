// Frozen engineering formulas (spec sections 3-4), ported verbatim from
// index.html. No DOM imports allowed in this module.
import { BALL_TABLES, type BallOp } from '../../data/osg-ball';
import { NY_D_IN, NY_FIN_IPT, NY_SEMI_IPT } from '../../data/harvey-plastics';

// Chip-thinning factor k(r_ae): 2*sqrt(r-r^2) when r_ae < 0.5, else 1.
export function kfac(r: number): number {
  const rc = Math.min(r, 1);
  return rc >= 0.5 ? 1 : 2 * Math.sqrt(rc - rc * rc);
}

// Ball-nose effective diameter at axial depth ap.
export function ballDeff(D: number, ap: number): number {
  if (!(ap > 0)) return D;
  if (ap >= D / 2) return D;
  return 2 * Math.sqrt(ap * (D - ap));
}

// Corner-radius effective diameter + geometric scale factor s.
export function crGeom(D: number, r: number, ap: number): { Deff: number; s: number } {
  if (!(r > 0) || !(ap > 0) || ap >= r) return { Deff: D, s: 1 };
  const w = Math.sqrt(2 * r * ap - ap * ap);
  return { Deff: D - 2 * r + 2 * w, s: w / r };
}

// Overhang reduction factors (rule of thumb, not from catalog).
export function ohFac(LD: number): { v: number; f: number; lvl: number } {
  if (!(LD > 4)) return { v: 1, f: 1, lvl: 0 };
  if (LD <= 5) return { v: 0.9, f: 0.8, lvl: 1 };
  if (LD <= 6) return { v: 0.8, f: 0.65, lvl: 1 };
  if (LD <= 8) return { v: 0.7, f: 0.5, lvl: 2 };
  return { v: 0.6, f: 0.4, lvl: 2 };
}

// Nylon fz interpolation over the Harvey HAT2 chart (inch IPT values are
// stored raw and scaled to mm at the use site, exactly like index.html).
export function nyFz(arr: number[], Dmm: number): number {
  const X = NY_D_IN.map((x) => x * 25.4);
  const n = X.length;
  if (Dmm <= X[0]) return arr[0] * 25.4 * (Dmm / X[0]);
  if (Dmm >= X[n - 1]) return arr[n - 1] * 25.4 * (Dmm / X[n - 1]);
  for (let i = 0; i < n - 1; i++) {
    if (Dmm <= X[i + 1]) {
      return (arr[i] + (arr[i + 1] - arr[i]) * ((Dmm - X[i]) / (X[i + 1] - X[i]))) * 25.4;
    }
  }
  return arr[n - 1] * 25.4;
}

export function nyFinFz(Dmm: number): number {
  return nyFz(NY_FIN_IPT, Dmm);
}

export function nySemiFz(Dmm: number): number {
  return nyFz(NY_SEMI_IPT, Dmm);
}

export interface BallCatResult { Vnom: number; fz: number; ap: number; ae: number; out: boolean }
// Ball catalog linear interpolation (spec 6.2.4). Returns nominal Vc at full
// diameter, normalized fz per mm, catalog ap/ae, and out-of-range flag.
export function ballCat(b: number, D: number, op: BallOp): BallCatResult {
  const TB = BALL_TABLES[op];
  const T = TB.T;
  const DD = TB.D;
  const zz = TB.z;
  const out = D < DD[0] || D > DD[DD.length - 1];
  const at = (i: number) => {
    const rp = T[i][b][0];
    const fd = T[i][b][1];
    return { vn: (Math.PI * DD[i] * rp) / 1000, fd: ((fd * 25.4) / (zz * rp)) / DD[i] };
  };
  let v = 0;
  let f = 0;
  if (D <= DD[0]) {
    const a = at(0);
    v = a.vn;
    f = a.fd;
  } else if (D >= DD[DD.length - 1]) {
    const a = at(DD.length - 1);
    v = a.vn;
    f = a.fd;
  } else {
    for (let i = 0; i < DD.length - 1; i++) {
      if (D >= DD[i] && D <= DD[i + 1]) {
        const a = at(i);
        const c = at(i + 1);
        const t = (D - DD[i]) / (DD[i + 1] - DD[i]);
        v = a.vn + (c.vn - a.vn) * t;
        f = a.fd + (c.fd - a.fd) * t;
        break;
      }
    }
  }
  return { Vnom: v, fz: f * D, ap: TB.ap(b, D), ae: TB.ae(b, D), out };
}

// Spindle cap from machine limits: Infinity when either side is unset.
export function capRpmOf(maxrpm: number, capPct: number): number {
  return maxrpm > 0 && capPct > 0 ? (maxrpm * Math.min(capPct, 100)) / 100 : Infinity;
}

// Scallop height (mm) for ball tools at stepover aeMM.
export function scallopHs(D: number, aeMM: number): number {
  const R0 = D / 2;
  return R0 - Math.sqrt(Math.max(R0 * R0 - (aeMM / 2) * (aeMM / 2), 0));
}

export interface CycleTime {
  N: number;
  L: number;
  t: number;
  layers: number;
  tt: number;
}

// Theoretical face-milling cycle time (spec 3.7). Null when A/B missing.
export function cycleTime(
  A: number,
  B: number,
  H: number,
  ap: number,
  aeMM: number,
  Vf: number,
  D: number,
): CycleTime | null {
  if (!(A > 0 && B > 0) || !(Vf > 0)) return null;
  const step = aeMM;
  const N = Math.max(1, Math.ceil((B - D) / step) + 1);
  const L = A * N;
  const t = (60 * L) / Vf;
  const hasH = H > 0 && ap > 0;
  const layers = hasH ? Math.max(1, Math.ceil(H / ap - 1e-9)) : 1;
  return { N, L, t, layers, tt: t * layers };
}
