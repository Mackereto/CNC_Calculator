import type { CycleOut } from '../../lib/cnc/calculate';
import { fmt, trim } from '../../lib/cnc/format';

export interface CycleTimeProps {
  cycle: CycleOut | null;
  H: string;
  ap: string;
}

export default function CycleTime({ cycle, H, ap }: CycleTimeProps) {
  if (!cycle) return null;

  const Hnum = parseFloat(H);
  const apNum = parseFloat(ap);
  const hasH = isFinite(Hnum) && Hnum > 0 && isFinite(apNum) && apNum > 0;
  const layersText =
    String(cycle.layers) +
    (hasH ? ' (H ' + trim(Hnum, 3) + ' ÷ ap ' + trim(apNum, 3) + ')' : ' (ไม่ได้กรอก H)');

  const ts = Math.round(cycle.tt);
  const minutes = Math.floor(ts / 60);
  const seconds = ts % 60;

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4">
      <h3 className="cnc-display mt-0 text-lg">เชิงทฤษฎี · งานปาดผิว</h3>
      <dl className="mt-2.5 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3.5 gap-y-1.5 tabular-nums">
        <div className="contents">
          <dt className="min-w-0 text-[var(--color-ink-2)]">แนวเดินมีดต่อชั้น N</dt>
          <dd className="m-0 whitespace-nowrap text-right font-medium">{String(cycle.N)}</dd>
        </div>
        <div className="contents">
          <dt className="min-w-0 text-[var(--color-ink-2)]">ระยะเดินต่อชั้น L</dt>
          <dd className="m-0 whitespace-nowrap text-right font-medium">{fmt(cycle.L, 0) + ' mm'}</dd>
        </div>
        <div className="contents">
          <dt className="min-w-0 text-[var(--color-ink-2)]">เวลาต่อชั้น t</dt>
          <dd className="m-0 whitespace-nowrap text-right font-medium">{fmt(cycle.t, 1) + ' s'}</dd>
        </div>
        <div className="contents">
          <dt className="min-w-0 text-[var(--color-ink-2)]">จำนวนชั้น</dt>
          <dd className="m-0 text-right font-medium">{layersText}</dd>
        </div>
        <div className="contents">
          <dt className="min-w-0 font-semibold text-[var(--color-ink)]">เวลารวม</dt>
          <dd className="m-0 whitespace-nowrap text-right font-bold text-[var(--color-accent)]">
            {fmt(cycle.tt, 1) + ' s  (' + minutes + ' นาที ' + seconds + ' วินาที)'}
          </dd>
        </div>
        {cycle.t0 != null ? (
          <>
            <div className="contents">
              <dt className="min-w-0 text-[var(--color-ink-2)]">เวลารวมที่ F เดิม</dt>
              <dd className="m-0 whitespace-nowrap text-right font-medium">{fmt(cycle.t0, 1) + ' s'}</dd>
            </div>
            <div className="contents">
              <dt className="min-w-0 text-[var(--color-ink-2)]">
                {cycle.t0 - cycle.tt >= 0 ? 'เวลาที่ลดลง' : 'เวลาที่เพิ่มขึ้น'}
              </dt>
              <dd className="m-0 whitespace-nowrap text-right font-medium">
                {fmt(Math.abs(((cycle.t0 - cycle.tt) / cycle.t0) * 100), 1) + ' %'}
              </dd>
            </div>
          </>
        ) : null}
      </dl>
    </div>
  );
}
