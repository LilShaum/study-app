import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { CourseTree } from './CourseTree';

/**
 * A lecture's tree, drawn when its row comes near the screen.
 *
 * The library and a class page list every lecture with its tree, and growing
 * a tree is real work (lib/growTree.ts): about 7 ms each at full speed, every
 * one of them before the page could show, though on a phone the first screen
 * holds two or three rows. Until then the row keeps the tree's place, so
 * nothing moves when it appears.
 */
export function LazyTree(props: ComponentProps<typeof CourseTree>) {
  const ref = useRef<HTMLSpanElement>(null);
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (near || !ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '300px 0px' },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [near]);

  if (near) return <CourseTree {...props} />;
  return <span ref={ref} aria-hidden="true" className={`${props.className ?? ''} block`} />;
}
