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

/**
 * A prompt screen's two halves. On a phone one column, in the order of the
 * steps; on a computer side by side, a rule between them: left what to
 * choose and what to do in the AI chat, right what you act on (Copy, then
 * the file or reply coming back), so the instruction and the place for its
 * answer are in view together.
 */
export function PromptColumns({ wide, left, right }: { wide: boolean; left: ReactNode; right: ReactNode }) {
  if (!wide) {
    return (
      <div className="space-y-6 px-5 py-4">
        {left}
        {right}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2">
      <div className="space-y-6 px-5 py-4">{left}</div>
      <div className="space-y-6 border-l border-border px-5 py-4">{right}</div>
    </div>
  );
}
