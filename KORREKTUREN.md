# Code à Cuisine – Korrekturen und offene Punkte

## Erledigt

### Abgleich mit den neu gelieferten Figma-Exporten

- Grundlage: `Rresults.jpg`, `One recipe view - one cook.jpg`, `Recipe.jpg`, `Cookbook.jpg` und `IT recipes.jpg` aus deiner Figma-ZIP. Die 2x-/3x-Exporte wurden auf ihre tatsächliche Layoutbreite bezogen, nicht als zusätzliche große Seiten behandelt.
- Ergebnisse: Textzeilen, Kartenhöhe, Titelzeilenhöhe und Abstand zum unteren Link korrigiert; Originalbild des Roboterarms beibehalten.
- Rezeptdetails: Desktop-Inhalt 1248 px, innere Bannerfläche 1152 px; Nährwertbereich und Titel sauber nebeneinander. Herz-/Like-Badge und unterer Link zur neuen Generierung ergänzt.
- Mobil: Logo und Zurück-Pfeil, vier Nährwertspalten, Nährwerte vor den Tags, Kochlabels, Zutaten-/Directions-Banner, einspaltige Schritte und Footer korrigiert. Widersprüchliche Media Queries entfernt.
- Kochbuch: hellen Kopfbereich wiederhergestellt, 64-px-Titel, kompakte beliebte Rezepte und 400-px-Kategoriefotos mit passenden Abständen.
- Kategorien: 880-px-Rezeptliste, 24-px-Titel, korrekte native Maße jedes Desktop-/Mobil-Banners, Abstände und Paginierung korrigiert. Das italienische Layout dient auch den übrigen Küchenstilen als gemeinsames Layout; Daten bleiben kategoriegerecht.
- Zusätzliche Checklistenfunktionen (Gesamtnährwerte, Prozentanteile, Kochaufgaben) stehen in einer ausklappbaren Ergänzung unter dem Footer. Sie vergrößern nicht mehr den Figma-Rezeptkopf.

- Ladeanimation stoppt jetzt bei Fehlern. Beim Tageslimit erscheint eine klare Meldung mit Link zum Kochbuch; ein wirkungsloser erneuter Versuch wird nicht angeboten. Das Backend-Tageslimit bleibt bestehen.

- Startseite, Zutatenformular, Einstellungen, Ergebnisse, Kochbuch, Kategorie und Rezeptdetails anhand der gelieferten Figma-Fotos und Original-SVG-Exporte angepasst: Größen, Abstände, Kartenaufbau, Banner, Buttons und Schriftgrößen in px.
- Widescreen ab 1440 px: Inhalt zentriert und begrenzt; Hintergrund über die gesamte Bildschirmbreite. Kategorie- und Rezeptbanner wachsen nicht beliebig weiter.
- Ausschließlich die vorhandenen Originalbilder verwendet. Alle 52 Dateien in `public/Icons` sind unverändert. Keine eigenen Sticker oder Ersatzrezepte hinzugefügt.
- Kleine Küchenstil-PNGs werden automatisch angezeigt, sobald deine Originaldateien unter den unten genannten Namen vorhanden sind. Fehlende Dateien erscheinen nicht als kaputte Bilder.
- Den irreführenden Mengen-/Portionsvergleich entfernt: Gramm, Milliliter und Stück wurden zuvor pauschal durch 100 geteilt und mit der Portionszahl verglichen. Die Eingabeprüfung verlangt weiterhin gültige Namen, Einheiten und positive endliche Mengen. Dezimalmengen bleiben erhalten. Die Meldung beschreibt jetzt ungültige Eingaben.
- Kategorie-Seiten unterscheiden Laden, fehlende Firebase-Konfiguration, Fehler und leere Datenbank; erneutes Laden bei Fehlern möglich. Keine erfundenen Rezepte füllen die Bibliothek.
- Echte KI-Metadaten für Kochzuordnung, Dauer und Parallelität werden übernommen und mit den Rezepten gespeichert. Separate Aufgabenlisten je Koch ergänzt. Alte Rezepte ohne Zuordnung bleiben lesbar und weisen Schritte standardmäßig Koch 1 zu.
- Kochhelfer auf 1–3 begrenzt, auch in der n8n-Eingabevalidierung. n8n-Node-Beschreibungen ergänzt.
- Nährwerte pro Portion und gesamt ergänzt; Prozentwerte und Balken zeigen den Anteil an Makronährstoffenergie (Protein/Kohlenhydrate 4 kcal/g, Fett 9 kcal/g). Fehlende Werte bleiben sichtbar fehlend.
- Paginierung mit 15 Rezepten pro Seite wie im Figma-Export. Auch Listen mit mehr als 20 Rezepten werden damit gemäß Checkliste paginiert.
- Touch-Ziele vergrößert; normaler Text mindestens 16 px, kleine Metadaten mindestens 14 px. Nährwerte für Screenreader zugänglich.
- Build-Kopieren der Apache-Datei funktioniert jetzt über Node auch unter Windows. ZIP enthält einen eindeutigen Projektordner mit `package.json`, ohne verschachtelte Projektkopien oder `node_modules`.

