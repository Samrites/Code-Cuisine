# Code à Cuisine

Code à Cuisine is an Angular recipe application that allows users to enter ingredients, select cooking preferences, generate AI-powered recipe suggestions and save generated recipes in a cookbook.

## Stack

- Angular 21
- n8n
- Google Gemini
- n8n Data Tables

## Architecture

The application currently uses:

```text
Angular → n8n → Google Gemini → n8n Data Table
```

n8n is the backend layer between the Angular frontend, Google Gemini and the recipe storage.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Start the Angular application:

```bash
npm start
```

3. Configure the n8n webhook in:

```text
public/api-config.js
```

Example:

```js
window.__CODE_CUISINE_API__ = {
  recipeWebhookUrl: 'https://YOUR-N8N-INSTANCE/webhook/YOUR-RECIPE-WEBHOOK'
};
```

Sensitive credentials such as the Google Gemini API key must not be stored in the Angular frontend or committed to GitHub. They are configured securely in n8n.

## Frontend flow

1. Users enter ingredients on `/generate-recipe`.
2. Users choose portions, helpers, cuisine, cooking time and dietary preferences on `/preferences`.
3. `/loading` starts recipe generation through `RecipeGenerationService`.
4. Angular sends the request to the n8n recipe-generation webhook.
5. n8n validates and prepares the input.
6. Google Gemini generates three structured recipe suggestions.
7. n8n processes the generated recipes.
8. Generated recipes are stored in the n8n Data Table.
9. Recipes are returned to Angular and displayed on `/results`.
10. Stored recipes are loaded through the n8n cookbook endpoint and displayed on `/cookbook`.

## Important files

- `src/app/services/recipe-generation.service.ts`  
  Handles recipe generation through the n8n webhook.

- `src/app/services/cookbook-store.service.ts`  
  Handles loading cookbook recipes through n8n.

- `src/app/pages/generate-recipe-page/*`  
  Ingredient input and autocomplete.

- `src/app/pages/preferences-page/*`  
  Portion, helper, cuisine, cooking-time and dietary preference selection.

- `src/app/pages/results-page/*`  
  Generated recipe overview.

- `src/app/pages/preparation-page/*`  
  Full recipe detail and preparation view.

- `public/api-config.js`  
  Runtime configuration for the n8n endpoints.

- `n8n/`  
  Contains the exported n8n workflow for the project.

## Recipe generation

The application expects the AI workflow to return three structured recipes.

Recipe information can include:

- title
- description
- cuisine
- ingredients
- preparation instructions
- preparation time
- cooking time
- servings
- helpers
- nutrition information
- diet information
- user ingredients
- additional ingredients

## n8n Backend

n8n provides the backend workflows used by Code à Cuisine.

### Recipe Generation

The Angular frontend sends ingredients and cooking preferences to an n8n webhook.

The workflow:

1. Receives the Angular request.
2. Extracts and maps the input.
3. Validates the request.
4. Prepares the AI input.
5. Sends the request to Google Gemini.
6. Parses the structured response.
7. Processes the generated recipes.
8. Stores the recipes.
9. Returns the recipes to Angular.

### Cookbook

Stored recipes are loaded through a separate n8n GET webhook.

The workflow reads the recipes from the n8n Data Table, formats them for Angular and returns the recipe list to the frontend.

### Data Table

The project uses the n8n Data Table:

```text
code_cuisine_recipes
```

It stores generated recipe information for the cookbook.

## Google Gemini

Google Gemini is used for AI recipe generation.

Gemini is called from inside the n8n workflow instead of directly from Angular. This keeps AI credentials outside the frontend application.

## Responsive design

The application supports desktop, widescreen, tablet and mobile layouts.

Responsive corrections include:

- preventing visual elements from overlapping text
- keeping backgrounds at full viewport height
- reducing unnecessary horizontal overflow
- adapting content positioning for mobile layouts
- keeping typography consistent across responsive breakpoints

## Language

The current target language of the user interface is English.

This includes:

- navigation
- buttons
- labels
- recipe sections
- generated recipe content

Generated AI recipes should therefore also be returned in English.

## Development notes

- At least one ingredient is required before continuing to preferences.
- Recipe generation expects three recipe suggestions.
- Recipe generation is handled through n8n.
- Google Gemini is connected through n8n.
- Generated recipes are stored in an n8n Data Table.
- Stored recipes should appear in the cookbook.
- The Impressum page remains linked from the home page.

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

- no errors appear in the browser console
- recipe generation works
- n8n receives the recipe-generation request
- Google Gemini returns three recipes
- generated recipes are stored in the n8n Data Table
- stored recipes appear in the cookbook
- responsive layouts work correctly
- all visible UI text uses a consistent language

## Project status

Current backend architecture:

```text
Angular → n8n → Google Gemini → n8n Data Table
```

n8n is the active backend for recipe generation and cookbook persistence.