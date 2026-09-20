import type { ReactNode } from 'react';

export interface SpecimenRow {
  label: string;
  value: ReactNode;
}

/**
 * The label on a mounted specimen.
 *
 * A herbarium sheet does not caption its specimen in a sentence — it carries a
 * small ruled label in fixed fields: what it is, where it came from, what was
 * determined about it. This is the same thing for a course, and it replaces a
 * line of run-together small caps followed by a sentence of statistics.
 *
 * Ruled top and bottom rather than boxed, because it is a label printed on the
 * sheet, not an object sitting on it.
 */
export function SpecimenLabel({ rows, className = '' }: { rows: SpecimenRow[]; className?: string }) {
  const present = rows.filter((r) => r.value !== null && r.value !== undefined && r.value !== '');
  if (!present.length) return null;

  return (
    <dl className={`border-y border-border py-2.5 text-small ${className}`}>
      {present.map((row) => (
        <div key={row.label} className="flex gap-4 py-0.5">
          <dt className="w-16 shrink-0 pt-px text-micro uppercase tracking-wider text-text-3 sm:w-20">
            {row.label}
          </dt>
          <dd className="min-w-0 flex-1 text-text-2">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
