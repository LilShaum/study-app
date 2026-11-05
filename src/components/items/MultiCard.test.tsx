import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { MultiItem } from '@/schema/course';
import { MultiCard } from './MultiCard';

const item = (extra: Partial<MultiItem> = {}): MultiItem =>
  ({
    id: 'm1',
    type: 'multi',
    question: 'Which are true of cyclic AMP?',
    options: ['alpha', 'beta', 'gamma', 'delta'],
    correct: [0, 1],
    option_rationale: ['alpha is so', 'beta is so', 'gamma is not so', 'delta is not so'],
    explanation: 'Because alpha and beta.',
    ...extra,
  }) as MultiItem;

const statement = (text: string) => screen.getByText(text).closest('button')!;
const tick = (...texts: string[]) => texts.forEach((t) => fireEvent.click(statement(t)));
const check = () => fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));

afterEach(cleanup);

describe('MultiCard', () => {
  it('asks to select all that apply, as checkboxes, without saying how many are true', () => {
    render(<MultiCard item={item()} />);
    expect(screen.getByText('Select all that apply')).toBeTruthy();
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);
    expect(document.body.textContent).not.toMatch(/\b(two|2) (are |of them )?(true|correct)/i);
  });

  it('checks only once a statement is ticked, and a tick can be taken back', () => {
    render(<MultiCard item={item()} />);
    const button = screen.getByRole('button', { name: 'Check answer' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    tick('alpha');
    expect(statement('alpha').getAttribute('aria-checked')).toBe('true');
    expect(button.disabled).toBe(false);
    tick('alpha');
    expect(statement('alpha').getAttribute('aria-checked')).toBe('false');
    expect(button.disabled).toBe(true);
  });

  it('is right only with every true statement and no false one', () => {
    const onAnswered = vi.fn();
    render(<MultiCard item={item()} onAnswered={onAnswered} />);
    tick('alpha', 'beta');
    check();
    expect(onAnswered).toHaveBeenCalledWith(true, undefined, true);
    expect(screen.getByText('✓ Correct: all 4 statements right.')).toBeTruthy();
  });

  it('counts a true statement left out as a miss, and marks it Also true with its reason', () => {
    const onAnswered = vi.fn();
    render(<MultiCard item={item()} onAnswered={onAnswered} />);
    tick('alpha');
    check();
    expect(onAnswered).toHaveBeenCalledWith(false, undefined, true);
    expect(screen.getByText('✗ Not this time: 3 of 4 statements right.')).toBeTruthy();
    expect(screen.getByLabelText('true, you ticked it').closest('button')!.textContent).toContain('alpha');
    expect(screen.getByLabelText('true, you left it').closest('button')!.textContent).toContain('beta');
    expect(screen.getByText(/^Also true/).parentElement!.textContent).toBe('Also true: beta is so');
    // The false ones left alone, with their reasons, quieter.
    expect(screen.getAllByLabelText('false')).toHaveLength(2);
    expect(screen.getByText('gamma is not so').textContent).toBe('Why not: gamma is not so');
  });

  it('counts a false statement ticked as a miss, and says why it is wrong', () => {
    const onAnswered = vi.fn();
    render(<MultiCard item={item()} onAnswered={onAnswered} />);
    tick('alpha', 'beta', 'gamma');
    check();
    expect(onAnswered).toHaveBeenCalledWith(false, undefined, true);
    expect(screen.getByText('✗ Not this time: 3 of 4 statements right.')).toBeTruthy();
    expect(screen.getByLabelText('false, you ticked it').closest('button')!.textContent).toContain('gamma');
    expect(screen.getByText('gamma is not so').textContent).toBe('Why that is wrong: gamma is not so');
    expect(screen.getByText('Because alpha and beta.')).toBeTruthy();
    // Nothing can be changed once marked.
    expect((statement('delta') as HTMLButtonElement).disabled).toBe(true);
  });

  it('lets you say you do not know: a miss, the true ones shown, nothing ticked', () => {
    const onAnswered = vi.fn();
    render(<MultiCard item={item()} onAnswered={onAnswered} />);
    fireEvent.click(screen.getByRole('button', { name: 'I don’t know' }));
    expect(onAnswered).toHaveBeenCalledTimes(1);
    expect(onAnswered).toHaveBeenCalledWith(false);
    expect(screen.getByText('The true statements are marked ✓.')).toBeTruthy();
    expect(screen.getAllByLabelText('true').map((m) => m.closest('button')!.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining('alpha'), expect.stringContaining('beta')]),
    );
    expect(screen.queryByLabelText(/you ticked it|you left it/)).toBeNull();
    expect(screen.getByText('Because alpha and beta.')).toBeTruthy();
  });

  it('opens the why after a miss and after Not sure, and folds it after a sure right answer', () => {
    const onAnswered = vi.fn();
    const idea = { title: 'Why', text: 'Alpha and beta follow from one cause.' };
    render(<MultiCard item={item()} onAnswered={onAnswered} idea={idea} />);
    tick('alpha', 'beta');
    fireEvent.click(screen.getByRole('button', { name: 'Not sure' }));
    check();
    expect(onAnswered).toHaveBeenCalledWith(true, undefined, false);
    expect(screen.getByText(/one cause/).closest('details')!.open).toBe(true);
    cleanup();
    render(<MultiCard item={item()} idea={idea} />);
    tick('alpha', 'beta');
    check();
    expect(screen.getByText(/one cause/).closest('details')!.open).toBe(false);
    cleanup();
    render(<MultiCard item={item()} idea={idea} />);
    tick('alpha');
    check();
    expect(screen.getByText(/one cause/).closest('details')!.open).toBe(true);
  });

  it('ticks with the number keys, checks with Enter, then moves on with Enter', () => {
    const onAnswered = vi.fn();
    const onNext = vi.fn();
    render(<MultiCard item={item()} onAnswered={onAnswered} onNext={onNext} keyboardEnabled />);
    const shown = screen.getAllByRole('checkbox').map((b) => b.textContent!.trim());
    for (const text of ['alpha', 'beta']) fireEvent.keyDown(window, { key: String(shown.indexOf(text) + 1) });
    expect(statement('alpha').getAttribute('aria-checked')).toBe('true');
    expect(statement('beta').getAttribute('aria-checked')).toBe('true');
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onAnswered).toHaveBeenCalledWith(true, undefined, true);
    expect(onNext).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onNext).toHaveBeenCalled();
  });

  it('shows the statements in a new order across showings, the key moving with them', () => {
    const firsts = new Set<string>();
    for (let k = 0; k < 30; k++) {
      const onAnswered = vi.fn();
      const { unmount } = render(<MultiCard item={item()} onAnswered={onAnswered} />);
      firsts.add(screen.getAllByRole('checkbox')[0].textContent!);
      tick('alpha', 'beta');
      check();
      expect(onAnswered).toHaveBeenCalledWith(true, undefined, true);
      unmount();
    }
    expect(firsts.size).toBeGreaterThan(1);
  });

  it('scores nothing when its key marks no statement true, and says the file is at fault', () => {
    const onAnswered = vi.fn();
    render(<MultiCard item={item({ correct: [] })} onAnswered={onAnswered} />);
    tick('alpha');
    check();
    expect(onAnswered).not.toHaveBeenCalled();
    expect(screen.getByText(/key marks no statement true/)).toBeTruthy();
    expect(screen.queryByText(/statements right/)).toBeNull();
    cleanup();
    render(<MultiCard item={item({ correct: [0, 9] })} onAnswered={onAnswered} />);
    tick('alpha');
    check();
    expect(onAnswered).not.toHaveBeenCalled();
  });
});
