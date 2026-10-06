// Runs the REAL compiled dist/code.js against a hand-built mock of the Figma
// plugin API (figma.currentPage.selection, node.fills/strokes/children, …).
// This is not a substitute for testing inside Figma itself — the mock only
// covers the API surface code.ts actually touches — but it exercises the
// exact same code that ships to Figma, not a re-implementation of it.

import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Mock node factory ───────────────────────────────────────────────────
let nextId = 1;
function makeNode({ name, type = 'ELLIPSE', x, y, w, h, fill, stroke, children }) {
  return {
    id: `mock-${nextId++}`,
    name,
    type,
    visible: true,
    absoluteBoundingBox: { x: x - w / 2, y: y - h / 2, width: w, height: h },
    fills: fill ? [{ type: 'SOLID', visible: true, color: fill }] : [],
    strokes: stroke ? [{ type: 'SOLID', visible: true, color: stroke }] : [],
    children: children || [],
  };
}
function makeText(characters, x, y) {
  return {
    id: `mock-text-${nextId++}`,
    name: characters,
    type: 'TEXT',
    visible: true,
    characters,
    absoluteBoundingBox: { x: x - 10, y: y - 6, width: 20, height: 12 },
    fills: [{ type: 'SOLID', visible: true, color: { r: 0.91, g: 0.89, b: 0.84 } }],
    strokes: [],
    children: [],
  };
}

// Layout: center at (250,250), radius 100 — matches the geometry the earlier
// pure-math check already verified (0deg=top, 90deg=right, 180deg=bottom).
const centerNode = makeNode({
  name: 'Logo',
  x: 250, y: 250, w: 64, h: 64,
  fill: { r: 0.1, g: 0.1, b: 0.1 },
  stroke: { r: 0.816, g: 0.796, b: 0.722 },
  children: [makeText('ZO', 250, 250)],
});
const itemTop = makeNode({ name: 'Start | /', x: 250, y: 150, w: 30, h: 30, fill: { r: 0.1, g: 0.1, b: 0.1 }, stroke: { r: 0.816, g: 0.796, b: 0.722 } });
const itemRight = makeNode({ name: 'Kurse | /courses', x: 350, y: 250, w: 30, h: 30 });
const itemBottom = makeNode({ name: 'Kontakt | /contact', x: 250, y: 350, w: 30, h: 30 });
// No "|" convention here — label/route must fall back to the nested text + slug.
const itemLeft = makeNode({
  name: 'blog-node',
  x: 150, y: 250, w: 30, h: 30,
  children: [makeText('Blog', 150, 250)],
});

const frame = {
  id: 'mock-frame',
  name: 'Orbit Mockup',
  type: 'FRAME',
  absoluteBoundingBox: { x: 100, y: 100, width: 300, height: 300 },
  children: [centerNode, itemTop, itemRight, itemBottom, itemLeft],
};

// ── Mock figma global ───────────────────────────────────────────────────
// Extended below with createEllipse/createText/group/loadFontAsync/viewport
// so the "ZenOrbit → Figma" (import) path can be exercised too.
const posted = [];
const MIXED = Symbol('figma-mixed');
const createdNodes = [];

function makeMockEllipse() {
  const node = {
    id: `created-${nextId++}`,
    type: 'ELLIPSE',
    name: '',
    x: 0, y: 0, width: 0, height: 0,
    fills: [], strokes: [], strokeWeight: 0,
    resize(w, h) { this.width = w; this.height = h; },
  };
  createdNodes.push(node);
  return node;
}
function makeMockText() {
  const node = {
    id: `created-${nextId++}`,
    type: 'TEXT',
    name: '',
    x: 0, y: 0, width: 0, height: 0,
    characters: '', fontSize: 0, fills: [],
    textAlignHorizontal: 'LEFT', textAlignVertical: 'TOP',
    resize(w, h) { this.width = w; this.height = h; },
  };
  createdNodes.push(node);
  return node;
}

globalThis.__html__ = '<html><!-- mock ui --></html>';
globalThis.figma = {
  mixed: MIXED,
  showUI: () => {},
  closePlugin: () => {},
  currentPage: { selection: [frame] },
  ui: {
    postMessage: (msg) => posted.push(msg),
    onmessage: null,
  },
  loadFontAsync: async () => {},
  createEllipse: makeMockEllipse,
  createText: makeMockText,
  viewport: { center: { x: 500, y: 500 }, scrollAndZoomIntoView: () => {} },
  group: (nodes, _parent) => {
    const group = { id: `group-${nextId++}`, type: 'GROUP', name: '', children: nodes };
    createdNodes.push(group);
    return group;
  },
};

// ── Execute the real compiled bundle ────────────────────────────────────
const code = readFileSync(path.join(__dirname, '../dist/code.js'), 'utf-8');
runInThisContext(code, { filename: 'dist/code.js' });

assert.equal(typeof globalThis.figma.ui.onmessage, 'function', 'code.js must register figma.ui.onmessage');

