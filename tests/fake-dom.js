'use strict';

// DOM mínimo para rodar src/app.js e src/festa.js no Node, sem navegador.

function fakeContext(calls = { drawImage: 0 }) {
  return {
    imageSmoothingEnabled: true, globalAlpha: 1, fillStyle: '',
    drawImage() { calls.drawImage++; }, clearRect() {}, save() {}, restore() {}, translate() {}, scale() {},
    fillRect() {}, createLinearGradient: () => ({ addColorStop() {} }),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4).fill(255) })
  };
}

function fakeElement(tag = 'div', calls) {
  const listeners = {};
  const classes = new Set();
  const element = {
    tagName: tag.toUpperCase(), innerHTML: '', textContent: '', value: '', hidden: false, disabled: false,
    style: { setProperty() {} }, dataset: {}, children: [], scrollTop: 0, offsetWidth: 240, offsetHeight: 90,
    width: 0, height: 0,
    classList: {
      add: value => classes.add(value), remove: value => classes.delete(value),
      toggle: (value, on) => (on === undefined ? !classes.has(value) : on) ? classes.add(value) : classes.delete(value),
      contains: value => classes.has(value)
    },
    get firstChild() { return element.children[0]; },
    appendChild(child) { element.children.push(child); child.remove = () => element.children.splice(element.children.indexOf(child), 1); return child; },
    remove() {},
    addEventListener(name, callback) { listeners[name] = callback; },
    listeners,
    closest: () => null,
    click() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 474, height: 612 }),
    toDataURL: () => 'data:image/png;base64,',
    getContext: () => fakeContext(calls)
  };
  return element;
}

function fakeDocument(ids, calls) {
  const nodes = new Map(ids.map(id => [id, fakeElement(id === '#festa-canvas' ? 'canvas' : 'div', calls)]));
  const listeners = {};
  const body = fakeElement('body');
  return {
    body, nodes, listeners, activeElement: null, hidden: false,
    documentElement: { style: { setProperty() {} } },
    querySelector: selector => nodes.get(selector) || null,
    querySelectorAll: () => [],
    createElement: tag => fakeElement(tag, calls),
    elementFromPoint: () => null,
    addEventListener: (name, callback) => { listeners[name] = callback; }
  };
}

module.exports = { fakeContext, fakeElement, fakeDocument };
