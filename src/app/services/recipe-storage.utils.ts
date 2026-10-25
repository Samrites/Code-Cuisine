import type {
  RecipeNutrition,
  RecipePreparationStep,
  StoredCookbookRecipe,
} from '../models/recipe.model';

const CUISINE_ALIASES: Record<string, string> = {
  it: 'italian',
  italian: 'italian',
  de: 'german',
  german: 'german',
  jp: 'japanese',
  japanese: 'japanese',
  in: 'indian',
  indian: 'indian',
  gourmet: 'gourmet',
  fusion: 'fusion',
};

/** Reads both existing recipe documents and current frontend documents without inventing recipes. */
export function normalizeStoredRecipe(id: string, input: unknown): StoredCookbookRecipe | null {
  const data = record(input);
  const title = text(data['title']);
  if (!title) return null;
  const ingredients = list(data['ingredients']);
  const explicitUserIngredients = list(data['userIngredients']);
  const extraIngredients = list(data['extraIngredients']);
  const objectIngredients = Array.isArray(data['ingredients']) ? data['ingredients'] : [];
  const userIngredients = explicitUserIngredients.length
    ? explicitUserIngredients
    : objectIngredients
        .filter((item) => record(item)['source'] !== 'extra')
        .map(ingredientLine)
        .filter(Boolean);
  const details = stepDetails({ ...data, steps: data['steps'] ?? data['instructions'] });
  const prepTimeMinutes = finiteNumber(data['prepTimeMinutes'] ?? data['cookTimeMinutes'] ?? data['cooking_time']);
  const rawCuisine = text(data['cuisineSlug'] ?? data['cuisine']).toLowerCase();
  const diet = text(data['dietTag'] ?? data['diet']).toLowerCase();
  return {
    id,
    source: 'library',
    title,
    description: text(data['description']),
    titleNormalized: text(data['titleNormalized']) || title.toLowerCase().replace(/\s+/g, '-'),
    cuisineSlug: CUISINE_ALIASES[rawCuisine] ?? null,
    prepTime: text(data['prepTime']) || (prepTimeMinutes !== null ? `${prepTimeMinutes} min` : '—'),
    prepTimeMinutes,
    cookCount: Math.min(
      3,
      Math.max(1, Math.floor(finiteNumber(data['cookCount'] ?? data['helpers']) ?? 1)),
    ),
    likes: Math.max(0, Math.floor(finiteNumber(data['likes'] ?? data['likesCount']) ?? 0)),
    dietTag:
      diet === 'vegetarian'
        ? 'Vegetarian'
        : diet === 'vegan'
          ? 'Vegan'
          : diet === 'keto'
            ? 'Keto'
            : null,
    ingredients,
    userIngredients,
    extraIngredients: extraIngredients.length
      ? extraIngredients
      : objectIngredients
          .filter((item) => record(item)['source'] === 'extra')
          .map(ingredientLine)
          .filter(Boolean),
    steps: details.map((step) => step.description),
    stepDetails: details,
    nutrition: nutrition(data['nutrition']),
  };
}

/** Restricts object access to actual plain data objects. */
function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Normalizes optional text without rendering object values as text. */
function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Accepts finite nonnegative numeric fields, preserving missing values as null. */
function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

/** Formats an original ingredient string or structured quantity/name object. */
function ingredientLine(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  const item = record(value);
  const name = text(item['name']);
  if (!name) return '';
  const amount = finiteNumber(item['amount']);
  return [amount !== null ? String(amount) : '', text(item['unit']), name]
    .filter(Boolean)
    .join(' ');
}

/** Converts only arrays into nonempty ingredient display lines. */
function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map(ingredientLine).filter(Boolean) : [];
}

/** Preserves structured and legacy steps, including their real helper and parallel metadata. */
function stepDetails(data: Record<string, unknown>): RecipePreparationStep[] {
  const explicit = data['stepDetails'];
  const entries =
    Array.isArray(explicit) && explicit.length
      ? explicit
      : Array.isArray(data['steps'])
        ? data['steps']
        : [];
  const assignments = Array.isArray(data['helperAssignments']) ? data['helperAssignments'] : [];
  return entries.flatMap((entry, index) => {
    const raw = record(entry);
    const description =
      typeof entry === 'string' ? entry.trim() : text(raw['description']) || text(raw['title']);
    if (!description) return [];
    const assigned = Array.isArray(raw['assignedTo']) ? raw['assignedTo'][0] : undefined;
    const group = assignments
      .map(record)
      .find(
        (item) => Array.isArray(item['stepIndexes']) && item['stepIndexes'].includes(index + 1),
      );
    const helper = text(assigned ?? group?.['person']).match(/(\d+)$/)?.[1];
    const cook = finiteNumber(raw['assignedCook']) ?? (helper ? Number(helper) : 1);
    return [
      {
        title: text(raw['title']) || `Step ${index + 1}`,
        description,
        assignedCook: Number.isInteger(cook) && cook >= 1 && cook <= 3 ? cook : 1,
        parallelizable: raw['parallelizable'] === true,
        durationMinutes: finiteNumber(raw['durationMinutes']),
      },
    ];
  });
}

/** Keeps missing or invalid nutrition values explicit rather than substituting zero. */
function nutrition(value: unknown): RecipeNutrition | null {
  const data = record(value);
  if (!Object.keys(data).length) return null;
  const facts = (input: unknown) => {
    const data = record(input);
    return {
      calories: finiteNumber(data['calories']),
      protein_g: finiteNumber(data['protein_g']),
      carbs_g: finiteNumber(data['carbs_g']),
      fat_g: finiteNumber(data['fat_g']),
    };
  };
  return { perPortion: facts(data['perPortion']), total: facts(data['total']) };
}
