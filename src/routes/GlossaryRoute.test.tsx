import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Course } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { GlossaryRoute } from './GlossaryRoute';

const def = (id: string, term: string, definition: string, extra = {}) => ({ id, type: 'definition', term, definition, ...extra });

const course = {
  schema_version: '1.0',
  metadata: { title: 'Enzymes' },
  sections: [
    {
      id: 's1',
      title: 'Kinetics',
      items: [
        def('d1', 'Vmax', 'The rate when every enzyme is saturated.'),
        def('d2', 'allosteric enzyme', 'An enzyme with a second binding site.', { also_known_as: ['regulatory enzyme'] }),
        { id: 'q1', type: 'mcq', question: 'q', options: ['a'], correct_index: 0 },
      ],
    },
    {
      id: 's2',
      title: 'Binding',
      items: [
        def('d3', '[S]', 'Substrate concentration.'),
        def('d4', 'Michaelis constant (Km)', 'The substrate concentration at half Vmax.', { related_terms: ['Vmax'] }),
        def('d5', 'Cooperativity', 'Binding at one site changes binding at another.'),
      ],
    },
  ],
} as unknown as Course;

function renderGlossary() {
  useCoursesStore.setState({ courses: { enz: course } });
  return render(
    <MemoryRouter initialEntries={['/study/enz/glossary']}>
      <Routes>
        <Route path="/study/:id/glossary" element={<GlossaryRoute />} />
      </Routes>
    </MemoryRouter>,
  );
}

const terms = () => [...document.querySelectorAll('dt > span')].map((el) => el.textContent);

afterEach(() => {
  cleanup();
  useCoursesStore.setState({ courses: {} });
});

describe('GlossaryRoute', () => {
  it('lists every term A to Z across sections, ignoring case, symbols first', () => {
    renderGlossary();
    expect(terms()).toEqual(['[S]', 'allosteric enzyme', 'Cooperativity', 'Michaelis constant (Km)', 'Vmax']);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['#', 'A', 'C', 'M', 'V']);
  });

  it('finds a term by its name, another name, or a word in its meaning', () => {
    renderGlossary();
    const find = screen.getByLabelText('Search the glossary');
    fireEvent.change(find, { target: { value: 'regulatory' } });
    expect(terms()).toEqual(['allosteric enzyme']);
    fireEvent.change(find, { target: { value: 'substrate concentration' } });
    expect(terms()).toEqual(['[S]', 'Michaelis constant (Km)']);
    fireEvent.change(find, { target: { value: 'nothing like this' } });
    expect(terms()).toEqual([]);
    expect(screen.getByText(/Nothing matches/)).toBeTruthy();
  });

  it('links a related term that is in the glossary, without an anchor', () => {
    renderGlossary();
    expect(screen.getByRole('button', { name: 'Vmax' })).toBeTruthy();
    // `<a href="#…">` would be read as a route by the hash router.
    expect(document.querySelectorAll('a[href*="#term"]')).toHaveLength(0);
  });
});
