import { normalizeStoredRecipe } from './recipe-storage.utils';
import { computed, Injectable, signal } from '@angular/core';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  getFirestore,
  increment,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import { getFirebaseConfig, hasFirebaseConfig } from '../config/firebase.config';
import {
  GeneratedRecipe,
  RecipeGenerationPreferences,
  StoredCookbookRecipe,
  type RecipeNutrition,
  type RecipePreparationStep,
} from '../models/recipe.model';

type FirestoreRecipeDocument = {
  title: string;
  titleNormalized: string;
  description: string;
  prepTime: string;
  prepTimeMinutes: number | null;
  cookCount: number;
  likes: number;
  dietTag: 'Vegetarian' | 'Vegan' | 'Keto' | null;
  cuisineSlug: string;
  userIngredients: string[];
  extraIngredients: string[];
  ingredients: string[];
  steps: string[];
  stepDetails?: RecipePreparationStep[];
  nutrition: RecipeNutrition | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

@Injectable({ providedIn: 'root' })
export class CookbookStoreService {
  private readonly db = createFirestore();
  private readonly recipesState = signal<StoredCookbookRecipe[]>([]);
  private readonly loadStatusState = signal<'loading' | 'ready' | 'unconfigured' | 'error'>(
    'loading',
  );
  readonly loadStatus = this.loadStatusState.asReadonly();
  private readonly saveStatusState = signal<'idle' | 'saving' | 'saved' | 'unconfigured' | 'error'>(
    'idle',
  );
  readonly saveStatus = this.saveStatusState.asReadonly();
  readonly recipes = computed(() => this.recipesState());
  readonly topLikedRecipes = computed(() =>
    [...this.recipesState()].sort((left, right) => right.likes - left.likes).slice(0, 5),
  );

  /** Loads the shared cookbook once the store is created. */
  constructor() {
    void this.refreshRecipes();
  }

  /** Returns all cookbook recipes that belong to the provided cuisine slug. */
  recipesByCuisine(slug: string): StoredCookbookRecipe[] {
    return this.recipesState().filter((recipe) => recipe.cuisineSlug === slug);
  }

  /** Reloads recipes and exposes loading, connection and error states to the cookbook pages. */
  async refreshRecipes(): Promise<void> {
    if (!this.db) {
      this.clearRecipes();
      this.loadStatusState.set('unconfigured');
      return;
    }

    this.loadStatusState.set('loading');
    try {
      await this.applyLoadedRecipes();
      this.loadStatusState.set('ready');
    } catch (error) {
      console.error('Failed to load cookbook recipes from Firestore.', error);
      this.clearRecipes();
      this.loadStatusState.set('error');
    }
  }

  /** Persists newly generated recipes to Firestore while skipping library entries and duplicates. */
  async saveGeneratedRecipes(
    recipes: GeneratedRecipe[],
    preferences: RecipeGenerationPreferences | null,
  ): Promise<void> {
    if (!this.db) {
      this.saveStatusState.set('unconfigured');
      return;
    }
    this.saveStatusState.set('saving');
    try {
      await this.persistGeneratedRecipes(recipes, preferences);
      this.saveStatusState.set('saved');
      await this.refreshRecipes();
    } catch (error) {
      this.saveStatusState.set('error');
      throw error;
    }
  }

  /** Increments the like counter for a persisted cookbook recipe. */
  async likeRecipe(recipe: GeneratedRecipe): Promise<void> {
    if (!this.db) {
      return;
    }

    const recipeId = recipe.id ?? (await this.resolveStoredRecipeId(recipe));

    if (!recipeId) {
      return;
    }

    await this.incrementRecipeLike(recipeId);
    this.applyLocalLike(recipeId);
  }

  /** Loads all saved recipes, including older documents without a likes field. */
  private async loadRecipes(): Promise<StoredCookbookRecipe[]> {
    const snapshot = await getDocs(collection(this.db!, 'recipes'));
    return snapshot.docs
      .map((entry) => normalizeStoredRecipe(entry.id, entry.data()))
      .filter((recipe): recipe is StoredCookbookRecipe => recipe !== null)
      .sort((left, right) => right.likes - left.likes);
  }

  /** Clears the local cookbook store state. */
  private clearRecipes(): void {
    this.recipesState.set([]);
  }

  /** Loads cookbook recipes and applies them to local state. */
  private async applyLoadedRecipes(): Promise<void> {
    const recipes = await this.loadRecipes();
    this.recipesState.set(recipes.length ? recipes : []);
  }

  /** Builds the Firestore payload for a generated recipe or skips invalid titles. */
  private buildPersistencePayload(
    recipe: GeneratedRecipe,
    preferences: RecipeGenerationPreferences | null,
  ): FirestoreRecipeDocument | null {
    const cuisineSlug = recipe.cuisineSlug ?? mapCuisinePreferenceToSlug(preferences?.cuisine);
    const titleNormalized = normalizeTitle(recipe.title);
    return titleNormalized
      ? createRecipeDocument(recipe, preferences, titleNormalized, cuisineSlug)
      : null;
  }

  /** Persists a single generated recipe when it is valid and not yet stored. */
  private async persistGeneratedRecipe(
    recipe: GeneratedRecipe,
    preferences: RecipeGenerationPreferences | null,
  ): Promise<void> {
    const persistencePayload = this.buildPersistencePayload(recipe, preferences);

    if (!persistencePayload || (await this.isDuplicateRecipe(persistencePayload))) {
      return;
    }

    await addDoc(collection(this.db!, 'recipes'), persistencePayload);
  }

  /** Persists every non-library recipe from the generated result list. */
  private async persistGeneratedRecipes(
    recipes: GeneratedRecipe[],
    preferences: RecipeGenerationPreferences | null,
  ): Promise<void> {
    const recipesToPersist = recipes.filter((recipe) => recipe.source !== 'library');

    for (const recipe of recipesToPersist) {
      await this.persistGeneratedRecipe(recipe, preferences);
    }
  }

  /** Checks whether the recipe already exists for the same cuisine. */
  private async recipeExists(titleNormalized: string, cuisineSlug: string): Promise<boolean> {
    const existingRecipeQuery = query(
      collection(this.db!, 'recipes'),
      where('titleNormalized', '==', titleNormalized),
      where('cuisineSlug', '==', cuisineSlug),
      limit(1),
    );
    const existingSnapshot = await getDocs(existingRecipeQuery);
    return !existingSnapshot.empty;
  }

  /** Checks whether the prepared Firestore payload already exists as a stored recipe. */
  private isDuplicateRecipe(recipe: FirestoreRecipeDocument): Promise<boolean> {
    return this.recipeExists(recipe.titleNormalized, recipe.cuisineSlug);
  }

  /** Resolves the persisted Firestore id for a generated recipe that has not been reloaded yet. */
  private async resolveStoredRecipeId(recipe: GeneratedRecipe): Promise<string | null> {
    const titleNormalized = normalizeTitle(recipe.title);
    const cuisineSlug = recipe.cuisineSlug ?? mapCuisinePreferenceToSlug(null);

    if (!titleNormalized) {
      return null;
    }

    const localMatch = this.recipesState().find(
      (entry) => entry.titleNormalized === titleNormalized && entry.cuisineSlug === cuisineSlug,
    );

    if (localMatch) {
      return localMatch.id;
    }

    await this.refreshRecipes();

    const refreshedMatch = this.recipesState().find(
      (entry) => entry.titleNormalized === titleNormalized && entry.cuisineSlug === cuisineSlug,
    );

    return refreshedMatch?.id ?? null;
  }

  /** Persists the like increment in Firestore. */
  private incrementRecipeLike(recipeId: string): Promise<void> {
    return updateDoc(doc(this.db!, 'recipes', recipeId), {
      likes: increment(1),
      updatedAt: serverTimestamp(),
    });
  }

  /** Mirrors a successful like increment in local state. */
  private applyLocalLike(recipeId: string): void {
    this.recipesState.update((recipes) =>
      recipes.map((entry) =>
        entry.id === recipeId ? { ...entry, likes: entry.likes + 1 } : entry,
      ),
    );
  }
}

/** Creates a Firestore instance only when a complete Firebase web config is available. */
function createFirestore(): Firestore | null {
  const firebaseConfig = getFirebaseConfig();

  if (!hasFirebaseConfig(firebaseConfig)) {
    return null;
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}

/** Builds the Firestore document stored for a generated recipe. */
function createRecipeDocument(
  recipe: GeneratedRecipe,
  preferences: RecipeGenerationPreferences | null,
  titleNormalized: string,
  cuisineSlug: string,
): FirestoreRecipeDocument {
  const timestamps = createRecipeTimestamps();
  return {
    ...pickPersistedRecipeFields(recipe, preferences),
    ...timestamps,
    title: recipe.title,
    titleNormalized,
    cuisineSlug,
  };
}

/** Builds the normalized title key used for duplicate detection in Firestore. */
function normalizeTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]/g, '')
    .replaceAll(/\s+/g, '-');
}

