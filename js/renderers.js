'use strict';

/* ============================================================
   RENDERERS — one per item type, plus the escaping helpers they
   (and Views) rely on for safely injecting untrusted course text.
   ============================================================ */

const Renderer = {

  /** Route to the right renderer based on item.type */
  dispatch(item, callbacks = {}) {
    switch (item.type) {
      case 'mcq':        return this.mcq(item, callbacks.onNext, callbacks.onAnswered);
      case 'flashcard':  return this.flashcard(item, callbacks.onGot, callbacks.onMissed);
      case 'definition': return this.definition(item, callbacks.revealMode);
      case 'example':    return this.example(item);
      case 'graphic':    return this.graphic(item);
      default: {
        const d = el('div', { className: 'card' });
        d.textContent = `Unknown item type: ${item.type}`;
        return d;
      }
    }
  },

  /* ---- MCQ ---- */
  mcq(item, onNext, onAnswered) {
    const card = el('div', { className: 'card mcq-card' });

    const diffBadge = item.difficulty
      ? `<span class="badge badge--${item.difficulty}">${item.difficulty}</span>` : '';

    card.innerHTML = `
      <div class="card-label">Multiple Choice ${diffBadge}</div>
      <div class="mcq-question">${_esc(item.question)}</div>
      <div class="mcq-options" role="radiogroup" aria-label="Answer options"></div>
      <button class="btn btn--primary mcq-check" disabled>Check Answer</button>
      <div class="mcq-result hidden">
        <div class="mcq-result-label"></div>
        <div class="mcq-explanation"></div>
      </div>
    `;

    const optionsEl   = q('.mcq-options',      card);
    const checkBtn    = q('.mcq-check',         card);
    const resultEl    = q('.mcq-result',        card);
    const resultLabel = q('.mcq-result-label',  card);
    const explanEl    = q('.mcq-explanation',   card);

    let selectedIndex = -1;

    const selectOption = (i, { focus = false } = {}) => {
      if (card.classList.contains('revealed')) return;
      const opts = qq('.mcq-option', card);
      opts.forEach((o, oi) => {
        const isSel = oi === i;
        o.classList.toggle('selected', isSel);
        o.setAttribute('aria-checked', String(isSel));
        o.tabIndex = isSel ? 0 : -1;
      });
      selectedIndex = i;
      checkBtn.disabled = false;
      if (focus) opts[i]?.focus();
    };

    (item.options || []).forEach((opt, i) => {
      const letter = 'ABCD'[i] || String(i + 1);
      const optBtn = el('button', {
        className: 'mcq-option',
        'data-index': String(i),
        role: 'radio',
        'aria-checked': 'false',
        tabindex: i === 0 ? '0' : '-1',
      });
      optBtn.innerHTML = `<span class="mcq-letter">${letter}</span><span class="mcq-text">${_esc(opt)}</span>`;

      optBtn.addEventListener('click', () => selectOption(i));

      optionsEl.appendChild(optBtn);
    });

    // Radiogroup keyboard pattern: arrow keys move + select, Home/End jump ends.
    optionsEl.addEventListener('keydown', e => {
      if (card.classList.contains('revealed')) return;
      const n = (item.options || []).length;
      if (!n) return;
      const cur = selectedIndex >= 0 ? selectedIndex : 0;
      let next = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (cur + 1) % n;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (cur - 1 + n) % n;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = n - 1;
      if (next !== null) {
        e.preventDefault();
        selectOption(next, { focus: true });
      }
    });

    checkBtn.addEventListener('click', () => {
      if (selectedIndex < 0 || card.classList.contains('revealed')) return;
      card.classList.add('revealed');
      checkBtn.style.display = 'none';

      const correct = selectedIndex === item.correct_index;

      qq('.mcq-option', card).forEach((opt, i) => {
        opt.disabled = true;
        if (i === item.correct_index)                                 opt.classList.add('correct');
        else if (i === selectedIndex && !correct)                     opt.classList.add('wrong');
      });

      resultLabel.className   = `mcq-result-label ${correct ? 'result--correct' : 'result--wrong'}`;
      resultLabel.textContent = correct ? '✓ Correct!' : `✗ Incorrect — the answer is ${item.options?.[item.correct_index] || ''}`;
      explanEl.textContent    = item.explanation || '';
      resultEl.classList.remove('hidden');

      if (onAnswered) onAnswered(correct);

      // Add "Next" button after reveal if onNext provided
      if (onNext) {
        const nextBtn = el('button', {
          className: 'btn btn--ghost',
          style: { marginTop: '12px' },
          text: 'Next →',
        });
        nextBtn.addEventListener('click', onNext);
        resultEl.appendChild(nextBtn);
      }
    });

    return card;
  },

  /* ---- FLASHCARD ---- */
  flashcard(item, onGot, onMissed) {
    const wrapper = el('div', { className: 'card flashcard-wrapper' });

    const diffBadge = item.difficulty
      ? `<span class="badge badge--${item.difficulty}">${item.difficulty}</span>` : '';

    wrapper.innerHTML = `
      <div class="card-label">Flashcard ${diffBadge}</div>
      <div class="flashcard-scene">
        <div class="flashcard-card">
          <div class="flashcard-face flashcard-face--front">
            <div class="flashcard-content">
              <p class="flashcard-text">${_esc(item.front)}</p>
            </div>
            <button class="btn btn--primary flashcard-flip">Flip Card</button>
          </div>
          <div class="flashcard-face flashcard-face--back">
            <div class="flashcard-content">
              <p class="flashcard-text">${_esc(item.back)}</p>
              ${item.hint ? `<p class="flashcard-hint">${icon('bulb', { size: 13 })} ${_esc(item.hint)}</p>` : ''}
            </div>
            <div class="flashcard-actions">
              <button class="btn btn--success flashcard-got">Got it ✓</button>
              <button class="btn btn--danger  flashcard-missed">Missed it ✗</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const scene    = q('.flashcard-scene', wrapper);
    const cardEl   = q('.flashcard-card',  wrapper);
    const flipBtn  = q('.flashcard-flip',  wrapper);
    const gotBtn   = q('.flashcard-got',   wrapper);
    const missedBtn = q('.flashcard-missed', wrapper);

    flipBtn.addEventListener('click', () => cardEl.classList.toggle('flipped'));

    if (gotBtn   && onGot)    gotBtn.addEventListener('click', onGot);
    if (missedBtn && onMissed) missedBtn.addEventListener('click', onMissed);

    // After first paint: sync container height to taller face
    requestAnimationFrame(() => {
      const front = q('.flashcard-face--front', wrapper);
      const back  = q('.flashcard-face--back',  wrapper);
      const h = Math.max(
        front ? front.scrollHeight : 0,
        back  ? back.scrollHeight  : 0,
        220
      );
      cardEl.style.minHeight = h + 'px';
      scene.style.minHeight  = h + 'px';
    });

    return wrapper;
  },

  /* ---- DEFINITION ---- */
  definition(item, revealMode = false) {
    const card = el('div', {
      className: `card definition-card${revealMode ? ' definition-card--reveal' : ''}`,
    });

    const diffBadge = item.difficulty
      ? `<span class="badge badge--${item.difficulty}">${item.difficulty}</span>` : '';

    const alsoKnown = item.also_known_as?.length
      ? `<div class="def-aka">Also known as: ${item.also_known_as.map(_esc).join(', ')}</div>` : '';

    const related = item.related_terms?.length
      ? `<div class="def-related">Related: ${item.related_terms.map(t => `<span class="def-tag">${_esc(t)}</span>`).join(' ')}</div>` : '';

    const bodyContent = `
      <div class="def-text">${_esc(item.definition)}</div>
      ${item.example_sentence ? `<div class="def-example">"${_esc(item.example_sentence)}"</div>` : ''}
      ${related}
      ${alsoKnown}
    `;

    if (revealMode) {
      card.innerHTML = `
        <div class="card-label">Definition ${diffBadge}</div>
        <div class="def-term">${_esc(item.term)}</div>
        <div class="def-reveal-hint">Click to reveal definition →</div>
        <div class="def-body hidden">${bodyContent}</div>
      `;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-expanded', 'false');
      const toggle = () => {
        const body = q('.def-body', card);
        const hint = q('.def-reveal-hint', card);
        const isHidden = body.classList.toggle('hidden');
        hint.textContent = isHidden ? 'Click to reveal definition →' : 'Click to hide';
        card.setAttribute('aria-expanded', String(!isHidden));
      };
      card.addEventListener('click', toggle);
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
    } else {
      card.innerHTML = `
        <div class="card-label">Definition ${diffBadge}</div>
        <div class="def-term">${_esc(item.term)}</div>
        ${bodyContent}
      `;
    }

    return card;
  },

  /* ---- EXAMPLE ---- */
  example(item) {
    const card = el('div', { className: 'card example-card' });

    const diffBadge = item.difficulty
      ? `<span class="badge badge--${item.difficulty}">${item.difficulty}</span>` : '';

    const stepsHtml = (item.steps || [])
      .map((step, i) => `
        <li class="example-step">
          <span class="step-num">${i + 1}</span>
          <span>${_esc(step)}</span>
        </li>
      `)
      .join('');

    card.innerHTML = `
      <div class="card-label">${icon('clipboard', { size: 13 })} Worked Example ${diffBadge}</div>
      <div class="example-title">${_esc(item.title)}</div>
      ${item.context
        ? `<div class="example-context">${_esc(item.context)}</div>` : ''}
      ${stepsHtml
        ? `<ol class="example-steps">${stepsHtml}</ol>` : ''}
      ${item.takeaway ? `
        <div class="example-takeaway">
          <span class="takeaway-label">${icon('bulb', { size: 12 })} Key Takeaway</span>
          ${_esc(item.takeaway)}
        </div>` : ''}
    `;

    return card;
  },

  /* ---- GRAPHIC ---- */
  graphic(item) {
    const card = el('div', { className: 'card graphic-card' });

    const diffBadge = item.difficulty
      ? `<span class="badge badge--${item.difficulty}">${item.difficulty}</span>` : '';

    // SVG is trusted content produced by the generator — insert directly.
    // alt_text is used as aria-label for screen readers.
    const svgContent = item.svg
      ? item.svg
      : '<div class="graphic-placeholder">No diagram provided</div>';

    card.innerHTML = `
      <div class="card-label">Diagram ${diffBadge}</div>
      <div class="graphic-title">${_esc(item.title)}</div>
      <div class="graphic-svg-wrapper"
           role="img"
           aria-label="${_attr(item.alt_text || item.title)}">
        ${svgContent}
      </div>
      ${item.caption ? `<div class="graphic-caption">${_esc(item.caption)}</div>` : ''}
    `;

    return card;
  },

  /* ---- EDIT FORM (Browse mode only) — one per item type, plus the
     shared difficulty/tags fields every type has. ---- */
  editForm(item) {
    const wrap = el('div', { className: 'card item-edit-card' });
    const diffOptions = ['easy', 'medium', 'hard']
      .map(d => `<option value="${d}" ${item.difficulty === d ? 'selected' : ''}>${d}</option>`)
      .join('');
    const tagsVal = (item.tags || []).join(', ');

    let fieldsHtml = '';
    if (item.type === 'mcq') {
      fieldsHtml = `
        <label class="edit-label">Question
          <textarea name="question" rows="2">${_esc(item.question)}</textarea>
        </label>
        <div class="edit-options-grid">
          ${(item.options || []).map((opt, i) => `
            <label class="edit-label">Option ${'ABCD'[i]}
              <input type="text" name="option_${i}" value="${_attr(opt)}" />
            </label>
          `).join('')}
        </div>
        <label class="edit-label">Correct answer
          <select name="correct_index">
            ${(item.options || []).map((opt, i) => `<option value="${i}" ${item.correct_index === i ? 'selected' : ''}>${'ABCD'[i]} — ${_esc(String(opt).slice(0, 50))}</option>`).join('')}
          </select>
        </label>
        <label class="edit-label">Explanation
          <textarea name="explanation" rows="2">${_esc(item.explanation)}</textarea>
        </label>
      `;
    } else if (item.type === 'flashcard') {
      fieldsHtml = `
        <label class="edit-label">Front
          <textarea name="front" rows="2">${_esc(item.front)}</textarea>
        </label>
        <label class="edit-label">Back
          <textarea name="back" rows="2">${_esc(item.back)}</textarea>
        </label>
        <label class="edit-label">Hint <span class="edit-hint">(optional)</span>
          <input type="text" name="hint" value="${_attr(item.hint || '')}" />
        </label>
      `;
    } else if (item.type === 'definition') {
      fieldsHtml = `
        <label class="edit-label">Term
          <input type="text" name="term" value="${_attr(item.term)}" />
        </label>
        <label class="edit-label">Definition
          <textarea name="definition" rows="2">${_esc(item.definition)}</textarea>
        </label>
        <label class="edit-label">Example sentence
          <textarea name="example_sentence" rows="2">${_esc(item.example_sentence || '')}</textarea>
        </label>
        <label class="edit-label">Related terms <span class="edit-hint">(comma-separated)</span>
          <input type="text" name="related_terms" value="${_attr((item.related_terms || []).join(', '))}" />
        </label>
        <label class="edit-label">Also known as <span class="edit-hint">(comma-separated)</span>
          <input type="text" name="also_known_as" value="${_attr((item.also_known_as || []).join(', '))}" />
        </label>
      `;
    } else if (item.type === 'example') {
      fieldsHtml = `
        <label class="edit-label">Title
          <input type="text" name="title" value="${_attr(item.title)}" />
        </label>
        <label class="edit-label">Context
          <textarea name="context" rows="2">${_esc(item.context || '')}</textarea>
        </label>
        <label class="edit-label">Steps <span class="edit-hint">(one per line)</span>
          <textarea name="steps" rows="4">${_esc((item.steps || []).join('\n'))}</textarea>
        </label>
        <label class="edit-label">Takeaway
          <textarea name="takeaway" rows="2">${_esc(item.takeaway || '')}</textarea>
        </label>
      `;
    } else if (item.type === 'graphic') {
      fieldsHtml = `
        <label class="edit-label">Title
          <input type="text" name="title" value="${_attr(item.title)}" />
        </label>
        <label class="edit-label">Caption
          <input type="text" name="caption" value="${_attr(item.caption || '')}" />
        </label>
        <label class="edit-label">Alt text
          <textarea name="alt_text" rows="2">${_esc(item.alt_text || '')}</textarea>
        </label>
        <p class="edit-hint">The diagram image itself isn't editable here — re-generate the course to change it.</p>
      `;
    }

    wrap.innerHTML = `
      <form class="item-edit-fields">
        ${fieldsHtml}
        <div class="edit-row-2col">
          <label class="edit-label">Difficulty
            <select name="difficulty">${diffOptions}</select>
          </label>
          <label class="edit-label">Tags <span class="edit-hint">(comma-separated)</span>
            <input type="text" name="tags" value="${_attr(tagsVal)}" />
          </label>
        </div>
        <div class="edit-actions">
          <button type="submit" class="btn btn--primary">Save</button>
          <button type="button" class="btn btn--ghost item-edit-cancel">Cancel</button>
        </div>
      </form>
    `;
    return wrap;
  },

  /** Reads an item edit form back into an updated item object (id/type preserved). */
  readEditForm(form, item) {
    const data = new FormData(form);
    const splitList = v => String(v || '').split(',').map(s => s.trim()).filter(Boolean);
    const updated = { ...item };

    if (item.type === 'mcq') {
      updated.question = String(data.get('question') || '').trim();
      updated.options = [0, 1, 2, 3].map(i => String(data.get(`option_${i}`) || '').trim());
      updated.correct_index = Number(data.get('correct_index'));
      updated.explanation = String(data.get('explanation') || '').trim();
    } else if (item.type === 'flashcard') {
      updated.front = String(data.get('front') || '').trim();
      updated.back = String(data.get('back') || '').trim();
      updated.hint = String(data.get('hint') || '').trim() || undefined;
    } else if (item.type === 'definition') {
      updated.term = String(data.get('term') || '').trim();
      updated.definition = String(data.get('definition') || '').trim();
      updated.example_sentence = String(data.get('example_sentence') || '').trim();
      updated.related_terms = splitList(data.get('related_terms'));
      updated.also_known_as = splitList(data.get('also_known_as'));
    } else if (item.type === 'example') {
      updated.title = String(data.get('title') || '').trim();
      updated.context = String(data.get('context') || '').trim();
      updated.steps = String(data.get('steps') || '').split('\n').map(s => s.trim()).filter(Boolean);
      updated.takeaway = String(data.get('takeaway') || '').trim();
    } else if (item.type === 'graphic') {
      updated.title = String(data.get('title') || '').trim();
      updated.caption = String(data.get('caption') || '').trim();
      updated.alt_text = String(data.get('alt_text') || '').trim();
    }

    updated.difficulty = data.get('difficulty') || item.difficulty;
    updated.tags = splitList(data.get('tags'));
    return updated;
  },
};

function _esc(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* Escape for attribute values */
function _attr(str) {
  return _esc(str).replace(/\n/g, ' ');
}
