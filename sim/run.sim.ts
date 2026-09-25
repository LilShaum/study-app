import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { simulate } from './engine';
import { markdown, summarise, type Summary } from './report';
import { SCENARIOS } from './scenarios';

/**
 * npm run sim                       the whole suite, 3 seeds, compared with sim/baseline.json
 * SIM_ONLY=steady-30,busy-20 npm run sim
 * SIM_SEEDS=5 npm run sim
 * npm run sim:baseline              run and save the result as the new baseline
 *
 * Writes sim/results/latest.md (read this) and latest.json.
 */
it('simulate', () => {
  // Nothing here needs to persist, and serialising all progress to
  // localStorage on every answer is most of the run time.
  Storage.prototype.setItem = () => {};
  const only = process.env.SIM_ONLY?.split(',').map((s) => s.trim());
  const seeds = Number(process.env.SIM_SEEDS ?? 3);
  const chosen = SCENARIOS.filter((s) => !only || only.includes(s.name));
  if (!chosen.length) throw new Error(`No scenario matches SIM_ONLY=${process.env.SIM_ONLY}`);

  const realNow = Date.now;
  const started = realNow();
  const rows: Summary[] = [];
  const runs = [];
  try {
    for (const sc of chosen) {
      const results = Array.from({ length: seeds }, (_, i) => simulate(sc, i + 1));
      runs.push(...results);
      rows.push(summarise(sc, results));
    }
  } finally {
    Date.now = realNow;
  }

  const baselinePath = 'sim/baseline.json';
  const baseline: Record<string, Summary> = existsSync(baselinePath)
    ? JSON.parse(readFileSync(baselinePath, 'utf8'))
    : {};
  mkdirSync('sim/results', { recursive: true });
  const header = `# Simulation — ${new Date(started).toISOString().slice(0, 16)} · ${seeds} seed(s) · ${Math.round((realNow() - started) / 1000)}s`;
  writeFileSync('sim/results/latest.md', markdown(rows, baseline, header));
  writeFileSync('sim/results/latest.json', JSON.stringify({ rows, runs }, null, 1));
  if (process.env.SIM_BASELINE) {
    const next = { ...baseline, ...Object.fromEntries(rows.map((r) => [r.scenario, r])) };
    writeFileSync(baselinePath, JSON.stringify(next, null, 1));
  }
}, 3_600_000);
