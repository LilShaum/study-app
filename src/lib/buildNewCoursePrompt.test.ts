import { describe, it, expect } from 'vitest';
import { buildNewCoursePrompt } from './buildNewCoursePrompt';

describe('buildNewCoursePrompt', () => {
  const prompt = buildNewCoursePrompt();

  it('embeds the canonical generator spec from prompts/generator.md', () => {
    // Imported with ?raw so what the app hands out is byte-for-byte the spec
    // the app parses. Assert on distinctive spec content, not just a non-empty
    // string — a silently-empty import would otherwise "pass".
    expect(prompt).toContain('The two obligations');
    expect(prompt).toContain('Build an inventory');
    expect(prompt).toContain('source_excerpt');
    expect(prompt).toContain('distractor_rationale');
    expect(prompt).toContain('schema_version');
  });

  it('carries the coverage rules that stop a thin course', () => {
    expect(prompt).toMatch(/every technical term/i);
    expect(prompt).toMatch(/Audit your own coverage/i);
  });

  it('tells the reader where to put their notes', () => {
    expect(prompt).toMatch(/attach your slides/i);
  });

  it('asks for JSON only', () => {
    expect(prompt).toMatch(/and nothing else/i);
  });

  it('is substantial enough to be the real spec', () => {
    expect(prompt.length).toBeGreaterThan(8000);
  });
});

describe('what the teacher said', () => {
  it('goes into the prompt before the source, only when written', async () => {
    const { buildNewCoursePrompt } = await import('./buildNewCoursePrompt');
    const withNotes = buildNewCoursePrompt('The table on slide 14 is just to illustrate.');
    expect(withNotes).toContain('WHAT MY TEACHER SAID');
    expect(withNotes.indexOf('slide 14')).toBeLessThan(withNotes.indexOf('MY SOURCE MATERIAL'));
    expect(buildNewCoursePrompt('   ')).not.toContain('WHAT MY TEACHER SAID');
  });
});

describe('buildNewCoursePrompt — a deck that follows another lecture', () => {
  const previous = {
    schema_version: '1.0',
    metadata: { title: 'Cell Signaling' },
    sections: [
      {
        id: 'last',
        title: 'Steroid hormones',
        source_range: 'slides 40–48',
        items: [{ id: 'd', type: 'definition', term: 'Aldosterone', definition: 'A mineralocorticoid.', source_excerpt: 'Aldosterone: mineralocorticoid' }],
      },
    ],
  } as never;

  it('lists what the previous lecture ends with, and says what to do with repeated slides', () => {
    const prompt = buildNewCoursePrompt(undefined, previous);
    expect(prompt).toContain('MY PREVIOUS LECTURE');
    expect(prompt).toContain('Steroid hormones (slides 40–48 of that deck)');
    expect(prompt).toContain('Terms already defined: Aldosterone');
    expect(prompt).toContain('Aldosterone: mineralocorticoid');
    expect(prompt).toMatch(/write no items, and do not define its terms again/);
    // Before the student's material, so it is read first.
    expect(prompt.indexOf('MY PREVIOUS LECTURE')).toBeLessThan(prompt.indexOf('MY SOURCE MATERIAL'));
  });

  it('says nothing about it when there is none', () => {
    expect(buildNewCoursePrompt()).not.toContain('MY PREVIOUS LECTURE');
  });
});
