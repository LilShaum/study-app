import { describe, expect, it } from 'vitest';


describe('isMissed — the latest answer decides', () => {
  it('stops counting an item as missed once it is got right, whatever the totals', async () => {
    const { useProgressStore, isMissed } = await import('./progress');
    const s = useProgressStore.getState();
    for (let k = 0; k < 3; k++) s.recordResult('m', 'x', false);
    expect(isMissed(useProgressStore.getState().getProgress('m').x)).toBe(true);
    useProgressStore.getState().recordResult('m', 'x', true);
    // 1 right, 3 wrong: the counts would still call it missed.
    expect(isMissed(useProgressStore.getState().getProgress('m').x)).toBe(false);
    expect(useProgressStore.getState().missedIds('m').has('x')).toBe(false);
  });

  it('follows an override of the latest answer', async () => {
    const { useProgressStore, isMissed } = await import('./progress');
    useProgressStore.getState().recordResult('m2', 'y', false);
    useProgressStore.getState().reviseResult('m2', 'y', true);
    expect(isMissed(useProgressStore.getState().getProgress('m2').y)).toBe(false);
  });

  it('falls back to the counts for records from before', async () => {
    const { isMissed } = await import('./progress');
    expect(isMissed({ got: 1, missed: 2, lastSeen: 1 })).toBe(true);
    expect(isMissed({ got: 2, missed: 1, lastSeen: 1 })).toBe(false);
    expect(isMissed(undefined)).toBe(false);
  });
});
