# ehoser-browser

Ein kleiner echter Desktop-Browser mit Electron/Chromium.

## Webseite

Die Root-Dateien `index.html`, `site.css` und `site.js` bilden die Vercel-Startseite.
Beim ersten Besuch wird ein Zugangscode abgefragt; danach merkt sich der Browser den
freigeschalteten Zustand lokal.

Die Datei `api/search.js` liefert die `ehoser`-Suchergebnisse. Optional koennen in
Vercel `BRAVE_SEARCH_API_KEY` oder `JINA_API_KEY` gesetzt werden, damit echte
Websuche-Ergebnisse genutzt werden. Ohne API-Key nutzt die Seite freie Quellen und
direkte Suchlinks als Fallback.

## Start

```powershell
npm install
npm start
```

Beim Start erscheint zuerst eine Zugangscode-Seite. Die Eingabe ist verdeckt.
