# Code à Cuisine – Supabase-Version

Diese Projektversion verwendet Supabase für das Kochbuch. Firebase-Konfiguration, Firebase-Paket und n8n-Workflow-Dateien wurden aus dem Projekt entfernt.

## Start

Im Ordner `code-cuisine` ausführen:

```bash
npm install
npm start
```

Anschließend die im Terminal angezeigte localhost-Adresse öffnen (gewöhnlich Port 4200).

## Noch offen / nicht als fertig getestet

- Der Rezeptgenerator benötigt noch eine Supabase Edge Function mit einem geeigneten Rezeptgenerierungsdienst. Ohne diese Funktion zeigt die App eine Fehlermeldung.
- Die Supabase-Tabelle `public.recipes` muss passende RLS-Policies für Lesen und ggf. Schreiben haben. Niemals einen Secret- oder service_role-Key im Browser verwenden.
- Die Live-Verbindung mit dem Supabase-Projekt wurde hier nicht geprüft.
- Historische Prüfberichte/Checklisten im Projekt können ältere Firebase- oder n8n-Architektur beschreiben und sind nicht als aktuelle Implementierungsbestätigung zu lesen.
