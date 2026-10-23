import { useState } from 'react';
import type { DetailRow } from '../../lib/cnc/calculate';

export interface ReadoutProps {
  k1: string;
  v1: string;
  u1: string;
  k2: string;
  v2: string;
  u2: string;
  gcode: string;
  details: DetailRow[];
  mode: 1 | 2;
}

export default function Readout({
  k1,
  v1,
  u1,
  k2,
  v2,
  u2,
  gcode,
  details,
  mode,
}: ReadoutProps) {
  const [copied, setCopied] = useState(false);

  const copyGcode = () => {
    if (gcode === '—') return;
    try {
      navigator.clipboard.writeText(gcode).then(
        () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        },
        () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        },
      );
    } catch {
      setCopied(false);
    }
  };

  return (
    <div>
      <div className="cnc-console p-4 sm:p-5">
        <div
          key={v1 + '|' + v2 + '|' + mode}
          className="cnc-fade"
        >
          <div className="flex min-w-0 items-baseline gap-3 py-1.5">
            <span className="w-10 shrink-0 font-mono text-lg text-[var(--readout-dim)]">{k1}</span>
            <span className="cnc-console__fig min-w-0 flex-1 break-all font-mono text-4xl font-bold leading-tight sm:text-5xl">{v1}</span>
            <span className="shrink-0 whitespace-nowrap font-mono text-[0.85rem] text-[var(--readout-dim)]">{u1}</span>
          </div>
          <div className="flex min-w-0 items-baseline gap-3 border-t border-[var(--readout-dim)]/30 py-1.5">
            <span className="w-10 shrink-0 font-mono text-lg text-[var(--readout-dim)]">{k2}</span>
            <span className="cnc-console__fig min-w-0 flex-1 break-all font-mono text-4xl font-bold leading-tight sm:text-5xl">{v2}</span>
            <span className="shrink-0 whitespace-nowrap font-mono text-[0.85rem] text-[var(--readout-dim)]">{u2}</span>

          </div>
        </div>
        <div className="mt-2.5 flex min-w-0 flex-wrap items-center justify-between gap-2.5 border-t border-[var(--readout-dim)]/30 pt-2.5">
          <code className="min-w-0 break-all font-mono text-base tabular-nums text-[var(--readout-ink)] sm:text-lg">{gcode}</code>
          <button
            type="button"
            onClick={copyGcode}
            className="cnc-btn shrink-0 border border-[var(--readout-dim)] bg-transparent px-3 py-1.5 text-[0.82rem] font-semibold text-[var(--readout-ink)] hover:border-[var(--readout-ink)]"
          >
            {copied ? '✓ คัดลอกแล้ว' : 'คัดลอก G-code'}
          </button>
        </div>
      </div>

      <dl className="mt-3.5 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3.5 gap-y-1.5 tabular-nums">
        {details.map((d, i) => (
          <div key={i} className="contents">
            <dt className="min-w-0 text-[var(--color-ink-2)]">{d.k}</dt>
            <dd className="m-0 whitespace-nowrap text-right font-medium">{d.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
