# Code à Cuisine

Code à Cuisine is an Angular recipe generator that collects user ingredients, forwards a generation request to an n8n workflow, renders three recipe suggestions, and stores accepted recipes in Firebase Firestore for the cookbook area.

## Stack

- Angular 21
- n8n webhook workflow for validation, quota checks and Gemini-based recipe generation
- Firebase Firestore for cookbook persistence
- Google Gemini for structured recipe generation

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Start the Angular app:

```bash
npm start
```

3. Start n8n locally on port `5678`.

4. Ensure the published workflow exposes:

```text
POST /webhook/generate-recipe-v5
```

5. Configure Firebase in:

```text
public/firebase-config.js
```

The file is loaded at runtime and must contain:

```js
window.__CODE_CUISINE_FIREBASE__ = {
  apiKey: '...',
  authDomain: '...',
  projectId: '...',
  storageBucket: '...',
  messagingSenderId: '...',
  appId: '...',
};
```

## Frontend flow

1. Users enter ingredients on `/generate-recipe`.
2. Users choose portions, helpers, cuisine, cooking time and diet on `/preferences`.
3. `/loading` triggers recipe generation through `RecipeGenerationService`.
4. The service posts to the configured production webhook `/webhook/generate-recipe-v5`.
5. Angular proxies `/api/*` to the local n8n production webhook.
6. Successful recipes are normalized, shown on `/results`, and saved to Firestore.
7. Stored recipes become visible in `/cookbook` and `/cookbook/:category`.

## Important files

- `src/app/services/recipe-generation.service.ts`
  Frontend integration for the live n8n workflow.
- `src/app/services/cookbook-store.service.ts`
  Firestore-backed cookbook store and persistence layer.
- `src/app/pages/generate-recipe-page/*`
  Ingredient input and autocomplete.
- `src/app/pages/preferences-page/*`
  Portion and preference selection.
- `src/app/pages/results-page/*`
  Generated recipe overview.
- `src/app/pages/preparation-page/*`
  Full recipe detail view.

## n8n expectations

The published n8n workflow is expected to:

- validate the incoming request again
- enforce quota checks
- ask Gemini for exactly 3 recipes
- return structured JSON with `success` and `recipes`

Example success shape:

```json
{
  "success": true,
  "recipes": [
    {
      "title": "Recipe title",
      "description": "Short description",
      "prepTime": "30 min",
      "cookCount": 2,
      "ingredients": ["500 g pasta", "2 tomatoes"],
      "userIngredients": ["500 g pasta"],
      "extraIngredients": ["2 tomatoes"],
      "steps": ["Step 1", "Step 2"],
      "nutrition": {
        "perPortion": {
          "calories": 530,
          "protein_g": 22,
          "carbs_g": 61,
          "fat_g": 18
        },
        "total": {
          "calories": 1060,
          "protein_g": 44,
          "carbs_g": 122,
          "fat_g": 36
        }
      }
    }
  ]
}
```

## Firebase

- Firestore collection: `recipes`
- The frontend stores generated recipes only after successful generation.
- The cookbook no longer uses local fallback recipes; if Firestore is empty, the cookbook stays empty.

## Development notes

- The frontend requires at least one ingredient before moving to preferences.
- The live service enforces exactly three returned recipes; otherwise the request is treated as an error.
- The Impressum page is linked from the home page and contains the provided contact details for Samrawit Tesfay.

## Test commands

```bash
npm run test:regressions
npm run test:n8n
npm run build
npm test
```

## Bildkorrekturen und Checklisten-Stand

Siehe `KORREKTUREN.md` für die vorgenommenen Bild-/px-Korrekturen, Prüfungen und offenen Anforderungen. Nach dem Entpacken `npm ci` ausführen; mitgelieferte Windows-Abhängigkeiten sind nicht Teil der korrigierten ZIP.

## Originale Küchenstil-Symbole und Widescreen

Die sechs PNG-Dateien aus deinem Download-Ordner nach `public/Icons` kopieren; genaue Dateinamen stehen in `KORREKTUREN.md`. Der originale Fünf-Teller-Export heißt `Visuals-widescreen.svg` und wird ab 1440 px eingebunden. Fehlende Originale werden nicht durch eigene Bilder ersetzt.

Für die Regressionen: `npm run test:regressions`. Weitere offene Checklistenpunkte und die Grenzen der hier durchgeführten Prüfungen stehen in `KORREKTUREN.md`.
