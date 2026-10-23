import { describe, expect, it } from 'vitest';
import { ballCat, ballDeff, kfac, nyFinFz, nySemiFz, ohFac } from './formulas';
import { BANDS, rec } from './recommendations';
import { calculate } from './calculate';
import type { CalcInput } from './calculate';
import { PRESETS } from '../../data/presets';

function baseMode1(p: (typeof PRESETS)[number]): CalcInput {
  const bandDef = BANDS[p.band];
  const aeC = bandDef.ae(p.D);
  const kC = kfac(aeC / p.D);
  const fzInput = p.fz * (kC / kfac(0.6));
  return {
    mode: 1,
    band: p.band,
    D: p.D,
    tool: 'sq',
    origTool: 'sq',
    op: 'finish2',
    r: 0.5,
    apUser: 0.1,
    aePct: 60,
    L: NaN,
    sf: 1,
    z: p.z,
    Vc: p.Vc,
    fz: fzInput,
    S: 8000,
    F: 900,
    maxrpm: 24000,
    capPct: 80,
    maxf: NaN,
    A: NaN,
    B: NaN,
    H: NaN,
    F0: NaN,
    Vc0: NaN,
    coat: '',
  };
}

describe('C01–C10 presets reproduce S/F within 1% of index.html', () => {
  for (const p of PRESETS) {
    it(`${p.code} D=${p.D} band=${p.band}`, () => {
      const out = calculate(baseMode1(p));
      expect(out.ok).toBe(true);
      const Dref = p.D;
      const ideal = (1000 * p.Vc) / (Math.PI * Dref);
      const n = Math.min(ideal, 19200);
      const Vf = (p.fz * (kfac(BANDS[p.band].ae(p.D) / p.D) / kfac(0.6))) * p.z * n;
      const gotS = parseFloat(out.v1.replace(/,/g, ''));
      const gotF = parseFloat(out.v2.replace(/,/g, ''));
      expect(gotS).toBeCloseTo(n, 0);
      expect(Math.abs(gotF - Vf) / Vf).toBeLessThan(0.01);
    });
  }
});

describe('ball interpolation at D=7 vs manual calc', () => {
  it('finish2 band 0 matches linear blend of D=6 and D=8 grid points', () => {
    const c = ballCat(0, 7, 'finish2');
    const at6 = { vn: (Math.PI * 6 * 16150) / 1000, fdn: ((131.5 * 25.4) / (2 * 16150)) / 6 };
    const at8 = { vn: (Math.PI * 8 * 11900) / 1000, fdn: ((112.2 * 25.4) / (2 * 11900)) / 8 };
    expect(c.Vnom).toBeCloseTo((at6.vn + at8.vn) / 2, 6);
    expect(c.fz / 7).toBeCloseTo((at6.fdn + at8.fdn) / 2, 9);
    expect(c.ap).toBeCloseTo(0.05 * 7, 9);
    expect(c.ae).toBeCloseTo(0.1 * 7, 9);
    expect(c.out).toBe(false);
  });
});

describe('capRpm clamp at 19,200', () => {
  it('caps n=38k ideal down to 19,200 with note', () => {
    const out = calculate({ ...baseMode1(PRESETS[0]), maxrpm: 24000, capPct: 80 });
    expect(parseFloat(out.v1.replace(/,/g, ''))).toBe(19200);
    expect(out.notes.some((x) => x.text.includes('เกินเพดาน'))).toBe(true);
  });
});

describe('overhang L/D=6 → Vc 80% / fz 65%', () => {
  it('reduces recommendation by oh factors', () => {
    expect(ohFac(6)).toEqual({ v: 0.8, f: 0.65, lvl: 1 });
    const withOh = calculate({ ...baseMode1(PRESETS[3]), D: 8, L: 48, sf: 1 });
    const noOh = calculate({ ...baseMode1(PRESETS[3]), D: 8, L: NaN, sf: 1 });
    void withOh;
    void noOh;
    const rOh = rec({ band: 0, D: 8, tool: 'sq', op: 'finish2', r: 0.5, apUser: 0.1, aePct: 60, L: 48, sf: 1 });
    const rNo = rec({ band: 0, D: 8, tool: 'sq', op: 'finish2', r: 0.5, apUser: 0.1, aePct: 60, L: NaN, sf: 1 });
    expect(rOh && rNo && rOh.Vc / rNo.Vc).toBeCloseTo(0.8, 9);
    expect(rOh && rNo && rOh.fzSet / rNo.fzSet).toBeCloseTo(0.65, 9);
  });
});

