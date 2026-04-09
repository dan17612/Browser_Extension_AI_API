# AI Chat Pro Browser Extension

Moderne Browser-Extension fur KI-Chat mit mehreren Providern in einer einheitlichen Oberflache.

## Vorschau

![Aufzeichnung der Extension](./Aufzeichnung%202026-04-09%20195453.gif)

## Features

- Mehrere Provider: Perplexity, OpenAI, Anthropic, Gemini, LM Studio
- Lokale Speicherung von Einstellungen und Chats
- Einstellungsseite mit Provider-spezifischen Feldern
- Chat-Export (z. B. JSON/Markdown)
- LM Studio Support fur lokale Modelle

## Projektstruktur

- [manifest.json](manifest.json): Extension-Konfiguration
- [popup/popup.html](popup/popup.html): Chat-Oberflache
- [popup/popup.js](popup/popup.js): Chat-Logik im Popup
- [options/options.html](options/options.html): Einstellungsseite
- [options/options.js](options/options.js): Provider- und API-Tests
- [background/background.js](background/background.js): API-Aufrufe pro Provider

## Installation (Chrome/Edge)

1. Repository lokal klonen oder als ZIP entpacken.
2. Browser offnen und Erweiterungsseite aufrufen:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Entwicklermodus aktivieren.
4. `Entpackte Erweiterung laden` auswahlen.
5. Projektordner `Browser_Extension` auswahlen.

## Verwendung

1. Extension offnen.
2. Auf Einstellungen gehen und Provider auswahlen.
3. API-Key hinterlegen (bei LM Studio kein API-Key notwendig).
4. Optional Modell und Base-URL anpassen.
5. Im Chat eine Nachricht senden.

## Hinweise zu Providern

- LM Studio:

  - Standard-URL ist `http://localhost:1234`
  - Stelle sicher, dass LM Studio lauft und ein Modell geladen ist

## Entwicklung

- Keine Build-Pipeline erforderlich (reines Browser-Extension-Projekt)
- Nach Codeanderungen Extension auf der Browser-Erweiterungsseite neu laden

## Lizenz

MIT
