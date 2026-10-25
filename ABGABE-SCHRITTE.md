# Abgabe nach dem Mentor-Feedback

## Kurzkommentar für den Mentor

Das Mentor-Feedback wurde umgesetzt. Die Rezeptgenerierung wurde mit dem aktiven n8n-Endpunkt abgeglichen und der korrigierte Workflow verwendet ein gültiges Gemini-Modell. Die Responsiveness der Start-, Zutaten- und Tablet-Ansichten wurde verbessert, blockierendes `overflow: hidden` entfernt und die unnötige Zutatenliste außerhalb des Autocomplete-Dropdowns gelöscht. Lange Zutaten bleiben in einer Zeile und werden bei Bedarf mit drei Punkten gekürzt. Das Kochbuch zeigt bei leerem Firestore lokale Beispielrezepte; die italienische Kategorie enthält 21 Einträge, sodass die Paginierung mit 20 Rezepten pro Seite geprüft werden kann. Der FTP-Build enthält den korrekten Base-Pfad und eine passende `.htaccess` für `/angular-projects/code-cuisine/`.

## n8n aktualisieren

1. In n8n den momentan aktiven Workflow mit dem Pfad `generate-recipe-v5-fixed` deaktivieren.
2. `n8n/workflows/generate-recipe-v5-korrigiert.json` importieren.
3. Im Knoten **Generate Recipes AI** `Google Gemini(PaLM) Api account 2` auswählen.
4. In den drei Firestore-Knoten **Read Quota Counter**, **Read Global Quota Counter** und
   **Write Quota Counter** die vorhandenen Google-Service-Account-Zugangsdaten auswählen.
5. Workflow aktivieren und veröffentlichen.
6. Einen Testlauf ausführen. Der Workflow liefert genau drei Rezepte. Ein erfolgreicher Test verbraucht
   die Tagesquote von drei Rezepten für diese IP-Adresse und zählt zugleich zum globalen Limit von
   zwölf Rezepten pro Tag.

## GitHub aktualisieren

```bash
git add .
git commit -m "fix: apply mentor feedback and repair production workflow"
git push origin main
```

## FileZilla aktualisieren

1. Im Projekt `npm ci` ausführen.
2. `npm run build:ftp` ausführen.
3. In FileZilla links `dist/code-cuisine/browser` öffnen.
4. Rechts `/angular-projects/code-cuisine` öffnen.
5. Den **Inhalt** von `browser` hochladen und vorhandene Dateien überschreiben. Nicht den Ordner `browser` als zusätzlichen Unterordner hochladen.
6. Danach diese URL mit Strg+F5 öffnen: `https://samrawit-tesfay.developerakademie.net/angular-projects/code-cuisine/`

## Abschlussprüfung

- Rezeptgenerierung mit mindestens einer Zutat testen.
- Startseite bei Desktop, iPad Mini und Mobil prüfen.
- Prüfen, dass die Seite normal vertikal scrollbar ist und keine horizontale Scrollbar besitzt.
- Autocomplete prüfen; außerhalb des Dropdowns darf keine zusätzliche Zutatenliste erscheinen.
- Kochbuch öffnen und die zweite Seite der italienischen Kategorie testen.