/** Maps the selected cuisine preference to the cookbook slug convention. */
function mapCuisinePreferenceToSlug(cuisine: string | null | undefined): string {
  return CUISINE_PREFERENCE_SLUGS[cuisine ?? ''] ?? 'fusion';
}

/** Parses a compact prep-time label back into a number of minutes. */
function parsePrepTimeToMinutes(prepTime: string): number | null {
  const minutes = Number.parseInt(prepTime.replace(/\D/g, ''), 10);
  return Number.isNaN(minutes) ? null : minutes;
}

/** Picks the generated-recipe fields persisted to Firestore. */
function pickPersistedRecipeFields(
  recipe: GeneratedRecipe,
  preferences: RecipeGenerationPreferences | null,
): Omit<
  FirestoreRecipeDocument,
  'title' | 'titleNormalized' | 'cuisineSlug' | 'createdAt' | 'updatedAt'
> {
  return {
    ...pickPersistedRecipeMeta(recipe, preferences),
    ...pickPersistedRecipeLists(recipe),
    nutrition: recipe.nutrition ?? null,
  };
}

const CUISINE_PREFERENCE_SLUGS: Record<string, string> = {
  Italian: 'italian',
  German: 'german',
  Japanese: 'japanese',
  Indian: 'indian',
  Gourmet: 'gourmet',
  Fusion: 'fusion',
};

