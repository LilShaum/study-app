import { WHATS_NEW, changeDate, type Change } from '@/lib/whatsNew';

/** How many of the latest days show before the rest fold under "Earlier". */
const SHOWN = 3;

function Day({ change }: { change: Change }) {
  return (
    <div>
      <h3 className="mark text-text-3">{changeDate(change.date)}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {change.items.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * What's new, newest first: the last few days open, the rest folded. Only
 * what a student would notice; the lines live in lib/whatsNew.
 */
export function WhatsNew() {
  const latest = WHATS_NEW.slice(0, SHOWN);
  const earlier = WHATS_NEW.slice(SHOWN);
  return (
    <div className="space-y-4">
      {latest.map((c) => (
        <Day key={c.date} change={c} />
      ))}
      {earlier.length > 0 && (
        <details className="group/earlier border-t border-border-light pt-2">
          <summary className="tap-safe flex cursor-pointer list-none items-center text-xs text-text-3 hover:text-text-2">
            <span className="group-open/earlier:hidden">Earlier ▸</span>
            <span className="hidden group-open/earlier:inline">Earlier ▾</span>
          </summary>
          <div className="mt-3 space-y-4">
            {earlier.map((c) => (
              <Day key={c.date} change={c} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
