import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { kfac } from '../../lib/cnc/formulas';
import { trim } from '../../lib/cnc/format';
import { BANDS, rec, recInfo, type Tool } from '../../lib/cnc/recommendations';
import { calculate, type CalcInput } from '../../lib/cnc/calculate';
import { MATERIALS, BAND_OPTIONS } from '../../data/materials';
import { PRESETS } from '../../data/presets';
import type { BallOp } from '../../data/osg-ball';
import Readout from './Readout';
import WarningsList from './WarningsList';
import CycleTime from './CycleTime';
import {
  ArrowDownWideNarrow,
  ArrowLeftRight,
  ArrowUpDown,
  ClipboardList,
  Cog,
  Droplet,
  Gauge,
  History,
  Layers,
  Move3d,
  Percent,
  RotateCw,
  Ruler,
  Scale,
  ShieldCheck,
  Timer,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
const DEFAULTS = {
  D: '6',
  z: '4',
  r: '0.5',
  aePct: '60',
  ap: '0.1',
  sf: '0.85',
  coat: '',
  maxrpm: '24000',
  cap: '80',
  S: '8000',
  F: '900',
  A: '50',
  B: '50',
};

const initialRec = rec({
  band: 0,
  D: parseFloat(DEFAULTS.D),
  tool: 'sq',
  op: 'finish2',
  r: parseFloat(DEFAULTS.r),
  apUser: parseFloat(DEFAULTS.ap),
  aePct: parseFloat(DEFAULTS.aePct),
  L: NaN,
  sf: parseFloat(DEFAULTS.sf),
});

function parseOrNaN(s: string): number {
  if (s === '' || s == null) return NaN;
  const v = parseFloat(s);
  return isFinite(v) ? v : NaN;
}

// Numeric-only guard: digits + single decimal point (integer-only when intOnly).
function keepNum(v: string, intOnly = false): string {
  let out = v.replace(intOnly ? /[^0-9]/g : /[^0-9.]/g, '');
  if (!intOnly) {
    const dot = out.indexOf('.');
    if (dot !== -1) out = out.slice(0, dot + 1) + out.slice(dot + 1).replace(/\./g, '');
  }
  return out;
}

const STEPS = ['วัสดุกับดอก', 'ค่าตัด', 'เครื่องจักร', 'ผลลัพธ์'] as const;

function FieldLabel({ icon: Icon, htmlFor, children }: { icon: LucideIcon; htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="cnc-label cnc-label--icon">
      <Icon size={15} strokeWidth={2.25} aria-hidden="true" className="cnc-label__icon" />
      <span>{children}</span>
    </label>
  );
}

export default function Calculator() {
  const [step, setStep] = useState(0);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const modeBtns = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    setSlot(document.getElementById('cnc-stepbar-slot'));
  }, []);
  const [mode, setMode] = useState<1 | 2>(1);
  const [matIdx, setMatIdx] = useState(0);
  const [matOpen, setMatOpen] = useState(false);
  const matSheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!matOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const el = matSheetRef.current;
    if (el && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(el, { y: '100%' }, { y: '0%', duration: 0.38, ease: 'power3.out', overwrite: true });
      gsap.fromTo(
        el.querySelectorAll('.cnc-mat__card'),
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out', stagger: 0.02, delay: 0.1, overwrite: true },
      );
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMatOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [matOpen]);
  const [band, setBand] = useState('0');
  const [tool, setTool] = useState<Tool>('sq');
  const [op, setOp] = useState<BallOp>('finish2');
  const [r, setR] = useState(DEFAULTS.r);
  const [L, setL] = useState('');
  const [sf, setSf] = useState(DEFAULTS.sf);
  const [coat, setCoat] = useState('');
  const [D, setD] = useState(DEFAULTS.D);
  const [z, setZ] = useState(DEFAULTS.z);
  const [aeUnit, setAeUnit] = useState<'pct' | 'mm'>('pct');
  const [aeText, setAeText] = useState(DEFAULTS.aePct);
  const [ap, setAp] = useState(DEFAULTS.ap);
  const [preset, setPreset] = useState('');
  const [Vc, setVc] = useState(initialRec ? trim(initialRec.Vc, 1) : '102');
  const [fz, setFz] = useState(initialRec ? trim(initialRec.fzSet, 4) : '0.036');
  const [Vc0, setVc0] = useState('');
  const [S, setS] = useState(DEFAULTS.S);
  const [F, setF] = useState(DEFAULTS.F);
  const [maxrpm, setMaxrpm] = useState(DEFAULTS.maxrpm);
  const [cap, setCap] = useState(DEFAULTS.cap);
  const [maxf, setMaxf] = useState('');
  const [A, setA] = useState(DEFAULTS.A);
  const [B, setB] = useState(DEFAULTS.B);
  const [H, setH] = useState('');
  const [F0, setF0] = useState('');
  const [editedVc, setEditedVc] = useState(false);
  const [editedFz, setEditedFz] = useState(false);
  const [zBall, setZBall] = useState('2');
  const [zOther, setZOther] = useState(DEFAULTS.z);
  const [lastTool, setLastTool] = useState<Tool>('sq');

  const plastic = +band >= 4;
  const effTool: Tool = plastic ? 'sq' : tool;
  const Dnum = parseOrNaN(D);

  // Compute ae percentage and mm from current unit input
  const aeRaw = parseOrNaN(aeText);
  const aePct = aeUnit === 'pct' ? aeRaw : Dnum > 0 && aeRaw >= 0 ? (aeRaw / Dnum) * 100 : NaN;
  const aeMM = Dnum > 0 && isFinite(aePct) ? (aePct / 100) * Dnum : NaN;

  const currentMat = MATERIALS[matIdx] ?? MATERIALS[0];
  const matHardness = currentMat.hardness;

  const recInput = useMemo(
    () => ({
      band: +band,
      D: Dnum,
      tool: effTool,
      op,
      r: parseOrNaN(r),
      apUser: parseOrNaN(ap),
      aePct: isFinite(aePct) ? aePct : 60,
      L: parseOrNaN(L),
      sf: parseOrNaN(sf) || 1,
    }),
    [band, Dnum, effTool, op, r, ap, aePct, L, sf],
  );

  const recommendation = useMemo(() => rec(recInput), [recInput]);
  const info = useMemo(
    () => (recommendation ? recInfo(recommendation, recInput) : 'กรอก D เพื่อดูค่าแนะนำ'),
    [recommendation, recInput],
  );

  useEffect(() => {
    if (!recommendation) return;
    if (!editedVc) setVc(trim(recommendation.Vc, 1));
    if (!editedFz) setFz(trim(recommendation.fzSet, 4));
  }, [recommendation?.Vc, recommendation?.fzSet, editedVc, editedFz]);

  useEffect(() => {
    const pill = pillRef.current;
    const btn = modeBtns.current[mode - 1];
    if (!pill || !btn) return;
    const move = () => {
      const left = btn.offsetLeft;
      const w = btn.offsetWidth;
      if (!w) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set(pill, { x: left, width: w });
        return;
      }
      gsap.to(pill, { x: left, width: w, duration: 0.32, ease: 'power3.out', overwrite: true });
    };
    move();
    window.addEventListener('resize', move);
    return () => window.removeEventListener('resize', move);
  }, [mode]);
  const calcInput: CalcInput = {
    ...recInput,
    mode,
    origTool: tool,
    z: Math.floor(parseOrNaN(z)),
    Vc: parseOrNaN(Vc),
    fz: parseOrNaN(fz),
    S: parseOrNaN(S),
    F: parseOrNaN(F),
    maxrpm: parseOrNaN(maxrpm),
    capPct: parseOrNaN(cap),
    maxf: parseOrNaN(maxf),
    A: parseOrNaN(A),
    B: parseOrNaN(B),
    H: parseOrNaN(H),
    F0: parseOrNaN(F0),
    Vc0: parseOrNaN(Vc0),
    coat,
  };
  const out = calculate({ ...calcInput, z: parseOrNaN(z) });

  const hVc = recommendation
    ? 'แนะนำ ' + trim(recommendation.Vc, 1) + ' (ช่วง ' + trim(recommendation.vmin, 1) + '–' + trim(recommendation.vmax, 1) + ')'
    : '';
  const hfz = recommendation
    ? 'แนะนำ ' + trim(recommendation.fzSet, 4) + ' ที่ ae ' + trim(isFinite(aePct) ? aePct : 0, 1) + '% (' +
      trim(isFinite(aeMM) ? aeMM : 0, 3) + ' mm)' + (recommendation.cap2 ? ' (จำกัดไม่เกิน 2 เท่าของตาราง)' : '')
    : '';

  const ldText = Dnum > 0 && parseOrNaN(L) > 0 ? '= ' + trim(parseOrNaN(L) / Dnum, 1) + 'D' : '';

  const goStep = (n: number) => {
    setStep(Math.max(0, Math.min(STEPS.length - 1, n)));
    requestAnimationFrame(() => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  };

  const fillForced = () => {
    if (!recommendation) return;
    setVc(trim(recommendation.Vc, 1));
    setFz(trim(recommendation.fzSet, 4));
    setEditedVc(false);
    setEditedFz(false);
  };

  const onMat = (idx: number) => {
    setMatIdx(idx);
    const m = MATERIALS[idx];
    if (m && m.value !== 'custom') setBand(m.value);
    setPreset('');
    setEditedVc(false);
    setEditedFz(false);
  };

  const onBand = (v: string) => {
    const m = MATERIALS[matIdx];
    if (m && m.value !== 'custom' && !(+m.value >= 4 && +v >= 4) && m.value !== v) {
      const customIdx = MATERIALS.findIndex((x) => x.value === 'custom');
      if (customIdx >= 0) setMatIdx(customIdx);
    }
    setBand(v);
    setPreset('');
    setEditedVc(false);
    setEditedFz(false);
  };

  const onTool = (t: Tool) => {
    if (lastTool === 'ball') setZBall(z);
    else setZOther(z);
    if (t === 'ball') setZ(zBall);
    else if (lastTool === 'ball') setZ(zOther);
    setLastTool(t);
    setTool(t);
    setPreset('');
    setEditedVc(false);
    setEditedFz(false);
  };

  const onPreset = (v: string) => {
    setPreset(v);
    if (!v) return;
    const p = v.split(',');
    if (lastTool === 'ball') setZBall(z);
    setTool('sq');
    setLastTool('sq');
    setL('');
    const customIdx = MATERIALS.findIndex((x) => x.value === 'custom');
    if (customIdx >= 0) setMatIdx(customIdx);
    setBand(p[4]);
    setD(p[0]);
    setZ(p[1]);
    setAeUnit('pct');
    setAeText('60');
    const b = BANDS[+p[4]];
    const kC = kfac(b.ae(+p[0]) / +p[0]);
    setVc(p[2]);
    setFz(trim(parseFloat(p[3]) * (kC / kfac(0.6)), 8));
    setEditedVc(true);
    setEditedFz(true);
    setMode(1);
  };

  const toggleAeUnit = () => {
    if (aeUnit === 'pct') {
      setAeUnit('mm');
      setAeText(isFinite(aeMM) ? trim(aeMM, 3) : '');
    } else {
      setAeUnit('pct');
      setAeText(isFinite(aePct) ? trim(aePct, 2) : '');
    }
  };

  const field = 'cnc-field';
  const label = 'cnc-label';
  const small = 'cnc-hint';
  const editedCls = 'cnc-field--edited';

  const stepPanel = 'cnc-step';
  const showOn = (n: number) => (step === n ? '' : ' cnc-step--hidden-mobile');

  return (
    <div ref={topRef} className="cnc-flow scroll-mt-4">
      {slot
        ? createPortal(
            <div className="cnc-stepbar no-print" role="group" aria-label="ขั้นตอนการคำนวณ">
              <ol className="cnc-stepper" aria-label="ขั้นตอนการคำนวณ">
                {STEPS.map((s, i) => (
                  <li key={s} className="cnc-stepper__item">
                    <button
                      type="button"
                      onClick={() => goStep(i)}
                      aria-current={step === i ? 'step' : undefined}
                      aria-label={'ขั้นตอนที่ ' + (i + 1) + ': ' + s}
                      className={'cnc-stepper__dot' + (step === i ? ' cnc-stepper__dot--active' : i < step ? ' cnc-stepper__dot--done' : '')}
                    >
                      <span aria-hidden="true">{i < step ? '✓' : String(i + 1)}</span>
                    </button>
                    {i < STEPS.length - 1 ? <span aria-hidden="true" className="cnc-stepper__bar" /> : null}
                  </li>
                ))}
              </ol>
              <p aria-live="polite" className="cnc-stepbar__name">{STEPS[step]}</p>
            </div>,
            slot,
          )
        : null}

      <div className="cnc-workbench">
        <section className={stepPanel + showOn(0)} aria-labelledby="in-h" aria-hidden={step !== 0}>
          <p className="cnc-stage" aria-hidden="true">1.0</p>
          <h2 id="in-h" className="cnc-display mt-1 text-xl">เลือกงานกับดอก</h2>
          <div ref={tabsRef} className="cnc-tabs mb-4 mt-3" role="group" aria-label="โหมดการคำนวณ">
            <span ref={pillRef} aria-hidden="true" className="cnc-tabs__pill" />
            <button
              ref={(el) => { modeBtns.current[0] = el; }}
              type="button"
              aria-pressed={mode === 1}
              onClick={() => setMode(1)}
              className="cnc-tab"
            >
              Vc, fz → S, F
            </button>
            <button
              ref={(el) => { modeBtns.current[1] = el; }}
              type="button"
              aria-pressed={mode === 2}
              onClick={() => setMode(2)}
              className="cnc-tab"
            >
              S, F → Vc, fz
            </button>
          </div>

          <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
              <span className={label} id="mat-label">วัสดุงาน</span>
              <div className="cnc-mat" role="group" aria-labelledby="mat-label">
                <button
                  type="button"
                  onClick={() => setMatOpen(true)}
                  aria-haspopup="dialog"
                  className="cnc-mat__pill"
                >
                  <span className="cnc-mat__name">{currentMat.label}</span>
                </button>
              </div>
              {matHardness ? <small className={small}>ความแข็ง {matHardness} (ตรวจจากใบรับรองวัสดุหรือวัดจริง)</small> : null}
              {currentMat.value !== 'custom' && +currentMat.value < 4 ? <small className={small}>ช่วงความแข็ง: {BAND_OPTIONS[+currentMat.value]?.label}</small> : null}
              {matOpen ? (
                <div role="dialog" aria-modal="true" aria-label="เลือกวัสดุงาน" className="cnc-mat__overlay no-print">
                  <div ref={matSheetRef} className="cnc-mat__sheet">
                    <div className="cnc-mat__top">
                      <button
                        type="button"
                        onClick={() => setMatOpen(false)}
                        aria-label="กลับไปหน้าคำนวณ"
                        className="cnc-btn cnc-btn--ghost cnc-mat__back"
                      >
                        <span aria-hidden="true">←</span> กลับ
                      </button>
                      <span className="cnc-mat__title">เลือกวัสดุงาน</span>
                      <span aria-hidden="true" className="cnc-mat__spacer" />
                    </div>
                    {BAND_OPTIONS.slice(0, 4).map((b) => (
                      <section key={b.value + b.label} className="cnc-mat__group" aria-label={b.label}>
                        <h3 className="cnc-mat__hrc">{b.label}</h3>
                        <div className="cnc-mat__grid">
                          {MATERIALS.map((m, i) => (m.value === b.value ? (
                            <button
                              key={i}
                              type="button"
                              onClick={() => { onMat(i); setMatOpen(false); }}
                              aria-pressed={i === matIdx}
                              className={'cnc-mat__card' + (i === matIdx ? ' cnc-mat__card--active' : '')}
                            >
                              {m.label}
                            </button>
                          ) : null))}
                        </div>
                      </section>
                    ))}
                    <section className="cnc-mat__group" aria-label="พลาสติก">
                      <h3 className="cnc-mat__hrc">พลาสติก</h3>
                      <div className="cnc-mat__grid">
                        {MATERIALS.map((m, i) => (m.value === '4' ? (
                          <button
                            key={i}
                            type="button"
                            onClick={() => { onMat(i); setMatOpen(false); }}
                            aria-pressed={i === matIdx}
                            className={'cnc-mat__card' + (i === matIdx ? ' cnc-mat__card--active' : '')}
                          >
                            {m.label}
                          </button>
                        ) : null))}
                      </div>
                    </section>
                    <section className="cnc-mat__group" aria-label="กำหนดเอง">
                      <h3 className="cnc-mat__hrc">กำหนดเอง</h3>
                      <div className="cnc-mat__grid">
                        {MATERIALS.map((m, i) => (m.value === 'custom' ? (
                          <button
                            key={i}
                            type="button"
                            onClick={() => { onMat(i); setMatOpen(false); }}
                            aria-pressed={i === matIdx}
                            className={'cnc-mat__card' + (i === matIdx ? ' cnc-mat__card--active' : '')}
                          >
                            {m.label}
                          </button>
                        ) : null))}
                      </div>
                    </section>
                  </div>
                </div>
              ) : null}
            </div>
            {currentMat.value === 'custom' || +currentMat.value >= 4 ? (
              <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
                <FieldLabel icon={Layers} htmlFor="band">ช่วงความแข็ง</FieldLabel>
                <select id="band" className={field} value={band} onChange={(e) => onBand(e.target.value)}>
                  {BAND_OPTIONS.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
              <span className={label} id="tool-label">ชนิดดอก</span>
              <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="tool-label">
                {([
                  ['sq', 'ปลายเรียบ'],
                  ['cr', 'รัศมีมุม'],
                  ['ball', 'ปลายบอล'],
                ] as [Tool, string][]).map(([v, th]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onTool(v)}
                    aria-pressed={tool === v}
                    title={th}
                    className={'cnc-mat__card truncate whitespace-nowrap' + (tool === v ? ' cnc-mat__card--active' : '')}
                  >
                    {th}
                  </button>
                ))}
              </div>
            </div>
            {!plastic && tool === 'cr' ? (
              <div className="flex min-w-0 flex-col gap-1">
              <FieldLabel icon={Scale} htmlFor="r">รัศมีมุม r (mm)</FieldLabel>
                <input id="r" className={field} type="text" inputMode="decimal" value={r} onChange={(e) => { setR(keepNum(e.target.value)); setPreset(''); setEditedVc(false); setEditedFz(false); }} />
              </div>
            ) : null}
            {!plastic && tool === 'ball' ? (
              <div className="flex min-w-0 flex-col gap-1">
              <FieldLabel icon={ClipboardList} htmlFor="op">ลักษณะงาน / ตารางดอกบอล</FieldLabel>
                <select id="op" className={field} value={op} onChange={(e) => { setOp(e.target.value as BallOp); setPreset(''); setEditedVc(false); setEditedFz(false); }}>
                  <option value="finish2">งานเก็บผิว · ดอก 2 ฟัน (AE-BD-H)</option>
                  <option value="finish">งานเก็บผิว · ดอก 4 ฟัน (AE-BM-H)</option>
                  <option value="rough">งานหยาบ · ดอก 4 ฟัน (AE-BM-H)</option>
                </select>
              </div>
            ) : null}
            <div className="flex min-w-0 flex-col gap-1">
              <FieldLabel icon={Wrench} htmlFor="D">เส้นผ่านศูนย์กลางดอก D (mm)</FieldLabel>
              <input id="D" className={field} type="text" inputMode="decimal" value={D} onChange={(e) => { setD(keepNum(e.target.value)); setPreset(''); setEditedVc(false); setEditedFz(false); }} />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <FieldLabel icon={Cog} htmlFor="z">จำนวนฟัน z</FieldLabel>
              <input id="z" className={field} type="text" inputMode="numeric" pattern="[0-9]*" value={z} onChange={(e) => setZ(keepNum(e.target.value, true))} />
              {effTool === 'ball' ? <small className={small}>ค่าแนะนำมาจากดอกบอล 2/4 ฟัน ถ้าจำนวนฟันต่างจากนี้ fz ต่อฟันใช้ค่าเดิม แต่ F เปลี่ยนตามจำนวนฟัน</small> : null}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <FieldLabel icon={Move3d} htmlFor="L">ระยะยื่นดอก L (mm)</FieldLabel>
              <input id="L" className={field} type="text" inputMode="decimal" placeholder="เว้นว่าง = ไม่เกิน 4D" value={L} onChange={(e) => { setL(keepNum(e.target.value)); setPreset(''); setEditedVc(false); setEditedFz(false); }} />
              {ldText ? <small className={small}>{ldText}</small> : null}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <FieldLabel icon={Droplet} htmlFor="coat">สารเคลือบดอก (ข้อมูลประกอบ)</FieldLabel>
              <select id="coat" className={field} value={coat} onChange={(e) => setCoat(e.target.value)}>
                <option value="">ไม่ทราบ</option>
                <option value="tialn">TiAlN</option>
                <option value="altin">AlTiN (Al สูง) / AlTiSiN</option>
                <option value="alcrn">AlCrN</option>
                <option value="ticn">TiCN</option>
                <option value="dlc">DLC</option>
              </select>
              <small className={small}>ไม่ปรับค่าแนะนำ ใช้เตือนเมื่อไม่เหมาะกับช่วงความแข็ง</small>
            </div>
            <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
              <FieldLabel icon={History} htmlFor="preset">ค่าจากรายงาน (ตาราง 3.1)</FieldLabel>
              <select id="preset" className={field} value={preset} onChange={(e) => onPreset(e.target.value)}>
                <option value="">— ไม่ใช้ —</option>
                {PRESETS.map((p) => (
                  <option key={p.code} value={[p.D, p.z, p.Vc, p.fz, p.band].join(',')}>{p.label}</option>
                ))}
              </select>
              <small className={small} style={{ paddingTop: '5px' }}>ดูที่มาใน <button type="button" onClick={() => { window.dispatchEvent(new CustomEvent('cnc:goto-ref')); }} className="text-[var(--color-accent)] underline">ตาราง 3.1 หน้า Reference</button></small>
            </div>
          </div>
        </section>

        <section className={stepPanel + showOn(1)} aria-labelledby="cut-h" aria-hidden={step !== 1}>
          <p className="cnc-stage" aria-hidden="true">2.0</p>
          <h2 id="cut-h" className="cnc-display mt-1 text-xl">ระยะกินกับความเร็ว</h2>
          <div className="mt-3 grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1">
              <FieldLabel icon={ArrowLeftRight} htmlFor="aeIn">ระยะกินข้างที่ใช้จริง ae</FieldLabel>
              <div className="flex min-w-0 gap-1.5">
                <input
                  id="aeIn"
                  className={field + ' flex-1'}
                  type="text"
                  inputMode="decimal"
                  value={aeText}
                  onChange={(e) => {
                    setAeText(keepNum(e.target.value));
                    setPreset('');
                  }}
                />
                <button
                  type="button"
                  aria-label="สลับหน่วย ae ระหว่าง % ของ D กับ mm"
                  onClick={toggleAeUnit}
                  className="cnc-btn cnc-btn--ghost shrink-0 px-2.5 text-[0.85rem]"
                >
                  {aeUnit === 'pct' ? '% ของ D' : 'mm'}
                </button>
              </div>
              {Dnum > 0 && isFinite(aePct) && isFinite(aeMM) ? (
                <small className={small}>{aeUnit === 'pct' ? '= ' + trim(aeMM, 3) + ' mm' : '= ' + trim(aePct, 2) + '% ของ D'} · กดปุ่มเพื่อสลับหน่วย</small>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <FieldLabel icon={ArrowUpDown} htmlFor="ap">ความลึกต่อชั้น ap (mm)</FieldLabel>
              <input id="ap" className={field} type="text" inputMode="decimal" value={ap} onChange={(e) => { setAp(keepNum(e.target.value)); setPreset(''); setEditedVc(false); setEditedFz(false); }} />
              <small className={small}>ใช้ตรวจกับเงื่อนไขแคตตาล็อกและนับจำนวนชั้น</small>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <FieldLabel icon={ShieldCheck} htmlFor="sf">ตัวคูณความปลอดภัยของ Vc</FieldLabel>
              <select id="sf" className={field} value={sf} onChange={(e) => { setSf(e.target.value); setPreset(''); setEditedVc(false); setEditedFz(false); }}>
                <option value="0.7">เริ่มทดลอง 70%</option>
                <option value="0.85">ระมัดระวัง 85%</option>
                <option value="1">ค่าแคตตาล็อก 100%</option>
              </select>
              <small className={small}>ลดเฉพาะ Vc ไม่ลด fz เป็นหลักปฏิบัติของผู้จัดทำ ไม่ได้มาจากแคตตาล็อก</small>
            </div>

            {mode === 1 ? (
              <>
                <div className="flex min-w-0 flex-col gap-1">
                  <FieldLabel icon={Gauge} htmlFor="Vc">{effTool === 'sq' ? 'ความเร็วตัด Vc (m/min)' : 'ความเร็วตัดที่จุดสัมผัสจริง Vc (m/min)'}</FieldLabel>
                  <input id="Vc" className={field + ' ' + (editedVc ? editedCls : '')} type="text" inputMode="decimal" value={Vc} onChange={(e) => { setVc(keepNum(e.target.value)); setEditedVc(true); setPreset(''); }} />
                  {hVc ? <small className={small}>{hVc}</small> : null}
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <FieldLabel icon={Zap} htmlFor="fz">fz ที่จะตั้ง (mm/tooth)</FieldLabel>
                  <input id="fz" className={field + ' ' + (editedFz ? editedCls : '')} type="text" inputMode="decimal" value={fz} onChange={(e) => { setFz(keepNum(e.target.value)); setEditedFz(true); setPreset(''); }} />
                  {hfz ? <small className={small}>{hfz}</small> : null}
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <FieldLabel icon={Timer} htmlFor="Vc0">Vc เดิมที่ใช้อยู่ (m/min, ไม่บังคับ)</FieldLabel>
                  <input id="Vc0" className={field} type="text" inputMode="decimal" placeholder="ใช้เตือนอายุดอก" value={Vc0} onChange={(e) => setVc0(keepNum(e.target.value))} />
                </div>
              </>
            ) : (
              <>
                <div className="flex min-w-0 flex-col gap-1">
                  <FieldLabel icon={RotateCw} htmlFor="S">รอบที่ตั้งอยู่ S (rpm)</FieldLabel>
                  <input id="S" className={field} type="text" inputMode="decimal" value={S} onChange={(e) => setS(keepNum(e.target.value))} />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <FieldLabel icon={ArrowDownWideNarrow} htmlFor="F">อัตราป้อนที่ตั้งอยู่ F (mm/min)</FieldLabel>
                  <input id="F" className={field} type="text" inputMode="decimal" value={F} onChange={(e) => setF(keepNum(e.target.value))} />
                </div>
              </>
            )}
          </div>
          {mode === 1 ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => { setPreset(''); fillForced(); }}
                className="cnc-btn cnc-btn--ghost"
              >
                ใช้ค่าแนะนำ
              </button>
            </div>
          ) : null}
          <div className="mt-3 rounded-[var(--radius-input)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] px-3 py-2.5 text-[0.88rem] text-[var(--color-ink-2)]">{info}</div>
        </section>

        <section className={stepPanel + showOn(2)} aria-labelledby="lim-h" aria-hidden={step !== 2}>
          <p className="cnc-stage" aria-hidden="true">3.0</p>
          <h2 id="lim-h" className="cnc-display mt-1 text-xl">ขีดจำกัดกับเวลา</h2>
          <div className="mt-3 grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1">
              <FieldLabel icon={Gauge} htmlFor="maxrpm">รอบสูงสุดของเครื่อง (rpm)</FieldLabel>
              <input id="maxrpm" className={field} type="text" inputMode="decimal" value={maxrpm} onChange={(e) => setMaxrpm(keepNum(e.target.value))} />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <FieldLabel icon={Percent} htmlFor="cap">เพดานรอบที่โรงงานกำหนด (%)</FieldLabel>
              <input id="cap" className={field} type="text" inputMode="decimal" value={cap} onChange={(e) => setCap(keepNum(e.target.value))} />
            </div>
            <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
              <FieldLabel icon={ArrowDownWideNarrow} htmlFor="maxf">อัตราป้อนสูงสุด (mm/min)</FieldLabel>
              <input id="maxf" className={field} type="text" inputMode="decimal" placeholder="เว้นว่างถ้ายังไม่ทราบ" value={maxf} onChange={(e) => setMaxf(keepNum(e.target.value))} />
              <small className={small}>ถ้ากรอก จะเตือนเมื่อ F เกินค่านี้</small>
            </div>
          </div>

          <div className="my-4 h-px bg-[var(--color-rule)]"></div>
          <h3 className="text-[0.95rem] font-semibold text-[var(--color-ink)]">เวลาเดินมีดเชิงทฤษฎี (งานปาดผิว)</h3>
          <div className="mt-2.5 grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1">
              <FieldLabel icon={Ruler} htmlFor="A">ความยาวแนวเดินมีด A (mm)</FieldLabel>
              <input id="A" className={field} type="text" inputMode="decimal" value={A} onChange={(e) => setA(keepNum(e.target.value))} />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <FieldLabel icon={Ruler} htmlFor="B">ความกว้างผิวงาน B (mm)</FieldLabel>
              <input id="B" className={field} type="text" inputMode="decimal" value={B} onChange={(e) => setB(keepNum(e.target.value))} />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <FieldLabel icon={Layers} htmlFor="H">ความลึกรวมที่ต้องกัด H (mm)</FieldLabel>
              <input id="H" className={field} type="text" inputMode="decimal" placeholder="เว้นว่าง = 1 ชั้น" value={H} onChange={(e) => setH(keepNum(e.target.value))} />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <FieldLabel icon={Timer} htmlFor="F0">F เดิมเพื่อเทียบ (mm/min)</FieldLabel>
              <input id="F0" className={field} type="text" inputMode="decimal" placeholder="ไม่บังคับ" value={F0} onChange={(e) => setF0(keepNum(e.target.value))} />
            </div>
          </div>
          <small className={small + ' mt-2 block'}>ใช้ ae และ ap ตามช่องด้านบน จำนวนชั้น = H ÷ ap ปัดขึ้น ไม่นับเวลาเข้า–ออกดอก การเคลื่อนที่เร็ว การเร่ง/ลดความเร็ว และการเปลี่ยนดอก</small>
        </section>

        <section className={stepPanel + showOn(3)} aria-labelledby="out-h" aria-hidden={step !== 3}>
          <p className="cnc-stage" aria-hidden="true">4.0</p>
          <h2 id="out-h" className="cnc-display mt-1 text-xl">พร้อมกดสตาร์ต</h2>
          <div aria-live="polite" className="mt-3 space-y-3.5">
            <Readout
              k1={out.k1}
              v1={out.v1}
              u1={out.u1}
              k2={out.k2}
              v2={out.v2}
              u2={out.u2}
              gcode={out.gcode}
              details={out.details}
              mode={mode}
            />
            <WarningsList notes={out.notes} />
            <CycleTime cycle={out.cycle} H={H} ap={ap} />
            <details className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 py-2.5">
              <summary className="cursor-pointer py-0.5 text-[0.95rem] font-bold text-[var(--color-ink)]">สมการที่ใช้ในผลลัพธ์นี้</summary>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-3 pb-2 pt-2.5 text-[0.88rem] leading-relaxed sm:grid-cols-2">
                {[
                  ['รอบตามสูตร', 'n = 1000·Vc / (π·Dref)  →  S = min(n, เพดานรอบ)'],
                  ['Vc จริงที่ได้', 'Vc·act = π·Dref·S / 1000'],
                  ['อัตราป้อน', 'F = fz·z·S  (fz·act = F / (z·S) ในโหมด 2)'],
                  ['ตัวคูณฟันบาง', 'k = 2√(r−r²) เมื่อ r = ae/Dref < 0.5 นอกนั้น k = 1'],
                  ['ความหนาเศษจริง', 'h = fz·act·s·k  (s = สเกลเรขาคณิตดอก)'],
                  ['รอยคลื่นผิว (ดอกบอล)', 'hs = R − √(R² − (ae/2)²),  R = D/2'],
                  ['จำนวนแนวเดิน', 'N = ceil((B − D) / ae) + 1,  L = A·N'],
                  ['เวลารวม', 't = 60·L / F,  ชั้น = ceil(H / ap),  รวม = t·ชั้น'],
                ].map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <dt className="font-semibold text-[var(--color-ink)]">{k}</dt>
                    <dd className="m-0 mt-0.5 font-mono text-[0.82rem] text-[var(--color-ink-2)]">{v}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </div>
        </section>
      </div>

      <nav className="cnc-pager no-print" aria-label="ไปขั้นตอนถัดไป">
        <button
          type="button"
          onClick={() => goStep(step - 1)}
          disabled={step === 0}
          aria-label="ย้อนกลับ"
          className="cnc-btn cnc-btn--ghost cnc-pager__btn cnc-pager__btn--prev"
        >
          <span aria-hidden="true" />
        </button>
        <p aria-hidden="true" className="cnc-pager__count">{step + 1} / {STEPS.length}</p>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => goStep(step + 1)}
            aria-label="ถัดไป"
            className="cnc-btn cnc-btn--primary cnc-pager__btn cnc-pager__btn--next"
          >
            <span aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => goStep(0)}
            aria-label="เริ่มใหม่"
            className="cnc-btn cnc-btn--primary cnc-pager__btn cnc-pager__btn--next"
          >
            <span aria-hidden="true">↺</span>
          </button>
        )}
      </nav>
    </div>
  );
}
