import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { DefinitionItem } from '@/schema/course';
import { DefinitionCard } from './DefinitionCard';

const item = (extra: Partial<DefinitionItem> = {}) =>
  ({
    id: 'd1',
    type: 'definition',
    term: 'Zymogen',
    definition: 'An inactive precursor of an enzyme.',
    source_excerpt: 'an inactive precursor, a zymogen, is cleaved to the active enzyme',
    ...extra,
  }) as DefinitionItem;

const passage = () => screen.getByText(/is cleaved to the active enzyme/).closest('details')!;

function show(card: DefinitionItem, notesOpen: boolean) {
  render(
    <MemoryRouter>
      <DefinitionCard item={card} notesOpen={notesOpen} />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('the passage on a reading card', () => {
  it('stays open in Learn when there is no example sentence: the passage is the lesson', () => {
    show(item(), true);
    expect(passage().open).toBe(true);
  });

  it('folds in Learn when the example sentence is there, one tap away', () => {
    show(item({ example_sentence: 'Chymotrypsinogen is the zymogen of chymotrypsin.' }), true);
    expect(passage().open).toBe(false);
    expect(screen.getByText(/Chymotrypsinogen is the zymogen/)).toBeTruthy();
    expect(screen.getByText('From your notes ▸')).toBeTruthy();
  });

  it('stays folded outside Learn, as it always has', () => {
    show(item(), false);
    expect(passage().open).toBe(false);
  });
});