/** Picks the scalar generated-recipe fields persisted to Firestore. */
function pickPersistedRecipeMeta(
  recipe: GeneratedRecipe,
  preferences: RecipeGenerationPreferences | null,
): Pick<
  FirestoreRecipeDocument,
  'description' | 'prepTime' | 'prepTimeMinutes' | 'cookCount' | 'likes' | 'dietTag'
> {
  const prepTimeMinutes = recipe.prepTimeMinutes ?? parsePrepTimeToMinutes(recipe.prepTime);
  const cookCount = recipe.cookCount ?? Math.max(1, preferences?.persons ?? 1);
  return {
    description: recipe.description,
    prepTime: recipe.prepTime,
    prepTimeMinutes,
    cookCount,
    likes: recipe.likes ?? 0,
    dietTag: recipe.dietTag ?? null,
  };
}

/** Picks the list fields persisted to Firestore for generated recipes. */
function pickPersistedRecipeLists(
  recipe: GeneratedRecipe,
): Pick<
  FirestoreRecipeDocument,
  'userIngredients' | 'extraIngredients' | 'ingredients' | 'steps' | 'stepDetails'
> {
  return {
    userIngredients: recipe.userIngredients ?? [],
    extraIngredients: recipe.extraIngredients ?? [],
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    stepDetails: recipe.stepDetails ?? [],
  };
}

/** Builds the created/updated timestamp payload for persisted recipes. */
function createRecipeTimestamps(): Pick<FirestoreRecipeDocument, 'createdAt' | 'updatedAt'> {
  return { createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
}
