import { afterEach, describe, expect, it, vi } from 'vitest';
import { quietMoment, watchForUpdates } from './appUpdate';
import { useToastStore } from '@/store/toast';

describe('quietMoment', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is not during a study session or a practice test', () => {
    expect(quietMoment('#/session/c1/learn')).toBe(false);
    expect(quietMoment('#/study/c1/test')).toBe(false);
    expect(quietMoment('#/class/BIOL%201/test')).toBe(false);
  });

  it('is on the library, a lecture page or Help, with nothing open', () => {
    expect(quietMoment('')).toBe(true);
    expect(quietMoment('#/study/c1')).toBe(true);
    expect(quietMoment('#/study/c1/testing-notes')).toBe(true);
    expect(quietMoment('#/help')).toBe(true);
  });

  it('is not while a dialog is open or a field is being typed in', () => {
    document.body.innerHTML = '<div role="dialog"></div>';
    expect(quietMoment('#/study/c1')).toBe(false);
    document.body.innerHTML = '<textarea></textarea>';
    (document.querySelector('textarea') as HTMLTextAreaElement).focus();
    expect(quietMoment('#/study/c1')).toBe(false);
  });
});

describe('watchForUpdates', () => {
  const setUp = (hasController: boolean) => {
    const sw = Object.assign(new EventTarget(), {
      controller: hasController ? {} : null,
      getRegistration: vi.fn(() => Promise.resolve({ update: vi.fn() })),
    });
    Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true });
    const reload = vi.fn();
    Object.defineProperty(window, 'location', { value: { ...window.location, hash: '#/session/c1/learn', reload }, configurable: true });
    watchForUpdates();
    return { sw, reload };
  };

  it('ignores the first install, and in a session offers the new version instead of reloading', () => {
    const first = setUp(false);
    first.sw.dispatchEvent(new Event('controllerchange'));
    expect(first.reload).not.toHaveBeenCalled();

    useToastStore.setState({ toasts: [] });
    const { sw, reload } = setUp(true);
    sw.dispatchEvent(new Event('controllerchange'));
    expect(reload).not.toHaveBeenCalled();
    expect(useToastStore.getState().toasts.at(-1)?.actionLabel).toBe('Reload');
    // Leaving the session for the lecture page is a quiet moment.
    window.location.hash = '#/study/c1';
    window.dispatchEvent(new Event('hashchange'));
    expect(reload).toHaveBeenCalled();
  });
});