// Trigger the same message the UI sends on "JSON generieren".
globalThis.figma.ui.onmessage({ type: 'generate' });

assert.equal(posted.length, 1, 'expected exactly one postMessage call');
const msg = posted[0];
assert.equal(msg.type, 'result', `expected a result message, got: ${JSON.stringify(msg)}`);

const json = JSON.parse(msg.json);
console.log(JSON.stringify(json, null, 2));

assert.equal(json.menuItems.length, 4, 'expected 4 menu items');
const byLabel = Object.fromEntries(json.menuItems.map((m) => [m.label, m]));

assert.equal(byLabel['Start'].angle, 0, 'Start should be at angle 0 (top)');
assert.equal(byLabel['Start'].route, '/');
assert.equal(byLabel['Kurse'].angle, 90, 'Kurse should be at angle 90 (right)');
assert.equal(byLabel['Kurse'].route, '/courses');
assert.equal(byLabel['Kontakt'].angle, 180, 'Kontakt should be at angle 180 (bottom)');
assert.equal(byLabel['Kontakt'].route, '/contact');
assert.equal(byLabel['Blog'].angle, -90, 'Blog should be at angle -90 (left), fallback label from text child');
assert.equal(byLabel['Blog'].route, '/blog', 'route should be slugified from the fallback label');

assert.equal(json.logoText, 'ZO', 'logo text should come from the nested text child of the Logo node');
assert.equal(json.buttonSize, 64);
assert.equal(json.radius, 100);
assert.equal(json.buttonBgColor, '#1A1A1A');
assert.equal(json.buttonOutlineColor, '#D0CBB8');

console.log('\n✓ Export direction (Figma → ZenOrbit) passed.');

// ── Import direction: ZenOrbit → Figma ──────────────────────────────────
posted.length = 0;
createdNodes.length = 0;

const importPayload = {
  menuItems: [
    { label: 'Start', route: '/', angle: 0 },
    { label: 'Kurse', route: '/courses', angle: 90 },
  ],
  radius: 90,
  buttonSize: 60,
  logoText: 'ZX',
  buttonBgColor: '#111111',
  buttonOutlineColor: '#D0CBB8',
  menuItemBgColor: '#111111',
  menuItemOutlineColor: '#D0CBB8',
  menuItemTextColor: '#E8E3D7',
};

globalThis.figma.ui.onmessage({ type: 'importJson', json: JSON.stringify(importPayload) });
await new Promise((resolve) => setTimeout(resolve, 0));

assert.equal(posted.length, 1, 'expected exactly one postMessage call for import');
assert.equal(posted[0].type, 'importDone', `expected importDone, got: ${JSON.stringify(posted[0])}`);

// 1 group + (center circle + center label) + 2 * (item circle + item label)
const groups = createdNodes.filter((n) => n.type === 'GROUP');
const ellipses = createdNodes.filter((n) => n.type === 'ELLIPSE');
const texts = createdNodes.filter((n) => n.type === 'TEXT');
assert.equal(groups.length, 1, 'expected one group to be created');
assert.equal(ellipses.length, 3, 'expected 3 ellipses (1 center + 2 items)');
assert.equal(texts.length, 3, 'expected 3 text labels (1 center + 2 items)');

const centerEllipse = ellipses.find((e) => e.name === 'Logo');
assert.ok(centerEllipse, 'center ellipse must be named "Logo"');
assert.equal(centerEllipse.width, 60, 'center ellipse size should come from buttonSize');

const itemNames = ellipses.filter((e) => e.name !== 'Logo').map((e) => e.name).sort();
assert.deepEqual(itemNames, ['Kurse | /courses', 'Start | /'], 'item ellipses should be named "Label | route"');

console.log('✓ Import direction (ZenOrbit → Figma) passed.');

// ── Validation preview: valid and invalid payloads ──────────────────────
posted.length = 0;
globalThis.figma.ui.onmessage({ type: 'validateJson', json: JSON.stringify(importPayload) });
assert.equal(posted.length, 1, 'expected one validation response');
assert.equal(posted[0].type, 'validationResult');
assert.equal(posted[0].valid, true);
assert.equal(posted[0].preview.itemCount, 2);
assert.deepEqual(posted[0].preview.labels, ['Start', 'Kurse']);

posted.length = 0;
globalThis.figma.ui.onmessage({
  type: 'validateJson',
  json: JSON.stringify({ menuItems: [{ label: '', angle: 'top' }] }),
});
assert.equal(posted.length, 1, 'expected one invalid validation response');
assert.equal(posted[0].type, 'validationResult');
assert.equal(posted[0].valid, false);
assert.match(posted[0].message, /label/);

posted.length = 0;
globalThis.figma.ui.onmessage({ type: 'validateJson', json: '{not-json}' });
assert.equal(posted[0].valid, false);
assert.match(posted[0].message, /kein gültiges JSON/);

console.log('✓ JSON validation preview passed.');
console.log('\n✓ All assertions passed — both directions of dist/code.js work against the mocked Figma API.');
