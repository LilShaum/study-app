import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { dayKey, useStudyLogStore } from '@/store/studyLog';
import { StudyHeatmap } from './StudyHeatmap';

const today = () => dayKey(Date.now());

describe('StudyHeatmap', () => {
  beforeEach(() => useStudyLogStore.setState({ byCourse: {} }));
  afterEach(cleanup);

  it('draws nothing before there is a day of study', () => {
    const { container } = render(<StudyHeatmap />);
    expect(container.innerHTML).toBe('');
    useStudyLogStore.setState({ byCourse: { a: { times: [], answers: [], days: { [today()]: 30 } } } });
    cleanup();
    expect(render(<StudyHeatmap />).container.innerHTML).toBe('');
  });

  it('shows the grid and the summary once a day was studied', () => {
    useStudyLogStore.setState({ byCourse: { a: { times: [], answers: [], days: { [today()]: 1200 } } } });
    const { container } = render(<StudyHeatmap />);
    expect(screen.getByText('Days of study')).toBeTruthy();
    const img = screen.getByRole('img');
    expect(img.getAttribute('aria-label')).toBe('Studied today: 20 minutes.');
    expect(container.querySelector(`rect[data-date="${today()}"]`)?.getAttribute('data-level')).toBe('2');
    expect(container.querySelectorAll('rect[data-date]').length).toBeGreaterThanOrEqual(8 * 7 - 6);
  });

  it('shows a tapped day and restores the summary on a second tap', () => {
    useStudyLogStore.setState({ byCourse: { a: { times: [], answers: [], days: { [today()]: 2100 } } } });
    const { container } = render(<StudyHeatmap />);
    const live = container.querySelector('[aria-live="polite"]')!;
    const summary = live.textContent;
    expect(summary).toBe('Studied today: 35 minutes.');
    const square = container.querySelector(`rect[data-date="${today()}"]`)!;
    fireEvent.pointerDown(square);
    expect(live.textContent).toMatch(/: 35 minutes, 1 lecture\.$/);
    fireEvent.pointerDown(square);
    expect(live.textContent).toBe(summary);
  });
});
