import type { ReactNode } from 'react';

/**
 * One step of a prompt screen (New lecture, Add to a lecture): its number
 * and name set as a label, then what to do, in a line or two. The rest of
 * what a student might want to know folds behind a "more" line (the owner,
 * 2026-10-29: "massive blocks of text … not intuitive for new users").
 */
export function PromptStep({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mark mb-2 flex items-baseline gap-2 text-text-3">
        <span className="text-accent">{n}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

/** A line that unfolds the rest: the reasons, the details, the options most never need. */
export function More({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="mt-3">
      <summary className="tap-safe cursor-pointer text-sm text-text-3 hover:text-text">{label}</summary>
      <div className="mt-2 space-y-3 text-sm text-text-2">{children}</div>
    </details>
  );
}
