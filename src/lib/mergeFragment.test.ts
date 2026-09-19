import { describe, it, expect } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { parseFragment } from '@/schema/fragment';
import { planMerge, applyMerge } from './mergeFragment';
import { allItems } from '@/schema/fragment';

function mcq(id: string, question: string): StudyItem {
  return {
    id,
    type: 'mcq',
    question,
    options: ['a', 'b', 'c', 'd'],
    correct_index: 1,
    explanation: 'because',
  } as StudyItem;
}

function flashcard(id: string, front: string): StudyItem {
  return { id, type: 'flashcard', front, back: 'back' } as StudyItem;
}

function course(): Course {
  return {
    schema_version: '1.0',
    metadata: { title: 'Cell Biology', course_code: 'BIO101' },
    sections: [
      { id: 's1', title: 'Basics', order: 1, items: [mcq('q1', 'What is ATP?')] },
      { id: 's2', title: 'Transport', order: 2, items: [flashcard('f1', 'Define osmosis')] },
    ],
  } as Course;
}

describe('planMerge', () => {
  it('appends into an existing section without touching the course', () => {
    const c = course();
    const plan = planMerge(c, { sections: [{ id: 's1', items: [mcq('q2', 'What is NADH?')] }] });

    expect(plan.totalAdded).toBe(1);
    expect(plan.sections[0]).toMatchObject({ id: 's1', title: 'Basics', isNew: false });
    // planMerge is pure — the original course is untouched until applyMerge.
    expect(c.sections[0].items).toHaveLength(1);
  });

  it('marks an unknown section id as new and carries its title', () => {
    const plan = planMerge(course(), {
      sections: [{ id: 's3', title: 'Respiration', items: [mcq('q9', 'What is glycolysis?')] }],
    });
    expect(plan.sections[0]).toMatchObject({ id: 's3', title: 'Respiration', isNew: true });
  });

  it('falls back to the id when a new section has no title', () => {
    const plan = planMerge(course(), { sections: [{ id: 'respiration', items: [mcq('q9', 'Q?')] }] });
    expect(plan.sections[0].title).toBe('respiration');
  });

  it('renames colliding item ids so progress is not shared', () => {
    // 'q1' already exists — reusing it would make two items share one score.
    const plan = planMerge(course(), { sections: [{ id: 's1', items: [mcq('q1', 'A new question?')] }] });

    expect(plan.totalAdded).toBe(1);
    expect(plan.renamedIds.q1).toBeDefined();
    expect(plan.sections[0].added[0].id).toBe(plan.renamedIds.q1);
    expect(plan.sections[0].added[0].id).not.toBe('q1');
  });

  it('skips items whose prompt the course already covers', () => {
    const plan = planMerge(course(), {
      sections: [{ id: 's1', items: [mcq('q2', 'what IS   atp?!'), mcq('q3', 'Genuinely new?')] }],
    });

    expect(plan.totalAdded).toBe(1);
    expect(plan.totalDuplicates).toBe(1);
    expect(plan.sections[0].added[0].question).toBe('Genuinely new?');
  });

  it('matches duplicates only within the same item type', () => {
    // Same text, different type — a flashcard and an MCQ on one fact are a
    // legitimate pairing, not a duplicate.
    const plan = planMerge(course(), {
      sections: [{ id: 's1', items: [flashcard('f9', 'What is ATP?')] }],
    });
    expect(plan.totalAdded).toBe(1);
    expect(plan.totalDuplicates).toBe(0);
  });

  it('catches duplicates inside the fragment itself', () => {
    const plan = planMerge(course(), {
      sections: [{ id: 's1', items: [mcq('a', 'Same question?'), mcq('b', 'Same question?')] }],
    });
    expect(plan.totalAdded).toBe(1);
    expect(plan.totalDuplicates).toBe(1);
  });

  it('adds duplicates anyway when skipDuplicates is off', () => {
    const plan = planMerge(
      course(),
      { sections: [{ id: 's1', items: [mcq('q2', 'What is ATP?')] }] },
      { skipDuplicates: false },
    );
    expect(plan.totalAdded).toBe(1);
    expect(plan.totalDuplicates).toBe(0);
  });

  it('counts what it adds, by type', () => {
    const plan = planMerge(course(), {
      sections: [{ id: 's1', items: [mcq('n1', 'One?'), mcq('n2', 'Two?'), flashcard('n3', 'Three')] }],
    });
    expect(plan.countsByType).toEqual({ mcq: 2, flashcard: 1 });
  });
});

