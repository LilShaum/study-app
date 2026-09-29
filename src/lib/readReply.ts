/**
 * The JSON in a chat reply, however the reply arrived.
 *
 * Two things cost a student a whole generation before this existed:
 *
 * - **Wrapping.** A model asked for "only JSON" still sometimes opens with a
 *   sentence, or (the fix prompt asks for this) a verdict list, and fences the
 *   JSON in ```json. Copying the whole reply then failed to parse.
 * - **Truncation.** A full lecture is a long reply. A chat that stops partway
 *   leaves JSON that ends mid-item, and one missing brace used to throw away
 *   every item before it too.
 *
 * So: the JSON is found wherever it sits, and a reply that was cut off is
 * closed after its last complete item — everything written before the cut is
 * kept, and the caller says what is missing.
 */
export type ReadReply =
  | { ok: true; json: unknown; cut: null }
  | { ok: true; json: unknown; cut: { lastSection: string | null } }
  | { ok: false; error: string };

/** The text most likely to be the JSON: a fenced block if there is one, else from the first bracket. */
function jsonText(reply: string): string {
  const fenced = [...reply.matchAll(/```(?:json)?\s*\n?([\s\S]*?)(?:```|$)/gi)].map((m) => m[1]);
  const block = fenced.sort((a, b) => b.length - a.length)[0];
  const text = block && /[[{]/.test(block) ? block : reply;
  const start = text.search(/[[{]/);
  return start < 0 ? text.trim() : text.slice(start).trim();
}

interface Frame {
  open: '{' | '[';
  /** The key this container is the value of, when its parent is an object. */
  key: string | null;
}

/**
 * Where a truncated reply can be cut and still make sense: just after an
 * item object closes inside an `items` array. Returns the text up to the last
 * such point with the containers still open closed after it, and the id of
 * the section being written when the cut came, if one could be read.
 */
function closeAfterLastItem(text: string): { text: string; lastSection: string | null } | null {
  const stack: Frame[] = [];
  let inString = false;
  let escaped = false;
  let stringStart = -1;
  let lastString: string | null = null;
  let pendingKey: string | null = null;
  let best: { at: number; closers: string } | null = null;
  let sectionId: string | null = null;
  let bestSection: string | null = null;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') {
        inString = false;
        lastString = text.slice(stringStart + 1, i);
        // A section's id, read as it streams past, to say where the cut came.
        if (pendingKey === 'id' && stack.length === 3 && stack[1].key === 'sections') sectionId = lastString;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      stringStart = i;
      continue;
    }
    if (c === ':') {
      pendingKey = lastString;
      continue;
    }
    if (c === ',') {
      pendingKey = null;
      continue;
    }
    if (c === '{' || c === '[') {
      const parent = stack[stack.length - 1];
      stack.push({ open: c, key: parent?.open === '{' ? pendingKey : null });
      pendingKey = null;
      continue;
    }
    if (c === '}' || c === ']') {
      const frame = stack.pop();
      if (!frame) return null;
      const parent = stack[stack.length - 1];
      if (c === '}' && parent?.open === '[' && parent.key === 'items') {
        best = {
          at: i + 1,
          closers: stack
            .slice()
            .reverse()
            .map((f) => (f.open === '{' ? '}' : ']'))
            .join(''),
        };
        bestSection = sectionId;
      }
      pendingKey = null;
    }
  }
  if (!best) return null;
  return { text: text.slice(0, best.at) + best.closers, lastSection: bestSection };
}

export function readReply(reply: string): ReadReply {
  const text = jsonText(reply);
  if (!text) return { ok: false, error: 'Nothing to read yet.' };
  try {
    return { ok: true, json: JSON.parse(text), cut: null };
  } catch (e) {
    const closed = closeAfterLastItem(text);
    if (closed) {
      try {
        return { ok: true, json: JSON.parse(closed.text), cut: { lastSection: closed.lastSection } };
      } catch {
        /* fall through to the original error */
      }
    }
    return { ok: false, error: `That isn't valid JSON — ${(e as Error).message}` };
  }
}

/** What to ask the chat for, when a reply was cut off: the rest, in a shape Add material takes. */
export const CONTINUE_ASK =
  'You were cut off. Send only the items you had not written yet, as {"sections":[{"id":"…","title":"…","items":[…]}]}, and nothing else.';

/** The line to show when a reply was cut off and only its complete part was kept. */
export function cutMessage(cut: { lastSection: string | null }): string {
  return `The reply was cut off before the end, so only its complete part is here${
    cut.lastSection ? ` — section "${cut.lastSection}" may be missing its last items, and any sections after it are missing` : ''
  }. Add this, then in the same chat send: ${CONTINUE_ASK} Paste what comes back into Add material on the course.`;
}
