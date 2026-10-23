// Mode 1/2 calculation, validation order, warnings, and detail rows
// (spec section 8), ported verbatim from index.html calc(). Pure: no DOM.
import { capRpmOf, cycleTime, kfac, scallopHs } from './formulas';
import { fmt, trim } from './format';
import { rec } from './recommendations';
import type { RecInput, Tool } from './recommendations';
import { generateWarnings, type Note, type NoteLevel } from './warnings';

export type { Note, NoteLevel };

export interface DetailRow {
  k: string;
  v: string;
}

export interface CalcInput extends RecInput {
  mode: 1 | 2;
  origTool: Tool;
  z: number;
  Vc: number;
  fz: number;
  S: number;
  F: number;
  maxrpm: number;
  capPct: number;
  maxf: number;
  A: number;
  B: number;
  H: number;
  F0: number;
  Vc0: number;
  coat: string;
}

export interface CycleOut {
  N: number;
  L: number;
  t: number;
  layers: number;
  tt: number;
  t0: number | null;
  F0: number;
}

export interface CalcResult {
  ok: boolean;
  k1: string;
  v1: string;
  u1: string;
  k2: string;
  v2: string;
  u2: string;
  gcode: string;
  details: DetailRow[];
  notes: Note[];
  cycle: CycleOut | null;
}

function blank(text: string): CalcResult {
  return {
    ok: false,
    k1: '',
    v1: '—',
    u1: '',
    k2: '',
    v2: '—',
    u2: '',
    gcode: '—',
    details: [],
    notes: [{ level: 'plain', text }],
    cycle: null,
  };
}

