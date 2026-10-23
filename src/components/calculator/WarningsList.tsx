import type { Note } from '../../lib/cnc/calculate';

export interface WarningsListProps {
  notes: Note[];
}

const ICON: Record<string, string> = {
  bad: '✕',
  warn: '!',
  ok: '✓',
  plain: '·',
};

export default function WarningsList({ notes }: WarningsListProps) {
  if (notes.length === 0) return null;

  return (
    <div className="space-y-2.5" role="list" aria-label="คำเตือนและข้อเสนอแนะ">
      {notes.map((nn, i) => (
        <div
          key={i}
          role="listitem"
          className={
            'cnc-note flex min-w-0 items-start gap-2.5 ' +
            (nn.level === 'bad'
              ? 'cnc-note--bad'
              : nn.level === 'ok'
                ? 'cnc-note--ok'
                : nn.level === 'plain'
                  ? 'cnc-note--plain'
                  : 'cnc-note--warn')
          }
        >
          <span aria-hidden="true" className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[0.7rem] font-bold">
            {ICON[nn.level] ?? '!'}
          </span>
          <span className="min-w-0">{nn.text}</span>
        </div>
      ))}
    </div>
  );
}
