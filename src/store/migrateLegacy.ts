import type { Course } from '@/schema/course';
import type { ItemResult } from './progress';
import { useCoursesStore } from './courses';
import { useProgressStore } from './progress';
import { useThemeStore, type ThemeMode } from './theme';
import { useOnboardingStore } from './onboarding';

const MIGRATED_KEY = 'arborous:migrated';

const LEGACY_KEYS = {
  courses: 'study_courses',
  progress: 'study_progress',
  themeMode: 'arborous_theme',
  themeTree: 'arborous_tree',
  onboarded: 'arborous_onboarded',
} as const;

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * One-time import of the vanilla app's localStorage data into the new
 * Zustand-backed stores. The rebuild deploys to the same origin
 * (lilshaum.github.io/study-app/), so existing users' libraries and study
 * progress should survive the upgrade rather than appearing empty.
 *
 * Guarded by a sentinel key so it only ever runs once — after that, a user
 * deleting a course in the new app must stay deleted, not keep reappearing
 * from the untouched legacy keys.
 */
export function runLegacyMigration(): void {
  try {
    if (localStorage.getItem(MIGRATED_KEY)) return;

    const legacyCourses = readJson<Record<string, Course>>(LEGACY_KEYS.courses);
    if (legacyCourses && Object.keys(legacyCourses).length > 0) {
      useCoursesStore.getState()._hydrateFromLegacy(legacyCourses);
    }

    const legacyProgress = readJson<Record<string, Record<string, ItemResult>>>(LEGACY_KEYS.progress);
    if (legacyProgress && Object.keys(legacyProgress).length > 0) {
      useProgressStore.getState()._hydrateFromLegacy(legacyProgress);
    }

    // The legacy tree choice is deliberately not carried over: it selected
    // one of four palettes that no longer exist. Light/dark still applies.
    const legacyMode = localStorage.getItem(LEGACY_KEYS.themeMode) as ThemeMode | null;
    if (legacyMode) useThemeStore.setState({ mode: legacyMode });

    if (localStorage.getItem(LEGACY_KEYS.onboarded)) {
      useOnboardingStore.getState().complete();
    }
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — skip migration silently.
  } finally {
    try {
      localStorage.setItem(MIGRATED_KEY, '1');
    } catch {
      /* ignore */
    }
  }
}
