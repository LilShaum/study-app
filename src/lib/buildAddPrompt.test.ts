import { describe, it, expect } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { buildAddPrompt } from './buildAddPrompt';

function course(): Course {
  return {
    schema_version: '1.0',
    metadata: { title: 'Cell Biology', course_code: 'BIO101' },
    sections: [
      {
        id: 's2',
        title: 'Transport',
        order: 2,
        items: [{ id: 'f1', type: 'flashcard', front: 'Define osmosis', back: 'x', tags: ['transport'] } as StudyItem],
      },
      {
        id: 's1',
        title: 'Basics',
        order: 1,
        items: [
          {
            id: 'q1',
            type: 'mcq',
            question: 'What is ATP?',
            options: ['a', 'b', 'c', 'd'],
            correct_index: 0,
            explanation: 'x',
            tags: ['energy'],
          } as StudyItem,
        ],
      },
    ],
  } as Course;
}

describe('buildAddPrompt', () => {
  const prompt = buildAddPrompt(course());

  it('embeds the canonical generator spec from CLAUDE.md', () => {
    // The spec is imported with ?raw so the in-app prompt cannot drift from
    // the format the app parses. If the import silently resolved to nothing,
    // the prompt would still "work" but omit the whole contract — so assert
    // on distinctive spec content, not just a non-empty string.
    expect(prompt).toContain('The two obligations');
    expect(prompt).toContain('Build an inventory');
    expect(prompt).toContain('source_excerpt');
    expect(prompt).toContain('distractor_rationale');
    expect(prompt.length).toBeGreaterThan(2000);
  });

  it('lists existing section ids with their item counts', () => {
    expect(prompt).toContain('id: "s1"');
    expect(prompt).toContain('id: "s2"');
    expect(prompt).toMatch(/id: "s1".*1 items already/);
  });

  it('lists sections in display order, not array order', () => {
    // The course stores s2 first but orders it second.
    expect(prompt.indexOf('id: "s1"')).toBeLessThan(prompt.indexOf('id: "s2"'));
  });

  it('gives the model an id prefix no existing item uses, instead of a partial list of taken ids', () => {
    expect(prompt).toContain('start every new id with "add1_"');
    expect(prompt).not.toContain('already taken');
  });

  it('skips a prefix that an earlier addition already used', () => {
    const added = course();
    added.sections[0].items.push({ id: 'add1_def_1', type: 'definition', term: 't', definition: 'd' } as never);
    expect(buildAddPrompt(added)).toContain('"add2_"');
  });

  it('says which output shape wins over the whole-course contract in the spec', () => {
    expect(prompt).toMatch(/this shape replaces it/);
  });

  it('lists the existing tag vocabulary', () => {
    expect(prompt).toContain('"energy"');
    expect(prompt).toContain('"transport"');
  });

  it('lists covered prompts so the model does not repeat them', () => {
    expect(prompt).toContain('What is ATP?');
    expect(prompt).toContain('Define osmosis');
  });

  it('asks for the fragment shape, not a whole course', () => {
    expect(prompt).toContain('"sections"');
    expect(prompt).toMatch(/do not return the whole course/i);
  });

  it('handles an empty course without crashing', () => {
    const empty = { schema_version: '1.0', metadata: { title: 'Empty' }, sections: [] } as Course;
    const p = buildAddPrompt(empty);
    expect(p).toContain('(no sections yet)');
    expect(p).toContain('(none yet)');
  });
});
