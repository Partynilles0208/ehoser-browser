# ehoser-browser

Ein kleiner echter Desktop-Browser mit Electron/Chromium.

## Webseite

Die Root-Dateien `index.html`, `site.css` und `site.js` bilden die Vercel-Startseite.
Beim ersten Besuch wird ein Zugangscode abgefragt; danach merkt sich der Browser den
freigeschalteten Zustand lokal.

## Start

```powershell
npm install
npm start
```

Beim Start erscheint zuerst eine Zugangscode-Seite. Die Eingabe ist verdeckt.
