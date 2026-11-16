import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Course } from '@/schema/course';
import { glossaryOf } from '@/lib/glossary';
import { SessionGlossary } from './SessionGlossary';

const course = {
  schema_version: '1.0',
  metadata: { title: 'T' },
  sections: [
    {
      id: 's1',
      title: 'One',
      items: [
        { id: 'd1', type: 'definition', term: 'Troponin', definition: 'Protein that moves tropomyosin when calcium binds.' },
        { id: 'd2', type: 'definition', term: 'Sarcomere', definition: 'The repeating unit of a myofibril.', also_known_as: ['contractile unit'] },
      ],
    },
  ],
} as unknown as Course;

afterEach(cleanup);

// The owner, 2026-11-16: check a term's meaning without leaving the sitting.
describe('SessionGlossary', () => {
  it('lists every term with its meaning, and finds one by any word', () => {
    render(<SessionGlossary entries={glossaryOf(course)} />);
    expect(screen.getByText('Troponin')).toBeTruthy();
    expect(screen.getByText('The repeating unit of a myofibril.')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Find a term'), { target: { value: 'calcium' } });
    expect(screen.queryByText('Sarcomere')).toBeNull();
    expect(screen.getByText('Troponin')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Find a term'), { target: { value: 'zzz' } });
    expect(screen.getByText('No terms match.')).toBeTruthy();
  });
});
