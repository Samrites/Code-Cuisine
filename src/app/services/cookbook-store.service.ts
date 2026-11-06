import { computed, Injectable, signal } from '@angular/core';

import type {
  GeneratedRecipe,
  RecipeGenerationPreferences,
  StoredCookbookRecipe,
} from '../models/recipe.model';

import { getSupabaseConfig } from '../config/supabase.config';
import { normalizeStoredRecipe } from './recipe-storage.utils';

type DatabaseRecipe = Record<string, unknown> & {
  id: number | string;
};

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

  /**
   * Returns recipes belonging to the selected cuisine.
   */
  recipesByCuisine(slug: string): StoredCookbookRecipe[] {
    const normalizedSlug = normalizeCuisineSlug(slug);

    return this.recipesState().filter(
      (recipe) =>
        normalizeCuisineSlug(recipe.cuisineSlug) === normalizedSlug,
    );
  }

  /**
   * Loads all saved recipes from Supabase.
   */
  async refreshRecipes(): Promise<void> {
    const config = getSupabaseConfig();

    if (!config) {
      this.recipesState.set([]);
      this.loadStatusState.set('unconfigured');
      return;
    }

    this.loadStatusState.set('loading');

    try {
      const response = await fetch(
        `${config.url}/rest/v1/recipes?select=*&order=created_at.desc&limit=500`,
        {
          headers: {
            apikey: config.anonKey,
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `Supabase read failed (${response.status})`,
        );
      }

      const rows = (await response.json()) as DatabaseRecipe[];

      const saved = rows
        .map((row) =>
          normalizeStoredRecipe(String(row.id), {
            ...row,

            cuisineSlug: normalizeCuisineSlug(
              readString(row['cuisine']),
            ),

            prepTimeMinutes: row['cooking_time'],
            cooking_time: row['cooking_time'],

            steps: row['instructions'],
            instructions: row['instructions'],

            cookCount: row['helpers'],

            likes: row['likes'] ?? 0,
          }),
        )
        .filter(
          (recipe): recipe is StoredCookbookRecipe =>
            recipe !== null,
        );

      this.recipesState.set(saved);
      this.loadStatusState.set('ready');
    } catch (error) {
      console.error('Supabase cookbook read failed', error);

      this.recipesState.set([]);
      this.loadStatusState.set('error');
    }
  }

  /**
   * Saves newly generated recipes in Supabase.
   */
  async saveGeneratedRecipes(
    recipes: GeneratedRecipe[],
    preferences: RecipeGenerationPreferences | null,
  ): Promise<void> {
    const config = getSupabaseConfig();

    if (!config) {
      this.saveStatusState.set('unconfigured');
      return;
    }

    this.saveStatusState.set('saving');

    try {
      const payload = recipes
        .filter((recipe) => recipe.source !== 'library')
        .map((recipe) => ({
          title: recipe.title,

          description: recipe.description,

          cuisine: resolveCuisineSlug(recipe, preferences),

          cooking_time:
            recipe.prepTimeMinutes ??
            parsePreparationMinutes(recipe.prepTime),

          servings: preferences?.portions ?? 2,

          helpers:
            recipe.cookCount ??
            preferences?.persons ??
            1,

          ingredients: buildStoredIngredients(recipe),

          instructions: buildStoredInstructions(recipe),

          nutrition: recipe.nutrition ?? null,

          likes: 0,
        }));

      if (payload.length > 0) {
        const response = await fetch(
          `${config.url}/rest/v1/recipes`,
          {
            method: 'POST',
            headers: {
              apikey: config.anonKey,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          throw new Error(
            `Supabase save failed (${response.status})`,
          );
        }
      }

      this.saveStatusState.set('saved');

      await this.refreshRecipes();
    } catch (error) {
      console.error('Supabase cookbook save failed', error);

      this.saveStatusState.set('error');

      throw error;
    }
  }

  /**
   * Saves a like permanently in Supabase.
   *
   * Uses the SQL function:
   * public.like_recipe(recipe_id bigint)
   */
  async likeRecipe(recipe: GeneratedRecipe): Promise<void> {
    const config = getSupabaseConfig();

    if (!config) {
      console.error('Supabase is not configured.');
      return;
    }

    const recipeId = Number(recipe.id);

    if (!Number.isSafeInteger(recipeId) || recipeId <= 0) {
      console.error(
        'Cannot save like: invalid database recipe ID.',
        recipe.id,
      );
      return;
    }

    try {
      const response = await fetch(
        `${config.url}/rest/v1/rpc/like_recipe`,
        {
          method: 'POST',
          headers: {
            apikey: config.anonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipe_id: recipeId,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
          `Supabase like failed (${response.status}): ${errorText}`,
        );
      }

      const newLikes = (await response.json()) as number | null;

      if (newLikes === null) {
        throw new Error(
          `Recipe ${recipeId} was not found in Supabase.`,
        );
      }

      // Update the displayed like count immediately.
      this.recipesState.update((recipes) =>
        recipes.map((storedRecipe) =>
          String(storedRecipe.id) === String(recipeId)
            ? {
                ...storedRecipe,
                likes: newLikes,
              }
            : storedRecipe,
        ),
      );

      // Reload all recipes to keep cookbook pages synchronized.
      await this.refreshRecipes();
    } catch (error) {
      console.error('Could not save recipe like:', error);
      throw error;
    }
  }
}

/**
 * Builds ingredient data for Supabase.
 */
function buildStoredIngredients(
  recipe: GeneratedRecipe,
): Array<{
  name: string;
  source: 'user' | 'extra';
}> {
  const userIngredients =
    recipe.userIngredients?.filter(Boolean) ?? [];

  const extraIngredients =
    recipe.extraIngredients?.filter(Boolean) ?? [];

  if (
    userIngredients.length > 0 ||
    extraIngredients.length > 0
  ) {
    return [
      ...userIngredients.map((ingredient) => ({
        name: ingredient,
        source: 'user' as const,
      })),

      ...extraIngredients.map((ingredient) => ({
        name: ingredient,
        source: 'extra' as const,
      })),
    ];
  }

  return recipe.ingredients
    .filter(Boolean)
    .map((ingredient) => ({
      name: ingredient,
      source: 'user' as const,
    }));
}

/**
 * Builds instruction data for Supabase.
 */
function buildStoredInstructions(
  recipe: GeneratedRecipe,
): Array<
  | string
  | {
      title: string;
      description: string;
      assignedCook: number;
      parallelizable: boolean;
      durationMinutes: number | null;
    }
> {
  if (recipe.stepDetails?.length) {
    return recipe.stepDetails.map((step) => ({
      title: step.title,
      description: step.description,
      assignedCook: step.assignedCook,
      parallelizable: step.parallelizable,
      durationMinutes: step.durationMinutes,
    }));
  }

  return recipe.steps.filter(Boolean);
}

/**
 * Resolves the cuisine category.
 */
function resolveCuisineSlug(
  recipe: GeneratedRecipe,
  preferences: RecipeGenerationPreferences | null,
): string {
  const preferenceCuisine =
    normalizeCuisineSlug(preferences?.cuisine);

  if (preferenceCuisine) {
    return preferenceCuisine;
  }

  const recipeCuisine =
    normalizeCuisineSlug(recipe.cuisineSlug);

  return recipeCuisine || 'fusion';
}

/**
 * Normalizes cuisine names.
 */
function normalizeCuisineSlug(
  value: string | null | undefined,
): string {
  const normalized =
    (value ?? '').trim().toLowerCase();

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

/**
 * Safely reads string values.
 */
function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Reads preparation time in minutes.
 */
function parsePreparationMinutes(prepTime: string): number {
  const minutes = Number.parseInt(prepTime, 10);

  return Number.isFinite(minutes) ? minutes : 0;
}