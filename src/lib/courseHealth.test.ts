import { describe, it, expect } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { analyseCourseHealth } from './courseHealth';

const mcq = (id: string, question: string, extra: Record<string, unknown> = {}): StudyItem =>
  ({
    id,
    type: 'mcq',
    question,
    options: ['a', 'b', 'c', 'd'],
    correct_index: 0,
    explanation: 'because',
    distractor_rationale: ['', 'x', 'y', 'z'],
    ...extra,
  }) as StudyItem;

const def = (id: string, term: string): StudyItem =>
  ({ id, type: 'definition', term, definition: 'd' }) as StudyItem;

function course(items: StudyItem[], metadata: Record<string, unknown> = {}): Course {
  return {
    schema_version: '1.0',
    metadata: { title: 'T', ...metadata },
    sections: [{ id: 's1', title: 'S', items }],
  } as Course;
}

const find = (h: ReturnType<typeof analyseCourseHealth>, id: string) =>
  h.findings.find((f) => f.id === id);

describe('analyseCourseHealth — structural problems', () => {
  it('flags duplicate item ids as a problem', () => {
    const h = analyseCourseHealth(course([mcq('q1', 'A?'), mcq('q1', 'B?')]));
    expect(find(h, 'duplicate-ids')).toMatchObject({ severity: 'problem' });
    expect(find(h, 'duplicate-ids')?.items).toEqual(['q1']);
  });

  it('flags an out-of-range correct_index as a problem', () => {
    const h = analyseCourseHealth(course([mcq('q1', 'A?', { correct_index: 9 })]));
    expect(find(h, 'correct-index-out-of-range')).toMatchObject({ severity: 'problem' });
  });

  it('flags a misaligned rationale array as a problem', () => {
    // 3 rationales for 4 options shows the wrong reason under the wrong option.
    const h = analyseCourseHealth(course([mcq('q1', 'A?', { distractor_rationale: ['', 'x', 'y'] })]));
    expect(find(h, 'rationale-misaligned')).toMatchObject({ severity: 'problem' });
  });

  it('flags filler options and missing explanations as warnings', () => {
    const h = analyseCourseHealth(
      course([mcq('q1', 'A?', { options: ['a', 'b', 'c', 'All of the above'], explanation: '' })]),
    );
    expect(find(h, 'filler-options')).toMatchObject({ severity: 'warning' });
    expect(find(h, 'no-explanation')).toMatchObject({ severity: 'warning' });
  });

  it('flags two items of one type asking the same thing', () => {
    const h = analyseCourseHealth(course([mcq('q1', 'What is ATP?'), mcq('q2', 'what  IS atp?!')]));
    expect(find(h, 'duplicate-prompts')?.items).toEqual(['q2']);
  });

  it('does not treat the same prompt in different types as a duplicate', () => {
    const h = analyseCourseHealth(
      course([mcq('q1', 'ATP'), { id: 'f1', type: 'flashcard', front: 'ATP', back: 'x' } as StudyItem]),
    );
    expect(find(h, 'duplicate-prompts')).toBeUndefined();
  });

  it('flags a question that does not have four options', () => {
    const h = analyseCourseHealth(course([mcq('q1', 'A?', { options: ['a', 'b'] })]));
    expect(find(h, 'option-count')).toMatchObject({ severity: 'warning', items: ['q1'] });
  });

  it('does not flag the contract\u2019s four options', () => {
    expect(find(analyseCourseHealth(course([mcq('q1', 'A?')])), 'option-count')).toBeUndefined();
  });

  it('flags a stale total_items claim', () => {
    const h = analyseCourseHealth(course([mcq('q1', 'A?')], { total_items: 99 }));
    expect(find(h, 'stale-total')?.message).toContain('99');
  });

  it('flags a diagram carrying script', () => {
    const h = analyseCourseHealth(
      course([{ id: 'g1', type: 'graphic', title: 'G', svg: '<svg onload="x()"></svg>' } as StudyItem]),
    );
    expect(find(h, 'unsafe-svg')).toMatchObject({ severity: 'warning' });
  });

  it('reports a clean course as clean', () => {
    const h = analyseCourseHealth(course([mcq('q1', 'A?'), mcq('q2', 'B?')]));
    expect(h.findings).toHaveLength(0);
    expect(h.problems).toBe(0);
  });
});

