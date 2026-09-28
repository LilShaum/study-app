import { it } from 'vitest';
import { simulate } from './engine';
import { SCENARIOS } from './scenarios';
import { MEMORY } from './student';
import { useStudyLogStore } from '@/store/studyLog';
// @ts-expect-error — a plain .mjs script, checked here rather than typed.
import { readLog, report } from '../scripts/calibrate-log.mjs';

/**
 * Checks scripts/calibrate-log.mjs on a simulated student, whose forgetting is
 * known, before it is trusted with a real one:
 *
 *   SIM_KEEP_LOG=1 npx vitest run --config vitest.sim.config.ts sim/calibrate.sim.ts
 *
 * Runs one month of steady-30 under each truth model with the study log on,
 * and prints the calibration report next to what the truth was.
 */
it.runIf(process.env.SIM_KEEP_LOG)('calibration recovers a known student', () => {
  for (const memory of ['fsrs', 'harsh']) {
    const base = SCENARIOS.find((s) => s.name === 'steady-30')!;
    simulate({ ...base, memory }, 1);
    const log = readLog({ byCourse: useStudyLogStore.getState().byCourse });
    const m = MEMORY[memory];
    console.log(
      `\n=== truth: ${memory} — after a miss, stability ${(m.lapse(null, 1) * 24).toFixed(0)} h for a card never learned, ` +
        `${(m.lapse(2, 1) * 24).toFixed(0)} h for one that held 2 days (ease 1) ===\n` +
        report(log).join('\n'),
    );
  }
});
