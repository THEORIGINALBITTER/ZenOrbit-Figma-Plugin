// ZenOrbit for Figma — reads a selected orbit-menu mockup (one frame/group with
// a center "Logo" node and surrounding item nodes) and turns it into a
// ZenOrbit Project-JSON, matching the format the ZenOrbit Customizer already
// accepts via "Project JSON importieren" (src/pages/CustomizerPage.jsx,
// applySnapshotState). No changes to the ZenOrbit app are needed — this
// plugin only produces a file in a format ZenOrbit already reads.

figma.showUI(__html__, { width: 380, height: 760, themeColors: true });

type Rgb = { r: number; g: number; b: number };

function toHex({ r, g, b }: Rgb): string {
  const c = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

function firstSolidFill(node: SceneNode): string | null {
  const fills = (node as GeometryMixin).fills;
  if (fills === figma.mixed || !Array.isArray(fills)) return null;
  const solid = fills.find((f) => f.type === 'SOLID' && f.visible !== false) as SolidPaint | undefined;
  return solid ? toHex(solid.color) : null;
}

function firstSolidStroke(node: SceneNode): string | null {
  const strokes = (node as GeometryMixin).strokes;
  if (!Array.isArray(strokes)) return null;
  const solid = strokes.find((s) => s.type === 'SOLID' && s.visible !== false) as SolidPaint | undefined;
  return solid ? toHex(solid.color) : null;
}

function findTextChild(node: SceneNode): TextNode | null {
  if (node.type === 'TEXT') return node;
  if ('children' in node) {
    for (const child of (node as ChildrenMixin & SceneNode).children) {
      if (child.type === 'TEXT') return child;
      const nested = findTextChild(child);
      if (nested) return nested;
    }
  }
  return null;
}

function slugify(label: string): string {
  const slug = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `/${slug || 'item'}`;
}

// Node name convention: "Label | /route" — only applies when the name
// actually contains "|". Without it, both label and route stay unset here
// so the caller falls back to a nested text layer, then the raw node name.
function parseNameConvention(name: string): { label: string | null; route: string | null } {
  const parts = name.split('|').map((s) => s.trim());
  if (parts.length >= 2 && parts[1]) return { label: parts[0] || null, route: parts[1] };
  return { label: null, route: null };
}

function centerOf(node: SceneNode): { x: number; y: number } {
  const b = node.absoluteBoundingBox;
  if (!b) return { x: 0, y: 0 };
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

function buildProjectJson() {
  const selection = figma.currentPage.selection;
  if (selection.length !== 1) {
    throw new Error('Bitte genau ein Frame oder eine Gruppe auswählen (dein Orbit-Mockup).');
  }
  const root = selection[0];
  if (!('children' in root)) {
    throw new Error('Die Auswahl braucht Kind-Elemente: ein Center-Node ("Logo") und die Menü-Items drumherum.');
  }
  const children = (root as ChildrenMixin & SceneNode).children.filter(
    (c) => c.visible !== false
  ) as SceneNode[];
  if (children.length < 2) {
    throw new Error('Mindestens ein Center-Node und ein Menü-Item werden benötigt.');
  }

  const centerNode =
    children.find((c) => c.name.trim().toLowerCase() === 'logo') ??
    children.reduce((closest, node) => {
      const rootCenter = centerOf(root as SceneNode);
      const a = centerOf(closest);
      const b = centerOf(node);
      const da = Math.hypot(a.x - rootCenter.x, a.y - rootCenter.y);
      const db = Math.hypot(b.x - rootCenter.x, b.y - rootCenter.y);
      return db < da ? node : closest;
    });

  const itemNodes = children.filter((c) => c.id !== centerNode.id);
  const centerPos = centerOf(centerNode);

  const menuItems = itemNodes.map((node, index) => {
    const pos = centerOf(node);
    const dx = pos.x - centerPos.x;
    const dy = pos.y - centerPos.y;
    const angle = Math.round(((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360);
    const normalizedAngle = angle > 180 ? angle - 360 : angle;

    const convention = parseNameConvention(node.name);
    const textNode = findTextChild(node);
    const label = convention.label || textNode?.characters || node.name;
    const route = convention.route || slugify(label);

    return {
      id: `item-${index + 1}`,
      label,
      angle: normalizedAngle,
      route,
    };
  });

  const radii = itemNodes.map((node) => {
    const pos = centerOf(node);
    return Math.hypot(pos.x - centerPos.x, pos.y - centerPos.y);
  });
  const radius = Math.round(radii.reduce((sum, r) => sum + r, 0) / radii.length) || 100;

  const centerBox = centerNode.absoluteBoundingBox;
  const buttonSize = centerBox ? Math.round(Math.max(centerBox.width, centerBox.height)) : 64;

  const firstItem = itemNodes[0];
  const centerText = findTextChild(centerNode);

  const snapshot: Record<string, unknown> = {
    menuItems,
    radius,
    buttonSize,
    logoType: centerText ? 'text' : 'text',
    logoText: centerText?.characters || centerNode.name,
  };

  const buttonBg = firstSolidFill(centerNode);
  if (buttonBg) snapshot.buttonBgColor = buttonBg;
  const buttonOutline = firstSolidStroke(centerNode);
  if (buttonOutline) snapshot.buttonOutlineColor = buttonOutline;

  if (firstItem) {
    const itemBg = firstSolidFill(firstItem);
    if (itemBg) snapshot.menuItemBgColor = itemBg;
    const itemOutline = firstSolidStroke(firstItem);
    if (itemOutline) snapshot.menuItemOutlineColor = itemOutline;
    const itemTextNode = findTextChild(firstItem);
    const itemTextColor = itemTextNode ? firstSolidFill(itemTextNode) : null;
    if (itemTextColor) snapshot.menuItemTextColor = itemTextColor;
  }

  return {
    _meta: {
      generatedWith: 'ZenOrbit for Figma',
      website: 'https://zenorbit.denisbitter.de',
      format: 'project-json',
      exportedAt: new Date().toISOString(),
    },
    ...snapshot,
  };
}

function hexToRgb(hex: string, fallback: RGB): RGB {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex?.trim() || '');
  if (!match) return fallback;
  const n = parseInt(match[1], 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

type ProjectJsonMenuItem = { label: string; angle: number; route?: string };
type ProjectJsonLike = {
  menuItems: ProjectJsonMenuItem[];
  radius?: number;
  buttonSize?: number;
  logoText?: string;
  buttonBgColor?: string;
  buttonOutlineColor?: string;
  menuItemBgColor?: string;
  menuItemOutlineColor?: string;
  menuItemTextColor?: string;
};

// Zeichnet eine Orbit-Gruppe (Center-Node "Logo" + Item-Nodes im Kreis) aus
// ZenOrbit-Konfigurationsdaten auf den Canvas — die Umkehrung von
// buildProjectJson(): dieselbe Node-Konvention, nur in die andere Richtung.
async function createMockupFromData(data: ProjectJsonLike, groupName: string): Promise<GroupNode> {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

  const dark: RGB = { r: 0.1, g: 0.1, b: 0.1 };
  const gold: RGB = { r: 0.816, g: 0.796, b: 0.722 };
  const lightText: RGB = { r: 0.91, g: 0.89, b: 0.84 };

  const buttonFill = hexToRgb(data.buttonBgColor || '', dark);
  const buttonStroke = hexToRgb(data.buttonOutlineColor || '', gold);
  const itemFill = hexToRgb(data.menuItemBgColor || '', dark);
  const itemStroke = hexToRgb(data.menuItemOutlineColor || '', gold);
  const itemTextColor = hexToRgb(data.menuItemTextColor || '', lightText);

  const centerX = figma.viewport.center.x;
  const centerY = figma.viewport.center.y;
  const radius = data.radius || 120;
  const buttonSize = data.buttonSize || 64;

  const makeCircle = (x: number, y: number, size: number, name: string, fill: RGB, stroke: RGB) => {
    const ellipse = figma.createEllipse();
    ellipse.resize(size, size);
    ellipse.x = x - size / 2;
    ellipse.y = y - size / 2;
    ellipse.fills = [{ type: 'SOLID', color: fill }];
    ellipse.strokes = [{ type: 'SOLID', color: stroke }];
    ellipse.strokeWeight = 1.5;
    ellipse.name = name;
    return ellipse;
  };

  const makeLabel = (parent: EllipseNode, characters: string, x: number, y: number, color: RGB) => {
    const text = figma.createText();
    text.characters = characters;
    text.fontSize = 11;
    text.fills = [{ type: 'SOLID', color }];
    text.textAlignHorizontal = 'CENTER';
    text.textAlignVertical = 'CENTER';
    text.resize(parent.width, parent.height);
    text.x = x - parent.width / 2;
    text.y = y - parent.height / 2;
    return text;
  };

  const center = makeCircle(centerX, centerY, buttonSize, 'Logo', buttonFill, buttonStroke);
  const centerLabel = makeLabel(center, data.logoText || 'ZO', centerX, centerY, lightText);

  const nodes: SceneNode[] = [center, centerLabel];
  for (const item of data.menuItems) {
    const rad = ((item.angle - 90) * Math.PI) / 180;
    const x = centerX + Math.cos(rad) * radius;
    const y = centerY + Math.sin(rad) * radius;
    const route = item.route || '/';
    const circle = makeCircle(x, y, Math.min(44, buttonSize * 0.7), `${item.label} | ${route}`, itemFill, itemStroke);
    const label = makeLabel(circle, item.label, x, y, itemTextColor);
    nodes.push(circle, label);
  }

  const group = figma.group(nodes, figma.currentPage);
  group.name = groupName;

  figma.currentPage.selection = [group];
  figma.viewport.scrollAndZoomIntoView([group]);
  return group;
}

async function createDemoMockup(): Promise<void> {
  await createMockupFromData(
    {
      menuItems: [
        { label: 'Start', route: '/', angle: 0 },
        { label: 'Kurse', route: '/courses', angle: 90 },
        { label: 'Kontakt', route: '/contact', angle: 180 },
        { label: 'Blog', route: '/blog', angle: -90 },
      ],
      radius: 120,
      buttonSize: 64,
      logoText: 'ZO',
    },
    'ZenOrbit Demo Mockup'
  );
}

async function importProjectJson(rawJson: string): Promise<void> {
  let parsed: ProjectJsonLike;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('Das ist kein gültiges JSON. Bitte den Export aus dem ZenOrbit Customizer (Delivery Studio → JSON) einfügen.');
  }
  if (!parsed || !Array.isArray(parsed.menuItems) || parsed.menuItems.length === 0) {
    throw new Error('Im JSON fehlt ein "menuItems"-Array. Bitte den Project-JSON-Export aus ZenOrbit einfügen, nicht den React/CSS-Export.');
  }
  await createMockupFromData(parsed, 'ZenOrbit Import');
}

figma.ui.onmessage = (msg: { type: string; json?: string }) => {
  if (msg.type === 'generate') {
    try {
      const json = buildProjectJson();
      figma.ui.postMessage({ type: 'result', json: JSON.stringify(json, null, 2) });
    } catch (err) {
      figma.ui.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }
  if (msg.type === 'createDemo') {
    createDemoMockup()
      .then(() => figma.ui.postMessage({ type: 'demoCreated' }))
      .catch((err) => figma.ui.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) }));
  }
  if (msg.type === 'importJson') {
    importProjectJson(msg.json || '')
      .then(() => figma.ui.postMessage({ type: 'importDone' }))
      .catch((err) => figma.ui.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) }));
  }
  if (msg.type === 'close') {
    figma.closePlugin();
  }
};
