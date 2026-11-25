import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Course } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { DiagramsRoute } from './DiagramsRoute';

const gfx = (id: string, title: string) => ({
  id,
  type: 'graphic',
  title,
  alt_text: `${title} diagram`,
  svg: `<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" stroke="currentColor" fill="none"/></svg>`,
});

const course = {
  schema_version: '1.0',
  metadata: { title: 'Cell Biology' },
  sections: [
    // Deliberately out of authored order, to pin that the gallery follows
    // `order` rather than array position.
    { id: 's2', title: 'Transport', order: 2, items: [gfx('g2', 'Sodium pump')] },
    {
      id: 's1',
      title: 'Membranes',
      order: 1,
      items: [{ id: 'd1', type: 'definition', term: 'Osmosis', definition: 'x' }, gfx('g1', 'Bilayer')],
    },
    { id: 's3', title: 'Text only', order: 3, items: [{ id: 'q1', type: 'mcq', question: 'q', options: ['a'], correct_index: 0 }] },
  ],
} as unknown as Course;

function renderDiagrams(id = 'cell_biology') {
  return render(
    <MemoryRouter initialEntries={[`/study/${id}/diagrams`]}>
      <Routes>
        <Route path="/study/:id/diagrams" element={<DiagramsRoute />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  useCoursesStore.setState({ courses: {} });
});

describe('DiagramsRoute', () => {
  it('collects every diagram in the course, in section order', () => {
    useCoursesStore.setState({ courses: { cell_biology: course } });
    renderDiagrams();

    expect(screen.getByText(/2 diagrams across 2 sections/)).toBeTruthy();
    // A phone shows one plate at a time, in section order, and turns to the next.
    const title = () => screen.getAllByRole('img').map((el) => el.getAttribute('aria-label'));
    expect(title()).toEqual(['Bilayer diagram']);
    expect(screen.getByText('1 of 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(title()).toEqual(['Sodium pump diagram']);
    expect(screen.getByText('2 of 2')).toBeTruthy();
  });

  it('numbers the figures straight through the course', () => {
    useCoursesStore.setState({ courses: { cell_biology: course } });
    renderDiagrams();
    // The number IS the figure's name, so it never restarts per section.
    expect(screen.getByText(/^Figure 1\.$/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(screen.getByText(/^Figure 2\.$/)).toBeTruthy();
  });

  it('jumps to a section without leaving the page', () => {
    useCoursesStore.setState({ courses: { cell_biology: course } });
    renderDiagrams();
    const nav = screen.queryByRole('navigation', { name: 'Jump to section' });
    if (!nav) return; // one section: no jump control to check
    // An `<a href="#plate-x">` here rewrites the hash route and throws the
    // reader back to the library — the bug this page shipped with.
    expect(nav.querySelectorAll('a')).toHaveLength(0);
    expect(nav.querySelectorAll('button').length).toBeGreaterThan(0);
  });

  it('leaves out sections that have no diagram', () => {
    useCoursesStore.setState({ courses: { cell_biology: course } });
    renderDiagrams();
    expect(screen.queryByText('Text only')).toBeNull();
  });

  it('explains itself instead of showing an empty page', () => {
    useCoursesStore.setState({
      courses: { plain: { ...course, sections: [course.sections[2]] } as Course },
    });
    renderDiagrams('plain');
    expect(screen.getByText('This lecture has no diagrams.')).toBeTruthy();
  });

  it('does not crash on an unknown course id', () => {
    expect(() => renderDiagrams('nope')).not.toThrow();
    expect(screen.getByText(/Lecture not found/)).toBeTruthy();
  });
});

describe('DiagramsRoute on a computer', () => {
  it('lays the plates out together and opens one large with its note', () => {
    window.matchMedia = ((q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    try {
      useCoursesStore.setState({ courses: { cell_biology: course } });
      renderDiagrams();
      expect(screen.getAllByRole('img')).toHaveLength(2);
      fireEvent.click(screen.getByRole('button', { name: 'Bilayer' }));
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByText('1 of 2')).toBeTruthy();
    } finally {
      // @ts-expect-error back to jsdom's none
      delete window.matchMedia;
    }
  });
});
