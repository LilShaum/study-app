import { describe, expect, it } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { buildFixPrompt, planFixes } from './buildFixPrompt';

const mcq = (id: string, question: string, extra: Record<string, unknown> = {}): StudyItem =>
  ({
    id,
    type: 'mcq',
    question,
    options: ['a', 'b', 'c', 'd'],
    correct_index: 0,
    explanation: 'because',
    distractor_rationale: ['', 'x', 'y', 'z'],
    source_excerpt: 'from the notes',
    ...extra,
  }) as StudyItem;

const def = (id: string, term: string): StudyItem =>
  ({ id, type: 'definition', term, definition: 'd', source_excerpt: `${term} is defined here` }) as StudyItem;

function course(items: StudyItem[], metadata: Record<string, unknown> = {}): Course {
  return {
    schema_version: '1.0',
    metadata: { title: 'Enzymes', ...metadata },
    sections: [{ id: 's1', title: 'Kinetics', items }],
  } as Course;
}

describe('planFixes', () => {
  it('reports terms the generator declared but never defined', () => {
    const plan = planFixes(
      course([def('d1', 'Michaelis constant')], {
        inventory: { terms: ['Michaelis constant', 'turnover number', 'catalytic efficiency'] },
      }),
    );
    expect(plan.missingTerms).toEqual(['turnover number', 'catalytic efficiency']);
    expect(plan.empty).toBe(false);
  });

  it('reports terms that are defined but never tested', () => {
    const plan = planFixes(course([def('d1', 'osmosis'), def('d2', 'tonicity'), mcq('q1', 'Define osmosis?')]));
    expect(plan.untestedTerms).toContain('tonicity');
    expect(plan.untestedTerms).not.toContain('osmosis');
  });

  it('collects the questions a model could actually repair', () => {
    const plan = planFixes(
      course([
        mcq('q_key', 'Broken key?', { correct_index: 9 }),
        mcq('q_rat', 'Misaligned?', { distractor_rationale: ['only one'] }),
        mcq('q_opts', 'Too few?', { options: ['a', 'b'] }),
        mcq('q_fine', 'Fine?'),
      ]),
    );
    expect(plan.faultyItems.map((f) => f.item.id).sort()).toEqual(['q_key', 'q_opts', 'q_rat']);
    expect(plan.faultyItems.find((f) => f.item.id === 'q_key')?.faults).toContain(
      'correct-index-out-of-range',
    );
  });

  it('asks for a definition that spells out its term to be reworded, and a repeat from a new side', () => {
    const plan = planFixes(
      course([
        { id: 'd1', type: 'definition', term: 'Signaling cell', definition: 'The cell that sends a signal.' } as StudyItem,
        { id: 'f1', type: 'flashcard', front: 'Why does feedback inhibition usually target the committed step?', back: 'It wastes nothing.' } as StudyItem,
        { id: 'f2', type: 'flashcard', front: 'Why is the committed step the usual target of feedback inhibition?', back: 'It wastes no intermediates.' } as StudyItem,
      ]),
    );
    expect(plan.faultyItems.find((f) => f.item.id === 'd1')?.faults).toEqual(['gives-away']);
    expect(plan.faultyItems.find((f) => f.item.id === 'f2')?.faults).toEqual(['same-fact']);
    expect(plan.faultyItems.find((f) => f.item.id === 'f1')).toBeUndefined();
    const text = buildFixPrompt(course([{ id: 'd1', type: 'definition', term: 'Signaling cell', definition: 'The cell that sends a signal.' } as StudyItem]));
    expect(text).toMatch(/without the term's words/);
  });

  it('leaves out faults a model cannot fix', () => {
    // Duplicate ids are the app's problem — the merge renames them — and
    // asking a model to "fix" one would just produce a confusing correction.
    const plan = planFixes(course([mcq('q1', 'A?'), mcq('q1', 'B?')]));
    expect(plan.faultyItems).toEqual([]);
  });

  it('is empty for a clean course', () => {
    const plan = planFixes(course([mcq('q1', 'What is osmosis?'), def('d1', 'osmosis')]));
    expect(plan.empty).toBe(true);
  });
});

describe('buildFixPrompt', () => {
  const dirty = course(
    [def('d1', 'Michaelis constant'), mcq('q_key', 'Broken key?', { correct_index: 9 })],
    { inventory: { terms: ['Michaelis constant', 'turnover number'] } },
  );

  it('names the missing term and tells the model it may skip it', () => {
    const prompt = buildFixPrompt(dirty);
    expect(prompt).toContain('turnover number');
    expect(prompt).toMatch(/["“]Not worth an item["”] is a[\s\n]*correct answer/);
    expect(prompt).toMatch(/mentioned once in passing/);
  });

  it('reproduces a faulty question in full so the model can repair it', () => {
    const prompt = buildFixPrompt(dirty);
    expect(prompt).toContain('"id": "q_key"');
    expect(prompt).toContain('answer key points outside the options');
  });

  it('asks for corrections that keep their id, not a regenerated course', () => {
    const prompt = buildFixPrompt(dirty);
    expect(prompt).toContain('"corrections"');
    expect(prompt).toMatch(/keeping its `id`/);
    expect(prompt).toMatch(/Do NOT return the whole course/);
  });

  it('asks for a plain-text verdict before the JSON', () => {
    expect(buildFixPrompt(dirty)).toMatch(/verdict list, before the JSON/);
  });

  it('tells the model to prefer the original notes over the excerpts', () => {
    const prompt = buildFixPrompt(dirty);
    expect(prompt).toMatch(/If this conversation still has my original notes/);
    expect(prompt).toContain('Michaelis constant is defined here');
  });

  it('lists the section ids that new items can go into', () => {
    expect(buildFixPrompt(dirty)).toContain('"s1" — Kinetics');
  });

  it('leaves out a section the course has nothing wrong with', () => {
    // A clean course still builds a prompt (the button is hidden instead),
    // but it should not invent headings for findings that do not exist.
    const prompt = buildFixPrompt(course([mcq('q1', 'What is osmosis?'), def('d1', 'osmosis')]));
    expect(prompt).not.toMatch(/never defined/);
    expect(prompt).not.toMatch(/Cards with something wrong/);
  });
});

describe('cards the student set aside as wrong', () => {
  const flagged = mcq('q9', 'Which is right?', { set_aside: { reason: 'wrong', at: 1 } });
  it('go to the front of the Fix prompt, without the mark', () => {
    const plan = planFixes(course([mcq('q1', 'Fine?'), flagged]));
    expect(plan.faultyItems[0].item.id).toBe('q9');
    expect(plan.faultyItems[0].faults[0]).toBe('student-flagged');
    const prompt = buildFixPrompt(course([flagged]));
    expect(prompt).toContain('I marked it as wrong or badly written');
    expect(prompt).not.toContain('set_aside');
  });

  it('set aside as not needed is not a fault', () => {
    const plan = planFixes(course([mcq('q2', 'Fine?', { set_aside: { reason: 'not-needed', at: 1 } })]));
    expect(plan.faultyItems.some((f) => f.item.id === 'q2')).toBe(false);
  });
});

describe('what the teacher said, kept on the lecture', () => {
  it('goes into Add, More practice and Fix prompts for it', async () => {
    const { buildAddPrompt } = await import('./buildAddPrompt');
    const { buildPractisePrompt } = await import('./buildPractisePrompt');
    const c = course([mcq('q1', 'Fine?')], { student_notes: 'Know the whole pathway on slide 22.' });
    for (const prompt of [buildAddPrompt(c), buildPractisePrompt(c), buildFixPrompt(c)]) {
      expect(prompt).toContain('WHAT MY TEACHER SAID');
      expect(prompt).toContain('slide 22');
    }
  });
});
