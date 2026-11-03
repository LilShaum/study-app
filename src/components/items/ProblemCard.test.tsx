import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ProblemItem } from '@/schema/course';
import { ProblemCard } from './ProblemCard';

afterEach(cleanup);

const force: ProblemItem = {
  id: 'p',
  type: 'problem',
  question: 'A 2.0 kg cart accelerates at 3.0 m/s². What net force acts on it?',
  answer: 6,
  unit: 'N',
  steps: ['Newton’s second law: F = ma.', 'F = 2.0 kg × 3.0 m/s² = 6.0 N.'],
  takeaway: 'Force is mass times acceleration, in kilograms and m/s².',
  mistakes: [{ answer: 6000, why: 'The mass was taken in grams.' }],
  source_excerpt: 'Slide 9: F = ma.',
};

const answer = (text: string) => {
  fireEvent.change(screen.getByLabelText('Your answer, in N'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Check' }));
};

describe('ProblemCard, a number to check', () => {
  it('checks a right answer, shows the solution and the method', () => {
    const onAnswered = vi.fn();
    render(<ProblemCard item={force} onAnswered={onAnswered} />);
    answer('6.0');
    expect(onAnswered).toHaveBeenCalledWith(true);
    expect(screen.getByText('✓ Right: 6 N.')).toBeTruthy();
    expect(screen.getByText(/2.0 kg × 3.0 m\/s² = 6.0 N/)).toBeTruthy();
    expect(screen.getByText(/Force is mass times acceleration/)).toBeTruthy();
  });

  it('names the mistake a wrong answer comes from', () => {
    const onAnswered = vi.fn();
    render(<ProblemCard item={force} onAnswered={onAnswered} />);
    answer('6000');
    expect(onAnswered).toHaveBeenCalledWith(false);
    expect(screen.getByText('✗ Not this time: the answer is 6 N.')).toBeTruthy();
    expect(screen.getByText(/The mass was taken in grams/)).toBeTruthy();
    // The passage opens after a miss.
    expect(screen.getByText('Slide 9: F = ma.').closest('details')?.open).toBe(true);
  });

  it('asks for a number, and counts nothing, when none was typed', () => {
    const onAnswered = vi.fn();
    render(<ProblemCard item={force} onAnswered={onAnswered} />);
    answer('no idea');
    expect(onAnswered).not.toHaveBeenCalled();
    expect(screen.getByText('Type the answer as a number, in N.')).toBeTruthy();
  });

  it('shows the steps one at a time, never the last, and right with help counts as not yet', () => {
    const onAnswered = vi.fn();
    const onOverride = vi.fn();
    render(<ProblemCard item={force} onAnswered={onAnswered} onOverride={onOverride} />);
    fireEvent.click(screen.getByRole('button', { name: 'Stuck? Show the first step' }));
    expect(screen.getByText(/Newton’s second law/)).toBeTruthy();
    expect(screen.queryByText(/= 6.0 N/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Show the next step' })).toBeNull();
    answer('6');
    expect(onAnswered).toHaveBeenCalledWith(false);
    expect(screen.getByText('✓ Right, with a step shown.')).toBeTruthy();
    expect(screen.getByText(/counts as not yet/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /I was right/ })).toBeNull();
  });

  it('can be overruled when the checker is wrong', () => {
    const onOverride = vi.fn();
    render(<ProblemCard item={force} onAnswered={vi.fn()} onOverride={onOverride} />);
    answer('7');
    fireEvent.click(screen.getByRole('button', { name: 'I was right, count it' }));
    expect(onOverride).toHaveBeenCalledWith(true);
    expect(screen.getByText(/Your call, not the checker’s/)).toBeTruthy();
  });

  it('I don’t know shows the answer and the solution, as a miss', () => {
    const onAnswered = vi.fn();
    render(<ProblemCard item={force} onAnswered={onAnswered} />);
    fireEvent.click(screen.getByRole('button', { name: 'I don’t know' }));
    expect(onAnswered).toHaveBeenCalledWith(false);
    expect(screen.getByText('The answer is 6 N.')).toBeTruthy();
    expect(screen.getByText(/2.0 kg × 3.0 m\/s² = 6.0 N/)).toBeTruthy();
  });
});

describe('ProblemCard, checked against its steps', () => {
  const proof: ProblemItem = {
    id: 'q',
    type: 'problem',
    question: 'Write a function that returns the sum of a list.',
    code: 'def total(xs):\n    ...',
    steps: ['Start a running total at 0.', 'Add each item of the list to it.', 'Return the total.'],
  };

  it('keeps the code as written, then grades by the steps ticked', () => {
    const onGot = vi.fn();
    const onMissed = vi.fn();
    const { container } = render(<ProblemCard item={proof} onGot={onGot} onMissed={onMissed} />);
    expect(container.querySelector('code')?.textContent).toBe('def total(xs):\n    ...');
    fireEvent.change(screen.getByLabelText('Your working'), { target: { value: 'total = 0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show the solution' }));
    expect(screen.getByText('total = 0')).toBeTruthy();
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(3);
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Done: 2 of 3' }));
    expect(onMissed).toHaveBeenCalled();
    expect(onGot).not.toHaveBeenCalled();
  });

  it('every step ticked is got it', () => {
    const onGot = vi.fn();
    render(<ProblemCard item={proof} onGot={onGot} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show the solution' }));
    for (const box of screen.getAllByRole('checkbox')) fireEvent.click(box);
    fireEvent.click(screen.getByRole('button', { name: 'Done: 3 of 3' }));
    expect(onGot).toHaveBeenCalled();
  });

  it('with a step shown, nothing to tick: it comes back', () => {
    const onMissed = vi.fn();
    render(<ProblemCard item={proof} onMissed={onMissed} />);
    fireEvent.click(screen.getByRole('button', { name: 'Stuck? Show the first step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show the next step' }));
    expect(screen.queryByRole('button', { name: 'Show the next step' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show the solution' }));
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onMissed).toHaveBeenCalled();
  });
});