## Originalbilder aus deiner neuesten ZIP

Alle sechs kleinen Original-PNGs sind jetzt enthalten: Italian, German, Japanese, Gourmet, Indian und Fusion cuisine. Ihre Bilddaten wurden unverändert übernommen. Deine tatsächlichen Dateinamen endeten auf `.png.png`, weil Windows die letzte Erweiterung ausblendet. Die neue ZIP verwendet die einfache Erweiterung `.png`. Der Code unterstützt zusätzlich deine bisherigen Namen mit `.png.png`.

Für Widescreen fehlt der Originalexport der fünf Teller. Speichere ihn als `public/Icons/Visuals-widescreen.svg`. Er wird ab 1440 px automatisch verwendet. Bis dahin bleibt die vorhandene Drei-Teller-Grafik sichtbar; sie entspricht der normalen Desktop-Vorlage. Keine zusätzlichen Teller wurden erfunden.

## Checkliste: noch offen oder nicht live verifiziert

| Bereich              | Offener Punkt                                                                                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Firebase             | Eigene `public/firebase-config.js` fehlt. Beispiel vorhanden. Firestore-Regeln und erfolgreiches Speichern/Laden mit deiner Konfiguration testen.                                                                                     |
| n8n/Gemini           | Workflow aktivieren, Zugangsdaten einrichten und echte Requests einschließlich Fehlerfällen testen. Fehlerworkflow/SMTP-Zuordnung prüfen.                                                                                             |
| Rezeptqualität       | 70 % Eingabezutaten, maximal drei Extras, Diät, Kochstil, unterschiedliche Vorschläge und sinnvoll genutzte Wartezeiten sind im Prompt vorgesehen; vollständige harte Ergebnisvalidierung und Live-Nachweis fehlen.                   |
| Portionen            | Auswahl und Weitergabe vorhanden; nachträgliches Skalieren eines bestehenden Rezepts nicht implementiert.                                                                                                                             |
| Quota                | Aktueller Zähler zählt Generierungsanfragen, jede liefert drei Rezepte. Abgleich mit drei Rezepten pro IP/Tag erforderlich. Globale Grenze 12, sichere IPv4/IPv6-Validierung und atomarer Schutz gegen gleichzeitige Anfragen fehlen. |
| Dokumentation/GitHub | README und viele JSDoc-Kommentare vorhanden; vollständiger Audit aller Funktionen und ein verifizierter Repository-Link/Commit-Verlauf fehlen.                                                                                        |
| Qualitätssicherung   | Kein vollständiger Produktionsbuild, Browser-, Geräte-, Accessibility- oder Cross-Browser-Test in dieser Umgebung. Impressumsangaben durch Projektinhaber prüfen.                                                                     |

## Durchgeführte Prüfungen

- Angular-Template- und TypeScript-Kompilierung: keine Fehler.
- Alle elf SCSS-Dateien kompilieren.
- 18 Regressionstests für Mengenprüfung, KI-Kochzuordnung, Parallelität, Dauer und Nährwertberechnung bestehen. Ausführen mit `npm run test:regressions`.
- Original-Icons bytegenau mit der Eingabe-ZIP verglichen und erfolgreich dekodiert. Verknüpfte vorhandene Assets geprüft; die sechs PNGs aus der neuesten ZIP wurden erfolgreich dekodiert. Der zusätzliche Widescreen-Tellerexport fehlt weiterhin.

Die mitgelieferten Abhängigkeiten waren für Windows; ein vollständiger Build hier unter Linux scheitert am fehlenden passenden esbuild-Binary. Diese Abhängigkeiten sind nicht in der neuen ZIP. Für die Angular-Prüfung wurde ausschließlich im Prüfprozess fehlende Speicher-Telemetrie umgangen, nicht im Projektcode.

Der direkte Figma-Zugriff wurde wegen fehlender Bearbeitungsrechte verweigert. Der Abgleich erfolgte mit deinen hochauflösenden Figma-JPG-/PNG-Exporten und den Original-SVG-Assets. Eine Browserprüfung wurde versucht; es konnte keine zulässige laufende Browseransicht hergestellt werden. Eine pixelgenaue Übereinstimmung aller Ansichten ist ohne direkten Figma- und Browserabgleich noch nicht bestätigt.

## Start auf deinem Rechner

