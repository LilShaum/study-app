import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MakeKindsField } from './MakeKindsField';
import { ALL_KINDS, type MakeKind } from '@/lib/makeKinds';

afterEach(cleanup);

// What the field last handed back, as its parent would hold it.
let seen: MakeKind[] = [];
let seenAi: boolean | null = null;
function Harness({ start, withAi = false, startAi = true }: { start: MakeKind[]; withAi?: boolean; startAi?: boolean }) {
  const [v, setV] = useState(start);
  const [ai, setAi] = useState(startAi);
  return (
    <MakeKindsField
      value={v}
      onChange={(next) => {
        seen = next;
        setV(next);
      }}
      {...(withAi
        ? {
            ai,
            onAi: (next: boolean) => {
              seenAi = next;
              setAi(next);
            },
          }
        : {})}
    />
  );
}

describe('MakeKindsField', () => {
  it('shows every kind ticked to begin with, the boxes in view, and no line of text under them', () => {
    const { container } = render(<Harness start={[...ALL_KINDS]} />);
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(boxes).toHaveLength(ALL_KINDS.length);
    expect(boxes.every((b) => b.checked)).toBe(true);
    expect(container.querySelector('p')).toBeNull();
  });

  it('unticks a kind', () => {
    render(<Harness start={[...ALL_KINDS]} />);
    fireEvent.click(screen.getByLabelText('Flashcards'));
    expect(seen).not.toContain('flashcard');
  });

  it('asks for at least one when every box is unticked', () => {
    render(<Harness start={['flashcard']} />);
    fireEvent.click(screen.getByLabelText('Flashcards'));
    expect(screen.getByText('Choose at least one.')).toBeTruthy();
  });

  describe('the two ways (the owner, 2026-11-25, Testing 6)', () => {
    it('names both, the AI choosing first, with every box in view and ticked', () => {
      render(<Harness start={[...ALL_KINDS]} withAi />);
      expect(screen.getByRole('radio', { name: 'The AI chooses' }).getAttribute('aria-checked')).toBe('true');
      expect(screen.getByRole('radio', { name: 'Only these' }).getAttribute('aria-checked')).toBe('false');
      expect((screen.getAllByRole('checkbox') as HTMLInputElement[]).every((b) => b.checked)).toBe(true);
    });

    it('moves to Only these when a box is touched, with that box changed', () => {
      render(<Harness start={[...ALL_KINDS]} withAi />);
      fireEvent.click(screen.getByLabelText('Flashcards'));
      expect(seenAi).toBe(false);
      expect(seen).toEqual(ALL_KINDS.filter((k) => k !== 'flashcard'));
      expect(screen.getByRole('radio', { name: 'Only these' }).getAttribute('aria-checked')).toBe('true');
    });

    it('goes back to the AI choosing in one tap, every box ticked again', () => {
      render(<Harness start={['flashcard']} withAi startAi={false} />);
      fireEvent.click(screen.getByRole('radio', { name: 'The AI chooses' }));
      expect(seenAi).toBe(true);
      expect((screen.getAllByRole('checkbox') as HTMLInputElement[]).every((b) => b.checked)).toBe(true);
      expect(screen.queryByText('Choose at least one.')).toBeNull();
    });
  });
});