describe('applyMerge', () => {
  it('appends to the right section and leaves others alone', () => {
    const c = course();
    const plan = planMerge(c, { sections: [{ id: 's2', items: [flashcard('f2', 'Define tonicity')] }] });
    const merged = applyMerge(c, plan);

    expect(merged.sections[0].items).toHaveLength(1);
    expect(merged.sections[1].items).toHaveLength(2);
    expect(merged.sections[1].items[1].id).toBe('f2');
    // Original untouched.
    expect(c.sections[1].items).toHaveLength(1);
  });

  it('appends a brand-new section', () => {
    const c = course();
    const plan = planMerge(c, {
      sections: [{ id: 's3', title: 'Respiration', items: [mcq('q9', 'Glycolysis?')] }],
    });
    const merged = applyMerge(c, plan);

    expect(merged.sections).toHaveLength(3);
    expect(merged.sections[2]).toMatchObject({ id: 's3', title: 'Respiration' });
  });

  it('keeps every item id unique across the merged course', () => {
    const c = course();
    const plan = planMerge(c, {
      sections: [{ id: 's1', items: [mcq('q1', 'New one?'), flashcard('f1', 'New card')] }],
    });
    const ids = allItems(applyMerge(c, plan).sections).map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('refreshes stale metadata counts when the course carried them', () => {
    const c = course();
    c.metadata.total_items = 2;
    c.metadata.item_counts = { mcq: 1, flashcard: 1 };

    const plan = planMerge(c, { sections: [{ id: 's1', items: [mcq('n1', 'New?')] }] });
    const merged = applyMerge(c, plan);

    expect(merged.metadata.total_items).toBe(3);
    expect(merged.metadata.item_counts).toEqual({ mcq: 2, flashcard: 1 });
  });

  it('does not invent metadata counts the course never had', () => {
    const merged = applyMerge(
      course(),
      planMerge(course(), { sections: [{ id: 's1', items: [mcq('n1', 'New?')] }] }),
    );
    expect(merged.metadata.total_items).toBeUndefined();
    expect(merged.metadata.item_counts).toBeUndefined();
  });
});

describe('parseFragment', () => {
  it('accepts the documented fragment shape', () => {
    const r = parseFragment({ sections: [{ id: 's1', items: [mcq('a', 'Q?')] }] }, 's1');
    expect(r.ok).toBe(true);
  });

  it('accepts a whole course file and uses its sections', () => {
    const r = parseFragment(course(), 's1');
    expect(r.ok && r.fragment.sections).toHaveLength(2);
  });

  it('accepts a bare array of items, into the fallback section', () => {
    const r = parseFragment([mcq('a', 'Q?')], 'fallback');
    expect(r.ok && r.fragment.sections?.[0].id).toBe('fallback');
  });

  it('accepts { items: [...] }', () => {
    const r = parseFragment({ items: [mcq('a', 'Q?')] }, 'fallback');
    expect(r.ok && r.fragment.sections?.[0].items).toHaveLength(1);
  });

  it('rejects a malformed item and names the field', () => {
    const r = parseFragment(
      { sections: [{ id: 's1', items: [{ id: 'x', type: 'mcq', question: 'Q?' }] }] },
      's1',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/options|correct_index/);
  });

  it('rejects non-objects', () => {
    expect(parseFragment('nope', 's1').ok).toBe(false);
    expect(parseFragment(null, 's1').ok).toBe(false);
  });
});

describe('planMerge — corrections', () => {
  const broken = {
    id: 'q_key',
    type: 'mcq',
    question: 'Broken?',
    options: ['a', 'b', 'c', 'd'],
    correct_index: 9,
    explanation: '',
  } as unknown as StudyItem;

  const fixed = { ...broken, correct_index: 2, explanation: 'Because c.' } as StudyItem;

  const withBroken = {
    schema_version: '1.0',
    metadata: { title: 'C' },
    sections: [
      { id: 's1', title: 'One', items: [mcq('a', 'First?'), broken] },
      { id: 's2', title: 'Two', items: [mcq('b', 'Second?')] },
    ],
  } as unknown as Course;

  it('matches a correction to the item it replaces and names what changes', () => {
    const plan = planMerge(withBroken, { corrections: [fixed] });
    expect(plan.totalCorrected).toBe(1);
    expect(plan.corrections[0]).toMatchObject({ id: 'q_key', sectionId: 's1' });
    expect(plan.corrections[0].changed.sort()).toEqual(['correct_index', 'explanation']);
  });

  it('replaces in place, keeping the id and the position', () => {
    // The id is how progress is stored, and the position is what a Learn run
    // walks — a fix should move neither.
    const plan = planMerge(withBroken, { corrections: [fixed] });
    const merged = applyMerge(withBroken, plan);
    expect(merged.sections[0].items.map((i) => i.id)).toEqual(['a', 'q_key']);
    const after = merged.sections[0].items[1] as Extract<StudyItem, { type: 'mcq' }>;
    expect(after.correct_index).toBe(2);
    expect(after.explanation).toBe('Because c.');
  });

  it('never adds an item for a correction whose id the course does not have', () => {
    // A model that invents an id is hallucinating, not offering content.
    const plan = planMerge(withBroken, {
      corrections: [{ ...fixed, id: 'does_not_exist' } as StudyItem],
    });
    expect(plan.unmatchedCorrections).toEqual(['does_not_exist']);
    expect(plan.totalCorrected).toBe(0);
    expect(plan.totalAdded).toBe(0);
    expect(applyMerge(withBroken, plan)).toEqual(withBroken);
  });

  it('ignores a correction identical to what is already there', () => {
    const plan = planMerge(withBroken, { corrections: [broken] });
    expect(plan.totalCorrected).toBe(0);
  });

  it('keeps the first when one paste corrects the same item twice', () => {
    const plan = planMerge(withBroken, {
      corrections: [fixed, { ...fixed, explanation: 'Second try.' } as StudyItem],
    });
    expect(plan.totalCorrected).toBe(1);
    const merged = applyMerge(withBroken, plan);
    const after = merged.sections[0].items[1] as Extract<StudyItem, { type: 'mcq' }>;
    expect(after.explanation).toBe('Because c.');
  });

  it('does not let an addition steal the id of an item being corrected', () => {
    const plan = planMerge(withBroken, {
      sections: [{ id: 's1', items: [mcq('q_key', 'A different question?')] }],
      corrections: [fixed],
    });
    expect(plan.renamedIds.q_key).toBeDefined();
    expect(plan.totalCorrected).toBe(1);
    const merged = applyMerge(withBroken, plan);
    const ids = merged.sections.flatMap((s) => s.items).map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('applies additions and corrections from one paste together', () => {
    const plan = planMerge(withBroken, {
      sections: [{ id: 's2', items: [mcq('new1', 'Brand new?')] }],
      corrections: [fixed],
    });
    expect([plan.totalAdded, plan.totalCorrected]).toEqual([1, 1]);
    const merged = applyMerge(withBroken, plan);
    expect(merged.sections[1].items.map((i) => i.id)).toEqual(['b', 'new1']);
    expect((merged.sections[0].items[1] as Extract<StudyItem, { type: 'mcq' }>).correct_index).toBe(2);
  });

  it('leaves a course alone when a fragment carries only corrections that no-op', () => {
    const plan = planMerge(withBroken, { corrections: [] as StudyItem[] });
    expect(applyMerge(withBroken, plan)).toEqual(withBroken);
  });
});

describe('parseFragment — corrections', () => {
  it('accepts a fragment of corrections alone', () => {
    const r = parseFragment(
      { corrections: [{ id: 'q1', type: 'mcq', question: 'Q?', options: ['a', 'b', 'c', 'd'], correct_index: 1 }] },
      's1',
    );
    expect(r.ok && r.fragment.corrections).toHaveLength(1);
  });

  it('accepts additions and corrections together', () => {
    const r = parseFragment(
      {
        sections: [{ id: 's1', items: [{ id: 'n1', type: 'flashcard', front: 'F', back: 'B' }] }],
        corrections: [{ id: 'q1', type: 'mcq', question: 'Q?', options: ['a', 'b', 'c', 'd'], correct_index: 1 }],
      },
      's1',
    );
    expect(r.ok && r.fragment.sections).toHaveLength(1);
    expect(r.ok && r.fragment.corrections).toHaveLength(1);
  });

  it('rejects a fragment that carries neither', () => {
    const r = parseFragment({ sections: [], corrections: [] }, 's1');
    expect(r.ok).toBe(false);
  });
});
