import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';

import { ActivatedRoute, RouterLink } from '@angular/router';

import { RecipeGenerationService } from '../../services/recipe-generation.service';
import { CookbookStoreService } from '../../services/cookbook-store.service';

import {
  GeneratedRecipe,
  type RecipeNutrition,
} from '../../models/recipe.model';

const AVAILABLE_COOK_LABELS = [
  'Icons/Cook-label.svg',
  'Icons/Cook-label2.svg',
  'Icons/cook-label3.svg',
  'Icons/Cook-label4.svg',
];

/**
 * Browser storage key for the selected recipe.
 */
const SELECTED_RECIPE_STORAGE_KEY =
  'code-cuisine:selected-preparation-recipe';

@Component({
  selector: 'app-preparation-page',
  imports: [RouterLink],
  templateUrl: './preparation-page.html',
  styleUrl: './preparation-page.scss',
})
export class PreparationPageComponent {
  private readonly recipeGeneration = inject(
    RecipeGenerationService,
  );

  private readonly cookbookStore = inject(
    CookbookStoreService,
  );

  private readonly route = inject(ActivatedRoute);

  private readonly destroyRef = inject(DestroyRef);

  private readonly source =
    this.route.snapshot.queryParamMap.get('from');

  /**
   * Restores the last opened recipe after a page reload.
   */
  private readonly restoredRecipe = signal<GeneratedRecipe | null>(
    this.loadStoredRecipe(),
  );

  /**
   * Tracks whether the current recipe was liked in this browser.
   */
  protected readonly isLiked = signal(false);

  /**
   * Prevents repeated like clicks while saving.
   */
  protected readonly isSavingLike = signal(false);

  /**
   * Mobile accordion states.
   */
  protected readonly ingredientsCollapsed = signal(false);

  protected readonly directionsCollapsed = signal(false);

