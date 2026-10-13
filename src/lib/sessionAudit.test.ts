import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CourseSchema, type Course } from '@/schema/course';
import { buildSessionItems } from './buildSessionItems';
import { auditSession, formatAudit, formatWalk } from './sessionAudit';

/**
 * The order a student meets, held on the test lectures
 * (docs/proposals/content-quality.md). Each rule is something the owner
 * found in one real sitting that screenshots of single cards had missed.
 */
const load = (name: string): Course => CourseSchema.parse(JSON.parse(readFileSync(`scripts/__fixtures__/${name}.study.json`, 'utf8')));
const COURSES = ['biochem', 'clean'] as const;
const NOW = Date.UTC(2026, 9, 13, 9);

describe.each(COURSES)('a sitting of %s', (name) => {
  const course = load(name);
  const sittings = {
    learn: buildSessionItems(course, 'learn', { now: NOW }),
    today: buildSessionItems(course, 'today', { now: NOW, minutes: 60, progress: {} }),
  };

  for (const [mode, items] of Object.entries(sittings)) {
    const audit = auditSession(items);
    if (process.env.AUDIT_PRINT) console.log(formatAudit(`${name} ${mode}`, audit));

    it(`${mode}: never asks for a term its own definition spells out`, () => {
      expect(audit.giveawaysAsked).toEqual([]);
    });
    it(`${mode}: never shows an answer and then asks for it`, () => {
      expect(audit.shownThenAsked).toBe(0);
    });
    it(`${mode}: never asks a card in the step of one that answers it`, () => {
      expect(audit.sameFactInStep).toEqual([]);
    });
    it(`${mode}: asks more than it reads`, () => {
      expect(audit.readingShare).toBeLessThan(0.5);
    });
  }
});

// AUDIT_COURSE=/path/to/lecture.study.json npx vitest run src/lib/sessionAudit.test.ts --reporter=verbose
// prints the audit and the whole walk of a real lecture, kept outside the repo.
describe.runIf(!!process.env.AUDIT_COURSE)('a real lecture', () => {
  it('prints its Learn and a 60-minute Today', () => {
    const course = CourseSchema.parse(JSON.parse(readFileSync(process.env.AUDIT_COURSE!, 'utf8')));
    for (const [mode, items] of [
      ['learn', buildSessionItems(course, 'learn', { now: NOW })],
      ['today', buildSessionItems(course, 'today', { now: NOW, minutes: 60, progress: {} })],
    ] as const) {
      console.log(formatAudit(mode, auditSession(items)));
      console.log(formatWalk(items));
    }
  });
});
