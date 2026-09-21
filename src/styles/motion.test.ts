import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(SRC, 'styles/index.css'), 'utf8');

/** The `prefers-reduced-motion: reduce` block, brace-matched. */
function reducedMotionBlock(): string {
  const at = css.indexOf('@media (prefers-reduced-motion: reduce)');
  expect(at).toBeGreaterThan(-1);
  let depth = 0;
  for (let i = css.indexOf('{', at); i < css.length; i++) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(at, i + 1);
    }
  }
  throw new Error('unterminated reduced-motion block');
}

describe('reduced motion', () => {
  const block = reducedMotionBlock();

  it('collapses duration AND delay', () => {
    // Zeroing only the duration leaves a delayed animation holding its
    // `from` state for the whole delay, which for the session tree meant the
    // crown sat invisible for 650ms and then appeared. A flash is precisely
    // what this preference asks us to avoid.
    expect(block).toMatch(/animation-duration:\s*0/);
    expect(block).toMatch(/transition-duration:\s*0/);
    expect(block).toMatch(/animation-delay:\s*0/);
  });

  it('stops the limbs swinging rather than making them swing instantly', () => {
    // A zero-duration transition still moves: eleven groups jumping five
    // degrees at once is more startling than the drift it replaced. Which
    // branch is held is said twice more without motion — heavier stroke on
    // the held limb, and the rest dimmed.
    expect(block).toMatch(/\.limb-set\s*\{[^}]*transform:\s*none\s*!important/);
  });
});

describe('script-driven scrolling', () => {
  it('never hardcodes smooth behaviour', () => {
    // An explicit `behavior` option beats the scroll-behavior property, so a
    // hardcoded 'smooth' scrolls smoothly however the reader has set their
    // system. Every such call goes through lib/motion.ts instead.
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) {
          // Comments stripped first: prose describing the rule is not a
          // breach of it, and a guard that cannot tell the difference is one
          // that gets weakened the first time it misfires.
          const code = fs
            .readFileSync(full, 'utf8')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:])\/\/.*$/gm, '$1');
          if (/behavior:\s*['"]smooth['"]/.test(code)) offenders.push(path.relative(SRC, full));
        }
      }
    };
    walk(SRC);
    expect(offenders).toEqual([]);
  });
});
