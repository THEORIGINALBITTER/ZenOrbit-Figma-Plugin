# ZenOrbit for Figma

Figma-Plugin für beide Richtungen zwischen Figma und ZenOrbit — kein Backend,
kein Netzwerkzugriff, kein Live-Sync, v1 ist ein reiner, lokaler Konverter:

- **Figma → ZenOrbit**: liest ein Orbit-Menü-Mockup aus Figma und erzeugt eine
  ZenOrbit Project-JSON, kompatibel mit „Project JSON importieren" im
  [ZenOrbit Customizer](https://zenorbit.denisbitter.de/customizer).
- **ZenOrbit → Figma**: fügt eine aus dem Customizer exportierte Project-JSON
  ein und zeichnet dieselbe Navigation (echte Farben, Winkel, Labels) als
  Mockup auf den Figma-Canvas.

## Schnellstart

Kein eigenes Mockup zur Hand? Im Plugin-Panel auf **"✦ Demo-Mockup erzeugen"**
klicken — das Plugin baut direkt auf dem Canvas eine Beispielgruppe nach der
Konvention unten. Danach einfach "JSON generieren" klicken.

## Mockup-Konvention

- Wähle **ein** Frame oder eine Gruppe aus, die dein Orbit-Menü darstellt.
- Ein direktes Kind-Element muss **exakt "Logo"** heißen (Groß-/Kleinschreibung egal) — das wird zum Center-Button.
  Ohne einen Node namens "Logo" wird stattdessen das Element genommen, das dem Zentrum der Auswahl am nächsten liegt.
- Alle anderen direkten Kind-Elemente werden zu Menü-Items. Ihre Position relativ zum Center-Node bestimmt den Winkel.
- Item-Name im Format `Label | /route` setzt Label und Route explizit fest.
  Ohne `|` wird das Label aus einem enthaltenen Textlayer (oder dem Node-Namen) und die Route als Slug daraus abgeleitet.
- Farben (Fill/Stroke) des Center-Node und des ersten Item-Node werden als
  Button- bzw. Menü-Item-Farben übernommen (ZenOrbit kennt aktuell eine
  einheitliche Farbe für alle Items, keine Einzelfarben pro Item).

## Entwicklung

```bash
npm install
npm run build      # einmalig bauen
npm run watch       # bei jeder Änderung neu bauen
npm test            # baut + prüft die Node-Traversal-Logik gegen einen Figma-API-Mock
```

In Figma: **Plugins → Development → Import plugin from manifest…** und
`manifest.json` in diesem Ordner auswählen.

`npm test` führt das echte kompilierte `dist/code.js` gegen einen
handgebauten `figma`-Mock aus (`test/mock-figma-test.mjs`) — testet also die
tatsächliche Node-Traversal- und Winkel-Logik, nicht nur eine Nachbildung
davon. Ersetzt aber nicht den echten Test in Figma selbst: der Mock deckt nur
die API-Oberfläche ab, die `code.ts` anfasst (Selection, `fills`/`strokes`,
`children`, `absoluteBoundingBox`) — nicht Figma-Eigenheiten wie
Auto-Layout, Varianten oder tatsächliches Rendering.

## Nach dem Export

Die generierte Datei im ZenOrbit Customizer unter **Delivery Studio → ↑ Project
JSON importieren** hochladen — Menüelemente, Radius, Farben und Logo werden
direkt übernommen. Details: [Guide → Delivery Studio → JSON](https://zenorbit.denisbitter.de/guide#delivery-json).

## Status

v1 — reiner Mockup-zu-JSON-Export, kein Live-Sync mit dem ZenOrbit Builder.
Auf der [Pricing-Seite](https://zenorbit.denisbitter.de/pro) als "Bald verfügbar"
für Studio angekündigt.
