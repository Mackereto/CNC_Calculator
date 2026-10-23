import { useState } from 'react';
import { SQ_D, SQ_T } from '../../data/osg-square';
import { BALL_TABLES, type BallOp } from '../../data/osg-ball';
import { NY_D_IN, NY_FIN_IPT, NY_SEMI_IPT } from '../../data/harvey-plastics';
import { MATERIALS, BAND_OPTIONS } from '../../data/materials';
import { PRESETS } from '../../data/presets';
import { BANDS } from '../../lib/cnc/recommendations';
import { fmt, trim } from '../../lib/cnc/format';

const SRC = {
  sq: 'https://osgtool.com/content/literature/8002024CA/Tech%20pg.%20List%20(s)-%208440_%208470_%208540_%208570.pdf',
  bm: 'https://osgtool.com/content/literature/8002024CA/Tech%20pg.%20List%20(s)-%208430_%208530.pdf',
  bd: 'https://osgtool.com/content/literature/8002024CA/Tech%20pg.%20List%20(s)-%208410_%208510.pdf',
  l8540: 'https://osgtool.com/content/literature/8002024CA/List%208540%20-%20A%20BRAND%20AE-MS-H.pdf',
  harvey: 'https://ecomm.productivity.com/customer/docs/skudocs/HAT2_Speeds_Feeds_902131.pdf',
  nycast: 'https://polymershapes.wp-content/uploads/2025/08/CastNylons-Machining-Guidelines_English.pdf',
  boedeker: 'https://www.boedeker.com/Technical-Resources/Plastic-Machining-Guidelines/Plastic-Milling-Machining-Guidelines',
};

