// Hardness bands 0-5 + catalog recommendation flow rec() (spec sections
// 5.2, 6, 3.5), ported verbatim from index.html. Pure: no DOM.
import {
  ballCat,
  ballDeff,
  crGeom,
  kfac,
  nyFinFz,
  nySemiFz,
  ohFac,
  type BallCatResult,
} from './formulas';
import type { BallOp } from '../../data/osg-ball';
import { fmt, trim } from './format';

export type Tool = 'sq' | 'cr' | 'ball';

export interface BandDef {
  name: string;
  plastic?: boolean;
  vmin: number;
  vmax: number;
  vmid: number;
  pct: number | ((D: number) => number);
  ap: number;
  ae: (D: number) => number;
  aemax: string;
}

const bandAe0 = (D: number) => {
  const r = D <= 1.5 ? 0.02 : D <= 2.5 ? 0.05 : 0.1;
  return Math.min(r * D, 1.0);
};

export const BANDS: BandDef[] = [
  { name: 'ไม่เกิน 45 HRC', vmin: 109.7, vmax: 129.5, vmid: 120, pct: 0.01, ap: 1.5, ae: bandAe0, aemax: '1 mm' },
  { name: '45–55 HRC', vmin: 79.2, vmax: 100.6, vmid: 90, pct: 0.01, ap: 1.5, ae: (D) => Math.min(0.05 * D, 1.0), aemax: '1 mm' },
  { name: '55–62 HRC', vmin: 59.4, vmax: 79.2, vmid: 70, pct: 0.007, ap: 1.5, ae: (D) => Math.min(0.03 * D, 0.5), aemax: '0.5 mm' },
  { name: '62–66 HRC', vmin: 50.3, vmax: 70.1, vmid: 60, pct: 0.006, ap: 1.0, ae: (D) => Math.min(0.02 * D, 0.5), aemax: '0.5 mm' },
  {
    name: 'Nylon / พลาสติกไม่เติมสาร · เก็บผิว',
    plastic: true,
    vmin: 243.8,
    vmax: 365.8,
    vmid: 304.8,
    pct: (D) => nyFinFz(D) / D,
    ap: 3,
    ae: (D) => 0.1 * D,
    aemax: '—',
  },
  {
    name: 'Nylon / พลาสติกไม่เติมสาร · กึ่งหยาบ',
    plastic: true,
    vmin: 243.8,
    vmax: 365.8,
    vmid: 304.8,
    pct: (D) => nySemiFz(D) / D,
    ap: 1,
    ae: (D) => 0.35 * D,
    aemax: '—',
  },
];

export interface RecInput {
  band: number;
  D: number;
  tool: Tool;
  op: BallOp;
  r: number;
  apUser: number;
  aePct: number;
  L: number;
  sf: number;
}

export interface Rec {
  band: BandDef;
  bi: number;
  D: number;
  tool: Tool;
  Vc: number;
  fzSet: number;
  hRec: number;
  Dref: number;
  s: number;
  Dk: number;
  cap2: boolean;
  vmin: number;
  vmax: number;
  out: boolean;
  range: string;
  oh: { v: number; f: number; lvl: number };
  LD: number;
  catFz: number;
  catAp: number;
  catAe: number;
  catPctDisplay: string;
}

// Catalog recommendation flow (index.html rec()). Returns null when D
// is not positive. Nylon bands force tool='sq' (no ball/CR reference).
export function rec(inp: RecInput): Rec | null {
  const bi = inp.band;
  const b = BANDS[bi];
  const D = inp.D;
  if (!(D > 0)) return null;
  const tool: Tool = bi >= 4 ? 'sq' : inp.tool;
  const L = inp.L;
  const LD = L > 0 ? L / D : NaN;
  const oh = ohFac(LD);
  const sf = inp.sf || 1;
  const vf = Math.min(oh.v, sf);
  const aeU = inp.aePct > 0 ? (inp.aePct / 100) * D : 0.6 * D;

  if (tool === 'ball') {
    const c = ballCat(bi, D, inp.op);
    return ballRec(b, bi, D, inp, aeU, oh, LD, vf, c);
  }
  return flatRec(b, bi, D, tool, inp, aeU, oh, LD, vf);
}

function ballRec(
  b: BandDef,
  bi: number,
  D: number,
  inp: RecInput,
  aeU: number,
  oh: { v: number; f: number; lvl: number },
  LD: number,
  vf: number,
  c: BallCatResult,
): Rec {
  const DeffC = ballDeff(D, c.ap);
  const DeffU = ballDeff(D, inp.apUser);
  const VeffC = (c.Vnom * DeffC) / D;
  const hC = c.fz * (DeffC / D) * kfac(c.ae / DeffC);
  const sU = DeffU / D;
  const kU = kfac(aeU / DeffU);
  let fz = hC / (sU * kU);
  let cap2 = false;
  if (fz > 2 * c.fz) {
    fz = 2 * c.fz;
    cap2 = true;
  }
  return {
    band: b,
    bi,
    D,
    tool: 'ball',
    Vc: VeffC * vf,
    fzSet: fz * oh.f,
    hRec: hC * oh.f,
    Dref: DeffU,
    s: sU,
    Dk: DeffU,
    cap2,
    vmin: VeffC * 0.7 * vf,
    vmax: VeffC * 1.3 * oh.v,
    out: c.out,
    range: '',
    oh,
    LD,
    catFz: c.fz,
    catAp: c.ap,
    catAe: c.ae,
    catPctDisplay: '',
  };
}

