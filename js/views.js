'use strict';

/* ============================================================
   VIEWS — each builds a full view and calls mount()
   ============================================================ */

const Views = {

  /* ---- HOME ---- */
  home() {
    const courses = Store.getAll();
    const ids     = Object.keys(courses);
    const allTags = [...new Set(ids.flatMap(id => courses[id].metadata.tags || []))].sort();

    const view = el('div', { className: 'view home-view' });

    view.innerHTML = `
      <header class="app-header">
        <span class="app-logo">Arborous</span>
        <label class="btn btn--primary upload-btn" for="file-upload"
               title="Upload a .study.json course file">
          + Upload Course
        </label>
        <input type="file" id="file-upload" accept=".json,.study.json" />
      </header>
      <main class="home-main">
        <div class="home-toolbar">
          <h2 class="home-title">My Courses</h2>
          <span class="home-count" id="home-count">${ids.length} course${ids.length !== 1 ? 's' : ''}</span>
        </div>
        ${ids.length === 0
          ? `<div class="empty-state">
               <div class="empty-icon">${icon('library', { size: 40 })}</div>
               <div class="empty-title">No courses yet</div>
               <div class="empty-text">Upload a <code>.study.json</code> file to get started. Use the generator (CLAUDE.md) to create one from your notes.</div>
             </div>`
          : `
            <div class="home-filters">
              <div class="search-box">
                <span class="search-icon" aria-hidden="true">${icon('search', { size: 14 })}</span>
                <input type="search" id="course-search" class="search-input"
                       placeholder="Search courses…" aria-label="Search courses" />
              </div>
              ${allTags.length ? `
                <div class="tag-filter" id="tag-filter">
                  ${allTags.map(t => `<button class="tag-chip" data-tag="${_attr(t)}">${_esc(t)}</button>`).join('')}
                </div>` : ''}
            </div>
            <div class="course-grid" id="course-grid"></div>
            <div class="empty-state hidden" id="no-match-state">
              <div class="empty-icon">${icon('search', { size: 40 })}</div>
              <div class="empty-title">No matching courses</div>
              <div class="empty-text">Try a different search term or clear the tag filter.</div>
            </div>
          `
        }
      </main>
    `;

    // Render course cards + wire up search/tag filtering
    if (ids.length > 0) {
      const grid = q('#course-grid', view);
      ids.forEach(id => grid.appendChild(this._courseCard(id, courses[id])));

      const searchInput  = q('#course-search', view);
      const tagFilterEl  = q('#tag-filter',    view);
      const noMatchState = q('#no-match-state', view);
      const countEl      = q('#home-count',     view);
      const selectedTags = new Set();

      const courseMatches = courseId => {
        const c = courses[courseId];
        const text = searchInput.value.trim().toLowerCase();
        const haystack = [c.metadata.title, c.metadata.course_code, c.metadata.subject, ...(c.metadata.tags || [])]
          .filter(Boolean).join(' ').toLowerCase();
        const matchesText = !text || haystack.includes(text);
        const matchesTags = selectedTags.size === 0 || (c.metadata.tags || []).some(t => selectedTags.has(t));
        return matchesText && matchesTags;
      };

      const applyFilters = () => {
        let visible = 0;
        qq('.course-card', grid).forEach(card => {
          const match = courseMatches(card.dataset.courseId);
          card.style.display = match ? '' : 'none';
          if (match) visible++;
        });
        const filtering = searchInput.value.trim() !== '' || selectedTags.size > 0;
        if (noMatchState) noMatchState.classList.toggle('hidden', visible !== 0);
        grid.classList.toggle('hidden', visible === 0);
        if (countEl) {
          countEl.textContent = filtering
            ? `${visible} of ${ids.length} course${ids.length !== 1 ? 's' : ''}`
            : `${ids.length} course${ids.length !== 1 ? 's' : ''}`;
        }
      };

      searchInput.addEventListener('input', applyFilters);
      if (tagFilterEl) {
        qq('.tag-chip', tagFilterEl).forEach(chip => {
          chip.addEventListener('click', () => {
            const tag = chip.dataset.tag;
            if (selectedTags.has(tag)) { selectedTags.delete(tag); chip.classList.remove('active'); }
            else { selectedTags.add(tag); chip.classList.add('active'); }
            applyFilters();
          });
        });
      }
    }

    // File upload
    const fileInput = q('#file-upload', view);
    fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const course = JSON.parse(ev.target.result);
          if (!course.schema_version || !course.metadata || !Array.isArray(course.sections)) {
            Toast.show('Invalid .study.json — missing schema_version, metadata, or sections fields.', { type: 'error' });
            return;
          }
          if (course.schema_version !== '1.0') {
            Toast.show(`Schema version "${course.schema_version}" is not supported. Expected "1.0".`, { type: 'error' });
            return;
          }
          const id = Store.save(course);
          Toast.show(`"${course.metadata.title || 'Course'}" uploaded.`, { type: 'success' });
          Router.go(`course/${id}`);
        } catch {
          Toast.show('Could not parse the file. Make sure it is a valid JSON file.', { type: 'error' });
        }
      };
      reader.readAsText(file);
      // Reset input so the same file can be re-uploaded
      fileInput.value = '';
    });

    this._addHeaderControls(view);
    mount(view);
  },

  _addHeaderControls(view) {
    const hdr = q('.app-header', view);
    if (!hdr) return;
    hdr.appendChild(TreeTheme.pickerButton());
    hdr.appendChild(Theme.toggleButton());
  },

  _courseCard(id, course) {
    const { metadata, sections } = course;
    const totalItems   = metadata.total_items
      || sections.reduce((s, sec) => s + sec.items.length, 0);
    const sectionCount = sections.length;
    const progress     = Store.getProgress(id);
    const seenCount    = Object.keys(progress).length;

    const card = el('div', { className: 'course-card', 'data-course-id': id });

    card.innerHTML = `
      <div class="course-card-body">
        <div class="course-card-header">
          ${metadata.course_code ? `<div class="course-code">${_esc(metadata.course_code)}</div>` : ''}
          <div class="course-title">${_esc(metadata.title)}</div>
        </div>
        ${metadata.description
          ? `<div class="course-desc">${_esc(metadata.description)}</div>` : ''}
        <div class="course-stats">
          <span class="course-stat">${sectionCount} section${sectionCount !== 1 ? 's' : ''}</span>
          <span class="course-stat">${totalItems} items</span>
          ${seenCount > 0
            ? `<span class="course-stat course-stat--progress">${seenCount} studied</span>` : ''}
        </div>
        ${metadata.tags?.length
          ? `<div class="course-tags">${metadata.tags.map(t => `<span class="tag">${_esc(t)}</span>`).join('')}</div>`
          : ''}
      </div>
      <div class="course-card-footer">
        <button class="btn btn--primary course-open">Open Course →</button>
        <button class="btn btn--ghost  course-delete" aria-label="Remove from library">✕</button>
      </div>
    `;

    q('.course-open',   card).addEventListener('click', () => Router.go(`course/${id}`));
    q('.course-delete', card).addEventListener('click', e => {
      e.stopPropagation();
      // Capture course + progress before deleting so undo can restore both
      const snapshot     = Store.get(id);
      const progSnapshot = Store.getProgress(id);
      Store.delete(id);
      Views.home();
      Toast.show(`"${metadata.title}" removed from library.`, {
        type: 'info',
        duration: 7000,
        undo: () => {
          // Restore course and its progress data
          const courses = Store.getAll();
          courses[id] = snapshot;
          localStorage.setItem(Store.COURSES_KEY, JSON.stringify(courses));
          const prog = JSON.parse(localStorage.getItem(Store.PROGRESS_KEY) || '{}');
          prog[id] = progSnapshot;
          localStorage.setItem(Store.PROGRESS_KEY, JSON.stringify(prog));
          Views.home();
          Toast.show(`"${metadata.title}" restored.`, { type: 'success' });
        },
      });
    });

    return card;
  },

  /* ---- COURSE OVERVIEW ---- */
  course(id, { editing = false } = {}) {
    const course = Store.get(id);
    if (!course) { Router.go('home'); return; }

    const { metadata, sections } = course;

    // Build item counts (use metadata if present, else recount)
    const allItems     = sections.flatMap(s => s.items);
    const countOf = type => (metadata.item_counts?.[type] != null)
      ? metadata.item_counts[type]
      : allItems.filter(i => i.type === type).length;

    const missedIds   = Store.missedIds(id);
    const missedCount = allItems.filter(i => missedIds.has(i.id)).length;

    const typeDefs = [
      { key: 'mcq',        label: 'MCQs'        },
      { key: 'flashcard',  label: 'Flashcards'  },
      { key: 'definition', label: 'Definitions' },
      { key: 'example',    label: 'Examples'    },
      { key: 'graphic',    label: 'Graphics'    },
    ];

    const countsHtml = typeDefs
      .map(({ key, label }) => {
        const n = countOf(key);
        return n > 0
          ? `<div class="overview-stat">
               <span class="overview-stat-num">${n}</span>
               <span class="overview-stat-label">${label}</span>
             </div>`
          : '';
      })
      .join('');

    const sectionsHtml = sections.map(s => `
      <div class="section-item">
        <div class="section-item-title">${_esc(s.title)}</div>
        ${s.description ? `<div class="section-item-desc">${_esc(s.description)}</div>` : ''}
        <div class="section-item-count">${s.items.length} items</div>
      </div>
    `).join('');

    const headerHtml = editing ? `
      <form class="course-edit-form" id="course-edit-form">
        <label class="edit-label">Course code
          <input type="text" name="course_code" value="${_attr(metadata.course_code || '')}" placeholder="e.g. BIOL200" />
        </label>
        <label class="edit-label">Title
          <input type="text" name="title" value="${_attr(metadata.title || '')}" required />
        </label>
        <label class="edit-label">Subject
          <input type="text" name="subject" value="${_attr(metadata.subject || '')}" placeholder="e.g. Biology" />
        </label>
        <label class="edit-label">Description
          <textarea name="description" rows="3">${_esc(metadata.description || '')}</textarea>
        </label>
        <label class="edit-label">Tags <span class="edit-hint">(comma-separated)</span>
          <input type="text" name="tags" value="${_attr((metadata.tags || []).join(', '))}" />
        </label>
        <div class="edit-actions">
          <button type="submit" class="btn btn--primary">Save Changes</button>
          <button type="button" class="btn btn--ghost" id="cancel-edit">Cancel</button>
        </div>
      </form>
    ` : `
      <div class="course-overview-header">
        ${metadata.course_code ? `<div class="course-code">${_esc(metadata.course_code)}</div>` : ''}
        <h1 class="course-overview-title">${_esc(metadata.title)}</h1>
        ${metadata.description ? `<p class="course-overview-desc">${_esc(metadata.description)}</p>` : ''}
        ${metadata.subject     ? `<div style="margin-top:6px"><span class="tag">${_esc(metadata.subject)}</span></div>` : ''}
      </div>
    `;

    const view = el('div', { className: 'view course-view' });
    view.innerHTML = `
      <header class="app-header">
        <button class="btn btn--ghost back-btn">← Library</button>
        <span class="app-logo">Arborous</span>
        <button class="btn btn--ghost edit-btn">${icon('edit', { size: 14 })} Edit</button>
        <button class="btn btn--ghost export-btn">${icon('download', { size: 14 })} Export</button>
        <button class="btn btn--ghost dashboard-btn">${icon('bar-chart', { size: 14 })} Progress</button>
      </header>
      <main class="course-main">
        <div class="course-overview">

          ${headerHtml}

          <div class="overview-stats">${countsHtml}</div>

          <div class="mode-section">
            <h3 class="mode-section-title">Choose a Study Mode</h3>
            <div class="mode-grid">
              <button class="mode-btn" data-mode="browse">
                <span class="mode-icon">${icon('book-open', { size: 22 })}</span>
                <span class="mode-name">Browse</span>
                <span class="mode-desc">Read all content in order</span>
              </button>
              <button class="mode-btn" data-mode="quiz">
                <span class="mode-icon">${icon('help-circle', { size: 22 })}</span>
                <span class="mode-name">Quiz</span>
                <span class="mode-desc">MCQs one at a time</span>
              </button>
              <button class="mode-btn" data-mode="flashcards">
                <span class="mode-icon">${icon('layers', { size: 22 })}</span>
                <span class="mode-name">Flashcards</span>
                <span class="mode-desc">Flip & track recall</span>
              </button>
              <button class="mode-btn" data-mode="definitions">
                <span class="mode-icon">${icon('file-text', { size: 22 })}</span>
                <span class="mode-name">Definitions</span>
                <span class="mode-desc">Term → reveal</span>
              </button>
              <button class="mode-btn" data-mode="mixed">
                <span class="mode-icon">${icon('shuffle', { size: 22 })}</span>
                <span class="mode-name">Mixed</span>
                <span class="mode-desc">All types, shuffled</span>
              </button>
              <button class="mode-btn" data-mode="missed">
                ${missedCount > 0 ? `<span class="mode-count">${missedCount}</span>` : ''}
                <span class="mode-icon">${icon('repeat', { size: 22 })}</span>
                <span class="mode-name">Review Missed</span>
                <span class="mode-desc">Retry what you got wrong</span>
              </button>
            </div>
          </div>

          <div class="sections-list">
            <h3 class="sections-list-title">Sections (${sections.length})</h3>
            ${sectionsHtml}
          </div>

        </div>
      </main>
    `;

    q('.back-btn', view).addEventListener('click', () => Router.go('home'));
    q('.dashboard-btn', view).addEventListener('click', () => Router.go(`dashboard/${id}`));

    q('.edit-btn', view).addEventListener('click', () => this.course(id, { editing: true }));

    q('.export-btn', view).addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(course, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = el('a', { href: url, download: `${id}.study.json` });
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      Toast.show('Course exported.', { type: 'success' });
    });

    const editForm = q('#course-edit-form', view);
    if (editForm) {
      editForm.addEventListener('submit', e => {
        e.preventDefault();
        const data = new FormData(editForm);
        const tags = String(data.get('tags') || '')
          .split(',').map(t => t.trim()).filter(Boolean);
        const updated = {
          ...course,
          metadata: {
            ...metadata,
            course_code: String(data.get('course_code') || '').trim() || undefined,
            title:       String(data.get('title') || '').trim() || metadata.title,
            subject:     String(data.get('subject') || '').trim() || undefined,
            description: String(data.get('description') || '').trim() || undefined,
            tags,
          },
        };
        Store.update(id, updated);
        Toast.show('Course updated.', { type: 'success' });
        this.course(id);
      });
      q('#cancel-edit', view).addEventListener('click', () => this.course(id));
    }

    qq('.mode-btn', view).forEach(btn => {
      btn.addEventListener('click', () => Router.go(`study/${id}/${btn.dataset.mode}`));
    });

    this._addHeaderControls(view);
    mount(view);
  },

  /* ---- PROGRESS DASHBOARD ---- */
  dashboard(id) {
    const course = Store.get(id);
    if (!course) { Router.go('home'); return; }

    const { metadata, sections } = course;
    const progress = Store.getProgress(id);

    const allItems = sections.flatMap(s =>
      s.items.map(item => ({ ...item, _sectionTitle: s.title, _sectionId: s.id }))
    );
    const gradable = allItems.filter(i => i.type === 'mcq' || i.type === 'flashcard');

    let totalGot = 0, totalMissed = 0, studiedCount = 0, lastSeen = null;
    const tagStats     = new Map(); // tag -> { got, missed }
    const sectionStats = new Map(); // sectionId -> { title, got, missed }

    gradable.forEach(item => {
      const r = progress[item.id];
      if (!r || (r.got === 0 && r.missed === 0)) return;
      studiedCount++;
      totalGot += r.got;
      totalMissed += r.missed;
      if (r.lastSeen && (!lastSeen || r.lastSeen > lastSeen)) lastSeen = r.lastSeen;

      (item.tags || []).forEach(tag => {
        const s = tagStats.get(tag) || { got: 0, missed: 0 };
        s.got += r.got; s.missed += r.missed;
        tagStats.set(tag, s);
      });

      const sec = sectionStats.get(item._sectionId) || { title: item._sectionTitle, got: 0, missed: 0 };
      sec.got += r.got; sec.missed += r.missed;
      sectionStats.set(item._sectionId, sec);
    });

    const totalAttempts = totalGot + totalMissed;
    const accuracyPct   = totalAttempts > 0 ? Math.round((totalGot / totalAttempts) * 100) : null;
    const accOf         = s => (s.got + s.missed) > 0 ? Math.round((s.got / (s.got + s.missed)) * 100) : null;
    const accClass      = pct => pct == null ? '' : pct >= 80 ? 'bar--good' : pct >= 50 ? 'bar--warn' : 'bar--bad';

    const weakestTags = [...tagStats.entries()]
      .map(([tag, s]) => ({ label: tag, acc: accOf(s), attempts: s.got + s.missed }))
      .sort((a, b) => a.acc - b.acc)
      .slice(0, 6);

    const weakestSections = [...sectionStats.entries()]
      .map(([, s]) => ({ label: s.title, acc: accOf(s), attempts: s.got + s.missed }))
      .sort((a, b) => a.acc - b.acc)
      .slice(0, 6);

    const lastSeenText = lastSeen
      ? new Date(lastSeen).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      : '—';

    const barRow = ({ label, acc, attempts }) => `
      <div class="bar-row">
        <div class="bar-label">${_esc(label)}</div>
        <div class="bar-track"><div class="bar-fill ${accClass(acc)}" style="width:${acc}%"></div></div>
        <div class="bar-pct">${acc}% <span class="bar-attempts">(${attempts})</span></div>
      </div>`;

    const view = el('div', { className: 'view dashboard-view' });

    if (studiedCount === 0) {
      view.innerHTML = `
        <header class="app-header">
          <button class="btn btn--ghost back-btn">← Back</button>
          <span class="app-logo">Arborous</span>
        </header>
        <main class="course-main" style="display:flex;align-items:center;justify-content:center;flex:1">
          <div class="empty-state">
            <div class="empty-icon">${icon('bar-chart', { size: 40 })}</div>
            <div class="empty-title">No progress yet</div>
            <div class="empty-text">Study some Quiz or Flashcard items in "${_esc(metadata.title)}" to see stats here.</div>
            <button class="btn btn--primary" id="back-course">Back to Course</button>
          </div>
        </main>
      `;
      q('.back-btn',    view).addEventListener('click', () => Router.go(`course/${id}`));
      q('#back-course', view).addEventListener('click', () => Router.go(`course/${id}`));
      this._addHeaderControls(view);
      mount(view);
      return;
    }

    view.innerHTML = `
      <header class="app-header">
        <button class="btn btn--ghost back-btn">← Back</button>
        <span class="app-logo">Arborous</span>
      </header>
      <main class="course-main">
        <div class="course-overview">
          <div class="course-overview-header">
            <h1 class="course-overview-title">${_esc(metadata.title)} — Progress</h1>
          </div>

          <div class="overview-stats">
            <div class="overview-stat">
              <span class="overview-stat-num">${accuracyPct}%</span>
              <span class="overview-stat-label">Accuracy</span>
            </div>
            <div class="overview-stat">
              <span class="overview-stat-num">${studiedCount}</span>
              <span class="overview-stat-label">of ${gradable.length} studied</span>
            </div>
            <div class="overview-stat">
              <span class="overview-stat-num">${totalGot}</span>
              <span class="overview-stat-label">Correct</span>
            </div>
            <div class="overview-stat">
              <span class="overview-stat-num">${totalMissed}</span>
              <span class="overview-stat-label">Missed</span>
            </div>
          </div>
          <div class="dashboard-lastseen">Last studied: ${lastSeenText}</div>

          ${weakestSections.length ? `
            <div class="dashboard-section">
              <h3 class="mode-section-title">Weakest Sections</h3>
              <div class="bar-list">${weakestSections.map(barRow).join('')}</div>
            </div>` : ''}

          ${weakestTags.length ? `
            <div class="dashboard-section">
              <h3 class="mode-section-title">Weakest Tags</h3>
              <div class="bar-list">${weakestTags.map(barRow).join('')}</div>
            </div>` : ''}

        </div>
      </main>
    `;

    q('.back-btn', view).addEventListener('click', () => Router.go(`course/${id}`));

    this._addHeaderControls(view);
    mount(view);
  },

  /* ---- STUDY VIEW — dispatcher ---- */
  study(id, mode) {
    const course = Store.get(id);
    if (!course || !mode) { Router.go('home'); return; }

    Session.init(id, mode);

    if (Session.total() === 0) {
      this._studyEmpty(id, mode, course);
      return;
    }

    if (mode === 'browse') {
      this._studyBrowse(id, course);
    } else {
      this._studyCards(id, mode, course);
    }
  },

  /* Empty state when no items match the mode */
  _studyEmpty(id, mode, course) {
    const modeLabel = { quiz: 'MCQ', flashcards: 'Flashcard', definitions: 'Definition', mixed: 'any', missed: 'previously-missed' }[mode] || mode;
    const isMissed = mode === 'missed';
    const emptyIcon = icon(isMissed ? 'target' : 'inbox', { size: 40 });
    const emptyTitle = isMissed ? 'Nothing to review' : `No ${modeLabel} items`;
    const emptyText = isMissed
      ? "You haven't missed anything yet — or you've already nailed it on a retry. Study some Quiz or Flashcards to build up practice history."
      : `This course doesn't have any ${modeLabel} items yet. Try Browse or Mixed mode.`;
    const view = el('div', { className: 'view study-view' });
    view.innerHTML = `
      <header class="app-header">
        <button class="btn btn--ghost back-btn">← Back</button>
        <span class="app-logo">Arborous</span>
      </header>
      <main class="study-main" style="display:flex;align-items:center;justify-content:center;flex:1">
        <div class="empty-state">
          <div class="empty-icon">${emptyIcon}</div>
          <div class="empty-title">${emptyTitle}</div>
          <div class="empty-text">${emptyText}</div>
          <button class="btn btn--primary" id="back-course">Back to Course</button>
        </div>
      </main>
    `;
    q('.back-btn',    view).addEventListener('click', () => Router.go(`course/${id}`));
    q('#back-course', view).addEventListener('click', () => Router.go(`course/${id}`));
    this._addHeaderControls(view);
    mount(view);
  },

  /* ---- BROWSE MODE ---- */
  _studyBrowse(id, course) {
    const view = el('div', { className: 'view study-view study-view--browse' });

    const navItems = course.sections.map(s =>
      `<li><a class="section-nav-item" href="#" data-sid="${_attr(s.id)}">${_esc(s.title)}</a></li>`
    ).join('');

    view.innerHTML = `
      <header class="app-header">
        <button class="btn btn--ghost back-btn">← Back</button>
        <span class="app-logo">Arborous</span>
        <span class="study-mode-badge">Browse</span>
      </header>
      <div class="study-layout">
        <aside class="study-sidebar">
          <div class="sidebar-title">${_esc(course.metadata.title)}</div>
          <nav class="section-nav"><ul>${navItems}</ul></nav>
        </aside>
        <main class="study-main" id="browse-main"></main>
      </div>
    `;

    q('.back-btn', view).addEventListener('click', () => Router.go(`course/${id}`));

    const mainEl = q('#browse-main', view);

    // Render every section → items feed
    course.sections.forEach(section => {
      const sectionEl = el('div', {
        className: 'browse-section',
        id: `section-${section.id}`,
      });
      sectionEl.innerHTML = `
        <h2 class="browse-section-title">${_esc(section.title)}</h2>
        ${section.description ? `<p class="browse-section-desc">${_esc(section.description)}</p>` : ''}
      `;
      const feed = el('div', { className: 'browse-feed' });
      section.items.forEach(item => {
        const rendered = Renderer.dispatch(item);
        if (rendered) {
          this._wireItemEditing(rendered, item, section, course, id);
          feed.appendChild(rendered);
        }
      });
      sectionEl.appendChild(feed);
      mainEl.appendChild(sectionEl);
    });

    // Section nav → scroll
    qq('.section-nav-item', view).forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const target = q(`#section-${link.dataset.sid}`, view);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        qq('.section-nav-item', view).forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      });
    });

    // Highlight active section while scrolling
    const mainScroll = mainEl;
    mainScroll.addEventListener('scroll', () => {
      const sections = qq('.browse-section', mainEl);
      let active = null;
      for (const sec of sections) {
        const rect = sec.getBoundingClientRect();
        if (rect.top <= 120) active = sec.id.replace('section-', '');
      }
      if (active) {
        qq('.section-nav-item', view).forEach(l => {
          l.classList.toggle('active', l.dataset.sid === active);
        });
      }
    }, { passive: true });

    // Activate first nav item
    const firstNav = q('.section-nav-item', view);
    if (firstNav) firstNav.classList.add('active');

    this._addHeaderControls(view);
    mount(view);
  },

  _wireItemEditing(cardEl, item, section, course, courseId) {
    cardEl.classList.add('item-has-toolbar');
    const toolbar = el('div', { className: 'item-toolbar' });
    const editBtn = el('button', {
      className: 'item-toolbar-btn', title: 'Edit', 'aria-label': 'Edit item',
      html: icon('edit', { size: 14 }),
    });
    const delBtn = el('button', {
      className: 'item-toolbar-btn item-toolbar-btn--danger', title: 'Delete', 'aria-label': 'Delete item',
      html: icon('trash', { size: 14 }),
    });
    toolbar.appendChild(editBtn);
    toolbar.appendChild(delBtn);
    cardEl.appendChild(toolbar);

    editBtn.addEventListener('click', () => {
      const formCard = Renderer.editForm(item);
      cardEl.replaceWith(formCard);

      const form = q('.item-edit-fields', formCard);
      form.addEventListener('submit', e => {
        e.preventDefault();
        const updated = Renderer.readEditForm(form, item);
        const idx = section.items.findIndex(i => i.id === item.id);
        if (idx >= 0) section.items[idx] = updated;
        Store.update(courseId, course);
        Toast.show('Item updated.', { type: 'success' });

        const newCard = Renderer.dispatch(updated);
        this._wireItemEditing(newCard, updated, section, course, courseId);
        formCard.replaceWith(newCard);
      });
      q('.item-edit-cancel', formCard).addEventListener('click', () => {
        formCard.replaceWith(cardEl);
      });
    });

    delBtn.addEventListener('click', () => {
      const idx = section.items.findIndex(i => i.id === item.id);
      if (idx < 0) return;
      const removed = section.items.splice(idx, 1)[0];
      Store.update(courseId, course);
      cardEl.remove();
      Toast.show('Item deleted.', {
        type: 'info',
        duration: 7000,
        undo: () => {
          section.items.splice(idx, 0, removed);
          Store.update(courseId, course);
          Router.go(`study/${courseId}/browse`);
          Toast.show('Item restored.', { type: 'success' });
        },
      });
    });
  },

  /* ---- CARD MODES ---- */
  _studyCards(id, mode, course) {
    const modeLabel = { quiz: 'Quiz', flashcards: 'Flashcards', definitions: 'Definitions', mixed: 'Mixed', missed: 'Review Missed' }[mode] || mode;
    const kbdHint = {
      quiz:        '<kbd>1</kbd>-<kbd>4</kbd> select · <kbd>Enter</kbd> check / next · <kbd>&larr;</kbd><kbd>&rarr;</kbd> prev / next · <kbd>Esc</kbd> back',
      flashcards:  '<kbd>Space</kbd> flip · <kbd>G</kbd> got it · <kbd>M</kbd> missed it · <kbd>&larr;</kbd><kbd>&rarr;</kbd> prev / next · <kbd>Esc</kbd> back',
      definitions: '<kbd>Enter</kbd> reveal (when focused) · <kbd>&larr;</kbd><kbd>&rarr;</kbd> prev / next · <kbd>Esc</kbd> back',
      mixed:       '<kbd>1</kbd>-<kbd>4</kbd> select · <kbd>Space</kbd> flip · <kbd>Enter</kbd> check / next · <kbd>G</kbd>/<kbd>M</kbd> got / missed · <kbd>&larr;</kbd><kbd>&rarr;</kbd> nav',
      missed:      '<kbd>1</kbd>-<kbd>4</kbd> select · <kbd>Space</kbd> flip · <kbd>Enter</kbd> check / next · <kbd>&larr;</kbd><kbd>&rarr;</kbd> nav',
    }[mode] || '';

    const view = el('div', { className: 'view study-view study-view--cards' });

    const sectionIds  = [...new Set(Session.items.map(i => i._sectionId))];
    const navSections = course.sections.filter(s => sectionIds.includes(s.id));

    const navHtml = navSections.length > 1
      ? `<ul>${navSections.map(s =>
          `<li><a class="section-nav-item" href="#" data-sid="${_attr(s.id)}">${_esc(s.title)}</a></li>`
        ).join('')}</ul>`
      : '';

    view.innerHTML = `
      <header class="app-header">
        <button class="btn btn--ghost back-btn">← Back</button>
        <span class="app-logo">Arborous</span>
        <span class="study-mode-badge">${_esc(modeLabel)}</span>
      </header>
      <div class="study-layout study-layout--cards">
        <aside class="study-sidebar">
          <div class="sidebar-title">${_esc(course.metadata.title)}</div>
          <div class="session-score">
            <div class="score-item score-item--got"    id="score-got">✓ 0</div>
            <div class="score-item score-item--missed" id="score-missed">✗ 0</div>
          </div>
          <nav class="section-nav" id="section-nav">
            ${navHtml}
          </nav>
        </aside>
        <main class="study-main">
          <div class="card-progress">
            <div class="progress-bar"><div class="progress-fill" id="prog-fill"></div></div>
            <div class="progress-label" id="prog-label"></div>
          </div>
          <div id="item-container"></div>
          <div class="card-nav" id="card-nav">
            <button class="btn btn--ghost" id="prev-btn" disabled>← Prev</button>
            <button class="btn btn--ghost" id="next-btn">Next →</button>
          </div>
          ${kbdHint ? `<div class="kbd-hint">${kbdHint}</div>` : ''}
        </main>
      </div>
    `;

    q('.back-btn', view).addEventListener('click', () => Router.go(`course/${id}`));

    qq('.section-nav-item', view).forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        Session.jumpToSection(link.dataset.sid);
        this._renderItem(view, id, mode);
        this._updateProgress(view);
        this._highlightSection(view, Session.activeSectionId);
      });
    });

    q('#prev-btn', view).addEventListener('click', () => {
      if (Session.prev()) {
        this._renderItem(view, id, mode);
        this._updateProgress(view);
        this._highlightSection(view, Session.activeSectionId);
      }
    });

    q('#next-btn', view).addEventListener('click', () => {
      if (Session.next()) {
        this._renderItem(view, id, mode);
        this._updateProgress(view);
        this._highlightSection(view, Session.activeSectionId);
      } else {
        this._showComplete(view, id);
      }
    });

    this._renderItem(view, id, mode);
    this._updateProgress(view);
    if (navSections.length > 1) {
      this._highlightSection(view, Session.activeSectionId);
    }

    this._addHeaderControls(view);
    mount(view);
  },

  _renderItem(view, id, mode) {
    const container = q('#item-container', view);
    container.innerHTML = '';

    const item = Session.current();
    if (!item) return;

    const onNext = () => {
      if (Session.next()) {
        this._renderItem(view, id, mode);
        this._updateProgress(view);
        this._highlightSection(view, Session.activeSectionId);
      } else {
        this._showComplete(view, id);
      }
    };

    const onGot = () => {
      Session.record(true);
      const el = q('#score-got', view);
      if (el) { el.textContent = `✓ ${Session.score.got}`; pulse(el); }
      onNext();
    };

    const onMissed = () => {
      Session.record(false);
      const el = q('#score-missed', view);
      if (el) { el.textContent = `✗ ${Session.score.missed}`; pulse(el); }
      onNext();
    };

    const onAnswered = (correct) => {
      Session.record(correct);
      const gotEl    = q('#score-got',    view);
      const missedEl = q('#score-missed', view);
      const target   = correct ? gotEl : missedEl;
      if (gotEl)    gotEl.textContent    = `✓ ${Session.score.got}`;
      if (missedEl) missedEl.textContent = `✗ ${Session.score.missed}`;
      pulse(target);
    };

    if (item._sectionTitle) {
      container.appendChild(el('div', {
        className: 'item-section-label',
        text: item._sectionTitle,
      }));
    }

    let rendered;
    switch (mode) {
      case 'definitions': rendered = Renderer.definition(item, true);              break;
      case 'flashcards':  rendered = Renderer.flashcard(item, onGot, onMissed);    break;
      case 'quiz':        rendered = Renderer.mcq(item, onNext, onAnswered);       break;
      default:            rendered = Renderer.dispatch(item, { onNext, onGot, onMissed, onAnswered }); break;
    }
    if (rendered) container.appendChild(rendered);

    const prevBtn = q('#prev-btn', view);
    const nextBtn = q('#next-btn', view);
    if (prevBtn) prevBtn.disabled = !Session.hasPrev();
    if (nextBtn) nextBtn.disabled = !Session.hasNext();
  },

  _updateProgress(view) {
    const fill  = q('#prog-fill',  view);
    const label = q('#prog-label', view);
    if (!fill || !label) return;
    const pct = ((Session.index + 1) / Session.total()) * 100;
    fill.style.width   = pct + '%';
    label.textContent  = `${Session.index + 1} / ${Session.total()}`;
  },

  _highlightSection(view, activeSectionId) {
    qq('.section-nav-item', view).forEach(a => {
      a.classList.toggle('active', a.dataset.sid === activeSectionId);
    });
  },

  _showComplete(view, id) {
    const cardNav = q('#card-nav', view);
    if (cardNav) cardNav.style.display = 'none';

    const container = q('#item-container', view);
    const { got, missed } = Session.score;
    const total = got + missed;
    const pct = total > 0 ? Math.round((got / total) * 100) : 100;

    container.innerHTML = `
      <div class="card complete-card">
        <div class="complete-icon">${icon('check-circle', { size: 40 })}</div>
        <h2 class="complete-title">Session Complete!</h2>
        <div class="complete-stats">
          <div class="complete-stat complete-stat--got">${got} Correct</div>
          <div class="complete-stat complete-stat--missed">${missed} Missed</div>
          ${total > 0 ? `<div class="complete-stat">${pct}% Accuracy</div>` : ''}
        </div>
        <div class="complete-actions">
          <button class="btn btn--primary" id="restart-btn">Study Again</button>
          <button class="btn btn--ghost"   id="back-course-btn">Back to Course</button>
        </div>
      </div>
    `;

    q('#restart-btn',    container).addEventListener('click', () => Views.study(id, Session.mode));
    q('#back-course-btn',container).addEventListener('click', () => Router.go(`course/${id}`));
  },
};
