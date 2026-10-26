import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import type { StudyItem } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { sortedSections } from '@/lib/sortedSections';
import { AddToCourseDialog } from '@/components/AddToCourseDialog';

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
  flashcard: 'Flashcard',
  definition: 'Term',
  example: 'Example',
  explain: 'Explanation',
  graphic: 'Diagram',
};

/** The card in a line: what it asks or names. */
function headline(item: StudyItem): string {
  switch (item.type) {
    case 'mcq':
      return item.question;
    case 'flashcard':
      return item.front;
    case 'definition':
      return item.term;
    default:
      return item.title;
  }
}

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

  return (
    <div>
      <Link to={`/study/${id}`} className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
        ← {course.metadata.title}
      </Link>
      <h1 className="mt-4 font-display text-display font-semibold text-text">Set aside</h1>
      <p className="mt-2 max-w-prose text-small text-text-2">
        Cards you set aside with <span className="text-text">Not needed?</span> while studying. They are kept in the
        lecture, just out of study.
      </p>

      {aside.length === 0 ? (
        <p className="mt-8 border-y border-border py-5 text-center text-small text-text-2">
          Nothing set aside. Under any card while you study, Not needed? sets it aside here.
        </p>
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
                  onClick={() => rows.forEach(({ item, section }) => setAside(id, section.id, item.id, null))}
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
                {rows.map(({ item, section }) => (
                  <li key={item.id} className="flex items-baseline gap-4 border-b border-border py-3">
                    <div className="min-w-0 flex-1">
                      <p className="mark text-text-3">
                        {TYPE_LABEL[item.type]} · {section.title}
                      </p>
                      <p className="mt-0.5 text-body text-text">{headline(item)}</p>
                    </div>
                    <button
                      type="button"
                      className="press tap-safe shrink-0"
                      onClick={() => setAside(id, section.id, item.id, null)}
                    >
                      Put back
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
      {fixing && <AddToCourseDialog courseId={id} course={course} initialMode="fix" onClose={() => setFixing(false)} />}
    </div>
  );
}