function Tbl({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="cnc-tblwrap my-1.5 mb-4">
      <table className="cnc-tbl">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Q({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 py-2.5">
      <summary className="cursor-pointer py-0.5 text-[0.95rem] font-bold text-[var(--color-ink)]">{title}</summary>
      <div className="pb-2 pt-2.5 text-[var(--color-ink-2)]">{children}</div>
    </details>
  );
}

export default function ReferenceFaq() {
  const [bi, setBi] = useState(0);
  const steel = bi < 4;
  const b = BANDS[bi];
  const apTxt = steel ? (['1.5D', '1.5D', '1.5D', '1D'][bi] ?? '') : '';
  const aeTxt = steel
    ? ([
        '0.02D (D ≤ 1.5), 0.05D (1.5 < D ≤ 2.5), 0.1D (D > 2.5) สูงสุด 1 mm',
        '0.05D สูงสุด 1 mm',
        '0.03D สูงสุด 0.5 mm',
        '0.02D สูงสุด 0.5 mm',
      ][bi] ?? '')
    : '';
  const steelBi = steel ? bi : 0;
  const sqRows = SQ_D.map((D, i) => {
    const rp = SQ_T[i][steelBi][0];
    const F = SQ_T[i][steelBi][1] * 25.4;
    const z = D < 6 ? 4 : 6;
    const fz = F / (z * rp);
    return [trim(D, 1), String(z), fmt(rp, 0), fmt(F, 0), fmt((Math.PI * D * rp) / 1000, 1), trim(fz, 4), ((fz / D) * 100).toFixed(2) + '%'];
  });

  const ballOps: { key: BallOp; tag: string; src: string }[] = [
    { key: 'finish2', tag: 'B', src: 'หน้า 1461' },
    { key: 'finish', tag: 'C', src: 'หน้า 1468' },
    { key: 'rough', tag: 'D', src: 'หน้า 1467' },
  ];

  const nyRows = NY_D_IN.map((dIn, i) => {
    const D = dIn * 25.4;
    const f1 = NY_FIN_IPT[i] * 25.4;
    const f2 = NY_SEMI_IPT[i] * 25.4;
    return [trim(D, 2), trim(f1, 4), ((f1 / D) * 100).toFixed(2) + '%', trim(f2, 4), ((f2 / D) * 100).toFixed(2) + '%', fmt((1000 * 304.8) / (Math.PI * D), 0)];
  });

  const matRows = MATERIALS.filter((m) => m.value !== 'custom').map((m) => [m.label, m.hardness, BANDS[+m.value].name]);

  return (
    <div className="mt-4">
      <div className="mb-3 flex max-w-xl flex-wrap items-end gap-3">
        <div className="flex min-w-52 flex-1 flex-col gap-1">
          <label htmlFor="refBand" className="cnc-label">ช่วงความแข็งที่จะดูตาราง</label>
          <select id="refBand" value={bi} onChange={(e) => setBi(+e.target.value)} className="cnc-field">
            {BAND_OPTIONS.map((o, i) => (
              <option key={o.value} value={i}>{o.label}</option>
            ))}
          </select>
        </div>
        <button type="button" onClick={() => window.print()} className="cnc-btn cnc-btn--ghost no-print">
          พิมพ์ / PDF
        </button>
      </div>

      <div className="grid gap-3">
        <Q title="ตาราง 3.1 · ค่าตรวจสอบจากรายงาน (C01–C10, ae = 60% D)" open>
          <Tbl
            head={['รหัส', 'D (mm)', 'z', 'Vc (m/min)', 'fz (mm/tooth)', 'ช่วงความแข็ง']}
            rows={PRESETS.map((p) => [p.code, String(p.D), String(p.z), String(p.Vc), String(p.fz), BAND_OPTIONS[+p.band]?.label ?? p.band])}
          />
        </Q>
        <Q title="ตาราง A · ดอกปลายเรียบและรัศมีมุม (OSG AE-MS-H / AE-CR-MS-H, หน้า 1348)" open>
          <p className="mb-2.5 text-[0.92rem] text-[var(--color-ink-2)]">
            {b.name} · Vc {trim(b.vmin, 1)}–{trim(b.vmax, 1)} m/min (ใช้ค่ากลาง {b.vmid}) · ap = {apTxt} · ae = {aeTxt} · จำนวนฟันตาม List 8540: 4 ฟันที่ 1–5 mm และ 6 ฟันที่ 6 mm ขึ้นไป
          </p>
          {bi < 4 ? <Tbl head={['D (mm)', 'z', 'n (rpm)', 'F (mm/min)', 'Vc (m/min)', 'fz (mm/tooth)', 'fz / D']} rows={sqRows} /> : null}
        </Q>

        {bi < 4
          ? ballOps.map((o) => {
              const TB = BALL_TABLES[o.key];
              return (
                <Q key={o.key} title={'ตาราง ' + o.tag + ' · ดอกบอล ' + TB.name + ' (OSG A Brand, ' + o.src + ')'}>
                  <p className="mb-2.5 text-[0.92rem] text-[var(--color-ink-2)]">
                    {b.name} · ap ตามตาราง = {trim(TB.ap(bi, 10) / 10, 3)}D · ae = {trim(TB.ae(bi, 10) / 10, 3)}D · ดอก {TB.z} ฟัน · Vc ในตารางคิดที่เส้นผ่านศูนย์กลางเต็ม D เครื่องคำนวณแปลงเป็น Vc ที่จุดสัมผัส (Deff) อีกชั้น · ช่วง Vc แนะนำ ±30% เป็นค่าที่ผู้จัดทำกำหนด ไม่ได้มาจากตารางนี้
                  </p>
                  <Tbl
                    head={['D (mm)', 'n (rpm)', 'F (mm/min)', 'Vc ที่ D เต็ม (m/min)', 'fz (mm/tooth)', 'fz / D']}
                    rows={TB.D.map((D, i) => {
                      const rp = TB.T[i][bi][0];
                      const F = TB.T[i][bi][1] * 25.4;
                      const fz = F / (TB.z * rp);
                      return [trim(D, 1), fmt(rp, 0), fmt(F, 0), fmt((Math.PI * D * rp) / 1000, 1), trim(fz, 4), ((fz / D) * 100).toFixed(2) + '%'];
                    })}
                  />
                </Q>
              );
            })
          : (
            <Q title="ตาราง G · Nylon / พลาสติกไม่เติมสาร (Harvey Tool)" open>
              <p className="mb-2.5 text-[0.92rem] text-[var(--color-ink-2)]">
                กลุ่มวัสดุ: Acrylic, Acetal, Delrin, Nylon 6, Nylon 6/6, PEEK ฯลฯ (ไม่เติมสาร, Rockwell R 100–150) ความเร็วตัด <b>800–1200 SFM (ประมาณ 244–366 m/min)</b> ใช้ค่ากลาง 305 m/min · เก็บผิว: ae 0.10D, ap 3D · กึ่งหยาบ: ae 0.35D, ap 1D · fz เป็นของ<b>ดอกไม่เคลือบ</b>
              </p>
              <Tbl head={['D (mm)', 'fz เก็บผิว (mm/tooth)', 'fz/D', 'fz กึ่งหยาบ (mm/tooth)', 'fz/D', 'n ที่ Vc 305 (rpm)']} rows={nyRows} />
              <p className="text-[0.92rem] text-[var(--color-ink-2)]">คอลัมน์สุดท้ายแสดงรอบที่ต้องใช้ถ้าตั้ง Vc 305 m/min ถ้าเกินเพดานรอบเครื่องของเรา (19,200 rpm) เครื่องคำนวณจะลดรอบและ Vc ให้เอง</p>
            </Q>
          )}

        <Q title="ตาราง E · ตัวคูณลดค่าตามระยะยื่นดอก">
          <p className="mb-2.5 text-[0.92rem] text-[var(--color-ink-2)]">OSG ระบุว่าตารางใช้ได้ถึงระยะยื่น 4 เท่าของ D และให้ลด speed, feed และความลึกเมื่อยื่นยาวกว่านั้น แต่ไม่ได้ระบุตัวเลข ตัวคูณด้านล่างเป็น<b>หลักปฏิบัติทั่วไป ไม่ได้มาจากแคตตาล็อก</b></p>
          <Tbl head={['ระยะยื่น L/D', 'ตัวคูณ Vc', 'ตัวคูณ fz', 'ระดับเตือน']} rows={[['ไม่เกิน 4D', '100%', '100%', '—'], ['4–5D', '90%', '80%', 'เตือน'], ['5–6D', '80%', '65%', 'เตือน'], ['6–8D', '70%', '50%', 'อันตราย'], ['เกิน 8D', '60%', '40%', 'อันตราย']]} />
        </Q>

        <Q title="ตาราง F · วัสดุและช่วงความแข็งที่ใช้เลือกตาราง">
          <p className="mb-2.5 text-[0.92rem] text-[var(--color-ink-2)]">ความแข็งเป็นค่าทั่วไปของวัสดุแต่ละเกรด ควรตรวจจากใบรับรองวัสดุหรือวัดจริงก่อนเลือกช่วง</p>
          <Tbl head={['วัสดุ', 'ความแข็งโดยประมาณ', 'ช่วงที่ใช้ในตาราง OSG']} rows={matRows} />
        </Q>

        <Q title="สูตรและเกณฑ์เตือน">
          <p className="text-[0.92rem] text-[var(--color-ink-2)]">
            n = 1000·Vc/(π·Deff) · Vf = fz·z·n · chip thinning k = 2√(r − r²) เมื่อ r = ae/D &lt; 0.5 · ดอกบอล Deff = 2√(ap(D − ap)) · ดอกรัศมีมุม Deff = D − 2r + 2√(2r·ap − ap²) เมื่อ ap &lt; r · scallop = R − √(R² − (ae/2)²) · เตือนเมื่อ Vc นอกช่วงแนะนำ (อันตรายเกินขอบบน 15%), ความหนาเศษหนากว่าค่าแนะนำ 20% (อันตราย 50%) หรือบางกว่า 40% (อันตราย 65%), ap ลึกกว่าแคตตาล็อก (อันตรายเกิน 50%)
          </p>
        </Q>

        <Q title="เอกสารต้นฉบับ">
          <ul className="space-y-1.5 text-[0.92rem] text-[var(--color-ink-2)]">
            <li>OSG End Mill Technical หน้า 1348 · A Brand AE-MS-H &amp; AE-CR-MS-H Side Milling: <a className="break-all text-[var(--color-accent)] underline" href={SRC.sq} target="_blank" rel="noopener">{SRC.sq}</a></li>
            <li>OSG End Mill Technical หน้า 1467–1468 · A Brand AE-BM-H (ดอกบอล 4 ฟัน): <a className="break-all text-[var(--color-accent)] underline" href={SRC.bm} target="_blank" rel="noopener">{SRC.bm}</a></li>
            <li>OSG End Mill Technical หน้า 1461 · A Brand AE-BD-H (ดอกบอล 2 ฟัน): <a className="break-all text-[var(--color-accent)] underline" href={SRC.bd} target="_blank" rel="noopener">{SRC.bd}</a></li>
            <li>OSG List 8540 · ขนาดและจำนวนฟันของ AE-MS-H: <a className="break-all text-[var(--color-accent)] underline" href={SRC.l8540} target="_blank" rel="noopener">{SRC.l8540}</a></li>
            <li>Harvey Tool · Speeds &amp; Feeds ของ End Mills for Plastics: <a className="break-all text-[var(--color-accent)] underline" href={SRC.harvey} target="_blank" rel="noopener">{SRC.harvey}</a></li>
            <li>Cast Nylons Limited (NYCAST) · Machining Guidelines: <a className="break-all text-[var(--color-accent)] underline" href={SRC.nycast} target="_blank" rel="noopener">{SRC.nycast}</a></li>
            <li>Boedeker Plastics · Plastic Milling Machining Guidelines: <a className="break-all text-[var(--color-accent)] underline" href={SRC.boedeker} target="_blank" rel="noopener">{SRC.boedeker}</a></li>
          </ul>
        </Q>
      </div>
    </div>
  );
}
