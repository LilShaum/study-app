import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MakeKindsField } from './MakeKindsField';
import { ALL_KINDS, type MakeKind } from '@/lib/makeKinds';

afterEach(cleanup);

// What the field last handed back, as its parent would hold it.
let seen: MakeKind[] = [];
function Harness({ start }: { start: MakeKind[] }) {
  const [v, setV] = useState(start);
  return (
    <MakeKindsField
      value={v}
      onChange={(next) => {
        seen = next;
        setV(next);
      }}
    />
  );
}

describe('MakeKindsField', () => {
  it('shows every kind ticked to begin with, the boxes in view (the owner, 2026-11-25)', () => {
    render(<Harness start={[...ALL_KINDS]} />);
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(boxes).toHaveLength(ALL_KINDS.length);
    expect(boxes.every((b) => b.checked)).toBe(true);
    expect(screen.queryByRole('button', { name: 'Tick all' })).toBeNull();
  });

  it('unticks a kind, and Tick all brings every kind back', () => {
    render(<Harness start={[...ALL_KINDS]} />);
    fireEvent.click(screen.getByLabelText('Flashcards'));
    expect(seen).not.toContain('flashcard');
    fireEvent.click(screen.getByRole('button', { name: 'Tick all' }));
    expect(seen).toEqual([...ALL_KINDS]);
  });

  it('asks for at least one when every box is unticked', () => {
    render(<Harness start={['flashcard']} />);
    fireEvent.click(screen.getByLabelText('Flashcards'));
    expect(screen.getByText('Choose at least one.')).toBeTruthy();
  });
});
