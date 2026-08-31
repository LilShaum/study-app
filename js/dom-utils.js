'use strict';

/* ============================================================
   DOM UTILITIES — element builder, query helpers, array/anim helpers
   ============================================================ */

const $App = document.getElementById('app');

/** Create a DOM element with props shorthand */
function el(tag, props = {}, ...children) {
  const e = document.createElement(tag);
  const { className, id, html, text, on, style, ...attrs } = props;
  if (className !== undefined) e.className = className;
  if (id !== undefined)        e.id = id;
  if (html !== undefined)      e.innerHTML = html;
  if (text !== undefined)      e.textContent = text;
  if (style !== undefined)     Object.assign(e.style, style);
  if (on) Object.entries(on).forEach(([k, v]) => e.addEventListener(k, v));
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v)));
  children.forEach(c => {
    if (!c && c !== 0) return;
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return e;
}

const q  = (sel, ctx = document) => ctx.querySelector(sel);
const qq = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function mount(view) {
  $App.innerHTML = '';
  $App.appendChild(view);
  const header = q('.app-header', view);
  if (header) header.appendChild(Theme.toggleButton());
}

function pulse(el) {
  if (!el) return;
  el.classList.remove('pulse');
  void el.offsetWidth;
  el.classList.add('pulse');
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
