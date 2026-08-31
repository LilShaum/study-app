'use strict';

/* ============================================================
   SESSION — manages active study session state
   ============================================================ */

const Session = {
  courseId:        null,
  mode:            null,
  items:           [],
  index:           0,
  score:           { got: 0, missed: 0 },
  activeSectionId: null,
  answeredIndices: null,

  init(courseId, mode) {
    this.courseId        = courseId;
    this.mode            = mode;
    this.index           = 0;
    this.score           = { got: 0, missed: 0 };
    this.items           = this._buildList(courseId, mode);
    this.activeSectionId = this.items[0]?._sectionId || null;
    this.answeredIndices = new Set();
  },

  _buildList(courseId, mode) {
    const course = Store.get(courseId);
    if (!course) return [];

    let items = course.sections.flatMap(s =>
      s.items.map(item => ({
        ...item,
        _sectionTitle: s.title,
        _sectionId:    s.id,
        _sectionOrder: s.order || 0,
      }))
    );

    switch (mode) {
      case 'quiz':        items = items.filter(i => i.type === 'mcq');        break;
      case 'flashcards':  items = items.filter(i => i.type === 'flashcard');  break;
      case 'definitions': items = items.filter(i => i.type === 'definition'); break;
      case 'mixed':       items = shuffle(items);                             break;
      case 'missed': {
        const missedIds = Store.missedIds(courseId);
        items = shuffle(items.filter(i => missedIds.has(i.id)));
        break;
      }
    }

    return items;
  },

  current() { return this.items[this.index] || null; },
  total()   { return this.items.length; },
  hasNext() { return this.index < this.items.length - 1; },
  hasPrev() { return this.index > 0; },

  next() {
    if (!this.hasNext()) return false;
    this.index++;
    this.activeSectionId = this.current()?._sectionId || null;
    return true;
  },

  prev() {
    if (!this.hasPrev()) return false;
    this.index--;
    this.activeSectionId = this.current()?._sectionId || null;
    return true;
  },

  record(got) {
    const item = this.current();
    if (!item) return;
    if (this.answeredIndices.has(this.index)) return;
    this.answeredIndices.add(this.index);
    if (got) this.score.got++; else this.score.missed++;
    Store.recordResult(this.courseId, item.id, got);
  },

  jumpToSection(sectionId) {
    const idx = this.items.findIndex(i => i._sectionId === sectionId);
    if (idx >= 0) {
      this.index           = idx;
      this.activeSectionId = sectionId;
    }
  },
};
