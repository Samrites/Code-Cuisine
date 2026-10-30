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
   * Returns all stored recipes that belong to the selected cuisine.
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
          }),
        )
        .filter(
          (recipe): recipe is StoredCookbookRecipe =>
            recipe !== null,
        );

      this.recipesState.set(saved);
      this.loadStatusState.set('ready');
    } catch (error) {
      console.error(
        'Supabase cookbook read failed',
        error,
      );

      this.recipesState.set([]);
      this.loadStatusState.set('error');
    }
  }

  /**
   * Saves newly generated recipes in Supabase
   * and refreshes the cookbook afterwards.
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

          cuisine: resolveCuisineSlug(
            recipe,
            preferences,
          ),

          cooking_time:
            recipe.prepTimeMinutes ??
            parsePreparationMinutes(recipe.prepTime),

          servings:
            preferences?.portions ?? 2,

          helpers:
            recipe.cookCount ??
            preferences?.persons ??
            1,

          /**
           * Keep the ingredient source information inside
           * the existing Supabase JSON ingredients column.
           *
           * This allows the cookbook to restore the
           * "Your ingredients" and "Extra ingredients"
           * sections after a page reload.
           */
          ingredients: buildStoredIngredients(recipe),

          /**
           * Keep the complete preparation metadata inside
           * the existing Supabase JSON instructions column.
           *
           * This preserves Chef 1 / Chef 2 / Chef 3,
           * parallel information and duration.
           */
          instructions: buildStoredInstructions(recipe),

          nutrition:
            recipe.nutrition ?? null,
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
      console.error(
        'Supabase cookbook save failed',
        error,
      );

      this.saveStatusState.set('error');

      throw error;
    }
  }

  /**
   * Likes stay disabled until a secure Supabase RPC is available.
   */
  async likeRecipe(
    recipe: GeneratedRecipe,
  ): Promise<void> {
    console.info(
      'Likes are disabled until a secure Supabase RPC is configured.',
      recipe.id,
    );
  }
}

/**
 * Builds the ingredient JSON stored in Supabase.
 *
 * New recipes keep their source metadata so the
 * preparation page can restore both ingredient groups.
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
 * Builds the instruction JSON stored in Supabase.
 *
 * Structured step details are preferred because they
 * preserve cook assignments and preparation metadata.
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
 * Resolves the cuisine used by cookbook category pages.
 */
function resolveCuisineSlug(
  recipe: GeneratedRecipe,
  preferences: RecipeGenerationPreferences | null,
): string {
  const recipeCuisine =
    normalizeCuisineSlug(recipe.cuisineSlug);

  if (recipeCuisine) {
    return recipeCuisine;
  }

  const preferenceCuisine =
    normalizeCuisineSlug(preferences?.cuisine);

  return preferenceCuisine || 'fusion';
}

/**
 * Normalizes all supported cuisine labels and aliases
 * into the slugs used by cookbook category routes.
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
 * Safely reads string database values.
 */
function readString(
  value: unknown,
): string {
  return typeof value === 'string'
    ? value
    : '';
}

/**
 * Reads preparation minutes from labels such as
 * "20 min" when no numeric value is available.
 */
function parsePreparationMinutes(
  prepTime: string,
): number {
  const minutes = Number.parseInt(
    prepTime,
    10,
  );

  return Number.isFinite(minutes)
    ? minutes
    : 0;
}