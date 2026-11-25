import type { ReactNode } from 'react';

/**
 * One step of a prompt screen (New lecture, Add to a lecture): its number
 * and the task in the heading, then the controls. The rest of
 * what a student might want to know folds behind a "more" line (the owner,
 * 2026-10-29: "massive blocks of text … not intuitive for new users").
 */
export function PromptStep({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section>
      {/* The heading is the step's whole task, read as a sentence: reading
          only the headings gets a student through (the owner, 2026-11-25).
          It was a grey small-caps label, which suited a name ("Copy the
          prompt") and not a task. */}
      <h3 className="mb-2.5 flex items-baseline gap-2.5 font-display text-body font-semibold text-text">
        <span className="mark shrink-0 text-accent">{n}</span>
        <span>{title}</span>
      </h3>
      {children}
    </section>
  );
}

/**
 * A step's choices as a specimen label: ruled rows, each named in small caps,
 * the name above on a phone and to the left on a computer
 * (docs/proposals/new-lecture-screen.md). `Rows` holds them.
 */
export function Rows({ children }: { children: ReactNode }) {
  return <div className="border-t border-border">{children}</div>;
}
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-border py-3 sm:grid sm:grid-cols-[4.25rem_minmax(0,1fr)] sm:gap-4">
      <div className="mark mb-1.5 text-text-3 sm:mb-0 sm:pt-1">{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
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
 * The steps of making or adding to a lecture, in one column on every screen.
 * Side by side on a computer was tried (2026-11-25): a step's Copy button
 * landed across the page from its own words and the right column sat empty
 * until a reply came back. The steps are a sequence, read down a page.
 */
export function PromptBody({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="space-y-6 px-5 py-4">
      {left}
      {right}
    </div>
  );
}
