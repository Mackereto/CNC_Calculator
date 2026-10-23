// Warning and advisory rules (spec sections 5.2, 8.4-8.7), ported verbatim
// from index.html calc(). Pure: no DOM.
import { BALL_TABLES, type BallOp } from '../../data/osg-ball';
import { fmt, trim } from './format';
import type { Rec, Tool } from './recommendations';

export type NoteLevel = '' | 'bad' | 'ok' | 'plain';

export interface Note {
  level: NoteLevel;
  text: string;
}

export interface WarningsInput {
  r: Rec;
  tool: Tool;
  origTool: Tool;
  op: BallOp;
  D: number;
  z: number;
  apu: number;
  coat: string;
  Vc0: number;
  maxf: number;
  capRpm: number;
  mode: 1 | 2;
  capped: boolean;
  Vcact: number;
  Vf: number;
  n: number;
  h: number;
}

function ballRange(op: BallOp): string {
  const DD = BALL_TABLES[op].D;
  return trim(DD[0], 1) + '–' + trim(DD[DD.length - 1], 1);
}

export function generateWarnings(inp: WarningsInput): Note[] {
  const {
    r,
    tool,
    origTool,
    op,
    D,
    z,
    apu,
    coat,
    Vc0,
    maxf,
    capRpm,
    mode,
    capped,
    Vcact,
    Vf,
    n,
    h,
  } = inp;

  const notes: Note[] = [];
  const push = (text: string, level: NoteLevel = '') => notes.push({ level, text });

  if (r.out) {
    push(
      'ดอก ' + trim(D, 2) + ' mm อยู่นอกช่วงตาราง ' +
        (r.bi >= 4 ? 'Harvey Tool (0.4–25.4' : 'OSG (' + (tool === 'ball' ? ballRange(op) : '1–20') + '') +
        ' mm) ค่าแนะนำคำนวณต่อจากขนาดที่ใกล้ที่สุด ควรทดลองอย่างระวัง',
    );
  }
  if (r.bi >= 4 && origTool !== 'sq') {
    push('ยังไม่มีค่าอ้างอิงดอกบอลหรือดอกรัศมีมุมสำหรับไนลอน ระบบคำนวณเหมือนดอกปลายเรียบ', 'plain');
  }
  if (r.bi >= 4 && z >= 4) {
    push(
      'ดอก ' + z + ' ฟัน ร่องคายเศษแคบ เศษไนลอนยาวเหนียวอุดและละลายติดดอกง่าย ค่าแนะนำอิงดอกพลาสติก 3 ฟันไม่เคลือบของ Harvey Tool ถ้าเป็นไปได้ใช้ดอก 2–3 ฟัน ถ้าต้องใช้ 4 ฟัน ให้เริ่มที่ fz ต่ำ ใช้ดอกคม เป่าลมไล่เศษตลอด และอย่าให้ดอกถูไถโดยไม่กินเนื้อ',
    );
  }

  let warnedVc = false;
  if (Vcact > r.vmax * 1.15) {
    push(
      'Vc ' + fmt(Vcact, 1) + ' m/min สูงกว่าช่วงแนะนำ (' + trim(r.vmin, 1) + '–' + trim(r.vmax, 1) +
        ') เกิน 15% เสี่ยงคมตัดร้อนและสึกเร็วมาก',
      'bad',
    );
    warnedVc = true;
  } else if (Vcact > r.vmax + 0.05) {
    push(
      'Vc ' + fmt(Vcact, 1) + ' m/min สูงกว่าช่วงแนะนำ (' + trim(r.vmin, 1) + '–' + trim(r.vmax, 1) +
        ') อาจทำให้ดอกสึกเร็วขึ้น',
    );
    warnedVc = true;
  } else if (Vcact < r.vmin - 0.05 && !capped) {
    push(
      'Vc ' + fmt(Vcact, 1) + ' m/min ต่ำกว่าช่วงแนะนำ (' + trim(r.vmin, 1) + '–' + trim(r.vmax, 1) +
        ') งานจะช้ากว่าที่ควร',
    );
    warnedVc = true;
  } else if (Vcact < r.vmin - 0.05 && capped) {
    push(
      'Vc ต่ำกว่าช่วงแนะนำเพราะติดเพดานรอบของเครื่อง' +
        (tool === 'sq' ? ' ซึ่งหลีกเลี่ยงไม่ได้สำหรับดอกเล็ก' : ' เมื่อกัดตื้นด้วยดอกบอลหรือรัศมีมุม Deff เล็ก จึงต้องใช้รอบสูง'),
      'plain',
    );
    warnedVc = true;
  }

  const ratio = h / r.hRec;
  const pct = Math.round((ratio - 1) * 100);
  if (ratio > 1.5) {
    push('เศษหนากว่าค่าแนะนำ ' + pct + '% เสี่ยงคมบิ่นหรือดอกหัก ควรลด fz หรือลด ae', 'bad');
  } else if (ratio > 1.2) {
    push('เศษหนากว่าค่าแนะนำ ' + pct + '% ควรทดลองอย่างระวังและดูสภาพคมตัด');
  } else if (ratio < 0.35) {
    push('เศษบางกว่าค่าแนะนำ ' + Math.abs(pct) + '% เสี่ยงเสียดสีแทนการตัด ร้อน สึกเร็ว และผิวไม่สวย', 'bad');
  } else if (ratio < 0.6) {
    push('เศษบางกว่าค่าแนะนำ ' + Math.abs(pct) + '% งานช้ากว่าที่ควร และอาจเริ่มเสียดสีแทนการตัด');
  } else if (!warnedVc) {
    push('Vc และความหนาเศษอยู่ในช่วงแนะนำ (' + (pct >= 0 ? '+' : '') + pct + '% จากค่าแนะนำ)', 'ok');
  }

  if (r.cap2) {
    push('ap ตื้นมากจนสูตรให้ fz สูงเกิน 2 เท่าของตาราง จึงจำกัดค่าแนะนำไว้ที่ 2 เท่า ควรเพิ่มทีละขั้นพร้อมดูผล', 'plain');
  }

  if (apu > 0) {
    const apCat = tool === 'ball' ? BALL_TABLES[op].ap(r.bi, D) : r.band.ap * D;
    if (apu > apCat * 1.5) {
      push(
        'ap ' + trim(apu, 3) + ' mm ลึกกว่าเงื่อนไขแคตตาล็อก (' + trim(apCat, 2) +
          ' mm) เกิน 50% เสี่ยงดอกโก่งหรือหัก ควรลด ap หรือลด fz',
        'bad',
      );
    } else if (apu > apCat + 1e-9) {
      push(
        'ap ' + trim(apu, 3) + ' mm ลึกกว่าเงื่อนไขแคตตาล็อก (' + trim(apCat, 2) +
          ' mm) ควรลด fz และดูการโก่งของดอก',
      );
    }
  }

  if (r.oh.lvl === 2) {
    push(
      'ระยะยื่น ' + trim(r.LD, 1) + 'D ยาวมาก ดอกจะโก่งและสั่นง่าย ค่าแนะนำถูกลดลงแล้ว ควรใช้ดอกคอยาวหรือลดระยะยื่นถ้าทำได้',
      'bad',
    );
  } else if (r.oh.lvl === 1) {
    push(
      'ระยะยื่น ' + trim(r.LD, 1) + 'D เกิน 4D ค่าแนะนำถูกลดลงแล้ว ควรดูการสั่นและผิวงาน',
    );
  }

  if (r.bi < 4 && coat === 'dlc') {
    push('สารเคลือบ DLC ไม่เหมาะกับการกัดเหล็ก (ทำปฏิกิริยากับเหล็กที่ความร้อนสูง) ตรวจชนิดสารเคลือบอีกครั้ง', 'bad');
  } else if (r.bi >= 2 && r.bi < 4 && (coat === 'tialn' || coat === 'ticn')) {
    push(
      'สารเคลือบ ' + (coat === 'tialn' ? 'TiAlN' : 'TiCN') +
        ' มักไม่ใช่ตัวเลือกแรกสำหรับเหล็กชุบแข็ง ≥55 HRC (ทนความร้อนไม่พอเมื่อเทียบ AlTiN Al สูง หรือ AlCrN) ค่าแนะนำอิงดอกเคลือบของ OSG ควรเริ่มทดลองที่ Vc ต่ำและดูการสึกของคม',
    );
  }

  if (mode === 1 && Vc0 > 0 && Vcact > Vc0 * 1.5) {
    push(
      'Vc ' + fmt(Vcact, 1) + ' m/min สูงกว่าค่าเดิม (' + fmt(Vc0, 1) +
        ') เกิน 1.5 เท่า อายุดอกอาจสั้นลงมาก ควรเริ่มทดลองที่ค่าต่ำก่อนและตรวจการสึกของคมเป็นระยะ',
    );
  }

  if (r.bi >= 4) {
    push('ไนลอนนำความร้อนไม่ดี ผู้ผลิตแนะนำลมเป่าหรือน้ำหล่อเย็นกึ่งสังเคราะห์ ยังไม่พบข้อมูลของน้ำมันตัดชนิดน้ำมันล้วนกับไนลอน ควรเป่าลมและสอบถามผู้ขายวัสดุก่อน', 'plain');
    push('ยึดชิ้นงานให้รองรับเต็มและไม่หนีบแรงจนบิด ถ้ากัดเนื้อออกมากด้านเดียวหรือต้องการความเรียบสูง ผู้ผลิตไนลอนหล่อแนะนำอบคลายเครียดระหว่างขั้นตอน และถ้ากัดด้วยดอกทื่อหรือไม่มีการระบายความร้อน ควรอบหลังกัด', 'plain');
  }

  if (maxf > 0 && Vf > maxf) {
    push(
      'F = ' + fmt(Vf, 1) + ' mm/min เกินอัตราป้อนสูงสุด (' + fmt(maxf, 0) +
        ') ที่รอบนี้ fz สูงสุดที่ตั้งได้ประมาณ ' + trim(maxf / (z * n), 4) + ' mm/tooth',
      'bad',
    );
  }

  if (!isFinite(capRpm)) {
    push('ยังไม่ได้กำหนดเพดานรอบ ตรวจรอบสูงสุดของเครื่องก่อนตั้งค่า', 'plain');
  }

  return notes;
}
