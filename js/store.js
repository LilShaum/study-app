'use strict';

/* ============================================================
   STORE — localStorage CRUD + progress tracking
   ============================================================ */

const Store = {
  COURSES_KEY:  'study_courses',
  PROGRESS_KEY: 'study_progress',

  _parse(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); }
    catch { return {}; }
  },

  /* --- Courses --- */

  getAll() {
    return this._parse(this.COURSES_KEY);
  },

  save(course) {
    const all = this.getAll();
    const raw = course.metadata.course_code || course.metadata.title || 'course';
    const id  = raw.replace(/[^a-z0-9]/gi, '_').toLowerCase().replace(/_+/g, '_');
    all[id] = course;
    localStorage.setItem(this.COURSES_KEY, JSON.stringify(all));
    return id;
  },

  get(id) {
    return this.getAll()[id] || null;
  },

  update(id, course) {
    const all = this.getAll();
    all[id] = course;
    localStorage.setItem(this.COURSES_KEY, JSON.stringify(all));
    return id;
  },

  delete(id) {
    const all = this.getAll();
    delete all[id];
    localStorage.setItem(this.COURSES_KEY, JSON.stringify(all));
    const prog = this._parse(this.PROGRESS_KEY);
    delete prog[id];
    localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(prog));
  },

  /* --- Progress --- */

  getProgress(courseId) {
    return this._parse(this.PROGRESS_KEY)[courseId] || {};
  },

  missedIds(courseId) {
    const progress = this.getProgress(courseId);
    return new Set(
      Object.keys(progress).filter(itemId => {
        const r = progress[itemId];
        return r && r.missed > r.got;
      })
    );
  },

  recordResult(courseId, itemId, got) {
    try {
      const all = this._parse(this.PROGRESS_KEY);
      if (!all[courseId]) all[courseId] = {};
      const r = all[courseId][itemId] || { got: 0, missed: 0, lastSeen: null };
      if (got) r.got++; else r.missed++;
      r.lastSeen = Date.now();
      all[courseId][itemId] = r;
      localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(all));
    } catch { /* storage full — silently skip */ }
  },
};
