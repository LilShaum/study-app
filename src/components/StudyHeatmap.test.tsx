import { afterEach, describe, expect, it } from 'vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { dayKey } from '@/store/studyLog';
import { dayLine, heatmapWeeks, type DayTotal } from '@/lib/heatmap';
import { StudyHeatmap } from './StudyHeatmap';

const today = () => dayKey(Date.now());

/** The grid with the page's line under it, as DaysRoute sets it. */
function Harness({ days }: { days: Record<string, DayTotal> }) {
  const [picked, setPicked] = useState<string | null>(null);
  const weeks = heatmapWeeks(days, new Date());
  const cell = weeks.flat().find((c) => c.date === picked);
  return (
    <>
      <StudyHeatmap weeks={weeks} label="the summary" picked={picked} setPicked={setPicked} />
      <p data-testid="line">{cell ? dayLine(cell) : 'the summary'}</p>
    </>
  );
}

afterEach(cleanup);

describe('StudyHeatmap', () => {
  it('draws a leaf for a day studied and a bud for the rest, with paths only, labelled for a screen reader', () => {
    const { container } = render(<Harness days={{ [today()]: { seconds: 3000, lectures: 1 } }} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('the summary');
    const svg = container.querySelector('svg')!;
    expect(svg.querySelectorAll('circle, ellipse, polygon, line').length).toBe(0);
    // Every rect is a tap target, not a drawn thing.
    for (const r of svg.querySelectorAll('rect')) expect(r.getAttribute('fill')).toBe('transparent');
    const leaves = [...svg.querySelectorAll('g[style]')];
    const studied = leaves.filter((g) => (g as HTMLElement).style.color.includes('heat'));
    expect(studied).toHaveLength(1);
    expect(leaves.length).toBe(container.querySelectorAll('[data-date]').length);
  });

  it('shows a tapped day and restores the summary on a second tap', () => {
    const { container } = render(<Harness days={{ [today()]: { seconds: 2100, lectures: 1 } }} />);
    const line = screen.getByTestId('line');
    const day = container.querySelector(`[data-date="${today()}"]`)!;
    // The leaf's blade (after its stalk) carries the outline.
    const square = () => day.previousElementSibling!.querySelectorAll('path')[1];
    expect(square().getAttribute('stroke')).toBe('var(--color-accent)'); // today
    fireEvent.pointerDown(day);
    expect(line.textContent).toMatch(/: 35 minutes, 1 lecture\.$/);
    // The day picked is outlined in the ink, so the tap can be seen to have landed.
    expect(square().getAttribute('stroke')).toBe('var(--color-text)');
    fireEvent.pointerDown(day);
    expect(line.textContent).toBe('the summary');
    expect(square().getAttribute('stroke')).toBe('var(--color-accent)');
  });
});
