import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MakeKindsField } from './MakeKindsField';
import { ALL_KINDS, type MakeKind } from '@/lib/makeKinds';

afterEach(cleanup);

let seen: MakeKind[] = [];
function Harness({ start }: { start: MakeKind[] }) {
  const [v, setV] = useState(start);
  seen = v;
  return <MakeKindsField value={v} onChange={setV} />;
}

describe('MakeKindsField', () => {
  it('leaves the choice to the AI by default, with no ticks to read (the owner, 2026-11-25)', () => {
    render(<Harness start={[...ALL_KINDS]} />);
    expect(screen.getByRole('radio', { name: /What suits my material/ }).getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('shows the ticks to narrow it, and going back allows every kind again', () => {
    render(<Harness start={[...ALL_KINDS]} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Only the kinds I tick' }));
    fireEvent.click(screen.getByLabelText('Flashcards'));
    expect(seen).not.toContain('flashcard');
    fireEvent.click(screen.getByRole('radio', { name: /What suits my material/ }));
    expect(seen).toEqual([...ALL_KINDS]);
  });

  it('opens on the ticks when a narrower choice is already stored', () => {
    render(<Harness start={['flashcard']} />);
    expect((screen.getByLabelText('Flashcards') as HTMLInputElement).checked).toBe(true);
  });
});
