# n8n Setup for Samrawit Tesfay

This project contains the corrected recipe workflow, an older reference export and the error workflow:

1. `workflows/generate-recipe-v5-korrigiert.json` – corrected workflow to import and activate.
2. `workflows/generate-recipe-v2.json` – older reference only.
3. `workflows/error-notification.json` – sends an email when an unexpected n8n workflow failure occurs.

## 1. Import the recipe workflow

In n8n choose **Workflows → Import from File** and import `generate-recipe-v5-korrigiert.json`.

The import is intentionally inactive. Deactivate or archive the older workflow that already uses `generate-recipe-v5`, then activate/publish the corrected workflow. Two active workflows cannot own the same production webhook path.

Reconnect these credentials in the matching nodes:

- **Generate Recipes AI** → your Google Gemini / PaLM API credential.
- **Read Quota Counter** and **Write Quota Counter** → your Google Firebase Cloud Firestore credential.

Do not paste API keys or service-account JSON into GitHub.

## 2. Import the error workflow

Import `error-notification.json`.

Open **Email Samrawit About Error** and create/select an SMTP credential. The workflow intentionally contains no saved SMTP password.

For the Yahoo address used in this project:

- User: `samrites2008@yahoo.com`
- SMTP host: `smtp.mail.yahoo.com`
- Port: `465` (SSL) or `587` (TLS)
- Authentication: enabled
- Password: use a Yahoo **app password**, not a password committed to the project
- From: `samrites2008@yahoo.com`
- To: `samrites2008@yahoo.com`

After the SMTP credential tests successfully, activate the error workflow.

## 3. Connect error handling to the recipe workflow

Open **Code a Cuisine - Generate Recipes** → workflow settings → choose **Code a Cuisine - Error Notification** as the error workflow. Save the workflow.

This is needed so unexpected n8n execution errors trigger an email. Normal validation/quota responses are handled inside the recipe workflow and are not treated as crashes.

## 4. Publish/activate the recipe workflow

The frontend expects the production webhook path:

`POST /webhook/generate-recipe-v5`

After activation, copy the production webhook URL into `public/api-config.js` if your n8n domain is different.

## 5. Test

Run these checks before submission:

- Send a valid recipe request and confirm exactly 3 recipes are returned.
- Send an invalid request and confirm a clear validation response is returned.
- Trigger more requests than the allowed quota and confirm the quota response appears.
- Temporarily create a controlled workflow error and confirm the error email arrives at `samrites2008@yahoo.com`.
- Confirm quota data is written to Firestore.
- If Gemini still reports “too many requests,” wait for the provider quota window or review the Gemini plan/quota. The workflow retries transient failures, but it cannot bypass a provider limit.

## Important

Credentials are account-specific. The corrected export refers to the credential names from the supplied workflow. After import, confirm that **Generate Recipes AI** uses your Google Gemini credential and both Firestore nodes use your Google Service Account credential. Never send or commit their secret values.
