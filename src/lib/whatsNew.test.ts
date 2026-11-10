import { describe, expect, it } from 'vitest';
import { WHATS_NEW, changeDate } from './whatsNew';

describe("What's new", () => {
  it('lists real dates, newest first, each once', () => {
    const dates = WHATS_NEW.map((c) => c.date);
    for (const d of dates) {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(new Date(`${d}T12:00:00`).getTime())).toBe(false);
    }
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(new Set(dates).size).toBe(dates.length);
  });

  // The owner asked for it "really concise": a few one-sentence lines a day.
  it('keeps every day short and every line one plain sentence', () => {
    for (const c of WHATS_NEW) {
      expect(c.items.length).toBeGreaterThan(0);
      expect(c.items.length).toBeLessThanOrEqual(5);
      for (const line of c.items) {
        expect(line.length).toBeLessThanOrEqual(150);
        expect(line).toMatch(/[.]$/);
        expect(line).not.toMatch(/—/);
      }
    }
  });

  it('names the day, and the year only when it is not this one', () => {
    const now = new Date('2026-11-10T12:00:00');
    expect(changeDate('2026-11-03', now)).toBe('3 November');
    expect(changeDate('2025-12-31', now)).toBe('31 December 2025');
  });
});
