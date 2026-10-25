# Code à Cuisine – Supabase-Umstellung (22.10.2026)

## Tatsächlich geändert
- Kochbuch liest aus `public.recipes` über die Supabase REST API statt aus Firestore.
- Die Datenbankspalten `cooking_time`, `helpers` und `instructions` werden in das bestehende Angular-Rezeptmodell übersetzt.
- Die Demo-Rezepte bleiben als Fallback und für die Pagination sichtbar.
- Neue generierte Rezepte werden bei vorhandener Supabase-Konfiguration per REST gespeichert (nur falls RLS dies erlaubt).
- Der alte n8n-Endpunkt wurde aus `public/api-config.js` entfernt.
- Es wird eine verständliche Fehlermeldung ausgegeben, wenn eine Generierung ohne Backend versucht wird.

## Unbedingt noch nötig
1. In `public/api-config.js` den **öffentlichen** Supabase Publishable-/anon-Key eintragen (NIEMALS den secret/service_role-Key).
2. In Supabase > Database > Policies eine SELECT-RLS-Policy für `public.recipes` anlegen, wenn das Kochbuch öffentlich sein soll. Beispiel (nur wenn öffentliche Rezepte gewünscht sind):
   `create policy "Public recipes readable" on public.recipes for select to anon, authenticated using (true);`
   RLS muss aktiviert sein.
3. Schreibzugriff NICHT pauschal für `anon` freigeben. Für Rezept-Speicherung und Likes ist ein sicherer Server-/Edge-Function-Endpunkt mit Rate-Limit/Validierung oder authentifizierte Benutzer mit passenden RLS-Regeln erforderlich.
4. **Rezeptgenerierung ist noch NICHT fertig:** Supabase ist eine Datenbank und ersetzt nicht automatisch die n8n-/KI-Logik. Eine Supabase Edge Function mit KI-Anbindung und sicherem API-Key muss dafür gebaut und veröffentlicht werden. Die Angular-App zeigt derzeit eine Fehlermeldung statt einen n8n-Aufruf zu machen.
5. `npm ci`, `npm run build:ftp`, UI-Tests und Live-Tests mit Supabase-Zugangsdaten ausführen.

## Prüfergebnisse in dieser Bearbeitung
- `node scripts/check-regressions.cjs`: 22/22 erfolgreich (prüft zum Teil ältere Firebase/n8n-Annahmen; kein vollständiger Supabase-Test).
- `npm run test:n8n`: bestehender n8n-Export besteht Strukturtest; n8n wird aber nicht mehr vom Frontend verwendet.
- Angular-Build: **nicht ausgeführt**; `node_modules` ist hier nicht installiert.
- Supabase-Live-Test: **nicht ausgeführt**; öffentlicher Schlüssel fehlt.

**Status: Zwischenstand, keine vollständig abgabefertige Lösung.**
