## n8n Workflows

This folder contains the exported n8n workflows used by Code a Cuisine.

### Included workflows

- `workflows/generate-recipe-v5-korrigiert.json`
  - Corrected import based on the workflow exported on 8 October 2026
  - Accepts the Angular `preferences.portions` and `preferences.persons` request shape
  - Preserves ingredient amount and unit values
  - Retries temporary Gemini failures three times and returns a stable error response
  - Counts the three generated recipes against the three-recipes-per-day quota
  - Exposes `/webhook/generate-recipe-v5`

- `workflows/generate-recipe-v2.json`
  - Older reference export; do not activate together with the corrected v5 workflow
  - Workflow name: **Code a Cuisine - Generate Recipes**
  - Validates Angular input again in n8n
  - Enforces quota checks
  - Calls Google Gemini
  - Requires exactly 3 generated recipe alternatives
  - Reads/writes quota data in Firestore
  - Exposes `/webhook/generate-recipe-v2`

- `workflows/error-notification.json`
  - Workflow name: **Code a Cuisine - Error Notification**
  - Starts with an Error Trigger
  - Sends unexpected workflow failures to `samrites2008@yahoo.com`
  - SMTP credentials must be connected manually after import

See `SETUP-SAMRAWIT.md` for the exact setup steps.

### Security

Never commit API keys, Yahoo app passwords, Firebase service-account JSON, or n8n credential exports to GitHub.
