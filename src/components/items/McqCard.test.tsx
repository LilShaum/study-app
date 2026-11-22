import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { McqItem } from '@/schema/course';
import { McqCard } from './McqCard';

const item = (extra: Partial<McqItem> = {}): McqItem =>
  ({
    id: 'q1',
    type: 'mcq',
    question: 'Which is it?',
    options: ['alpha', 'beta', 'gamma', 'delta'],
    correct_index: 1,
    explanation: 'Because beta.',
    ...extra,
  }) as McqItem;

const answer = (optionText: string) => {
  fireEvent.click(screen.getByText(optionText));
  fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
};

afterEach(cleanup);

describe('McqCard, five options', () => {
  it('letters them up to E and picks the fifth with the 5 key', () => {
    const onAnswered = vi.fn();
    render(<McqCard item={item({ options: ['a1', 'b1', 'c1', 'd1', 'e1'], correct_index: 4 })} onAnswered={onAnswered} keyboardEnabled />);
    expect(screen.getAllByRole('radio').length).toBe(5);
    expect(document.body.textContent).toContain('E');
    const fifth = screen.getAllByRole('radio')[4].textContent ?? '';
    fireEvent.keyDown(document, { key: '5' });
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    // The fifth shown, whatever order the shuffle gave.
    const picked = ['a1', 'b1', 'c1', 'd1', 'e1'].findIndex((o) => fifth.includes(o));
    expect(onAnswered).toHaveBeenCalledWith(picked === 4, picked, true);
    expect(screen.getByLabelText(/^E, /)).toBeTruthy();
  });
});

describe('McqCard', () => {
  it('marks the right answer right and the wrong one wrong', () => {
    const onAnswered = vi.fn();
    render(<McqCard item={item()} onAnswered={onAnswered} />);
    answer('beta');
    // The index in the file, whatever order the options were shown in.
    expect(onAnswered).toHaveBeenCalledWith(true, 1, true);
    expect(screen.getByText('✓ Correct')).toBeTruthy();
    expect(screen.getByLabelText(/, the answer$/).closest('button')!.textContent).toContain('beta');
  });

  it('names the correct option when you get it wrong', () => {
    const onAnswered = vi.fn();
    render(<McqCard item={item()} onAnswered={onAnswered} />);
    answer('gamma');
    expect(onAnswered).toHaveBeenCalledWith(false, 2, true);
    // The answer is marked in the list, and the verdict names its letter.
    const right = screen.getByLabelText(/, the answer$/);
    expect(right.closest('button')!.textContent).toContain('beta');
    const letter = right.getAttribute('aria-label')!.charAt(0);
    expect(screen.getByText(new RegExp(`the answer is ${letter}\\.`))).toBeTruthy();
    expect(screen.getByLabelText(/, your answer$/).closest('button')!.textContent).toContain('gamma');
  });

  it('opens the idea the question rests on after a miss, and folds it as Why after a right answer', () => {
    const idea = { title: 'Why beta', text: 'Beta follows from alpha being blocked.' };
    render(<McqCard item={item()} idea={idea} />);
    expect(screen.queryByText(/Beta follows/)).toBeNull();
    answer('gamma');
    expect(screen.getByText(/Beta follows/).closest('details')!.open).toBe(true);
    cleanup();
    render(<McqCard item={item()} idea={idea} />);
    answer('beta');
    expect(screen.getByText(/Beta follows/).closest('details')!.open).toBe(false);
    expect(screen.getByText('Why ▸')).toBeTruthy();
  });

  it('says whether the answer was sure, and opens the feedback on a right answer marked Not sure', () => {
    const onAnswered = vi.fn();
    const idea = { title: 'Why beta', text: 'Beta follows from alpha being blocked.' };
    render(<McqCard item={item()} onAnswered={onAnswered} idea={idea} />);
    fireEvent.click(screen.getByText('beta'));
    fireEvent.click(screen.getByRole('button', { name: 'Not sure' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(onAnswered).toHaveBeenCalledWith(true, 1, false);
    expect(screen.getByText(/Beta follows/).closest('details')!.open).toBe(true);
    cleanup();
    render(<McqCard item={item()} onAnswered={onAnswered} />);
    answer('beta');
    expect(onAnswered).toHaveBeenLastCalledWith(true, 1, true);
  });

  it('lets you say you do not know: a miss, the answer shown, nothing picked', () => {
    const onAnswered = vi.fn();
    render(<McqCard item={item()} onAnswered={onAnswered} />);
    fireEvent.click(screen.getByRole('button', { name: 'I don’t know' }));
    expect(onAnswered).toHaveBeenCalledWith(false);
    expect(screen.getByText(/^The answer is [A-D]\.$/)).toBeTruthy();
    expect(screen.getByLabelText(/, the answer$/).closest('button')!.textContent).toContain('beta');
    expect(screen.queryByLabelText(/, your answer$/)).toBeNull();
    expect(screen.getByText('Because beta.')).toBeTruthy();
  });

  it('shows the options in a new order across showings, the answer moving with them', () => {
    const firsts = new Set<string>();
    for (let k = 0; k < 30; k++) {
      const { unmount } = render(<McqCard item={item()} />);
      firsts.add(screen.getAllByRole('radio')[0].textContent!);
      unmount();
    }
    expect(firsts.size).toBeGreaterThan(1);
  });

  /**
   * A course whose `correct_index` points outside its options is a fault the
   * health panel already reports — but the card used to compound it: no option
   * could equal the index, so every answer was marked wrong, a miss was
   * recorded against the student, and the verdict read "the answer is"
   * followed by nothing at all.
   */
  describe('when the answer key points outside the options', () => {
    const broken = item({ correct_index: 7 });

    it('does not record a result', () => {
      const onAnswered = vi.fn();
      render(<McqCard item={broken} onAnswered={onAnswered} />);
      answer('alpha');
      expect(onAnswered).not.toHaveBeenCalled();
    });

    it('says the course file is at fault rather than the student', () => {
      render(<McqCard item={broken} />);
      answer('alpha');
      expect(screen.getByText(/answer key points outside its 4 options/)).toBeTruthy();
      expect(screen.queryByText(/✗ Incorrect/)).toBeNull();
      expect(screen.queryByText(/✓ Correct/)).toBeNull();
    });

    it('still shows the explanation, which may be the only usable content', () => {
      render(<McqCard item={broken} />);
      answer('alpha');
      expect(screen.getByText('Because beta.')).toBeTruthy();
    });

    it('treats a missing index the same way', () => {
      const onAnswered = vi.fn();
      render(<McqCard item={item({ correct_index: undefined as unknown as number })} onAnswered={onAnswered} />);
      answer('alpha');
      expect(onAnswered).not.toHaveBeenCalled();
    });
  });
});
