# Firebase für dein Kochbuch verbinden

Firebase speichert die generierten Rezepte. Die sechs Küchenbilder öffnen eine nach Küchenstil gefilterte Liste dieser gespeicherten Rezepte. Ohne Verbindung beziehungsweise ohne gespeicherte Rezepte bleibt die Liste leer; die Beispielrezepte aus Figma sind keine Datenbank.

## Welche Angaben gebraucht werden

Der vollständige `firebaseConfig`-Block deiner Firebase-Web-App: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`. Für diese Firestore-Verbindung sind die ersten drei Angaben notwendig; die übrigen können im Originalblock bleiben.

1. Öffne https://console.firebase.google.com/ und wähle dein bestehendes Projekt.
2. Zahnrad → Projekteinstellungen → Allgemein → Deine Apps → deine Web-App.
3. Falls noch keine Web-App registriert ist, füge sie über das Symbol `</>` hinzu.
4. Unter SDK-Einrichtung und -Konfiguration wähle „Konfiguration“. Kopiere den vollständigen `firebaseConfig`-Block.
5. Kopiere `public/firebase-config.example.js` nach `public/firebase-config.js`.
6. Ersetze die Beispielwerte durch die Werte aus deinem Block. Die erste Zeile muss `window.__CODE_CUISINE_FIREBASE__ = {` bleiben.
7. `npm start` im Projektordner starten und http://localhost:4200 öffnen. Nach Änderungen Browser vollständig neu laden.

Du kannst den Firebase-Web-Konfigurationsblock hier schicken, damit er in die Projektdatei eingesetzt werden kann. Für diese Einrichtung werden kein Passwort und kein Service-Account-Schlüssel benötigt.

## Datenbank und Regeln

Im selben Projekt muss eine Cloud-Firestore-Datenbank vorhanden sein. Die App verwendet die Standarddatenbank und die Sammlung `recipes`. Lesen, das Anlegen generierter Rezepte und Aktualisieren des Herzzählers müssen zu den eigenen Firestore-Regeln passen. Bei „Missing or insufficient permissions“ liegt ein Regelproblem vor; nicht pauschal die gesamte Datenbank öffentlich beschreibbar machen.

Wenn noch keine Rezepte gespeichert sind, zuerst ein Rezept erfolgreich generieren. Die Ergebnisansicht zeigt an, wenn das Speichern scheitert. Ein n8n-Tageslimit ist ein gesondertes Problem und wird durch die Firebase-Konfiguration nicht aufgehoben.

Offizielle Anleitungen:
https://firebase.google.com/docs/web/setup
https://support.google.com/firebase/answer/7015592?hl=de
https://firebase.google.com/docs/firestore/quickstart
