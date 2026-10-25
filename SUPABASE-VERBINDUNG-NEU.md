# Code à Cuisine – Supabase-Verbindung

Die Angular-App ruft jetzt die bereits bereitgestellte Edge Function `generate-recipes` auf.

## Starten
1. ZIP entpacken und Ordner `code-cuisine` in VS Code öffnen.
2. `npm install` und anschließend `npm start` ausführen.
3. Zutaten und Einstellungen wählen, 3 Rezepte generieren und Bibliothek öffnen.

## Wichtige Hinweise
- Der OpenAI-API-Schlüssel bleibt ausschließlich in den Supabase Edge Function Secrets.
- Nur der öffentliche Supabase Publishable Key steht im Frontend.
- Speichern und Lesen in `public.recipes` benötigen passende Supabase RLS-Policies.
- Die Edge Function muss Anfragen mit dem öffentlichen Publishable Key erlauben und CORS-Header setzen.
- Die Generierung wurde im Supabase-Dashboard bereits getestet; ein Ende-zu-Ende-Test der Angular-App ist noch erforderlich.
- Quota-/IP-Limits aus der JOIN-Checkliste sind damit **nicht** automatisch umgesetzt.
- Bei Bedarf das Backend-Nährwertformat an `perPortion`/`total` angleichen.
- Automatisches OpenAI-Aufladen ist laut letztem Screenshot ausgeschaltet.