describe('analyseCourseHealth — coverage against the declared inventory', () => {
  const withInventory = (items: StudyItem[], terms: string[]) =>
    course(items, { inventory: { terms } });

  it('holds the generator to the term list it declared', () => {
    const h = analyseCourseHealth(
      withInventory([def('d1', 'Michaelis constant'), mcq('q1', 'What is the Michaelis constant?')], [
        'Michaelis constant',
        'turnover number',
        'catalytic efficiency',
      ]),
    );
    expect(h.declaredTermCoverage).toMatchObject({ covered: 1, total: 3 });
    expect(h.declaredTermCoverage?.missing).toEqual(['turnover number', 'catalytic efficiency']);
    expect(find(h, 'declared-terms-missing')).toMatchObject({ severity: 'warning' });
  });

  it('does not count a term the notes only mention as missing', () => {
    const h = analyseCourseHealth(
      course([def('d1', 'Michaelis constant')], { inventory: { terms: ['Michaelis constant', 'Purkinje neuron'], mentioned: ['Purkinje neuron'] } }),
    );
    expect(h.declaredTermCoverage).toMatchObject({ covered: 1, total: 1 });
    expect(find(h, 'declared-terms-missing')).toBeUndefined();
  });

  it('names the figures the generator could not read, so the student checks them', () => {
    const h = analyseCourseHealth(course([def('d1', 'Axon')], { inventory: { unclear_figures: ['slide 12: small labels on the vertebra'] } }));
    expect(find(h, 'unclear-figures')?.message).toMatch(/one figure.*slide 12: small labels on the vertebra/);
    expect(find(analyseCourseHealth(course([def('d1', 'Axon')])), 'unclear-figures')).toBeUndefined();
  });

  it('matches a declared term against a longer definition title', () => {
    const h = analyseCourseHealth(withInventory([def('d1', 'Km (Michaelis constant)')], ['Km']));
    expect(h.declaredTermCoverage).toMatchObject({ covered: 1, total: 1 });
  });

  it('matches a declared singular against a plural definition title', () => {
    // Real case: generator declared "isozyme", titled the definition "Isozymes".
    const h = analyseCourseHealth(withInventory([def('d1', 'Isozymes')], ['isozyme']));
    expect(h.declaredTermCoverage?.missing).toEqual([]);
  });

  it('matches through a parenthetical inserted into the definition title', () => {
    // Real case: declared "concerted model", titled "Concerted (MWC) model".
    const h = analyseCourseHealth(withInventory([def('d1', 'Concerted (MWC) model')], ['concerted model']));
    expect(h.declaredTermCoverage?.missing).toEqual([]);
  });

  it('folds subscripts so a term is not reduced to one letter', () => {
    const h = analyseCourseHealth(withInventory([def('d1', 'v\u2080 (initial velocity)')], ['v\u2080']));
    expect(h.declaredTermCoverage?.missing).toEqual([]);
  });

  it('folds accents so a transliterated term still matches', () => {
    // Real case: the transcript said "Némethy", the generator wrote
    // "Nemethy". Stripping the accent instead of folding it split the word
    // into two tokens and reported a covered term as missing.
    const h = analyseCourseHealth(
      withInventory([def('d1', 'Koshland-Nemethy-Filmer')], ['Koshland–Némethy–Filmer']),
    );
    expect(h.declaredTermCoverage?.missing).toEqual([]);
  });

  it('does not count a substring collision as coverage', () => {
    // "Ki" must not be satisfied by a definition of "kinase" — a false pass
    // here would report coverage the course does not have.
    const h = analyseCourseHealth(withInventory([def('d1', 'kinase')], ['Ki']));
    expect(h.declaredTermCoverage?.missing).toEqual(['Ki']);
  });

  it('reports no coverage figure when the generator declared nothing', () => {
    const h = analyseCourseHealth(course([mcq('q1', 'A?')]));
    expect(h.declaredTermCoverage).toBeNull();
    expect(find(h, 'declared-terms-missing')).toBeUndefined();
  });

  it('flags terms that are defined but never tested', () => {
    const h = analyseCourseHealth(course([def('d1', 'osmosis'), def('d2', 'tonicity'), mcq('q1', 'Define osmosis?')]));
    const f = find(h, 'untested-terms');
    expect(f?.message).toContain('tonicity');
    expect(f?.message).not.toContain('osmosis,');
  });

  it('flags a course where almost nothing can be scored', () => {
    const h = analyseCourseHealth(course([def('d1', 'a'), def('d2', 'b'), def('d3', 'c'), mcq('q1', 'Q?')]));
    expect(find(h, 'low-gradable')?.message).toContain('25%');
  });
});