  /**
   * Responsive layout state.
   */
  protected readonly isMobileLayout = signal(
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 768px)').matches
      : false,
  );

  /**
   * Selects the active recipe.
   *
   * Priority:
   * 1. Recipe selected in the app
   * 2. First generated recipe
   * 3. Recipe restored from browser storage
   */
  protected readonly selectedRecipe = computed(
    () =>
      this.recipeGeneration.selectedRecipe() ??
      this.recipeGeneration.generatedRecipes()[0] ??
      this.restoredRecipe() ??
      null,
  );

  /**
   * Number of people cooking.
   */
  private readonly cookingPersons = computed(() =>
    Math.max(
      1,
      this.selectedRecipe()?.cookCount ??
        this.recipeGeneration.lastUsedPreferences()?.persons ??
        1,
    ),
  );

  /**
   * Back navigation.
   */
  protected readonly backLinkLabel =
    this.source === 'cookbook'
      ? 'Back to cookbook'
      : 'Recipe results';

  protected readonly backLinkTarget =
    this.source === 'cookbook'
      ? '/cookbook'
      : '/results';

  protected readonly backLinkAriaLabel =
    this.source === 'cookbook'
      ? 'Back to cookbook'
      : 'Back to recipe results';

  /**
   * Recipe preference tags.
   */
  protected readonly selectedPreferenceTags = computed(() =>
    buildPreparationPreferenceTags(this.selectedRecipe()),
  );

  /**
   * Nutrition facts.
   */
  protected readonly nutritionFacts = computed(() =>
    buildNutritionFacts(
      this.selectedRecipe()?.nutrition?.perPortion ?? null,
    ),
  );

  /**
   * Macro nutrition.
   */
  protected readonly macroNutrition = computed(() =>
    buildMacroNutrition(
      this.selectedRecipe()?.nutrition ?? null,
    ),
  );

  /**
   * Preparation directions.
   */
  protected readonly preparationDirections = computed(() =>
    buildPreparationDirections(
      this.selectedRecipe(),
      this.cookLabelSources(),
    ),
  );

  /**
   * Cooking person labels.
   */
  protected readonly cookingPersonsLabel = computed(
    () => this.cookingPersons(),
  );

  protected readonly cookLabelSources = computed(() =>
    getCookLabelSources(this.cookingPersons()),
  );

  /**
   * Helper tasks.
   */
  protected readonly helperTasks = computed(() =>
    Array.from(
      { length: this.cookingPersons() },
      (_, index) => ({
        cook: index + 1,
        label: AVAILABLE_COOK_LABELS[index],
        tasks: this.preparationDirections().filter(
          (step) => step.assignedCook === index + 1,
        ),
      }),
    ),
  );

  /**
   * Ingredient columns.
   */
  protected readonly ingredientColumns = computed(() =>
    buildIngredientColumns(this.selectedRecipe()),
  );

  constructor() {
    if (typeof window !== 'undefined') {
      this.registerMobileLayoutListener();
    }

    /**
     * Save the active recipe whenever it changes.
     */
    effect(() => {
      const recipe = this.selectedRecipe();

      if (recipe) {
        this.saveSelectedRecipe(recipe);
      }
    });

    /**
     * Restore the heart state for the active recipe.
     */
    effect(() => {
      this.syncLikedState();
    });
  }

  /**
   * Reads the previously opened recipe from localStorage.
   */
  private loadStoredRecipe(): GeneratedRecipe | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const stored = window.localStorage.getItem(
        SELECTED_RECIPE_STORAGE_KEY,
      );

      if (!stored) {
        return null;
      }

      const parsed: unknown = JSON.parse(stored);

      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !('title' in parsed) ||
        typeof parsed.title !== 'string' ||
        !('id' in parsed)
      ) {
        return null;
      }

      return parsed as GeneratedRecipe;
    } catch (error) {
      console.error(
        'Could not restore selected recipe:',
        error,
      );

      return null;
    }
  }

  /**
   * Saves the selected recipe in localStorage.
   */
  private saveSelectedRecipe(
    recipe: GeneratedRecipe,
  ): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(
        SELECTED_RECIPE_STORAGE_KEY,
        JSON.stringify(recipe),
      );
    } catch (error) {
      console.error(
        'Could not save selected recipe:',
        error,
      );
    }
  }

  /**
   * Toggles the like for the current recipe.
   */
  protected async toggleLike(): Promise<void> {
    const recipe = this.selectedRecipe();

    if (!recipe || this.isSavingLike()) {
      return;
    }

    const nextValue = !this.isLiked();

    if (!nextValue) {
      // Existing database function only supports adding likes.
      // Do not pretend that a database like was removed.
      return;
    }

    this.isSavingLike.set(true);

    try {
      await this.cookbookStore.likeRecipe(recipe);

      this.applyLikeState(recipe.title, true);
    } catch (error) {
      console.error('Could not save like:', error);
    } finally {
      this.isSavingLike.set(false);
    }
  }

  /**
   * Mobile ingredient accordion.
   */
  protected toggleIngredients(): void {
    this.ingredientsCollapsed.update(
      (value) => !value,
    );
  }

  /**
   * Mobile directions accordion.
   */
  protected toggleDirections(): void {
    this.directionsCollapsed.update(
      (value) => !value,
    );
  }

  /**
   * LocalStorage key for liked recipes.
   */
  private getLikedRecipeStorageKey(
    recipeTitle: string,
  ): string {
    return `liked-recipe:${recipeTitle.trim().toLowerCase()}`;
  }

  /**
   * Registers the mobile layout listener.
   */
  private registerMobileLayoutListener(): void {
    const mediaQuery = window.matchMedia(
      '(max-width: 768px)',
    );

    const updateMobileLayout = (
      event: MediaQueryList | MediaQueryListEvent,
    ): void => {
      this.isMobileLayout.set(event.matches);
    };

    updateMobileLayout(mediaQuery);

    mediaQuery.addEventListener(
      'change',
      updateMobileLayout,
    );

    this.destroyRef.onDestroy(() => {
      mediaQuery.removeEventListener(
        'change',
        updateMobileLayout,
      );
    });
  }

  /**
   * Restores the local heart state.
   */
  private syncLikedState(): void {
    const recipe = this.selectedRecipe();

    const liked =
      !!recipe &&
      typeof window !== 'undefined' &&
      this.isRecipeLiked(recipe.title);

    this.isLiked.set(liked);
  }

  /**
   * Checks whether this browser liked the recipe.
   */
  private isRecipeLiked(
    recipeTitle: string,
  ): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return (
      window.localStorage.getItem(
        this.getLikedRecipeStorageKey(recipeTitle),
      ) === 'true'
    );
  }

  /**
   * Saves the local liked state.
   */
  private persistLikedState(
    recipeTitle: string,
    nextValue: boolean,
  ): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      this.getLikedRecipeStorageKey(recipeTitle),
      String(nextValue),
    );
  }

  /**
   * Updates the heart and localStorage.
   */
  private applyLikeState(
    recipeTitle: string,
    nextValue: boolean,
  ): void {
    this.isLiked.set(nextValue);

    this.persistLikedState(
      recipeTitle,
      nextValue,
    );
  }
}

type NutritionFact = {
  label: string;
  value: string;
};

type IngredientColumns = {
  yourIngredients: string[];
  extraIngredients: string[];
};

/**
 * Builds recipe preference tags.
 */
function buildPreparationPreferenceTags(
  recipe: GeneratedRecipe | null,
): string[] {
  const tags: string[] = recipe?.dietTag
    ? [recipe.dietTag]
    : [];

  tags.push(
    getCookingTimeCategory(recipe?.prepTime ?? ''),
  );

  return tags;
}

/**
 * Builds nutrition facts.
 */
function buildNutritionFacts(
  recipeNutrition:
    | RecipeNutrition['perPortion']
    | null,
): NutritionFact[] {
  if (!recipeNutrition) {
    return createEmptyNutritionFacts();
  }

  return [
    createNutritionFact(
      'Energy',
      recipeNutrition.calories,
      'kcal',
    ),

    createNutritionFact(
      'Protein',
      recipeNutrition.protein_g,
      'g',
    ),

    createNutritionFact(
      'Fat',
      recipeNutrition.fat_g,
      'g',
    ),

    createNutritionFact(
      'Carbs',
      recipeNutrition.carbs_g,
      'g',
    ),
  ];
}

