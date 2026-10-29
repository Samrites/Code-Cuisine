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
    return this.recipesState().filter(
      (recipe) => recipe.cuisineSlug === slug,
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

          cuisine:
            recipe.cuisineSlug ??
            (preferences?.cuisine || 'fusion').toLowerCase(),

          cooking_time:
            recipe.prepTimeMinutes ??
            (Number.parseInt(recipe.prepTime, 10) || 0),

          servings: preferences?.portions ?? 2,

          helpers:
            recipe.cookCount ??
            preferences?.persons ??
            1,

          ingredients: recipe.ingredients,
          instructions: recipe.steps,
          nutrition: recipe.nutrition ?? null,
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