function flatRec(
  b: BandDef,
  bi: number,
  D: number,
  tool: Tool,
  inp: RecInput,
  aeU: number,
  oh: { v: number; f: number; lvl: number },
  LD: number,
  vf: number,
): Rec {
  const aeC = b.ae(D);
  const pctVal = typeof b.pct === 'function' ? b.pct(D) : b.pct;
  const fzC = pctVal * D;
  const hC = fzC * kfac(aeC / D);
  const g = tool === 'cr' ? crGeom(D, inp.r, inp.apUser) : { Deff: D, s: 1 };
  const kU = kfac(aeU / D);
  let fz = hC / (g.s * kU);
  let cap2 = false;
  if (fz > ((2 * fzC * kfac(aeC / D)) / kU) && g.s < 1) {
    fz = (2 * fzC * kfac(aeC / D)) / kU;
    cap2 = true;
  }
  return {
    band: b,
    bi,
    D,
    tool,
    Vc: b.vmid * vf,
    fzSet: fz * oh.f,
    hRec: hC * oh.f,
    Dref: g.Deff,
    s: g.s,
    Dk: D,
    cap2,
    vmin: b.vmin * vf,
    vmax: b.vmax * oh.v,
    out: bi >= 4 ? D < 0.4 || D > 25.4 : D < 1 || D > 20,
    range: '',
    oh,
    LD,
    catFz: fzC,
    catAp: b.ap * D,
    catAe: aeC,
    catPctDisplay: typeof b.pct === 'function' ? trim(pctVal * 100, 2) : (b.pct * 100).toFixed(1),
  };
}

// Thai catalog-condition line shown under the inputs (index.html info).
export function recInfo(r: Rec, inp: RecInput): string {
  const b = r.band;
  const D = r.D;
  let info: string;
  if (r.tool === 'ball') {
    const c = ballCat(r.bi, D, inp.op);
    const DeffC = ballDeff(D, c.ap);
    const DeffU = ballDeff(D, inp.apUser);
    const VeffC = (c.Vnom * DeffC) / D;
    info =
      'เงื่อนไข OSG (' + inp.op + '): fz ' + trim(c.fz, 4) + ' mm/tooth ที่ ap ' +
      trim(c.ap, 3) + ' mm และ ae ' + trim(c.ae, 3) + ' mm · Deff ที่ ap ตาราง = ' +
      trim(DeffC, 2) + ' mm (Vc ที่จุดสัมผัส ' + trim(VeffC, 1) + ' m/min) · Deff ที่ ap ของคุณ = ' +
      trim(DeffU, 2) + ' mm · ช่วง Vc แนะนำ ±30%';
  } else if (r.bi >= 4) {
    info =
      'เงื่อนไข Harvey Tool (ดอกพลาสติก 3 ฟัน ไม่เคลือบ) (' + b.name + '): fz ' +
      trim(r.catFz, 4) + ' mm/tooth ที่ ap ' + b.ap + 'D (' + trim(b.ap * D, 2) +
      ' mm) และ ae ' + trim(r.catAe, 3) + ' mm · ความหนาเศษอ้างอิง ' + trim(r.hRec / r.oh.f, 4) + ' mm';
  } else {
    info =
      'เงื่อนไขตาราง OSG AE-MS-H' + (r.tool === 'cr' ? ' / AE-CR-MS-H' : '') + ' (' + b.name + '): fz ' +
      trim(r.catFz, 4) + ' mm/tooth ที่ ap ' + b.ap + 'D (' + trim(b.ap * D, 2) +
      ' mm) และ ae ' + trim(r.catAe, 3) + ' mm · ความหนาเศษอ้างอิง ' + trim(r.hRec / r.oh.f, 4) + ' mm';
    if (r.tool === 'cr') info += ' · Deff ที่ ap ของคุณ = ' + trim(r.Dref, 2) + ' mm';
  }
  if (r.oh.lvl > 0) info += ' · ระยะยื่น ' + trim(r.LD, 1) + 'D ลดค่าแนะนำ fz เหลือ ' + Math.round(r.oh.f * 100) + '%';
  const sf = inp.sf || 1;
  if (sf < 1 || r.oh.lvl > 0) {
    info += ' · Vc แนะนำใช้ ' + Math.round(Math.min(r.oh.v, sf) * 100) + '% ของตาราง';
  }
  void fmt;
  return info;
}