export function calculate(inp: CalcInput): CalcResult {
  const D = inp.D;
  const z = inp.z;
  const aeu = inp.aePct;
  const tool: Tool = inp.band >= 4 ? 'sq' : inp.tool;
  if (!(D > 0 && z >= 1 && Math.floor(z) === z)) {
    return blank('กรอก D มากกว่า 0 และ z เป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป');
  }
  if (!(aeu > 0 && aeu <= 100)) {
    return blank('ae ต้องมากกว่า 0 และไม่เกินเส้นผ่านศูนย์กลางดอก (100% ของ D)');
  }
  if (tool === 'cr' && !(inp.r > 0 && inp.r <= D / 2)) {
    return blank('กรอกรัศมีมุม r มากกว่า 0 และไม่เกินครึ่งหนึ่งของ D');
  }
  if (tool !== 'sq' && !(inp.apUser > 0)) {
    return blank('ดอกบอลและดอกรัศมีมุมต้องกรอก ap เพื่อคำนวณ Deff');
  }
  const r = rec(inp);
  if (!r) return blank('กรอก D เพื่อดูค่าแนะนำ');
  const aeMM = (aeu / 100) * D;
  const kUse = kfac(aeMM / r.Dk);
  const Dref = r.Dref;
  const capRpm = capRpmOf(inp.maxrpm, inp.capPct);
  const details: DetailRow[] = [];

  let n = 0;
  let Vf = 0;
  let Vcact = 0;
  let fzact = 0;
  let ideal = 0;
  let capped = false;
  let k1 = '';
  let v1 = '';
  let u1 = '';
  let k2 = '';
  let v2 = '';
  let u2 = '';
  let gcode = '';

  if (inp.mode === 1) {
    const Vc = inp.Vc;
    const fz = inp.fz;
    if (!(Vc > 0) || !(fz > 0)) return blank('กรอก Vc และ fz ให้มากกว่า 0');
    ideal = (1000 * Vc) / (Math.PI * Dref);
    n = Math.min(ideal, capRpm);
    capped = ideal > capRpm;
    Vcact = (Math.PI * Dref * n) / 1000;
    fzact = fz;
    Vf = fz * z * n;
    k1 = 'S';
    k2 = 'F';
    v1 = fmt(Math.round(n), 0);
    u1 = 'rpm';
    v2 = fmt(Vf, 1);
    u2 = 'mm/min';
    gcode = 'S' + Math.round(n) + ' M03  F' + trim(Vf, 1);
    if (tool !== 'sq') details.push({ k: 'เส้นผ่านศูนย์กลางใช้งาน Deff', v: trim(Dref, 3) + ' mm' });
    details.push({ k: 'รอบตามสูตร (ก่อนจำกัด)', v: fmt(ideal, 0) + ' rpm' });
    details.push({
      k: tool === 'sq' ? 'Vc ที่ได้จริง' : 'Vc จริงที่จุดสัมผัส',
      v: fmt(Vcact, 1) + ' m/min',
    });
    if (tool !== 'sq') {
      details.push({ k: 'Vc ที่ขอบนอกสุดของดอก', v: fmt((Math.PI * D * n) / 1000, 1) + ' m/min' });
    }
    details.push({ k: 'fz ที่ตั้ง', v: trim(fz, 4) + ' mm/tooth' });
  } else {
    const S = inp.S;
    const F = inp.F;
    if (!(S > 0) || !(F > 0)) return blank('กรอก S และ F ให้มากกว่า 0');
    n = S;
    Vf = F;
    Vcact = (Math.PI * Dref * S) / 1000;
    fzact = F / (z * S);
    k1 = 'Vc';
    k2 = 'fz';
    v1 = fmt(Vcact, 1);
    u1 = 'm/min';
    v2 = trim(fzact, 4);
    u2 = 'mm/tooth';
    gcode = 'S' + trim(S, 0) + ' M03  F' + trim(F, 1);
    if (tool !== 'sq') details.push({ k: 'Deff (Vc คิดที่จุดสัมผัส)', v: trim(Dref, 3) + ' mm' });
    if (isFinite(capRpm)) details.push({ k: 'รอบเทียบกับเพดาน', v: fmt((S / capRpm) * 100, 0) + ' %' });
  }

  const h = fzact * r.s * kUse;
  details.push({ k: 'ความหนาเศษจริงโดยประมาณ', v: trim(h, 4) + ' mm' });
  details.push({ k: 'อัตราป้อนต่อรอบ (fz·z)', v: trim(fzact * z, 4) + ' mm/rev' });
  if (tool === 'ball') {
    const hs = scallopHs(D, aeMM);
    details.push({
      k: 'ความสูงรอยคลื่นผิว (scallop)',
      v: trim(hs * 1000, 2) + ' µm ที่ระยะก้าว ' + trim(aeMM, 3) + ' mm',
    });
  }

  const notes: Note[] = [];
  if (inp.mode === 1 && capped) {
    notes.push({
      level: '',
      text:
        'รอบตามสูตร ' + fmt(ideal, 0) + ' rpm เกินเพดาน ' + fmt(capRpm, 0) +
        ' rpm จึงลดรอบลงที่เพดาน Vc จริงเหลือ ' + fmt(Vcact, 1) + ' m/min',
    });
  } else if (inp.mode === 2 && n > capRpm) {
    notes.push({
      level: 'bad',
      text: 'รอบ S ที่กรอกเกินเพดาน ' + fmt(capRpm, 0) + ' rpm ที่โรงงานกำหนด',
    });
  }

  const generated = generateWarnings({
    r,
    tool,
    origTool: inp.origTool,
    op: inp.op,
    D,
    z,
    apu: inp.apUser,
    coat: inp.coat,
    Vc0: inp.Vc0,
    maxf: inp.maxf,
    capRpm,
    mode: inp.mode,
    capped,
    Vcact,
    Vf,
    n,
    h,
  });

  notes.push(...generated);

  const ct = cycleTime(inp.A, inp.B, inp.H, inp.apUser, aeMM, Vf, D);
  const cycle: CycleOut | null = ct
    ? {
        ...ct,
        F0: inp.F0,
        t0: inp.F0 > 0 ? ((60 * ct.L) / inp.F0) * ct.layers : null,
      }
    : null;

  return { ok: true, k1, v1, u1, k2, v2, u2, gcode, details, notes, cycle };
}