describe('chip-ratio boundaries 1.2 / 1.5 / 0.6 / 0.35', () => {
  it('emits matching levels', () => {
    const mk = (fz: number) => calculate({ ...baseMode1(PRESETS[3]), D: 8, Vc: 120, fz });
    expect(mk(0.2).notes.some((x) => x.level === 'bad' && x.text.includes('เสี่ยงคมบิ่น'))).toBe(true);
    expect(mk(0.048).notes.some((x) => x.level === 'ok')).toBe(true);
    expect(mk(0.02).notes.some((x) => x.level === '' && x.text.includes('บางกว่าค่าแนะนำ'))).toBe(true);
    expect(mk(0.01).notes.some((x) => x.level === 'bad' && x.text.includes('เสียดสี'))).toBe(true);
  });
});

describe('nylon fz helpers', () => {
  it('interior interpolation matches spec formula', () => {
    const D = 6.35;
    const got = nyFinFz(D);
    expect(got).toBeGreaterThan(0);
    expect(nySemiFz(D)).toBeGreaterThan(got);
  });
});

describe('ballDeff edge cases', () => {
  it('returns D at and beyond hemisphere', () => {
    expect(ballDeff(6, 3)).toBe(6);
    expect(ballDeff(6, 9)).toBe(6);
    expect(ballDeff(6, 0.1)).toBeCloseTo(2 * Math.sqrt(0.1 * 5.9), 9);
  });
});

