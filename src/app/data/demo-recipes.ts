import { StoredCookbookRecipe } from '../models/recipe.model';

type DemoRecipeSeed = readonly [title: string, minutes: number, diet: StoredCookbookRecipe['dietTag']];

const ITALIAN_RECIPES: DemoRecipeSeed[] = [
  ['Tomato Basil Pasta', 20, 'Vegetarian'],
  ['Creamy Mushroom Risotto', 35, 'Vegetarian'],
  ['Lemon Garlic Spaghetti', 18, 'Vegan'],
  ['Classic Vegetable Lasagne', 55, 'Vegetarian'],
  ['Gnocchi with Sage Butter', 30, 'Vegetarian'],
  ['Tuscan White Bean Soup', 40, 'Vegan'],
  ['Spinach Ricotta Ravioli', 45, 'Vegetarian'],
  ['Aubergine Parmigiana', 50, 'Vegetarian'],
  ['Pesto Potato Salad', 25, 'Vegan'],
  ['Roasted Pepper Polenta', 35, 'Vegan'],
  ['Caprese Orzo', 20, 'Vegetarian'],
  ['Broccoli Orecchiette', 25, 'Vegan'],
  ['Pumpkin Sage Pasta', 35, 'Vegetarian'],
  ['Courgette Lemon Linguine', 20, 'Vegan'],
  ['Italian Lentil Stew', 45, 'Vegan'],
  ['Fennel Orange Salad', 15, 'Vegan'],
  ['Crispy Polenta Bites', 30, 'Vegan'],
  ['Baked Tomato Risotto', 50, 'Vegetarian'],
  ['Cannellini Tomato Bake', 40, 'Vegan'],
  ['Rosemary Focaccia Salad', 35, 'Vegan'],
  ['Pea and Mint Arancini', 50, 'Vegetarian'],
];

const OTHER_RECIPES: Array<{ seed: DemoRecipeSeed; cuisine: string }> = [
  { seed: ['Potato Herb Skillet', 30, 'Vegetarian'], cuisine: 'german' },
  { seed: ['Sesame Vegetable Bowl', 25, 'Vegan'], cuisine: 'japanese' },
  { seed: ['Golden Chickpea Curry', 35, 'Vegan'], cuisine: 'indian' },
  { seed: ['Herb Crusted Cauliflower', 45, 'Vegan'], cuisine: 'gourmet' },
  { seed: ['Miso Pesto Noodles', 25, 'Vegan'], cuisine: 'fusion' },
];

/** Provides visible, testable cookbook content when Supabase has no saved recipes yet. */
export const DEMO_COOKBOOK_RECIPES: StoredCookbookRecipe[] = [
  ...ITALIAN_RECIPES.map((seed, index) => createDemoRecipe(seed, 'italian', index)),
  ...OTHER_RECIPES.map(({ seed, cuisine }, index) => createDemoRecipe(seed, cuisine, index + 30)),
];

/** Converts a compact seed into a complete public cookbook recipe. */
function createDemoRecipe(
  [title, minutes, dietTag]: DemoRecipeSeed,
  cuisineSlug: string,
  index: number,
): StoredCookbookRecipe {
  return {
    id: `demo-${cuisineSlug}-${index + 1}`,
    source: 'library',
    title,
    titleNormalized: title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-'),
    description: 'A reliable cookbook recipe with simple ingredients and clear preparation steps.',
    prepTime: `${minutes} min`,
    prepTimeMinutes: minutes,
    cookCount: 2,
    likes: Math.max(3, 28 - index),
    dietTag,
    cuisineSlug,
    userIngredients: ['fresh vegetables', 'herbs'],
    extraIngredients: ['olive oil', 'salt', 'pepper'],
    ingredients: ['fresh vegetables', 'herbs', 'olive oil', 'salt', 'pepper'],
    steps: [
      'Prepare and measure all ingredients.',
      'Cook gently until the vegetables are tender.',
      'Season to taste and serve warm.',
    ],
  };
}
