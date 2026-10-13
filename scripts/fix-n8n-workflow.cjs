const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  throw new Error('Usage: node scripts/fix-n8n-workflow.cjs INPUT.json OUTPUT.json');
}

const workflow = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const byName = (name) => {
  const node = workflow.nodes.find((entry) => entry.name === name);
  if (!node) throw new Error(`Missing workflow node: ${name}`);
  return node;
};
const assignment = (nodeName, fieldName) => {
  const entry = byName(nodeName).parameters.assignments.assignments.find(
    (candidate) => candidate.name.replace(/^=/, '') === fieldName,
  );
  if (!entry) throw new Error(`Missing assignment ${nodeName}.${fieldName}`);
  return entry;
};

workflow.name = 'Code a Cuisine - Generate Recipes - Korrigiert v5';
workflow.active = false;
delete workflow.id;
delete workflow.versionId;
delete workflow.createdAt;
delete workflow.updatedAt;
delete workflow.shared;
delete workflow.pinData;
delete workflow.meta;

byName('Webhook').parameters.path = 'generate-recipe-v5';
assignment('Extract Input', 'ingredients').value =
  '={{ $json.body?.ingredients ?? $json.ingredients ?? [] }}';
assignment('Extract Input', 'servings').value =
  '={{ Number($json.body?.servings ?? $json.body?.preferences?.portions ?? $json.servings ?? $json.preferences?.portions ?? 0) }}';
assignment('Extract Input', 'helpers').value =
  '={{ Number($json.body?.helpers ?? $json.body?.preferences?.persons ?? $json.helpers ?? $json.preferences?.persons ?? 0) }}';
assignment('Extract Input', 'timeCategoryRaw').value =
  "={{ $json.body?.timeCategory ?? $json.body?.preferences?.cookingTime ?? $json.timeCategory ?? $json.preferences?.cookingTime ?? 'medium' }}";
assignment('Extract Input', 'cuisineRaw').value =
  "={{ $json.body?.cuisine ?? $json.body?.preferences?.cuisine ?? $json.cuisine ?? $json.preferences?.cuisine ?? '' }}";
assignment('Extract Input', 'dietRaw').value =
  "={{ $json.body?.diet ?? $json.body?.preferences?.diet ?? $json.diet ?? $json.preferences?.diet ?? 'none' }}";
assignment('Map Input', 'servings').value =
  '={{ Number($json.servings ?? $json.body?.servings ?? $json.body?.preferences?.portions ?? 0) }}';
assignment('Map Input', 'helpers').value =
  '={{ Number($json.helpers ?? $json.body?.helpers ?? $json.body?.preferences?.persons ?? 0) }}';
assignment('Map Input', 'timeCategory').value =
  "={{ ({ quick:'quick', short:'quick', medium:'medium', complex:'elaborate', elaborate:'elaborate', long:'elaborate' })[String($json.timeCategoryRaw ?? $json.timeCategory ?? $json.body?.preferences?.cookingTime ?? '').trim().toLowerCase()] || 'medium' }}";

byName('Validate Input').parameters.jsCode = `const item = $input.first().json;
const errors = [];
const validCuisines = ['de', 'it', 'jp', 'in', 'gourmet', 'fusion'];
const validDiets = ['vegetarian', 'vegan', 'keto', 'none'];
const validTimeCategories = ['quick', 'medium', 'elaborate'];
const rawIngredients = Array.isArray(item.ingredients) ? item.ingredients : [];

const normalizedIngredients = rawIngredients.map((ingredient) => {
  const structured = typeof ingredient === 'object' && ingredient !== null;
  const name = structured ? String(ingredient.name ?? '').trim() : String(ingredient ?? '').trim();
  const amount = structured ? Number(ingredient.amount) : null;
  const unit = structured ? String(ingredient.unit ?? '').trim() : '';
  return { name, amount, unit, structured };
});

const ingredientIsValid = (ingredient) => {
  const normalizedName = ingredient.name.toLowerCase();
  const validName = ingredient.name.length >= 2 && /[a-zA-ZäöüÄÖÜß]/.test(ingredient.name) &&
    !/^\\d+$/.test(ingredient.name) && !['test', 'asdf', 'qwe'].includes(normalizedName);
  const validQuantity = !ingredient.structured ||
    (Number.isFinite(ingredient.amount) && ingredient.amount > 0 && ingredient.unit.length > 0);
  return validName && validQuantity;
};

if (normalizedIngredients.length === 0) errors.push('At least one valid ingredient is required');
if (normalizedIngredients.some((ingredient) => !ingredientIsValid(ingredient))) {
  errors.push('Each ingredient requires a valid name, positive amount, and unit');
}
if (!Number.isInteger(item.servings) || item.servings < 1 || item.servings > 12) {
  errors.push('servings must be between 1 and 12');
}
if (!Number.isInteger(item.helpers) || item.helpers < 1 || item.helpers > 3) {
  errors.push('helpers must be between 1 and 3');
}
if (!validCuisines.includes(item.cuisine)) errors.push('cuisine is invalid');
if (!validTimeCategories.includes(item.timeCategory)) errors.push('timeCategory is invalid');
const diet = item.diet || 'none';
if (!validDiets.includes(diet)) errors.push('diet is invalid');

return [{ json: {
  ...item,
  ingredients: normalizedIngredients
    .filter(ingredientIsValid)
    .map(({ name, amount, unit }) => ({ name, amount, unit })),
  diet,
  valid: errors.length === 0,
  errors
} }];`;

