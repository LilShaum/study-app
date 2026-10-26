import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { DefinitionItem } from '@/schema/course';
import type { RecallItem } from '@/lib/buildSessionItems';
import { RecallCard } from './RecallCard';

const target: DefinitionItem = { id: 'd', type: 'definition', term: 'Osmosis', definition: 'Water crossing a membrane toward more solute' };
const item: RecallItem = { id: 'd~recall', type: 'recall', target, pool: [target], source_excerpt: 'Slide 4: water follows solute.' };

afterEach(cleanup);

describe('RecallCard, I don’t know', () => {
  it('shows the term and the passage as a miss, with nothing to overrule', () => {
    const onAnswered = vi.fn();
    const onConfused = vi.fn();
    render(<RecallCard item={item} onAnswered={onAnswered} onConfused={onConfused} />);
    fireEvent.click(screen.getByRole('button', { name: 'I don’t know' }));
    expect(onAnswered).toHaveBeenCalledWith(false);
    expect(onConfused).not.toHaveBeenCalled();
    expect(screen.getByText('The answer is Osmosis.')).toBeTruthy();
    expect(screen.getByText(/water follows solute/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /I was right/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'I don’t know' })).toBeNull();
  });
});
