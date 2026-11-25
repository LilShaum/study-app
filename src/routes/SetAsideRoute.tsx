import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import type { StudyItem } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { sortedSections } from '@/lib/sortedSections';
import { itemPrompt } from '@/schema/fragment';
import { AddToCourseDialog } from '@/components/AddToCourseDialog';
import { ItemRenderer } from '@/components/items/ItemRenderer';
import { toast } from '@/store/toast';
import { useMediaQuery, WIDE } from '@/lib/useMediaQuery';

type Reason = 'not-needed' | 'wrong';

const GROUPS: { reason: Reason; title: string; note: string }[] = [
  {
    reason: 'not-needed',
    title: 'Not on my exam',
    note: 'Out of Today, Learn, Practice and your figures. Put one back if it turns out you need it.',
  },
  {
    reason: 'wrong',
    title: 'Wrong or badly written',
    note: 'Out of study until fixed. Fix hands these to the AI to rewrite from your notes; a fixed card comes back on its own.',
  },
];

const TYPE_LABEL: Record<StudyItem['type'], string> = {
  mcq: 'Question',
  multi: 'Question',
  flashcard: 'Flashcard',
  definition: 'Term',
  example: 'Example',
  explain: 'Explanation',
  problem: 'Problem',
  graphic: 'Diagram',
};

/** The card in a line: what it asks or names. */
const headline = itemPrompt;

/**
 * "/study/:id/set-aside": every card the student set aside while studying,
 * by reason, each with Put back. Linked from the lecture page whenever there
 * is anything here, and named in the toast that confirms a card was set
 * aside, so nothing goes somewhere the student cannot find.
 */
export function SetAsideRoute() {
  const { id } = useParams<{ id: string }>();
  const course = useCoursesStore((s) => (id ? s.courses[id] : undefined));
  const setAside = useCoursesStore((s) => s.setAside);
  const [fixing, setFixing] = useState(false);
  const wide = useMediaQuery(WIDE);
  // Computer: the card shown beside the list.
  const [picked, setPicked] = useState<string | null>(null);

  if (!id) return <Navigate to="/" replace />;
  if (!course) {
    return (
      <div className="py-6 text-center text-text-2">
        Lecture not found.{' '}
        <Link to="/" className="text-accent hover:underline">
          Back to Library
        </Link>
      </div>
    );
  }

  const aside = sortedSections(course).flatMap((section) =>
    section.items.filter((item) => item.set_aside).map((item) => ({ item, section })),
  );

  // Taking a card back is undoable from the toast, in reach of the thumb.
  const putBack = (rows: { item: StudyItem; section: { id: string } }[]) => {
    for (const { item, section } of rows) setAside(id, section.id, item.id, null);
    toast(rows.length === 1 ? 'Put back.' : `${rows.length} put back.`, {
      type: 'info',
      actionLabel: 'Undo',
      onAction: () => {
        for (const { item, section } of rows) setAside(id, section.id, item.id, item.set_aside?.reason ?? 'not-needed');
      },
    });
  };

  const shownRow = wide ? (aside.find(({ item }) => item.id === picked) ?? aside[0]) : undefined;

  const list = aside.length === 0 ? (
    <p className="mt-8 border-y border-border py-5 text-center text-small text-text-2">Nothing set aside.</p>
  ) : (
    GROUPS.map(({ reason, title, note }) => {
      const rows = aside.filter(({ item }) => item.set_aside?.reason === reason);
      if (!rows.length) return null;
      return (
        <section key={reason} className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="font-display text-heading font-semibold text-text">
              {title} <span className="mark tabular-nums text-text-3">{rows.length}</span>
            </h2>
            <button
              type="button"
              className="tap-safe text-small text-text-3 underline-offset-4 hover:text-text hover:underline"
              onClick={() => putBack(rows)}
            >
              Put all back
            </button>
          </div>
          <p className="mt-1 max-w-prose text-small text-text-2">{note}</p>
          {reason === 'wrong' && (
            <button type="button" className="press tap-safe mt-3" onClick={() => setFixing(true)}>
              Fix these with the AI
            </button>
          )}
          <ul className="mt-3 border-t border-border">
            {rows.map(({ item, section }) => {
              const on = shownRow?.item.id === item.id;
              return (
                <li key={item.id} className="flex items-baseline gap-4 border-b border-border py-3">
                  <div className="min-w-0 flex-1">
                    <p className="mark text-text-3">
                      {TYPE_LABEL[item.type]} · {section.title}
                    </p>
                    {wide ? (
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => setPicked(item.id)}
                        className={`mt-0.5 text-left text-body ${
                          on ? 'text-accent underline decoration-accent decoration-2 underline-offset-4' : 'text-text'
                        }`}
                      >
                        {headline(item)}
                      </button>
                    ) : (
                      <p className="mt-0.5 text-body text-text">{headline(item)}</p>
                    )}
                  </div>
                  <button type="button" className="press tap-safe shrink-0" onClick={() => putBack([{ item, section }])}>
                    Put back
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      );
    })
  );

  return (
    <div>
      <Link to={`/study/${id}`} className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
        ← {course.metadata.title}
      </Link>
      <h1 className="mt-4 font-display text-display font-semibold text-text">Set aside</h1>
      <p className="mt-2 max-w-prose text-small text-text-2">
        Kept in the lecture, out of study.
      </p>

      {wide && aside.length > 0 ? (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,28rem)] gap-x-10">
          <div>{list}</div>
          {/* The card as it reads, beside the list, for the one picked. */}
          {shownRow && (
            <aside
              aria-label="The card"
              className="sticky top-6 mt-8 max-h-[calc(100vh-3rem)] self-start overflow-y-auto border-l border-border pl-10 [scrollbar-width:thin]"
            >
              <p className="mark mb-3 text-text-3">
                {TYPE_LABEL[shownRow.item.type]} · {shownRow.section.title}
              </p>
              <ItemRenderer key={shownRow.item.id} item={shownRow.item} courseId={id} />
            </aside>
          )}
        </div>
      ) : (
        list
      )}
      {fixing && <AddToCourseDialog courseId={id} course={course} initialMode="fix" onClose={() => setFixing(false)} />}
    </div>
  );
}
