'use strict';

/* ============================================================
   KEYBOARD SHORTCUTS — study views only
   ============================================================ */

function handleGlobalKeydown(e) {
  // Don't hijack keys while typing into a form control.
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

  const hash = window.location.hash.replace(/^#\/?/, '') || 'home';
  const [view, id, mode] = hash.split('/');
  if (view !== 'study' || !mode || mode === 'browse') return;

  if (e.key === 'Escape') {
    e.preventDefault();
    Router.go(`course/${id}`);
    return;
  }

  const mcqCard       = q('.mcq-card');
  const flashcardCard = q('.flashcard-card');

  // Left/Right navigate cards — unless focus is inside the MCQ radiogroup,
  // where arrow keys move the radio selection instead (see Renderer.mcq).
  if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !document.activeElement?.closest('.mcq-options')) {
    const btn = e.key === 'ArrowRight' ? q('#next-btn') : q('#prev-btn');
    if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
    return;
  }

  if (mcqCard && !mcqCard.classList.contains('revealed')) {
    if (/^[1-4]$/.test(e.key)) {
      const opt = qq('.mcq-option', mcqCard)[Number(e.key) - 1];
      if (opt) { e.preventDefault(); opt.click(); opt.focus(); }
      return;
    }
    if (e.key === 'Enter') {
      const checkBtn = q('.mcq-check', mcqCard);
      if (checkBtn && !checkBtn.disabled) { e.preventDefault(); checkBtn.click(); }
      return;
    }
  } else if (e.key === 'Enter' && !flashcardCard) {
    // Advance: revealed MCQ, definition, example, or graphic card.
    const nextBtn = q('#next-btn');
    if (nextBtn && !nextBtn.disabled) { e.preventDefault(); nextBtn.click(); }
    return;
  }

  if (flashcardCard) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!flashcardCard.classList.contains('flipped')) q('.flashcard-flip')?.click();
      return;
    }
    if (flashcardCard.classList.contains('flipped')) {
      if (e.key === 'g' || e.key === 'G') { e.preventDefault(); q('.flashcard-got')?.click(); return; }
      if (e.key === 'm' || e.key === 'M') { e.preventDefault(); q('.flashcard-missed')?.click(); return; }
    }
  }
}