describe('analyseCourseHealth — what a sitting would ask', () => {
  it('lists a definition that spells out its own term', () => {
    const giveaway = { id: 'd1', type: 'definition', term: 'Guard cell', definition: 'The cell that guards a stoma.' } as StudyItem;
    const fine = { id: 'd2', type: 'definition', term: 'Stoma', definition: 'A pore in the leaf surface through which gases pass.' } as StudyItem;
    expect(find(analyseCourseHealth(course([giveaway, fine])), 'gives-away')?.items).toEqual(['d1']);
  });

  it('lists the second of two cards on one fact, not the first', () => {
    const h = analyseCourseHealth(
      course([
        { id: 'f1', type: 'flashcard', front: 'What range do typical Km values fall in?', back: 'Between 10⁻⁶ and 10⁻¹ M.' } as StudyItem,
        mcq('q1', 'Typical Km values for enzymes fall in which range?', { options: ['10⁻⁶ to 10⁻¹ M', 'b', 'c', 'd'] }),
      ]),
    );
    expect(find(h, 'same-fact')?.items).toEqual(['q1']);
  });

  it('leaves a contrast alone', () => {
    const h = analyseCourseHealth(
      course([
        { id: 'f1', type: 'flashcard', front: 'What does a competitive inhibitor do to apparent Km and apparent Vmax?', back: 'Apparent Km increases; Vmax is unchanged.' } as StudyItem,
        { id: 'f2', type: 'flashcard', front: 'What does a mixed inhibitor do to apparent Km and apparent Vmax?', back: 'Apparent Km may increase or decrease; apparent Vmax decreases.' } as StudyItem,
      ]),
    );
    expect(find(h, 'same-fact')).toBeUndefined();
  });
});

describe('analyseCourseHealth — key terms asked one way', () => {
  it('lists a term from a section title with only one card on it', () => {
    const c = {
      schema_version: '1.0',
      metadata: { title: 'T' },
      sections: [
        {
          id: 's1',
          title: 'Osmosis',
          items: [
            { id: 'd1', type: 'definition', term: 'Osmosis', definition: 'Water moving down its gradient across a membrane.' },
            { id: 'f1', type: 'flashcard', front: 'What drives osmosis?', back: 'A difference in solute concentration.' },
          ],
        },
      ],
    } as Course;
    expect(find(analyseCourseHealth(c), 'thin-key-terms')?.message).toMatch(/Osmosis/);
  });
});

