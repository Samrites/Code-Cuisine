import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { GeneratedRecipe } from '../../models/recipe.model';
import { CookbookStoreService } from '../../services/cookbook-store.service';
import { CuisineIconService } from '../../services/cuisine-icon.service';
import { RecipeGenerationService } from '../../services/recipe-generation.service';

type CookbookCuisineCategory = {
  slug: string;
  title: string;
  imagePath: string;
};

const COOKBOOK_CUISINE_CATEGORIES: CookbookCuisineCategory[] = [
  {
    slug: 'italian',
    title: 'Italian cuisine',
    imagePath: 'Icons/italien.svg',
  },
  {
    slug: 'german',
    title: 'German cuisine',
    imagePath: 'Icons/german.svg',
  },
  {
    slug: 'japanese',
    title: 'Japanese cuisine',
    imagePath: 'Icons/japan.svg',
  },
  {
    slug: 'gourmet',
    title: 'Gourmet cuisine',
    imagePath: 'Icons/gourmet.svg',
  },
  {
    slug: 'indian',
    title: 'Indian cuisine',
    imagePath: 'Icons/indien.svg',
  },
  {
    slug: 'fusion',
    title: 'Fusion cuisine',
    imagePath: 'Icons/fusion.svg',
  },
];

@Component({
  selector: 'app-cookbook-page',
  imports: [RouterLink],
  templateUrl: './cookbook-page.html',
  styleUrl: './cookbook-page.scss',
})
export class CookbookPageComponent {
  private readonly recipeGeneration = inject(RecipeGenerationService);
  private readonly cookbookStore = inject(CookbookStoreService);
  private readonly router = inject(Router);

  protected readonly cuisineIcons = inject(CuisineIconService).icons;
  protected readonly cookbookStatus = this.cookbookStore.loadStatus;
  protected readonly likedRecipes = this.cookbookStore.topLikedRecipes;
  protected readonly cuisineCategories = COOKBOOK_CUISINE_CATEGORIES;

  /** Opens a stored cookbook recipe in the shared preparation view. */
  protected openRecipe(recipe: GeneratedRecipe): void {
    this.recipeGeneration.selectRecipe(recipe);

    void this.router.navigate(['/preparation'], {
      queryParams: {
        from: 'cookbook',
      },
    });
  }
}