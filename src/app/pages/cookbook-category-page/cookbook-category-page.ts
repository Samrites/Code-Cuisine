import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  GeneratedRecipe,
  StoredCookbookRecipe,
} from '../../models/recipe.model';
import { CookbookStoreService } from '../../services/cookbook-store.service';
import { RecipeGenerationService } from '../../services/recipe-generation.service';

type CookbookCategoryConfig = {
  slug: string;
  title: string;
  heroSrc: string;
  mobileHeroSrc: string;
  heroWidth: number;
  heroHeight: number;
  mobileHeroWidth: number;
  mobileHeroHeight: number;
};

const PAGE_SIZE = 20;

const DEFAULT_CATEGORY = {
  slug: 'italian',
  title: 'Italian cuisine',
  heroSrc: 'Icons/property-italian.svg',
  mobileHeroSrc: 'Icons/property-italian-mobile.svg',
  heroWidth: 1146,
  heroHeight: 144,
  mobileHeroWidth: 340,
  mobileHeroHeight: 94,
} satisfies CookbookCategoryConfig;

const COOKBOOK_CATEGORY_CONFIGS: CookbookCategoryConfig[] = [
  {
    slug: 'italian',
    title: 'Italian cuisine',
    heroSrc: 'Icons/property-italian.svg',
    mobileHeroSrc: 'Icons/property-italian-mobile.svg',
    heroWidth: 1146,
    heroHeight: 144,
    mobileHeroWidth: 340,
    mobileHeroHeight: 94,
  },
  {
    slug: 'german',
    title: 'German cuisine',
    heroSrc: 'Icons/property-german.svg',
    mobileHeroSrc: 'Icons/property-german-mobile.svg',
    heroWidth: 1143,
    heroHeight: 151,
    mobileHeroWidth: 341,
    mobileHeroHeight: 91,
  },
  {
    slug: 'japanese',
    title: 'Japanese cuisine',
    heroSrc: 'Icons/property-japanese.svg',
    mobileHeroSrc: 'Icons/property-japanese-mobile.svg',
    heroWidth: 1143,
    heroHeight: 156,
    mobileHeroWidth: 340,
    mobileHeroHeight: 90,
  },
  {
    slug: 'gourmet',
    title: 'Gourmet cuisine',
    heroSrc: 'Icons/property-gourmet.svg',
    mobileHeroSrc: 'Icons/property-gourmet-mobile.svg',
    heroWidth: 1143,
    heroHeight: 165,
    mobileHeroWidth: 342,
    mobileHeroHeight: 90,
  },
  {
    slug: 'indian',
    title: 'Indian cuisine',
    heroSrc: 'Icons/property-indian.svg',
    mobileHeroSrc: 'Icons/property-indian-mobile.svg',
    heroWidth: 1143,
    heroHeight: 132,
    mobileHeroWidth: 340,
    mobileHeroHeight: 91,
  },
  {
    slug: 'fusion',
    title: 'Fusion cuisine',
    heroSrc: 'Icons/property-fusion.svg',
    mobileHeroSrc: 'Icons/property-fusion-mobile.svg',
    heroWidth: 1143,
    heroHeight: 132,
    mobileHeroWidth: 340,
    mobileHeroHeight: 91,
  },
];

@Component({
  selector: 'app-cookbook-category-page',
  imports: [RouterLink],
  templateUrl: './cookbook-category-page.html',
  styleUrl: './cookbook-category-page.scss',
})
export class CookbookCategoryPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recipeGeneration = inject(RecipeGenerationService);
  private readonly cookbookStore = inject(CookbookStoreService);

  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly pageSize = PAGE_SIZE;
  protected readonly cookbookStatus = this.cookbookStore.loadStatus;

  protected readonly category = computed<CookbookCategoryConfig>(() => {
    const slug = this.paramMap().get('category') ?? '';

    const matchingCategory = COOKBOOK_CATEGORY_CONFIGS.find(
      (entry) => entry.slug === slug,
    );

    return (
      matchingCategory ??
      COOKBOOK_CATEGORY_CONFIGS[0] ??
      DEFAULT_CATEGORY
    );
  });

  protected readonly currentPage = computed(() => {
    const rawPage = Number(
      this.queryParamMap().get('page') ?? '1',
    );

    const page = Number.isFinite(rawPage)
      ? Math.floor(rawPage)
      : 1;

    return Math.max(
      1,
      Math.min(page, this.totalPages()),
    );
  });

  private readonly categoryRecipes = computed(() =>
    this.cookbookStore.recipesByCuisine(
      this.category().slug,
    ),
  );

  protected readonly totalPages = computed(() =>
    Math.max(
      1,
      Math.ceil(
        this.categoryRecipes().length / PAGE_SIZE,
      ),
    ),
  );

  protected readonly visibleRecipes = computed(() => {
    const start =
      (this.currentPage() - 1) * PAGE_SIZE;

    return this.categoryRecipes().slice(
      start,
      start + PAGE_SIZE,
    );
  });

  protected readonly pageNumbers = computed(() =>
    Array.from(
      { length: this.totalPages() },
      (_, index) => index + 1,
    ),
  );

  /** Retries loading the cookbook after a failed request. */
  protected reloadRecipes(): void {
    void this.cookbookStore.refreshRecipes();
  }

  /** Resolves the visible meta tags shown on each category-row card. */
  protected recipeMetaTags(
    recipe: StoredCookbookRecipe,
  ): string[] {
    const tags: string[] = [];

    if (recipe.dietTag) {
      tags.push(recipe.dietTag);
    }

    tags.push(
      getCookingTimeCategory(recipe.prepTime),
    );

    return tags;
  }

  /** Opens the selected cookbook recipe in the preparation view. */
  protected openRecipe(
    recipe: GeneratedRecipe,
  ): void {
    this.recipeGeneration.selectRecipe(recipe);

    void this.router.navigate(['/preparation'], {
      queryParams: {
        from: 'cookbook',
      },
    });
  }

  /** Converts the recipe index on the current page into the absolute list position. */
  protected recipeNumber(
    indexOnPage: number,
  ): number {
    return (
      (this.currentPage() - 1) *
        PAGE_SIZE +
      indexOnPage +
      1
    );
  }

  /** Updates the active category-page query parameter for pagination. */
  protected changePage(page: number): void {
    if (
      page < 1 ||
      page > this.totalPages() ||
      page === this.currentPage()
    ) {
      return;
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page,
      },
      queryParamsHandling: 'merge',
    });
  }
}

/** Maps a compact preparation-time label to the display category badges. */
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