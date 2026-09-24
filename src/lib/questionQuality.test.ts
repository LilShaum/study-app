import { describe, it, expect } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import {
  analyseQuestionQuality,
  asksBeyondRecall,
  isSourceCued,
  lengthBias,
  restatement,
} from './questionQuality';

const mcq = (id: string, options: string[], correct_index: number, extra: Record<string, unknown> = {}): StudyItem =>
  ({
    id,
    type: 'mcq',
    question: 'Which one?',
    options,
    correct_index,
    explanation: 'because',
    distractor_rationale: ['', '', '', ''],
    source_excerpt: 'src',
    ...extra,
  }) as StudyItem;

const course = (items: StudyItem[], sections?: { id: string; title: string; items: StudyItem[] }[]): Course =>
  ({
    schema_version: '1.0',
    metadata: { title: 'T' },
    sections: sections ?? [{ id: 's1', title: 'S', items }],
  }) as Course;

/** Four options of equal length, so nothing is given away by shape. */
const even = ['aaaa', 'bbbb', 'cccc', 'dddd'];

describe('lengthBias', () => {
  it('reports no bias when the correct option is never the longest', () => {
    const items = Array.from({ length: 40 }, (_, n) => mcq(`q${n}`, ['aaaaaaaaaaaa', 'bb', 'cc', 'dd'], 1));
    const b = lengthBias(course(items));
    expect(b.longestIsCorrect).toBe(0);
    expect(b.z).toBeLessThan(0);
  });

  it('stays near chance on evenly matched options', () => {
    // With four equal lengths every option ties for longest, so the correct
    // one always counts — the honest reading is that shape says nothing,
    // which is what the ratio is for.
    const items = Array.from({ length: 40 }, (_, n) => mcq(`q${n}`, even, n % 4));
    const b = lengthBias(course(items));
    expect(b.ratio).toBeCloseTo(1, 5);
    expect(b.lopsided).toEqual([]);
  });

  it('catches the correct answer always being the longest', () => {
    const items = Array.from({ length: 40 }, (_, n) =>
      mcq(`q${n}`, ['a very much longer correct answer indeed', 'bb', 'cc', 'dd'], 0),
    );
    const b = lengthBias(course(items));
    expect(b.longestIsCorrect).toBe(40);
    expect(b.z).toBeGreaterThan(3);
    expect(b.ratio).toBeGreaterThan(2);
  });

  it('names questions with one wildly longer option', () => {
    const b = lengthBias(course([mcq('q1', ['a'.repeat(80), 'bb', 'cc', 'dd'], 1)]));
    expect(b.lopsided).toEqual(['q1']);
  });

  it('is not fooled into dividing by zero on an empty course', () => {
    const b = lengthBias(course([]));
    expect(b).toMatchObject({ mcqs: 0, z: 0, ratio: 1 });
  });
});

describe('restatement', () => {
  it('is high when the question is its own source with a question mark', () => {
    const item = mcq('q1', even, 0, {
      question: 'Hydrophilic messengers travel to the target cell how?',
      options: ['dissolved in extracellular fluid', 'x', 'y', 'z'],
      correct_index: 0,
      source_excerpt: 'Hydrophilic — travel to target cell dissolved in extracellular fluid',
    });
    expect(restatement(item)).toBeGreaterThan(0.7);
  });

  it('is low when the question applies the material instead of repeating it', () => {
    const item = mcq('q1', even, 0, {
      question: 'Given [L] = 2 uM, [R] = 3 uM and [LR] = 1.5 uM, what is Kd?',
      options: ['4 uM', '1 uM', '9 uM', '0.25 uM'],
      correct_index: 0,
      source_excerpt: 'Kd = [L][R] / [LR]. A high-affinity receptor reaches half occupancy sooner.',
    });
    expect(restatement(item)).toBeLessThan(0.3);
  });

  it('returns 0 rather than NaN when there is nothing to compare', () => {
    expect(restatement(mcq('q1', ['', '', '', ''], 0, { question: '' }))).toBe(0);
  });
});

describe('isSourceCued', () => {
  it.each([
    'According to the notes, where does the disturbance act?',
    'Give the four example steroids on the Chemical Messengers slide.',
    'Which two are listed together on one line?',
    'What does this slide say about gap junctions?',
    'What do the slides show about Ras activation?',
  ])('flags %s', (q) => expect(isSourceCued(q)).toBe(true));

  it.each([
    'Which steroid is the branch point for cortisol and testosterone?',
    'What happens to Kd when affinity falls?',
    // "note" inside another word must not trigger it
    'Which receptor is noted for binding noradrenaline?',
    // In histology a slide is the specimen, not the lecture deck.
    'Which stain is applied to the slide before imaging the section?',
    'Why are tissue sections mounted on slides before staining?',
  ])('leaves %s alone', (q) => expect(isSourceCued(q)).toBe(false));
});

describe('asksBeyondRecall', () => {
  it.each([
    'If the sensor stops working, what happens to the variable?',
    'A drug raises the receptor Kd. What does that mean?',
    'How does paracrine signalling differ from autocrine?',
  ])('accepts %s', (q) => expect(asksBeyondRecall(q)).toBe(true));

  it.each(['To which class does thyroxine belong?', 'Name the seven classes of chemical messenger.'])(
    'rejects %s',
    (q) => expect(asksBeyondRecall(q)).toBe(false),
  );
});

describe('analyseQuestionQuality — recall-only sections', () => {
  const recall = (id: string) =>
    mcq(id, even, 0, { question: 'To which class does it belong?' });
  const applied = (id: string) => mcq(id, even, 0, { question: 'If the step is blocked, what happens?' });

  it('names a section where nothing asks beyond recall', () => {
    const q = analyseQuestionQuality(
      course([], [{ id: 's1', title: 'Classes', items: [recall('a'), recall('b'), recall('c'), recall('d')] }]),
    );
    expect(q.recallOnlySections).toEqual(['Classes']);
  });

  it('clears a section as soon as one question applies something', () => {
    const q = analyseQuestionQuality(
      course([], [{ id: 's1', title: 'Classes', items: [recall('a'), recall('b'), recall('c'), applied('d')] }]),
    );
    expect(q.recallOnlySections).toEqual([]);
  });

  it('stays quiet on a section too small to judge', () => {
    const q = analyseQuestionQuality(
      course([], [{ id: 's1', title: 'Tiny', items: [recall('a'), recall('b')] }]),
    );
    expect(q.recallOnlySections).toEqual([]);
  });
});