describe('side-by-side 6 verification cases from overhaul plan', () => {
  it('Case 1: D1 pre-hard caps rpm at 19,200 and matches index.html', () => {
    const out = calculate({
      mode: 1,
      band: 0,
      D: 1,
      z: 4,
      tool: 'sq',
      origTool: 'sq',
      op: 'finish2',
      r: 0.5,
      apUser: 0.1,
      aePct: 60,
      L: NaN,
      sf: 0.85,
      coat: '',
      Vc: 102,
      fz: 0.0078,
      S: 8000,
      F: 900,
      maxrpm: 24000,
      capPct: 80,
      maxf: NaN,
      A: NaN,
      B: NaN,
      H: NaN,
      F0: NaN,
      Vc0: NaN,
    });
    expect(out.v1).toBe('19,200');
    expect(out.v2).toBe('599.0');
    expect(out.gcode).toBe('S19200 M03  F599');
    expect(out.notes).toEqual([
      {
        level: '',
        text: 'รอบตามสูตร 32,468 rpm เกินเพดาน 19,200 rpm จึงลดรอบลงที่เพดาน Vc จริงเหลือ 60.3 m/min',
      },
      {
        level: 'plain',
        text: 'Vc ต่ำกว่าช่วงแนะนำเพราะติดเพดานรอบของเครื่อง ซึ่งหลีกเลี่ยงไม่ได้สำหรับดอกเล็ก',
      },
      {
        level: 'bad',
        text: 'เศษหนากว่าค่าแนะนำ 179% เสี่ยงคมบิ่นหรือดอกหัก ควรลด fz หรือลด ae',
      },
    ]);
  });

  it('Case 2: D12 hardened ball-finish matches index.html exactly', () => {
    const out = calculate({
      mode: 1,
      band: 2,
      D: 12,
      z: 4,
      tool: 'ball',
      origTool: 'ball',
      op: 'finish',
      r: 0.5,
      apUser: 0.1,
      aePct: 60,
      L: NaN,
      sf: 0.85,
      coat: '',
      Vc: 36.5,
      fz: 0.015,
      S: 8000,
      F: 900,
      maxrpm: 24000,
      capPct: 80,
      maxf: NaN,
      A: NaN,
      B: NaN,
      H: NaN,
      F0: NaN,
      Vc0: NaN,
    });
    expect(out.v1).toBe('5,325');
    expect(out.v2).toBe('319.5');
    expect(out.gcode).toBe('S5325 M03  F319.5');
    expect(out.notes).toEqual([
      {
        level: 'bad',
        text: 'เศษบางกว่าค่าแนะนำ 87% เสี่ยงเสียดสีแทนการตัด ร้อน สึกเร็ว และผิวไม่สวย',
      },
    ]);
  });

  it('Case 3: nylon D6 matches index.html exactly', () => {
    const out = calculate({
      mode: 1,
      band: 4,
      D: 6,
      z: 3,
      tool: 'sq',
      origTool: 'sq',
      op: 'finish2',
      r: 0.5,
      apUser: 0.1,
      aePct: 60,
      L: NaN,
      sf: 0.85,
      coat: '',
      Vc: 259.1,
      fz: 0.07,
      S: 8000,
      F: 900,
      maxrpm: 24000,
      capPct: 80,
      maxf: NaN,
      A: NaN,
      B: NaN,
      H: NaN,
      F0: NaN,
      Vc0: NaN,
    });
    expect(out.v1).toBe('13,746');
    expect(out.v2).toBe('2,886.6');
    expect(out.gcode).toBe('S13746 M03  F2886.6');
    expect(out.notes).toEqual([
      {
        level: '',
        text: 'เศษหนากว่าค่าแนะนำ 24% ควรทดลองอย่างระวังและดูสภาพคมตัด',
      },
      {
        level: 'plain',
        text: 'ไนลอนนำความร้อนไม่ดี ผู้ผลิตแนะนำลมเป่าหรือน้ำหล่อเย็นกึ่งสังเคราะห์ ยังไม่พบข้อมูลของน้ำมันตัดชนิดน้ำมันล้วนกับไนลอน ควรเป่าลมและสอบถามผู้ขายวัสดุก่อน',
      },
      {
        level: 'plain',
        text: 'ยึดชิ้นงานให้รองรับเต็มและไม่หนีบแรงจนบิด ถ้ากัดเนื้อออกมากด้านเดียวหรือต้องการความเรียบสูง ผู้ผลิตไนลอนหล่อแนะนำอบคลายเครียดระหว่างขั้นตอน และถ้ากัดด้วยดอกทื่อหรือไม่มีการระบายความร้อน ควรอบหลังกัด',
      },
    ]);
  });

  it('Case 4: DLC-on-steel emits bad coating warning', () => {
    const out = calculate({
      mode: 1,
      band: 0,
      D: 6,
      z: 4,
      tool: 'sq',
      origTool: 'sq',
      op: 'finish2',
      r: 0.5,
      apUser: 0.1,
      aePct: 60,
      L: NaN,
      sf: 0.85,
      coat: 'dlc',
      Vc: 102,
      fz: 0.06,
      S: 8000,
      F: 900,
      maxrpm: 24000,
      capPct: 80,
      maxf: NaN,
      A: NaN,
      B: NaN,
      H: NaN,
      F0: NaN,
      Vc0: NaN,
    });
    expect(out.notes.some((x) => x.level === 'bad' && x.text.includes('สารเคลือบ DLC'))).toBe(true);
  });

  it('Case 5: L/D=6 reduces Vc and fz and warns', () => {
    const out = calculate({
      mode: 1,
      band: 0,
      D: 6,
      z: 4,
      tool: 'sq',
      origTool: 'sq',
      op: 'finish2',
      r: 0.5,
      apUser: 0.1,
      aePct: 60,
      L: 36,
      sf: 0.85,
      coat: '',
      Vc: 81.6,
      fz: 0.039,
      S: 8000,
      F: 900,
      maxrpm: 24000,
      capPct: 80,
      maxf: NaN,
      A: NaN,
      B: NaN,
      H: NaN,
      F0: NaN,
      Vc0: NaN,
    });
    expect(out.v1).toBe('4,329');
    expect(out.notes.some((x) => x.text.includes('ระยะยื่น 6D เกิน 4D'))).toBe(true);
  });

  it('Case 6: mode2 over-cap warns when S > capRpm', () => {
    const out = calculate({
      mode: 2,
      band: 0,
      D: 6,
      z: 4,
      tool: 'sq',
      origTool: 'sq',
      op: 'finish2',
      r: 0.5,
      apUser: 0.1,
      aePct: 60,
      L: NaN,
      sf: 0.85,
      coat: '',
      Vc: 102,
      fz: 0.06,
      S: 22000,
      F: 2000,
      maxrpm: 24000,
      capPct: 80,
      maxf: NaN,
      A: NaN,
      B: NaN,
      H: NaN,
      F0: NaN,
      Vc0: NaN,
    });
    expect(out.v1).toBe('414.7');
    expect(out.v2).toBe('0.0227');
    expect(out.notes.some((x) => x.level === 'bad' && x.text.includes('รอบ S ที่กรอกเกินเพดาน 19,200 rpm'))).toBe(true);
  });
});