/**
 * Creates one nutrition value.
 */
function createNutritionFact(
  label: string,
  value: number | null,
  unit: string,
): NutritionFact {
  return {
    label,
    value: formatNutritionValue(value, unit),
  };
}

/**
 * Creates empty nutrition placeholders.
 */
function createEmptyNutritionFacts(): NutritionFact[] {
  return [
    'Energy',
    'Protein',
    'Fat',
    'Carbs',
  ].map((label) =>
    createNutritionFact(
      label,
      null,
      label === 'Energy'
        ? 'kcal'
        : 'g',
    ),
  );
}

/**
 * Limits cook labels.
 */
function getCookLabelSources(
  cookingPersons: number,
): string[] {
  return AVAILABLE_COOK_LABELS.slice(
    0,
    Math.min(
      cookingPersons,
      AVAILABLE_COOK_LABELS.length,
    ),
  );
}

/**
 * Builds preparation directions.
 */
function buildPreparationDirections(
  recipe: GeneratedRecipe | null,
  activeCookLabels: string[],
) {
  const details = recipe?.stepDetails ?? [];

  return (recipe?.steps ?? []).map(
    (step, index) => {
      const detail = details[index];

      const assignedCook = Math.min(
        Math.max(
          1,
          detail?.assignedCook ?? 1,
        ),
        activeCookLabels.length || 1,
      );

      return {
        number: index + 1,

        title:
          detail?.title ||
          `Step ${index + 1}`,

        text:
          detail?.description ||
          step.trim(),

        assignedCook,

        parallelizable:
          detail?.parallelizable ?? false,

        durationMinutes:
          detail?.durationMinutes ?? null,

        cookLabelSource:
          activeCookLabels[
            assignedCook - 1
          ] ??
          AVAILABLE_COOK_LABELS[0],
      };
    },
  );
}

/**
 * Builds ingredient columns.
 */
function buildIngredientColumns(
  recipe: GeneratedRecipe | null,
): IngredientColumns {
  if (hasExplicitIngredientColumns(recipe)) {
    return {
      yourIngredients:
        recipe?.userIngredients ?? [],

      extraIngredients:
        recipe?.extraIngredients ?? [],
    };
  }

  return splitRecipeIngredients(
    recipe?.ingredients ?? [],
  );
}

/**
 * Checks for separated ingredients.
 */
function hasExplicitIngredientColumns(
  recipe: GeneratedRecipe | null,
): boolean {
  return !!(
    recipe?.userIngredients ||
    recipe?.extraIngredients
  );
}

/**
 * Splits ingredients into two columns.
 */
function splitRecipeIngredients(
  ingredients: string[],
): IngredientColumns {
  const splitIndex = Math.min(
    4,
    Math.ceil(ingredients.length / 2),
  );

  return {
    yourIngredients:
      ingredients.slice(0, splitIndex),

    extraIngredients:
      ingredients.slice(splitIndex),
  };
}

/**
 * Determines cooking time category.
 */
function getCookingTimeCategory(
  prepTime: string,
): 'Quick' | 'Medium' | 'Complex' {
  const minutes = Number.parseInt(
    prepTime.replace(/\D/g, ''),
    10,
  );

  if (
    Number.isNaN(minutes) ||
    minutes <= 20
  ) {
    return 'Quick';
  }

  if (minutes <= 45) {
    return 'Medium';
  }

  return 'Complex';
}

/**
 * Formats nutrition values.
 */
function formatNutritionValue(
  value: number | null,
  unit: string,
): string {
  if (
    value === null ||
    Number.isNaN(value)
  ) {
    return `-- ${unit}`;
  }

  return `${value}${unit}`;
}

/**
 * Calculates macro nutrition.
 */
function buildMacroNutrition(
  nutrition: RecipeNutrition | null,
) {
  const portion = nutrition?.perPortion;
  const total = nutrition?.total;

  const definitions = [
    {
      label: 'Protein',
      key: 'protein_g' as const,
      factor: 4,
    },
    {
      label: 'Carbs',
      key: 'carbs_g' as const,
      factor: 4,
    },
    {
      label: 'Fat',
      key: 'fat_g' as const,
      factor: 9,
    },
  ];

  const complete = definitions.every(
    ({ key }) =>
      typeof portion?.[key] === 'number' &&
      Number.isFinite(portion[key]) &&
      portion[key]! >= 0,
  );

  const macroCalories = complete
    ? definitions.reduce(
        (sum, { key, factor }) =>
          sum + portion![key]! * factor,
        0,
      )
    : 0;

  return definitions.map(
    ({ label, key, factor }) => ({
      label,

      portion: formatNutritionValue(
        portion?.[key] ?? null,
        'g',
      ),

      total: formatNutritionValue(
        total?.[key] ?? null,
        'g',
      ),

      percent:
        macroCalories > 0
          ? Math.round(
              ((portion![key]! * factor) /
                macroCalories) *
                100,
            )
          : null,
    }),
  );
}