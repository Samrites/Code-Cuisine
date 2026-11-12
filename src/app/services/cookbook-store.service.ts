import { computed, Injectable, signal } from '@angular/core';

import type {
  GeneratedRecipe,
  StoredCookbookRecipe,
} from '../models/recipe.model';

import { normalizeStoredRecipe } from './recipe-storage.utils';

type N8nRecipeRow = Record<string, unknown>;

const N8N_RECIPES_URL =
  'https://join-ai-issue-collector.app.n8n.cloud/webhook/code-cuisine-recipes';

const N8N_ACTIONS_URL =
  'https://join-ai-issue-collector.app.n8n.cloud/webhook/code-cuisine-final-clean-test';

@Injectable({
  providedIn: 'root',
})
export class CookbookStoreService {
  private readonly recipesState = signal<StoredCookbookRecipe[]>([]);

  private readonly loadStatusState = signal<
    'loading' | 'ready' | 'unconfigured' | 'error'
  >('loading');

  private readonly saveStatusState = signal<
    'idle' | 'saving' | 'saved' | 'unconfigured' | 'error'
  >('idle');

  readonly recipes = computed(() => this.recipesState());

  readonly loadStatus = this.loadStatusState.asReadonly();

  readonly saveStatus = this.saveStatusState.asReadonly();

  readonly topLikedRecipes = computed(() =>
    [...this.recipesState()]
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 5),
  );

  constructor() {
    void this.refreshRecipes();
  }

  recipesByCuisine(slug: string): StoredCookbookRecipe[] {
    const normalizedSlug = normalizeCuisineSlug(slug);

    return this.recipesState().filter(
      (recipe) =>
        normalizeCuisineSlug(recipe.cuisineSlug) === normalizedSlug,
    );
  }

  async refreshRecipes(): Promise<void> {
    this.loadStatusState.set('loading');

    try {
      const response = await fetch(N8N_RECIPES_URL, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(
          `n8n cookbook read failed (${response.status})`,
        );
      }

      const data: unknown = await response.json();
      const rows = extractRecipeRows(data);

      const saved = rows
        .map((row) => {
          const recipeId =
            readString(row['recipe_id']) ||
            readString(row['id']);

          return normalizeStoredRecipe(recipeId, {
            ...row,

            cuisineSlug: normalizeCuisineSlug(
              readString(row['cuisine']),
            ),

            prepTimeMinutes:
              row['prep_time'] ??
              row['cooking_time'] ??
              0,

            cooking_time:
              row['cooking_time'] ??
              row['prep_time'] ??
              0,

            steps: parseJsonValue(row['instructions'], []),

            instructions: parseJsonValue(
              row['instructions'],
              [],
            ),

            stepDetails: parseJsonValue(
              row['step_details'],
              [],
            ),

            ingredients: parseJsonValue(
              row['ingredients'],
              [],
            ),

            userIngredients: parseJsonValue(
              row['user_ingredients'],
              [],
            ),

            extraIngredients: parseJsonValue(
              row['extra_ingredients'],
              [],
            ),

            nutrition: parseJsonValue(
              row['nutrition'],
              null,
            ),

            cookCount: readNumber(
              row['cook_count'] ?? row['helpers'],
              0,
            ),

            likes: readNumber(row['likes'], 0),
          });
        })
        .filter(
          (recipe): recipe is StoredCookbookRecipe =>
            recipe !== null,
        );

      this.recipesState.set(saved);
      this.loadStatusState.set('ready');
    } catch (error) {
      console.error('n8n cookbook read failed:', error);

      this.recipesState.set([]);
      this.loadStatusState.set('error');
    }
  }

  async likeRecipe(recipe: GeneratedRecipe): Promise<void> {
    const recipeId = String(recipe.id ?? '').trim();

    if (!recipeId) {
      console.error('Cannot save like: recipe ID is missing.');
      return;
    }

    try {
      const response = await fetch(N8N_ACTIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'likeRecipe',
          recipeId,
        }),
      });

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          `n8n like request failed (${response.status}): ${message}`,
        );
      }

      const data: unknown = await response.json();

      const newLikes =
        isRecord(data) && typeof data['likes'] === 'number'
          ? data['likes']
          : null;

      if (newLikes !== null) {
        this.recipesState.update((recipes) =>
          recipes.map((storedRecipe) =>
            String(storedRecipe.id) === recipeId
              ? {
                  ...storedRecipe,
                  likes: newLikes,
                }
              : storedRecipe,
          ),
        );
      } else {
        await this.refreshRecipes();
      }
    } catch (error) {
      console.error('Could not save recipe like:', error);
      throw error;
    }
  }
}

function extractRecipeRows(data: unknown): N8nRecipeRow[] {
  if (Array.isArray(data)) {
    return data.filter(isRecord);
  }

  if (!isRecord(data)) {
    return [];
  }

  if (Array.isArray(data['recipes'])) {
    return data['recipes'].filter(isRecord);
  }

  if (Array.isArray(data['data'])) {
    return data['data'].filter(isRecord);
  }

  return [];
}

function normalizeCuisineSlug(
  value: string | null | undefined,
): string {
  const normalized = (value ?? '').trim().toLowerCase();

  const aliases: Record<string, string> = {
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

  return aliases[normalized] ?? normalized;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readNumber(
  value: unknown,
  fallback: number,
): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function parseJsonValue<T>(
  value: unknown,
  fallback: T,
): T {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string') {
    return value as T;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}