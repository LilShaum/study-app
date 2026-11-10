import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { BASE_PATH } from '@/lib/basePath';
import { qrPath } from '@/lib/qrPath';
import { toast } from '@/store/toast';

type Code = { d: string; viewBox: number };

/**
 * A QR code of the app's own address, so a student can let a friend scan it.
 * The QR library loads when the panel first opens, so it stays out of the
 * main bundle.
 */
export function ShareApp() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<Code | null>(null);
  const panelId = useId();
  const addressRef = useRef<HTMLParagraphElement>(null);
  const url = new URL(BASE_PATH, window.location.origin).href;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    if (!open || code) return;
    let cancelled = false;
    import('qrcode-generator').then((mod) => {
      if (cancelled) return;
      const qr = mod.default(0, 'M');
      qr.addData(url);
      qr.make();
      setCode(qrPath((r, c) => qr.isDark(r, c), qr.getModuleCount()));
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, code, url]);

  const share = async () => {
    try {
      await navigator.share({ title: 'Arborous', url });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        toast('Could not open the share sheet');
      }
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copied');
    } catch {
      const el = addressRef.current;
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      toast('Select the address above to copy it');
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="press tap-safe"
      >
        <Icon name="share" size={14} />
        Share Arborous
      </button>
      {open && (
        <div id={panelId} className="mt-3">
          <div className="bg-plate text-plate-ink w-48 h-48 max-w-full">
            {code && (
              <svg
                role="img"
                aria-label="QR code for the Arborous link"
                viewBox={`0 0 ${code.viewBox} ${code.viewBox}`}
                shapeRendering="crispEdges"
                className="block w-full h-full"
              >
                <path d={code.d} className="fill-current" />
              </svg>
            )}
          </div>
          <p className="mt-2 text-small text-text-2">
            Point a phone&rsquo;s camera at the code to open Arborous.
          </p>
          <p ref={addressRef} className="mt-1 text-small text-text-3 break-all">
            {url}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4">
            {canShare && (
              <button type="button" onClick={share} className="press tap-safe">
                Share…
              </button>
            )}
            <button type="button" onClick={copy} className="press tap-safe">
              Copy link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
