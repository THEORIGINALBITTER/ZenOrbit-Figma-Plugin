# ZenOrbit for Figma

ZenOrbit for Figma verbindet Figma und den
[ZenOrbit Customizer](https://zenorbit.denisbitter.de/customizer) in beide
Richtungen. Das Plugin wandelt Orbit-Menüs lokal zwischen Figma-Mockups und
ZenOrbit Project JSON um.

Es benötigt kein Backend, überträgt keine Dokumente an externe Dienste und
fordert keinen Netzwerkzugriff an.

## Funktionen

### Figma → ZenOrbit

- Liest ein ausgewähltes Orbit-Menü aus einem Frame oder einer Gruppe.
- Erkennt Center-Button, Menüelemente, Winkel, Radius, Labels und Routen.
- Übernimmt verfügbare Füll-, Kontur- und Textfarben.
- Erzeugt ein ZenOrbit-kompatibles Project JSON.
- Kopiert das Ergebnis in die Zwischenablage oder lädt es als `.json` herunter.

### ZenOrbit → Figma

- Importiert Project JSON aus dem ZenOrbit Delivery Studio.
- Prüft Struktur, Menüelemente, Winkel, Größen und Hex-Farben.
- Zeigt vor dem Import eine verständliche Projektvorschau.
- Kennzeichnet fehlende optionale Werte und verwendete Standards.
- Zeichnet das validierte Orbit-Menü als editierbare Gruppe auf den Canvas.

### Demo-Mockup

Über **Demo-Mockup erzeugen** erstellt das Plugin ein vollständiges Beispiel
direkt auf dem aktuellen Figma-Canvas. Damit lassen sich Export und Import ohne
vorbereitete Designdatei testen.

## Plugin lokal in Figma installieren

### Fertiges Release-Paket

1. Das aktuelle ZIP unter
   [GitHub Releases](https://github.com/THEORIGINALBITTER/ZenOrbit-Figma-Plugin/releases/latest)
   herunterladen und entpacken.
2. In Figma **Plugins → Development → Import plugin from manifest…** öffnen.
3. Die `manifest.json` aus dem entpackten Ordner auswählen.

### Aus dem Quellcode

1. Repository klonen und Abhängigkeiten installieren:

   ```bash
   git clone https://github.com/THEORIGINALBITTER/ZenOrbit-Figma-Plugin.git
   cd ZenOrbit-Figma-Plugin
   npm install
   npm run build
   ```

2. In der Figma-Desktop-App öffnen:

   ```text
   Plugins → Development → Import plugin from manifest…
   ```

3. Die Datei `manifest.json` aus diesem Repository auswählen.

4. Das Plugin anschließend über **Plugins → Development → ZenOrbit for Figma**
   starten.

## Figma-Mockup vorbereiten

Wähle genau einen Frame oder eine Gruppe mit mindestens zwei direkten
Kind-Elementen aus:

- Ein Kind sollte `Logo` heißen und wird als Center-Button verwendet.
- Alle anderen sichtbaren Kinder werden als Menüelemente behandelt.
- Falls kein Element `Logo` heißt, verwendet das Plugin das Element, das dem
  Mittelpunkt der Auswahl am nächsten liegt.

Für Menüelemente kann der Name folgende Konvention verwenden:

```text
Label | /route
```

Beispiele:

```text
Start | /
Produkte | /products
Kontakt | /contact
```

Ohne `|` übernimmt das Plugin den Text eines enthaltenen Textlayers oder den
Node-Namen. Die Route wird dann automatisch aus dem Label erzeugt.

## Figma nach ZenOrbit exportieren

1. Orbit-Gruppe oder Frame auswählen.
2. Im Plugin **JSON generieren** anklicken.
3. JSON kopieren oder als Datei herunterladen.
4. Im ZenOrbit Customizer zu **Delivery Studio → Project JSON importieren**
   wechseln.
5. JSON einfügen oder Datei auswählen.

## ZenOrbit nach Figma importieren

1. Im ZenOrbit Customizer das Project JSON über **Delivery Studio → JSON**
   kopieren.
2. JSON im Plugin in das Feld **ZenOrbit → Figma** einfügen.
3. Die Validierung und Projektvorschau prüfen.
4. **In Figma erzeugen** anklicken.

Der Import-Button wird erst aktiviert, wenn das JSON valide ist.

## Unterstütztes JSON

Minimalbeispiel:

```json
{
  "menuItems": [
    { "label": "Start", "route": "/", "angle": 0 },
    { "label": "Produkte", "route": "/products", "angle": 90 },
    { "label": "Kontakt", "route": "/contact", "angle": 180 }
  ],
  "radius": 120,
  "buttonSize": 64,
  "logoText": "ZO",
  "buttonBgColor": "#1A1A1A",
  "buttonOutlineColor": "#D0CBB8",
  "menuItemBgColor": "#1A1A1A",
  "menuItemOutlineColor": "#D0CBB8",
  "menuItemTextColor": "#E8E3D7"
}
```

Pflichtfelder:

- `menuItems`: nicht-leeres Array
- `label`: nicht-leerer Text pro Menüelement
- `angle`: numerischer Winkel pro Menüelement

Optionale Felder erhalten sichere Standardwerte. Farben müssen als
sechsstellige Hex-Werte wie `#D0CBB8` angegeben werden.

## Datenschutz

- Verarbeitung erfolgt vollständig lokal im Figma-Plugin.
- Kein Backend und kein Benutzerkonto erforderlich.
- Kein Tracking und keine Analyse-Skripte.
- `manifest.json` erlaubt keine Netzwerk-Domains.
- Es werden keine Figma-Dokumente oder Project-JSON-Daten hochgeladen.

## Entwicklung

Voraussetzungen:

- Node.js
- npm
- Figma Desktop

Befehle:

```bash
npm install
npm run build
npm run package
npm run watch
npm test
npx tsc --noEmit
```

Projektstruktur:

```text
src/code.ts              Plugin-Logik und Figma-API
src/ui.html              Plugin-Oberfläche
dist/code.js             gebautes Plugin-Bundle
dist/ui.html             gebaute Oberfläche
test/mock-figma-test.mjs automatisierte Figma-API-Mocktests
manifest.json            Figma-Plugin-Manifest
scripts/package.sh       erstellt das veröffentlichbare ZIP
```

`npm test` baut das Plugin und prüft anschließend:

- Figma → ZenOrbit Export
- ZenOrbit → Figma Import
- Canvas-Erzeugung über den Figma-API-Mock
- gültige JSON-Vorschau
- verständliche Ablehnung ungültiger JSON-Daten

Die automatisierten Tests ersetzen nicht den abschließenden visuellen Test in
der Figma-Desktop-App.

## Status

Das Plugin befindet sich in aktiver Entwicklung. Export, Import,
Demo-Erzeugung und JSON-Validierung sind implementiert. Eine Veröffentlichung
in der Figma Community ist noch nicht Bestandteil dieser Entwicklungsstufe.

## Lizenz

[MIT](LICENSE)
