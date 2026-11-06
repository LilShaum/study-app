import { useCallback, useState } from 'react';
import { safeLocalStorage } from './safeStorage';
import { treeVersionOf, type TreeVersion } from './treeWords';

const KEY = 'arborous:tree-version';

/**
 * The version the switch on the lecture page last showed, kept so going into a
 * section and back does not lose the place while comparing. Goes when the
 * owner has chosen one (components/LectureTree), with the key.
 */
export function useTreeVersion(): [TreeVersion, (version: TreeVersion) => void] {
  const [version, setVersion] = useState(() => treeVersionOf(safeLocalStorage.getItem(KEY)));
  const choose = useCallback((next: TreeVersion) => {
    setVersion(next);
    safeLocalStorage.setItem(KEY, String(next));
  }, []);
  return [version, choose];
}
