# Korrekturen nach Feedback

- Widescreen/Responsive auf der Startseite: Hero-Bild begrenzt, damit es Text und Cookbook-Link nicht überdeckt.
- Impressum-Schrift: Quicksand explizit gesetzt.
- Firebase-Runtime entfernt: `src/index.html` lädt nur noch `api-config.js`.
- Supabase Edge Function: Publishable Key wird nur noch im `apikey`-Header gesendet; kein Publishable Key mehr als Bearer-Token.
- Supabase REST Cookbook: ebenfalls nur `apikey` für den öffentlichen Publishable Key.
- Rezept-Fehlerbehandlung: doppelten `const trimmedBody`-Fehler entfernt; Backend-Stringfehler werden korrekt angezeigt; 401/403 erhalten eine klare Supabase-Meldung.
- Fehlende `angular.json` ergänzt.
- FTP-Base-Href auf `/angular-projects/browser/` gesetzt, passend zur bestehenden Abgabe.

## Auf Windows ausführen

```bash
npm install
npm run build:ftp
```

Danach den Inhalt aus `dist/code-cuisine/browser/` nach `/angular-projects/browser/` hochladen und im Browser mit `Strg + F5` neu laden.
