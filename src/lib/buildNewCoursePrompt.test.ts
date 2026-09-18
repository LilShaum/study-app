import { describe, it, expect } from 'vitest';
import { buildNewCoursePrompt } from './buildNewCoursePrompt';

describe('buildNewCoursePrompt', () => {
  const prompt = buildNewCoursePrompt();

  it('embeds the canonical generator spec from CLAUDE.md', () => {
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
