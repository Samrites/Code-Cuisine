const fs = require('node:fs');
const assert = require('node:assert/strict');

const file = 'n8n/workflows/generate-recipe-v5-korrigiert.json';
const workflow = JSON.parse(fs.readFileSync(file, 'utf8'));
const nodes = new Map(workflow.nodes.map((node) => [node.name, node]));
assert.equal(nodes.size, workflow.nodes.length, 'Node names must be unique');

for (const [source, outputs] of Object.entries(workflow.connections)) {
  assert(nodes.has(source), `Missing connection source: ${source}`);
  for (const group of outputs.main ?? []) {
    for (const connection of group ?? []) {
      assert(nodes.has(connection.node), `Missing connection target: ${connection.node}`);
    }
  }
}

assert.equal(workflow.active, false);
assert.equal(nodes.get('Webhook').parameters.path, 'generate-recipe-v5');
const extractAssignments = Object.fromEntries(
  nodes
    .get('Extract Input')
    .parameters.assignments.assignments.map((entry) => [entry.name, entry.value]),
);
assert.match(extractAssignments.ingredients, /\$json\.body\?\.ingredients/);
assert.match(extractAssignments.ingredients, /\$json\.ingredients/);
assert.match(extractAssignments.servings, /\$json\.preferences\?\.portions/);
assert.match(extractAssignments.helpers, /\$json\.preferences\?\.persons/);
assert.equal(workflow.pinData, undefined);
assert.equal(nodes.get('Read Quota Counter').parameters.projectId, '=code-a-cuisine-276fa');
assert.equal(nodes.get('Write Quota Counter').parameters.projectId, '=code-a-cuisine-276fa');
assert.equal(nodes.get('Generate Recipes AI').retryOnFail, true);
assert.equal(nodes.get('Generate Recipes AI').maxTries, 3);
assert.equal(nodes.get('Generate Recipes AI').waitBetweenTries, 10000);
assert.equal(nodes.get('Generate Recipes AI').onError, 'continueErrorOutput');
assert.equal(workflow.connections['Generate Recipes AI'].main[1][0].node, 'Build AI Service Error');
assert.equal(
  workflow.connections['Generated Count Valid?'].main[1][0].node,
  'Build Recipe Count Error',
);

for (const node of workflow.nodes.filter((entry) => entry.type === 'n8n-nodes-base.code')) {
  assert.doesNotThrow(
    () => new Function('$input', '$', node.parameters.jsCode),
    `${node.name} syntax`,
  );
}

const validate = new Function('$input', '$', nodes.get('Validate Input').parameters.jsCode);
const validInput = {
  ingredients: [
    { name: 'Rice', amount: 100, unit: 'g' },
    { name: 'Tomato', amount: 2, unit: 'piece' },
  ],
  servings: 2,
  helpers: 1,
  cuisine: 'in',
  diet: 'none',
  timeCategory: 'quick',
};
const [validResult] = validate({ first: () => ({ json: validInput }) }, () => null);
assert.equal(validResult.json.valid, true);
assert.deepEqual(validResult.json.ingredients[0], { name: 'Rice', amount: 100, unit: 'g' });

const [invalidResult] = validate(
  {
    first: () => ({
      json: { ...validInput, ingredients: [{ name: 'Rice', amount: 0, unit: 'g' }] },
    }),
  },
  () => null,
);
assert.equal(invalidResult.json.valid, false);

const normalizeQuota = new Function(
  '$input',
  '$',
  nodes.get('Normalize Quota Counter').parameters.jsCode,
);
const quotaSource = {
  quota: {
    quotaKey: 'ip_date',
    ip: '127.0.0.1',
    dateKey: '2026-10-08',
    limitPerDay: 3,
    requestCost: 3,
  },
};
const quotaContext = (count) => (name) => ({
  first: () => ({ json: name === 'Prepare Quota Data' ? quotaSource : { count } }),
});
const [firstQuota] = normalizeQuota({}, quotaContext(0));
assert.equal(firstQuota.json.quota.allowed, true);
assert.equal(firstQuota.json.quota.remainingToday, 3);
const [usedQuota] = normalizeQuota({}, quotaContext(1));
assert.equal(usedQuota.json.quota.allowed, false);

const prepareWrite = new Function(
  '$input',
  '$',
  nodes.get('Prepare Quota Write').parameters.jsCode,
);
const [quotaWrite] = prepareWrite({}, () => ({ first: () => ({ json: firstQuota.json }) }));
assert.equal(quotaWrite.json.count, 3);

for (const nodeName of [
  'Build Validation Error',
  'Build Quota Error',
  'Build Recipe Count Error',
  'Build AI Service Error',
]) {
  const names = nodes.get(nodeName).parameters.assignments.assignments.map((entry) => entry.name);
  assert(names.includes('success'));
  assert(names.includes('error'));
  assert(!names.some((name) => name.startsWith('=')));
}

console.log(
  `n8n workflow OK: ${workflow.nodes.length} nodes, v5 endpoint, request mapping and errors verified`,
);
