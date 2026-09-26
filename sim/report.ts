import type { Metrics, RunResult, Scenario } from './engine';

export interface Summary {
  scenario: string;
  why: string;
  seeds: number;
  mean: Omit<Metrics, 'bySection' | 'allStartedDay' | 'forecast0' | 'forecast10' | 'unseen0' | 'unseen10'> & {
    allStartedDay: number | null;
    bySection: number[];
    forecast0: [number, number, number] | null;
    forecast10: [number, number, number] | null;
    unseen0: [number, number] | null;
    unseen10: [number, number] | null;
  };
  scoreSd: number;
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const two = (xs: ([number, number] | null)[]): [number, number] | null => {
  const ok = xs.filter((x): x is [number, number] => x != null);
  return ok.length ? [avg(ok.map((x) => x[0])), avg(ok.map((x) => x[1]))] : null;
};
const pair = (xs: ([number, number, number] | null)[]): [number, number, number] | null => {
  const ok = xs.filter((x): x is [number, number, number] => x != null);
  return ok.length ? [avg(ok.map((x) => x[0])), avg(ok.map((x) => x[1])), avg(ok.map((x) => x[2]))] : null;
};

export function summarise(sc: Scenario, runs: RunResult[]): Summary {
  const m = runs.map((r) => r.metrics);
  const scores = m.map((x) => x.expectedScore);
  const mean = avg(scores);
  const started = m.map((x) => x.allStartedDay);
  return {
    scenario: sc.name,
    why: sc.why,
    seeds: runs.length,
    scoreSd: Math.sqrt(avg(scores.map((s) => (s - mean) ** 2))),
    mean: {
      expectedScore: mean,
      held: avg(m.map((x) => x.held)),
      neverStudied: avg(m.map((x) => x.neverStudied)),
      appEstimate: avg(m.map((x) => x.appEstimate)),
      minutes: avg(m.map((x) => x.minutes)),
      reviewShare: avg(m.map((x) => x.reviewShare)),
      earlyReviews: avg(m.map((x) => x.earlyReviews)),
      lateReviews: avg(m.map((x) => x.lateReviews)),
      peakDue: avg(m.map((x) => x.peakDue)),
      allStartedDay: started.every((d) => d != null) ? avg(started as number[]) : null,
      bySection: m[0].bySection.map((_, i) => avg(m.map((x) => x.bySection[i]))),
      forecast0: pair(m.map((x) => x.forecast0)),
      forecast10: pair(m.map((x) => x.forecast10)),
      unseen0: two(m.map((x) => x.unseen0)),
      unseen10: two(m.map((x) => x.unseen10)),
    },
  };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const said = (r: [number, number] | null) => (r ? `${pct(r[0])}/${pct(r[1])}` : '—');
// "40–60% (52)": the forecast's range, then the truth on the same sections.
const range = (r: [number, number, number] | null) =>
  r ? `${Math.round(r[0] * 100)}–${pct(r[1])} (${Math.round(r[2] * 100)}${r[2] >= r[0] - 0.005 && r[2] <= r[1] + 0.005 ? '' : '!'})` : '—';
const delta = (now: number, was: number | undefined) => {
  if (was == null) return '';
  const d = Math.round((now - was) * 100);
  return d === 0 ? ' (=)' : ` (${d > 0 ? '+' : ''}${d})`;
};

export function markdown(rows: Summary[], baseline: Record<string, Summary>, header: string): string {
  const out = [
    header,
    '',
    '| Scenario | Exam score | Held ≥0.8 | Never studied | App thinks | Forecast d0 / d10 | Unstudied said/true d0, d10 | Min | In Review | Too early | Too late | Peak due | All started |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const r of rows) {
    const b = baseline[r.scenario]?.mean;
    const m = r.mean;
    out.push(
      `| ${r.scenario} | ${pct(m.expectedScore)} ±${Math.round(r.scoreSd * 100)}${delta(m.expectedScore, b?.expectedScore)} | ${pct(m.held)}${delta(m.held, b?.held)} | ${pct(m.neverStudied)}${delta(m.neverStudied, b?.neverStudied)} | ${pct(m.appEstimate)} | ${range(m.forecast0)} / ${range(m.forecast10)} | ${said(m.unseen0)}, ${said(m.unseen10)} | ${Math.round(m.minutes)} | ${pct(m.reviewShare)} | ${pct(m.earlyReviews)} | ${pct(m.lateReviews)} | ${Math.round(m.peakDue)} | ${m.allStartedDay == null ? 'never' : `day ${Math.round(m.allStartedDay)}`} |`,
    );
  }
  out.push('', 'Exam score by section (course order):', '');
  for (const r of rows) out.push(`- ${r.scenario}: ${r.mean.bySection.map(pct).join(' ')}`);
  out.push('', 'What each scenario is for:', '');
  for (const r of rows) out.push(`- **${r.scenario}**: ${r.why}`);
  out.push(
    '',
    'Columns: *Exam score* is the expected score on a question per item in scope (MCQs get the 25% guess floor), mean ± spread across seeds, with the change from the baseline in points. *Held* is the share still at recall ≥ 0.8. *App thinks* is the same score computed from the app’s own memory model on the day. *Forecast* is what the app’s forecast (lib/forecast.ts) said on day 0 and day 10, with the true score on the same sections in brackets — marked ! when it falls outside the range. *Too early* / *Too late* are review answers given at true recall ≥ 0.95 / < 0.5.',
  );
  return out.join('\n');
}
