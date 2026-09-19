import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * These tests drive the real localStorage the jsdom environment provides,
 * with setItem stubbed to throw the way a full quota does.
 */
async function freshModule() {
  vi.resetModules();
  return await import('./safeStorage');
}

const realSetItem = Storage.prototype.setItem;

afterEach(() => {
  Storage.prototype.setItem = realSetItem;
  localStorage.clear();
});

beforeEach(() => {
  localStorage.clear();
});

function breakWrites() {
  Storage.prototype.setItem = () => {
    throw new DOMException('exceeded the quota', 'QuotaExceededError');
  };
}

describe('safeStorage — a write that cannot land', () => {
  it('does not throw out of a store action', async () => {
    const { safeJSONStorage } = await freshModule();
    breakWrites();
    expect(() => safeJSONStorage!.setItem('k', { state: { a: 1 }, version: 0 })).not.toThrow();
  });

  it('warns once per session, not once per keystroke', async () => {
    const { safeJSONStorage, setStorageFailureHandler } = await freshModule();
    const warn = vi.fn();
    setStorageFailureHandler(warn);
    breakWrites();
    for (let i = 0; i < 5; i++) safeJSONStorage!.setItem('k', { state: { i }, version: 0 });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  /**
   * The bug this exists for: with storage full, uploading a course showed the
   * course in the library AND a success toast, then lost it on reload —
   * because the once-per-session warning had already been spent elsewhere.
   */
  it('reports failure to the caller even after the session warning is spent', async () => {
    const { safeJSONStorage, persisted, setStorageFailureHandler } = await freshModule();
    const warn = vi.fn();
    setStorageFailureHandler(warn);
    breakWrites();

    safeJSONStorage!.setItem('first', { state: {}, version: 0 }); // spends the warning
    const { ok } = persisted(() => safeJSONStorage!.setItem('second', { state: {}, version: 0 }));

    expect(warn).toHaveBeenCalledTimes(1);
    expect(ok).toBe(false);
  });

  it('reports success when the write lands', async () => {
    const { safeJSONStorage, persisted } = await freshModule();
    const { ok } = persisted(() => safeJSONStorage!.setItem('k', { state: { a: 1 }, version: 0 }));
    expect(ok).toBe(true);
  });

  it('does not carry a failure over into the next check', async () => {
    const { safeJSONStorage, persisted } = await freshModule();
    breakWrites();
    expect(persisted(() => safeJSONStorage!.setItem('k', { state: {}, version: 0 })).ok).toBe(false);
    Storage.prototype.setItem = realSetItem;
    expect(persisted(() => safeJSONStorage!.setItem('k', { state: {}, version: 0 })).ok).toBe(true);
  });

  it('brackets an awaited action, where the write lands after the call returns', async () => {
    const { safeJSONStorage, beginWriteCheck, writesLanded } = await freshModule();
    breakWrites();
    beginWriteCheck();
    await (async () => {
      await Promise.resolve();
      safeJSONStorage!.setItem('late', { state: {}, version: 0 });
    })();
    expect(writesLanded()).toBe(false);
  });

  it('returns the action’s own result alongside the verdict', async () => {
    const { persisted } = await freshModule();
    expect(persisted(() => 42).result).toBe(42);
  });
});

describe('safeStorage — reading is never fatal', () => {
  it('returns null rather than throwing when storage is blocked', async () => {
    const { safeJSONStorage } = await freshModule();
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(safeJSONStorage!.getItem('k')).toBeNull();
    spy.mockRestore();
  });
});

describe('storageUsage', () => {
  it('counts what is actually stored', async () => {
    const { storageUsage } = await freshModule();
    const before = storageUsage()!.used;
    localStorage.setItem('big', 'x'.repeat(1000));
    expect(storageUsage()!.used).toBeGreaterThan(before);
  });

  it('reports a limit to scale the number against', async () => {
    const { storageUsage } = await freshModule();
    expect(storageUsage()!.limit).toBeGreaterThan(1024 * 1024);
  });
});