for (const name of ['Build Validation Error', 'Build Quota Error']) {
  for (const field of byName(name).parameters.assignments.assignments) {
    field.name = field.name.replace(/^=/, '');
  }
}

byName('Prepare Quota Data').parameters.jsCode = byName(
  'Prepare Quota Data',
).parameters.jsCode.replace('limitPerDay: 3', 'limitPerDay: 3,\n        requestCost: 3');
byName('Read Quota Counter').alwaysOutputData = true;
byName('Normalize Quota Counter').parameters.jsCode = byName('Normalize Quota Counter')
  .parameters.jsCode.replace(
    'const allowed = usedToday < limitPerDay;',
    'const requestCost = existingQuota.requestCost ?? 3;\nconst allowed = usedToday + requestCost <= limitPerDay;',
  )
  .replace(
    'remainingToday,\n        allowed',
    'remainingToday,\n        requestCost,\n        allowed',
  );
byName('Prepare Quota Write').parameters.jsCode = byName(
  'Prepare Quota Write',
).parameters.jsCode.replace(
  'count: Number(quota.usedToday ?? 0) + 1,',
  'count: Number(quota.usedToday ?? 0) + Number(quota.requestCost ?? 3),',
);

const aiNode = byName('Generate Recipes AI');
aiNode.retryOnFail = true;
aiNode.maxTries = 3;
aiNode.waitBetweenTries = 10000;
aiNode.onError = 'continueErrorOutput';

const countErrorNode = {
  parameters: {
    assignments: {
      assignments: [
        { id: crypto.randomUUID(), name: 'success', value: false, type: 'boolean' },
        { id: crypto.randomUUID(), name: 'error', value: 'invalid_recipe_count', type: 'string' },
        {
          id: crypto.randomUUID(),
          name: 'message',
          value: 'The AI did not return exactly three recipes.',
          type: 'string',
        },
        {
          id: crypto.randomUUID(),
          name: 'details',
          value: '={{$json.generationCountCheck}}',
          type: 'object',
        },
      ],
    },
    options: {},
  },
  type: 'n8n-nodes-base.set',
  typeVersion: 3.4,
  position: [3680, 96],
  id: crypto.randomUUID(),
  name: 'Build Recipe Count Error',
  notes: 'Returns a stable failure payload when Gemini does not return exactly three recipes.',
};
const returnCountNode = {
  parameters: { options: {} },
  type: 'n8n-nodes-base.respondToWebhook',
  typeVersion: 1.5,
  position: [3904, 96],
  id: crypto.randomUUID(),
  name: 'Return Recipe Count Error',
};
const aiErrorNode = {
  parameters: {
    assignments: {
      assignments: [
        { id: crypto.randomUUID(), name: 'success', value: false, type: 'boolean' },
        {
          id: crypto.randomUUID(),
          name: 'error',
          value: 'ai_temporarily_unavailable',
          type: 'string',
        },
        {
          id: crypto.randomUUID(),
          name: 'message',
          value: 'The AI service is temporarily rate limited. Please try again later.',
          type: 'string',
        },
      ],
    },
    options: {},
  },
  type: 'n8n-nodes-base.set',
  typeVersion: 3.4,
  position: [2944, 48],
  id: crypto.randomUUID(),
  name: 'Build AI Service Error',
  notes: 'Converts a persistent Gemini error into a response the Angular app can display.',
};
const returnAiErrorNode = {
  parameters: { options: {} },
  type: 'n8n-nodes-base.respondToWebhook',
  typeVersion: 1.5,
  position: [3168, 48],
  id: crypto.randomUUID(),
  name: 'Return AI Service Error',
};

workflow.nodes.push(countErrorNode, returnCountNode, aiErrorNode, returnAiErrorNode);
workflow.connections['Generate Recipes AI'].main[1] = [
  { node: 'Build AI Service Error', type: 'main', index: 0 },
];
workflow.connections['Build AI Service Error'] = {
  main: [[{ node: 'Return AI Service Error', type: 'main', index: 0 }]],
};
workflow.connections['Generated Count Valid?'].main[1] = [
  { node: 'Build Recipe Count Error', type: 'main', index: 0 },
];
workflow.connections['Build Recipe Count Error'] = {
  main: [[{ node: 'Return Recipe Count Error', type: 'main', index: 0 }]],
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(workflow, null, 2)}\n`);