describe('analyseCourseHealth — thin key terms, by any of their names and only where asked', () => {
  const lecture = (items: StudyItem[]) =>
    ({ schema_version: '1.0', metadata: { title: 'T' }, sections: [{ id: 's1', title: 'The rate equation and Km', items }] }) as Course;
  const defKm = { id: 'd1', type: 'definition', term: 'Michaelis constant (Km)', definition: 'The substrate concentration at half the maximum rate.' } as StudyItem;
  const ask = (id: string, question: string, answer: string) =>
    ({ id, type: 'mcq', question, options: [answer, 'b', 'c', 'd'], correct_index: 0, explanation: 'Km appears here too.', distractor_rationale: ['', 'x', 'y', 'z'] }) as StudyItem;

  it('counts a term named in its section title by its short name', () => {
    const c = lecture([defKm, ask('q1', 'What does a low Km tell you about an enzyme?', 'It is half saturated at a low concentration')]);
    expect(find(analyseCourseHealth(c), 'thin-key-terms')?.message).toMatch(/Michaelis constant \(Km\)/);
  });

  it('does not count a question that only mentions the term in an option or explanation', () => {
    const c = lecture([
      defKm,
      ask('q1', 'What does a low Km tell you about an enzyme?', 'It is half saturated at a low concentration'),
      { ...ask('q2', 'Which plot gives a straight line?', 'Lineweaver–Burk'), options: ['Lineweaver–Burk', 'Km against Vmax', 'c', 'd'] } as StudyItem,
    ]);
    expect(find(analyseCourseHealth(c), 'thin-key-terms')?.message).toMatch(/Michaelis constant/);
    const twice = lecture([defKm, ask('q1', 'What does a low Km tell you?', 'High affinity'), ask('q2', 'Two enzymes differ only in Km. Which is faster at low substrate?', 'The one with the lower Km')]);
    expect(find(analyseCourseHealth(twice), 'thin-key-terms')).toBeUndefined();
  });
});

describe('analyseCourseHealth — an MCQ that asks a term back from its definition', () => {
  it('is listed; one on what the definition leaves out is not', () => {
    const items = [
      { id: 'd1', type: 'definition', term: 'Transpiration pull', definition: 'The upward pull on water created as it evaporates from the leaves.' },
      mcq('q1', 'Water evaporating from the leaves creates an upward pull on it. What is this called?', { options: ['Transpiration pull', 'Root pressure', 'Capillarity', 'Guttation'] }),
      mcq('q2', 'Why does transpiration pull fail in a plant whose xylem has an air bubble?', { options: ['The water column breaks', 'b', 'c', 'd'] }),
    ] as StudyItem[];
    expect(find(analyseCourseHealth(course(items)), 'mcq-restates-definition')?.items).toEqual(['q1']);
  });
});

describe('analyseCourseHealth: wrong options with no reason', () => {
  it('lists questions with a wrong option that has no reason, or no reasons at all', () => {
    const h = analyseCourseHealth(
      course([mcq('ok', 'A?'), mcq('gap', 'B?', { distractor_rationale: ['', 'x', ' ', 'z'] }), mcq('none', 'C?', { distractor_rationale: undefined })]),
    );
    expect(find(h, 'rationale-missing')).toMatchObject({ severity: 'warning', items: ['gap', 'none'] });
  });

  it('leaves a misaligned array to its own finding', () => {
    const h = analyseCourseHealth(course([mcq('q', 'A?', { distractor_rationale: ['', 'x'] })]));
    expect(find(h, 'rationale-missing')).toBeUndefined();
  });
});

describe('analyseCourseHealth: questions to write out', () => {
  const written = (id: string, back: string): StudyItem => ({ id, type: 'flashcard', front: `${id}?`, back, tags: ['short-answer'] }) as StudyItem;

  it('flags a list of bare words asked as a written answer, not one that explains', () => {
    const h = analyseCourseHealth(
      course([
        written('list', '(1) Iron. (2) Zinc. (3) Iodine.'),
        written('ok', '(1) Iron carries oxygen in haemoglobin, so too little means tiredness. (2) Zinc is needed by many enzymes, so wounds heal slowly without it.'),
      ]),
    );
    expect(find(h, 'written-list')).toMatchObject({ severity: 'warning', items: ['list'] });
  });

  it('flags a section with more than two, naming the ones past two', () => {
    const long = (id: string) => written(id, `(1) ${id} happens because one thing leads to another. (2) And then it finishes for a stated reason.`);
    const h = analyseCourseHealth(course([long('a'), long('b'), long('c'), long('d')]));
    expect(find(h, 'written-many')?.items).toEqual(['c', 'd']);
    expect(find(analyseCourseHealth(course([long('a'), long('b')])), 'written-many')).toBeUndefined();
  });
});
