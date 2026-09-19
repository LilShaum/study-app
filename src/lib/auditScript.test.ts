import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Regression tests for scripts/audit-course.mjs.
 *
 * The auditor is the tool that decides whether a generated course is honest,
 * so a bug in it is worse than no tool: two false-positive classes have
 * already been found by hand (a `\b` that matched `stroke-width`, and a
 * contiguous-quote rule that rejected faithfully quoted tables). Both are
 * pinned below.
 *
 * It runs as a subprocess because that is how it is actually used — this
 * exercises the real argv parsing and exit codes, not an importable subset.
 */
const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/audit-course.mjs');
const FIXTURES = path.join(ROOT, 'scripts/__fixtures__');
const CLEAN = path.join(FIXTURES, 'clean.study.json');
const SOURCE = path.join(FIXTURES, 'source.txt');

interface Result {
  code: number;
  out: string;
}

function audit(...args: string[]): Result {
  try {
    return { code: 0, out: execFileSync('node', [SCRIPT, ...args], { encoding: 'utf8' }) };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { code: err.status ?? 1, out: (err.stdout ?? '') + (err.stderr ?? '') };
  }
}

/** Writes a mutated copy of the clean fixture to a temp file. */
let tmpDir: string;
beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-test-'));
});
afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function mutated(name: string, mutate: (course: Record<string, never>) => void): string {
  const course = JSON.parse(fs.readFileSync(CLEAN, 'utf8'));
  mutate(course);
  const file = path.join(tmpDir, `${name}.study.json`);
  fs.writeFileSync(file, JSON.stringify(course));
  return file;
}

describe('audit-course.mjs — a good course passes', () => {
  const clean = audit(CLEAN, SOURCE);

  it('exits 0 with no hard failures', () => {
    expect(clean.out).toContain('No hard failures');
    expect(clean.code).toBe(0);
  });

  it('confirms every excerpt traces to the source', () => {
    expect(clean.out).toMatch(/✓ every source_excerpt traces to the source/);
  });

  it('accepts a faithfully reconstructed table row as a warning, not a failure', () => {
    // q2 quotes a table: "Active transport | Requires ATP: Yes | ...". The PDF
    // text layer separates cell from header, so it has no contiguous run.
    expect(clean.out).toMatch(/not a contiguous quote but every word appears/);
    expect(clean.out).toContain('q2');
    expect(clean.code).toBe(0);
  });

  it('uses the declared inventory when no --terms file is given', () => {
    expect(clean.out).toMatch(/every expected term has a definition \(the course's own declared inventory\) — 3\/3/);
  });
});

describe('audit-course.mjs — real defects are caught', () => {
  it('catches a fabricated excerpt', () => {
    const file = mutated('fabricated', (c) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c as any).sections[0].items[0].source_excerpt =
        'Osmosis is driven by a sodium-potassium pump consuming four ATP per cycle.';
    });
    const r = audit(file, SOURCE);
    expect(r.out).toMatch(/NOT FOUND/);
    expect(r.out).toContain('d1');
    expect(r.code).toBe(1);
  });

  it('catches a duplicated item id', () => {
    const file = mutated('dupid', (c) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c as any).sections[0].items[1].id = 'd1';
    });
    const r = audit(file, SOURCE);
    expect(r.out).toMatch(/repeated: d1/);
    expect(r.code).toBe(1);
  });

  it('catches a misaligned distractor_rationale', () => {
    const file = mutated('rationale', (c) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c as any).sections[0].items[3].distractor_rationale = ['', 'only one'];
    });
    const r = audit(file, SOURCE);
    expect(r.out).toMatch(/distractor_rationale is index-aligned/);
    expect(r.code).toBe(1);
  });

  it('catches an inflated total_items', () => {
    const file = mutated('total', (c) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c as any).metadata.total_items = 999;
    });
    const r = audit(file, SOURCE);
    expect(r.out).toMatch(/metadata\.total_items \(999\)/);
    expect(r.code).toBe(1);
  });

  it('catches a term the course declared but never defined', () => {
    const file = mutated('inventory', (c) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c as any).metadata.inventory.terms.push('facilitated diffusion');
    });
    const r = audit(file, SOURCE);
    expect(r.out).toMatch(/uncovered: facilitated diffusion/);
    expect(r.code).toBe(1);
  });

  it('catches an SVG carrying script', () => {
    const file = mutated('svg', (c) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c as any).sections[0].items.push({
        id: 'g1',
        type: 'graphic',
        title: 'Bad',
        alt_text: 'x',
        svg: '<svg viewBox="0 0 10 10" onload="alert(1)"><script>fetch("//evil")</script></svg>',
        source_excerpt: 'Osmosis is the net movement of water across a semipermeable membrane',
      });
    });
    const r = audit(file, SOURCE);
    expect(r.out).toMatch(/no script, event handlers or external refs/);
    expect(r.code).toBe(1);
  });
});

describe('audit-course.mjs — the false positives it used to produce', () => {
  it('does not mistake stroke-width for a fixed canvas size', () => {
    const file = mutated('strokewidth', (c) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c as any).sections[0].items.push({
        id: 'g_ok',
        type: 'graphic',
        title: 'Fine',
        alt_text: 'a line',
        // No width/height on <svg>; stroke-width is a line weight, not a size.
        svg: '<svg viewBox="0 0 100 20"><line x1="0" y1="10" x2="100" y2="10" stroke="currentColor" stroke-width="2"/></svg>',
        source_excerpt: 'Osmosis is the net movement of water across a semipermeable membrane',
      });
    });
    const r = audit(file, SOURCE);
    expect(r.out).toMatch(/✓ g_ok: svg has no fixed pixel size/);
  });

  it('still flags a genuinely fixed-size SVG', () => {
    const file = mutated('fixedsize', (c) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c as any).sections[0].items.push({
        id: 'g_fixed',
        type: 'graphic',
        title: 'Fixed',
        alt_text: 'a line',
        svg: '<svg viewBox="0 0 100 20" width="300" height="60"><line x1="0" y1="10" x2="100" y2="10" stroke="currentColor"/></svg>',
        source_excerpt: 'Osmosis is the net movement of water across a semipermeable membrane',
      });
    });
    const r = audit(file, SOURCE);
    expect(r.out).toMatch(/! g_fixed: svg has no fixed pixel size/);
  });

  it('runs without a source file, warning instead of crashing', () => {
    const r = audit(CLEAN);
    expect(r.out).toMatch(/no source file given/);
    expect(r.code).toBe(0);
  });
});
