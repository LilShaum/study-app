import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { DefinitionItem } from '@/schema/course';
import { RelatedTerms } from './RelatedTerms';

const def = (id: string, term: string, definition: string, extra: Partial<DefinitionItem> = {}): DefinitionItem => ({ id, type: 'definition', term, definition, ...extra });
const under = def('u', 'Undernutrition', 'Too little of a nutrient over time');
const over = def('o', 'Overnutrition', 'Too much of a nutrient over time', { also_known_as: ['Excess intake'] });
const glossary = [under, over];

afterEach(cleanup);

describe('RelatedTerms', () => {
  it('opens a neighbour’s meaning under the term, and closes it again', () => {
    render(<RelatedTerms names={['overnutrition', 'Malnutrition', 'Undernutrition']} glossary={glossary} self={under} />);
    // Not defined in the lecture, or itself: left out.
    expect(screen.queryByText(/Malnutrition/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Undernutrition' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'overnutrition' }));
    expect(screen.getByText('Too much of a nutrient over time')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'overnutrition' }));
    expect(screen.queryByText('Too much of a nutrient over time')).toBeNull();
  });

  it('finds a neighbour by another of its names, and shows nothing with none', () => {
    render(<RelatedTerms names={['Excess intake']} glossary={glossary} self={under} />);
    expect(screen.getByRole('button', { name: 'Excess intake' })).toBeTruthy();
    cleanup();
    const { container } = render(<RelatedTerms names={[]} glossary={glossary} self={under} />);
    expect(container.textContent).toBe('');
  });
});