1. ZIP entpacken. In VS Code den enthaltenen Ordner `code-cuisine` öffnen.
2. Terminal öffnen. `ls package.json` muss die Datei anzeigen. Sonst zuerst in den inneren Ordner wechseln: `cd code-cuisine`.
3. `npm ci` ausführen.
4. `public/firebase-config.example.js` nach `public/firebase-config.js` kopieren und deine eigenen Firebase-Projektdaten einsetzen.
5. `npm start` ausführen und `http://localhost:4200` öffnen.
6. n8n entsprechend README starten/aktivieren. Lokal `npm run test:regressions`, `npm run build` und `npm test` prüfen.

Der frühere ENOENT-Fehler bedeutete, dass das Terminal in einem Ordner ohne `package.json` stand. `npm start` muss im tatsächlichen Projektordner ausgeführt werden.

## Einzelne Dateien in VS Code ersetzen

Wenn du dein bereits gestartetes Projekt behalten möchtest, kopiere aus der neuen ZIP diese Ordner vollständig an die gleichnamige Stelle deines Projekts:

- `src/app/pages/results-page`
- `src/app/pages/preparation-page`
- `src/app/pages/cookbook-page`
- `src/app/pages/cookbook-category-page`

Diese Nachkorrektur ändert keine Firebase-Projektdaten. In deiner hochgeladenen ZIP fehlt weiterhin `public/firebase-config.js`. Die klaren Figma-Listen erscheinen erst nach Verbindung mit einer befüllten Firestore-Bibliothek. Es wurden keine Rezeptlisten aus dem Design als echte gespeicherte Daten ausgegeben.

Nach dem Kopieren aktualisiert `npm start` normalerweise die Ansicht automatisch. Falls nötig Browser mit Strg+F5 neu laden. Beim vollständigen Neu-Entpacken musst du deine eigene `firebase-config.js` wieder nach `public` kopieren; die sechs PNG-Symbole sind in der neuen ZIP bereits enthalten.

## Weitere Funktionskorrekturen nach deiner erneuten Prüfung

- Firestore lädt auch ältere Rezepte ohne `likes`-Feld. Die bisherige Sortierabfrage konnte solche Dokumente ausschließen. Sortierung erfolgt nach dem Laden.
- Die Bibliothek versteht sowohl aktuelle Frontend-Dokumente als auch strukturierte n8n-Rezeptdaten: Küchenstil, Zutatenmengen, Kochzeit, Kochzuordnung, parallele Schritte und Nährwerte.
- Ungültige Dokumente erzeugen keine leeren Zeilen; fehlende Nährwerte werden nicht als Null erfunden.
- Firebase prüft die benötigten Verbindungsfelder, ohne optionale Storage- und Messaging-Werte zwingend zu verlangen.
- Die Ergebnisseite zeigt einen fehlgeschlagenen oder nicht konfigurierten Speichervorgang sichtbar an.
- Eine ausbleibende Antwort des Generierungsdienstes wird nach 90 Sekunden als Fehler behandelt.
- Rezept-Detailansicht verwendet Diät und Zeit als Tags wie im Figma-Export.
- 18 Regressionstests sowie Angular-Template-/TypeScript-Prüfung und elf SCSS-Kompilierungen bestanden. Ein vollständiger Produktionsbuild und der Live-Browserabgleich bleiben hier ungeprüft.

Die Datei `FIREBASE-EINRICHTEN.md` erklärt die noch benötigten Projektdaten. Eine vollständige Erfüllung aller Backend-Punkte der Checkliste ist weiterhin nicht bestätigt; siehe Tabelle oben.

## Eingetragene Live-Verbindungen

- Firebase-Web-App `code-a-cuisine-276fa` ist in `public/firebase-config.js` eingetragen.
- Der Frontend-Webhook entspricht dem sichtbaren n8n-Produktionspfad `https://join-ai-issue-collector.app.n8n.cloud/webhook/generate-recipe-v5`.
- Der auf n8n sichtbare Fehler „The service is receiving too many requests from you“ entsteht im Knoten `Generate Recipes AI` durch ein Gemini-Anfragelimit (HTTP 429), nicht durch Firebase oder Angular.
- Die gelieferte Workflow-JSON wurde als `n8n/workflows/generate-recipe-v5-korrigiert.json` korrigiert. Sie liest die verschachtelten Angular-Präferenzen, behält Zutatenmengen und Einheiten, zählt drei erzeugte Rezepte korrekt gegen das Tageslimit, behandelt falsche Ergebnisanzahlen und versucht einen kurzfristig begrenzten Gemini-Aufruf bis zu dreimal erneut.
- Der korrigierte Workflow ist absichtlich inaktiv exportiert. Vor der Aktivierung muss der bisherige Workflow mit demselben `generate-recipe-v5`-Pfad deaktiviert oder archiviert werden. Die Gemini- und Firestore-Credentials müssen nach dem Import kontrolliert werden. Ein ausgeschöpftes Gemini-Anbieterlimit kann kein Workflow umgehen.
