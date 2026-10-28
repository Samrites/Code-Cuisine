# Code à Cuisine

Code à Cuisine is an Angular recipe generator that allows users to enter ingredients, select cooking preferences, generate recipe suggestions with AI, and save generated recipes in a Supabase-backed cookbook.

## Stack

* Angular 21
* Supabase
* Supabase Edge Functions
* Google Gemini for recipe generation
* Supabase database for cookbook persistence

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Start the Angular application:

```bash
npm start
```

3. Configure the public Supabase connection in:

```text
public/api-config.js
```

Example:

```js
window.__CODE_CUISINE_API__ = {
  recipeWebhookUrl: 'https://YOUR_PROJECT.supabase.co/functions/v1/generate-recipes'
};

window.__CODE_CUISINE_SUPABASE__ = {
  url: 'https://YOUR_PROJECT.supabase.co',
  anonKey: 'YOUR_PUBLIC_PUBLISHABLE_KEY'
};
```

Only the public Supabase publishable key is used in the frontend. Secret or service-role keys must not be stored in the frontend.

## Frontend flow

1. Users enter ingredients on `/generate-recipe`.
2. Users choose portions, helpers, cuisine, cooking time and dietary preferences on `/preferences`.
3. `/loading` starts recipe generation through `RecipeGenerationService`.
4. The frontend sends the request to the Supabase Edge Function `generate-recipes`.
5. The Edge Function handles AI recipe generation.
6. Successful recipes are normalized and displayed on `/results`.
7. Generated recipes are stored in the Supabase `recipes` table.
8. Stored recipes are displayed in `/cookbook` and the corresponding cookbook categories.

## Important files

* `src/app/services/recipe-generation.service.ts`
  Handles recipe generation through the Supabase Edge Function.

* `src/app/services/cookbook-store.service.ts`
  Handles loading and storing cookbook recipes with Supabase.

* `src/app/pages/generate-recipe-page/*`
  Ingredient input and autocomplete.

* `src/app/pages/preferences-page/*`
  Portion, helper, cuisine, cooking-time and dietary preference selection.

* `src/app/pages/results-page/*`
  Generated recipe overview.

* `src/app/pages/preparation-page/*`
  Full recipe detail and preparation view.

* `public/api-config.js`
  Runtime configuration for the public Supabase URL, publishable key and recipe-generation endpoint.

## Recipe generation

The application expects the AI generation service to return three structured recipes.

A generated recipe can contain information such as:

```json
{
  "title": "Recipe title",
  "description": "Short description",
  "prepTime": "30 min",
  "cookCount": 2,
  "ingredients": [
    "500 g pasta",
    "2 tomatoes"
  ],
  "userIngredients": [
    "500 g pasta"
  ],
  "extraIngredients": [
    "2 tomatoes"
  ],
  "steps": [
    "Step 1",
    "Step 2"
  ],
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
```

## Supabase

Supabase provides the backend services used by the application.

### Database

Main table:

```text
recipes
```

Generated recipes are stored after successful generation and are then available in the cookbook.

### Row Level Security

Row Level Security is enabled for the `recipes` table.

The application uses the public `anon` role for permitted frontend operations. Appropriate RLS policies must therefore exist for the operations used by the application.

### Edge Function

Recipe generation is handled through:

```text
/functions/v1/generate-recipes
```

The Angular frontend sends recipe-generation requests to this Supabase Edge Function.

## Responsive design

The application supports desktop, widescreen, tablet and mobile layouts.

Responsive corrections include:

* limiting visual elements so they do not overlap text on widescreen displays
* keeping the page background at full viewport height
* reducing unnecessary horizontal overflow
* adapting content positioning for mobile layouts
* keeping typography consistent across responsive breakpoints

## Language

The user interface should use one consistent language.

The current target is English for:

* navigation
* buttons
* labels
* recipe sections
* generated recipe content

Generated AI responses should therefore also be requested in English.

## Development notes

* At least one ingredient is required before continuing to preferences.
* Recipe generation expects three recipe suggestions.
* Generated recipes should be saved to Supabase after successful generation.
* Saved recipes should appear in the cookbook.
* The Impressum page remains linked from the home page.
* Supabase is used for the current backend and recipe persistence.

## Build

Local development:

```bash
npm start
```

Production build:

```bash
npm run build
```

FTP deployment build:

```bash
npm run build:ftp
```

## Testing

Before submitting the project, check:

* no errors in the browser console
* recipe generation works
* generated recipes are saved
* saved recipes appear in the cookbook
* responsive layouts do not create unnecessary horizontal scrolling
* widescreen layouts fill the complete viewport height
* all visible UI text uses a consistent language

## Project status

The project currently uses:

```text
Angular → Supabase Edge Function → AI generation → Supabase database
```

Supabase is the active backend architecture for recipe generation and cookbook persistence.
