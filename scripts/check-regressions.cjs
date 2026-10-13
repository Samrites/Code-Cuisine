/** Checks recipe metadata and quantity regressions without calling live services. */
const ts = require('typescript');
const fs = require('node:fs');
const assert = require('node:assert/strict');
function loadFunctions(file, names) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const functions = source.statements.filter(
    (node) => ts.isFunctionDeclaration(node) && names.includes(node.name?.text),
  );
  assert.equal(functions.length, names.length);
  const code = ts.transpileModule(
    functions.map((node) => node.getText(source).replace(/^export /, '')).join('\n'),
    {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    },
  ).outputText;
  return new Function(code + '\nreturn {' + names.join(',') + '};')();
}
const { buildStepDetails } = loadFunctions('src/app/services/recipe-generation.service.ts', [
  'buildStepDetails',
]);
const { buildMacroNutrition } = loadFunctions(
  'src/app/pages/preparation-page/preparation-page.ts',
  ['formatNutritionValue', 'buildMacroNutrition'],
);
let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log('PASS ' + name);
}
check('Structured cook assignment and parallel work survive normalization', () => {
  const [step] = buildStepDetails({
    steps: [
      {
        title: 'Sauce',
        description: 'Cook sauce',
        assignedTo: ['cook_2'],
        parallelizable: true,
        durationMinutes: 8,
      },
    ],
  });
  assert.deepEqual(step, {
    title: 'Sauce',
    description: 'Cook sauce',
    assignedCook: 2,
    parallelizable: true,
    durationMinutes: 8,
  });
});
check('Separate helper assignments map by one-based step index', () => {
  assert.equal(
    buildStepDetails({
      steps: ['Boil', 'Chop'],
      helperAssignments: [{ person: 'cook_3', stepIndexes: [2] }],
    })[1].assignedCook,
    3,
  );
});
check('Legacy steps remain available without fabricated assignments', () => {
  const steps = buildStepDetails({ steps: [' Boil ', ''] });
  assert.equal(steps.length, 1);
  assert.equal(steps[0].assignedCook, 1);
  assert.equal(steps[0].description, 'Boil');
});
check('Invalid cook and duration metadata use safe defaults', () => {
  const [step] = buildStepDetails({
    steps: [{ description: 'Mix', assignedTo: ['cook_8'], durationMinutes: Infinity }],
  });
  assert.equal(step.assignedCook, 1);
  assert.equal(step.durationMinutes, null);
});
check('Macro calorie shares use 4/4/9 energy factors', () => {
  const values = buildMacroNutrition({
    perPortion: { protein_g: 25, carbs_g: 25, fat_g: 0 },
    total: { protein_g: 50, carbs_g: 50, fat_g: 0 },
  });
  assert.deepEqual(
    values.map((v) => v.percent),
    [50, 50, 0],
  );
  assert.equal(values[0].total, '50g');
});
check('Missing nutrition does not invent percentages', () =>
  assert(buildMacroNutrition(null).every((v) => v.percent === null)),
);
check('Incomplete nutrition does not fabricate a full breakdown', () =>
  assert(buildMacroNutrition({ perPortion: { protein_g: 10 } }).every((v) => v.percent === null)),
);
check('Zero macros do not divide by zero', () =>
  assert(
    buildMacroNutrition({ perPortion: { protein_g: 0, carbs_g: 0, fat_g: 0 } }).every(
      (v) => v.percent === null,
    ),
  ),
);
// Execute the actual quantity guard with isolated ingredient state.
const file = 'src/app/pages/preferences-page/preferences-page.ts';
const source = ts.createSourceFile(
  file,
  fs.readFileSync(file, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
);
const clazz = source.statements.find(ts.isClassDeclaration);
const guard = clazz.members.find(
  (n) => n.name?.getText(source) === 'hasInvalidIngredientQuantities',
);
const guardCode = ts.transpileModule('function guard() ' + guard.body.getText(source), {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
const guardFn = new Function(guardCode + '; return guard;')();
function rejects(entries) {
  return guardFn.call({ ingredientDraftState: { ingredientEntries: () => entries } });
}
check('Valid decimal grams are not rejected by a portions heuristic', () =>
  assert.equal(rejects([{ name: 'Herbs', unit: 'gram', amount: '2.5' }]), false),
);
check('Valid pieces and millilitres pass the input guard', () =>
  assert.equal(
    rejects([
      { name: 'Egg', unit: 'piece', amount: '1' },
      { name: 'Milk', unit: 'ml', amount: '50' },
    ]),
    false,
  ),
);
check('Empty, zero, negative, NaN and missing-name inputs fail', () => {
  assert.equal(rejects([]), true);
  for (const amount of ['0', '-1', 'abc', 'Infinity', ''])
    assert.equal(rejects([{ name: 'Pasta', unit: 'gram', amount }]), true);
  assert.equal(rejects([{ name: ' ', unit: 'gram', amount: '100' }]), true);
});
// Evaluate the actual loader computed callback to guard against endless animation on errors.
const loadingFile = 'src/app/pages/loading-page/loading-page.ts';
const loadingSource = ts.createSourceFile(
  loadingFile,
  fs.readFileSync(loadingFile, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
);
const loadingClass = loadingSource.statements.find(ts.isClassDeclaration);
const loader = loadingClass.members.find((n) => n.name?.getText(loadingSource) === 'canShowLoader');
const callback = loader.initializer.arguments[0].getText(loadingSource);
const showLoader = new Function('return (' + callback + ').call(this);');
check('Loading animation stops on quota and other errors', () => {
  for (const status of ['idle', 'loading', 'error', 'success']) {
    assert.equal(showLoader.call({ generationStatus: () => status }), status === 'loading');
  }
});
const storageExports = {};
new Function(
  'exports',
  ts.transpileModule(fs.readFileSync('src/app/services/recipe-storage.utils.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText,
)(storageExports);
const { normalizeStoredRecipe } = storageExports;
check('Legacy recipes without likes remain valid library entries', () => {
  const recipe = normalizeStoredRecipe('old', {
    title: 'Soup',
    cuisine: 'Indian',
    steps: ['Boil'],
  });
  assert.equal(recipe.likes, 0);
  assert.equal(recipe.cuisineSlug, 'indian');
  assert.equal(recipe.steps[0], 'Boil');
});
check('Structured n8n ingredients and helper steps render as real recipe data', () => {
  const recipe = normalizeStoredRecipe('n8n', {
    title: 'Curry',
    cuisine: 'in',
    cookTimeMinutes: 20,
    helpers: 2,
    ingredients: [
      { name: 'Rice', amount: 100, unit: 'g', source: 'user' },
      { name: 'Salt', amount: 1, unit: 'g', source: 'extra' },
    ],
    steps: [
      { title: 'Boil', description: 'Boil rice', assignedTo: ['cook_2'], parallelizable: true },
    ],
  });
  assert.equal(recipe.prepTime, '20 min');
  assert.deepEqual(recipe.userIngredients, ['100 g Rice']);
  assert.deepEqual(recipe.extraIngredients, ['1 g Salt']);
  assert.equal(recipe.stepDetails[0].assignedCook, 2);
  assert.equal(recipe.stepDetails[0].parallelizable, true);
});
check('Current frontend documents preserve structured preparation metadata', () => {
  const recipe = normalizeStoredRecipe('current', {
    title: 'Pasta',
    cuisineSlug: 'italian',
    stepDetails: [{ title: 'Sauce', description: 'Stir', assignedCook: 3, durationMinutes: 8 }],
  });
  assert.equal(recipe.stepDetails[0].assignedCook, 3);
  assert.equal(recipe.stepDetails[0].durationMinutes, 8);
});
check('Malformed documents cannot produce blank recipe rows or invalid nutrition', () => {
  assert.equal(normalizeStoredRecipe('bad', { title: ' ' }), null);
  const recipe = normalizeStoredRecipe('partial', {
    title: 'Soup',
    ingredients: {},
    steps: {},
    nutrition: { perPortion: { calories: Infinity, protein_g: -4 } },
  });
  assert.deepEqual(recipe.ingredients, []);
  assert.equal(recipe.nutrition.perPortion.calories, null);
  assert.equal(recipe.nutrition.perPortion.protein_g, null);
});
const { hasFirebaseConfig } = loadFunctions('src/app/config/firebase.config.ts', [
  'hasFirebaseConfig',
]);
check('Firestore connection does not require optional Storage and Messaging settings', () => {
  assert.equal(
    hasFirebaseConfig({
      apiKey: 'configured-key',
      authDomain: 'app.firebaseapp.com',
      projectId: 'app',
    }),
    true,
  );
  assert.equal(
    hasFirebaseConfig({
      apiKey: 'your-api-key',
      authDomain: 'app.firebaseapp.com',
      projectId: 'app',
    }),
    false,
  );
  assert.equal(hasFirebaseConfig({ apiKey: '', authDomain: '', projectId: '' }), false);
});
// Exercise the actual icon service method with controlled local image load events.
const iconFile = 'src/app/services/cuisine-icon.service.ts';
const iconSource = ts.createSourceFile(
  iconFile,
  fs.readFileSync(iconFile, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
);
const iconClass = iconSource.statements.find(ts.isClassDeclaration);
const iconMethod = iconClass.members.find((n) => n.name?.getText(iconSource) === 'loadIcon');
const iconCode = ts.transpileModule(
  'function loadIcon(slug: string, filename: string, retryDoubleExtension = true) ' +
    iconMethod.body.getText(iconSource),
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
).outputText;
const loadIcon = new Function(iconCode + '; return loadIcon;')();
check('Original cuisine PNGs load with normal or hidden duplicate Windows extension', () => {
  const images = [];
  let icons = {};
  const target = {
    document: {
      baseURI: 'https://example.org/app/',
      createElement: () => {
        const img = {};
        images.push(img);
        return img;
      },
    },
    loadedIcons: {
      update: (fn) => {
        icons = fn(icons);
      },
    },
    loadIcon,
  };
  loadIcon.call(target, 'german', 'German cuisine.png');
  images[0].onerror();
  assert.equal(images.length, 2);
  assert(images[1].src.endsWith('German%20cuisine.png.png'));
  images[1].onload();
  assert.equal(icons.german, images[1].src);
  loadIcon.call(target, 'indian', 'Indian cuisine.png');
  images[2].onload();
  assert(icons.indian.endsWith('Indian%20cuisine.png'));
});
console.log(`${passed} regression checks passed`);
