import { Fragment, type ReactNode } from 'react';

/**
 * A fenced block: ``` (a language name and a line break after it, or not),
 * the code, ```.
 */
const FENCE = /```(?:[\w+#.-]*\n)?([\s\S]*?)\n?```/g;
const INLINE = /`([^`\n]+)`/g;

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <code key={`${key}.${m.index}`} className="font-mono text-[0.9em]">
        {m[1]}
      </code>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/**
 * An item's text with its code set as code, as a book sets it: `inline` in
 * the fixed-width face, and a block between lines of ``` kept exactly as
 * written, its line breaks and indents with it (a computer science class
 * asks about code; the owner, 2026-10-29). Everything else is plain text, as
 * every field always was: no Markdown, no HTML. Made of React elements, so
 * nothing in a lecture file is ever read as markup, and of phrasing elements
 * only, so it can sit in a paragraph, a button or a label.
 */
export function RichText({ text }: { text: string | undefined | null }): ReactNode {
  const s = String(text ?? '');
  if (!s.includes('`')) return s;
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of s.matchAll(FENCE)) {
    if (m.index > last) out.push(...inline(s.slice(last, m.index), `t${last}`));
    out.push(<CodeBlock key={`b${m.index}`} code={m[1]} />);
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(...inline(s.slice(last), `t${last}`));
  return <Fragment>{out}</Fragment>;
}

/** Code, a matrix or a table of data, exactly as written: scrolled sideways rather than wrapped. */
export function CodeBlock({ code }: { code: string }) {
  return (
    <code className="my-2 block overflow-x-auto whitespace-pre border-l-2 border-border-strong py-1 pl-3 text-left font-mono text-[0.85em] leading-relaxed text-text">
      {code.replace(/^\n+|\s+$/g, '')}
    </code>
  );
}
