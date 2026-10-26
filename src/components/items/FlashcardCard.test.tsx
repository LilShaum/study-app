import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { FlashcardItem } from '@/schema/course';
import { FlashcardCard } from './FlashcardCard';

const card = (extra: Partial<FlashcardItem> = {}): FlashcardItem =>
  ({ id: 'f1', type: 'flashcard', front: 'Name three needs of life.', back: '(1) Water. (2) Carbon. (3) Energy.', ...extra }) as FlashcardItem;

afterEach(cleanup);

describe('FlashcardCard, written', () => {
  it('shows what was written beside the points, and counts full marks only as got it', () => {
    const onGot = vi.fn();
    const onMissed = vi.fn();
    render(<FlashcardCard item={card()} onGot={onGot} onMissed={onMissed} />);
    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'water and energy' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show the answer' }));

    expect(screen.getByText('water and energy')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Water.'));
    fireEvent.click(screen.getByLabelText('Energy.'));
    fireEvent.click(screen.getByRole('button', { name: 'Done: 2 of 3' }));
    expect(onMissed).toHaveBeenCalledTimes(1);
    expect(onGot).not.toHaveBeenCalled();

    // The next card starts clean.
    fireEvent.click(screen.getByRole('button', { name: 'Show the answer' }));
    for (const p of ['Water.', 'Carbon.', 'Energy.']) fireEvent.click(screen.getByLabelText(p));
    fireEvent.click(screen.getByRole('button', { name: 'Done: 3 of 3' }));
    expect(onGot).toHaveBeenCalledTimes(1);
  });

  it('asks Got it or Missed it on a one-point short answer', () => {
    const onGot = vi.fn();
    render(<FlashcardCard item={card({ back: 'Plate tectonics.', tags: ['short-answer'] })} onGot={onGot} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show the answer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(onGot).toHaveBeenCalledTimes(1);
  });

  it('leaves an ordinary card a flip card', () => {
    render(<FlashcardCard item={card({ back: 'Mitochondria.' })} />);
    expect(screen.getByRole('button', { name: 'Flip card' })).toBeTruthy();
    expect(screen.queryByLabelText('Your answer')).toBeNull();
  });
});

describe('FlashcardCard, moving between cards', () => {
  it('starts the next written card unwritten, with its own points', () => {
    const { rerender } = render(<FlashcardCard item={card()} />);
    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'water' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show the answer' }));
    rerender(<FlashcardCard item={card({ id: 'f2', back: '(1) A. (2) B. (3) C. (4) D.' })} />);
    expect((screen.getByLabelText('Your answer') as HTMLTextAreaElement).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Show the answer' }));
    expect(screen.getByRole('button', { name: 'Done: 0 of 4' })).toBeTruthy();
  });
});

describe('FlashcardCard, I don’t know', () => {
  it('on a flip card shows the answer, and Next counts it as missed', () => {
    const onGot = vi.fn();
    const onMissed = vi.fn();
    render(<FlashcardCard item={card({ back: 'Mitochondria.' })} onGot={onGot} onMissed={onMissed} />);
    fireEvent.click(screen.getByRole('button', { name: 'I don’t know' }));
    expect(screen.queryByRole('button', { name: 'Got it' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onMissed).toHaveBeenCalledTimes(1);
    expect(onGot).not.toHaveBeenCalled();
  });

  it('on a written answer shows the points to make, with nothing to tick', () => {
    const onMissed = vi.fn();
    render(<FlashcardCard item={card()} onMissed={onMissed} />);
    fireEvent.click(screen.getByRole('button', { name: 'I don’t know' }));
    expect(screen.getByText('The points to make')).toBeTruthy();
    expect(screen.getByText('Carbon.')).toBeTruthy();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onMissed).toHaveBeenCalledTimes(1);
  });
});
