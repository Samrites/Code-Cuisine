import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type IngredientSource = "user" | "extra";

interface InputIngredient {
  name?: string;
  amount?: number;
  unit?: string;
}

interface GeneratedIngredient {
  name: string;
  amount: number;
  unit: string;
  source: IngredientSource;
}

interface GeneratedInstruction {
  title: string;
  description: string;
  assignedTo: string[];
  parallelizable: boolean;
  durationMinutes: number | null;
}

interface GeneratedNutrition {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

interface GeneratedRecipe {
  title: string;
  description: string;
  cuisine: string;
  cooking_time: number;
  servings: number;
  helpers: number;
  ingredients: GeneratedIngredient[];
  instructions: GeneratedInstruction[];
  nutrition: GeneratedNutrition;
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ingredientMatchesUserInput(
  generatedName: string,
  userIngredients: InputIngredient[],
): boolean {
  const generated = normalizeText(generatedName);

  if (!generated) {
    return false;
  }

  return userIngredients.some((ingredient) => {
    const userName = normalizeText(ingredient?.name);

    if (!userName) {
      return false;
    }

    return (
      generated === userName ||
      generated.includes(userName) ||
      userName.includes(generated)
    );
  });
}

function normalizeIngredients(
  rawIngredients: unknown,
  userIngredients: InputIngredient[],
): GeneratedIngredient[] {
  if (!Array.isArray(rawIngredients)) {
    return [];
  }

  return rawIngredients
    .filter(
      (ingredient): ingredient is Record<string, unknown> =>
        ingredient !== null &&
        typeof ingredient === "object" &&
        !Array.isArray(ingredient),
    )
    .map((ingredient) => {
      const name = String(
        ingredient["name"] ?? "",
      ).trim();

      const amountValue = Number(
        ingredient["amount"],
      );

      const amount = Number.isFinite(
        amountValue,
      )
        ? amountValue
        : 0;

      const unit = String(
        ingredient["unit"] ?? "",
      ).trim();

      const rawSource =
        ingredient["source"] === "user"
          ? "user"
          : ingredient["source"] === "extra"
            ? "extra"
            : null;

      /*
       * User ingredients are protected here as well.
       *
       * If OpenAI accidentally marks "Pasta" or "Tomatoes"
       * as extra, we correct it when the generated name
       * clearly matches an ingredient supplied by the user.
       *
       * AI-added ingredients remain extra.
       */
      const matchesUserIngredient =
        ingredientMatchesUserInput(
          name,
          userIngredients,
        );

      const source: IngredientSource =
        matchesUserIngredient
          ? "user"
          : rawSource === "user"
            ? "extra"
            : rawSource ?? "extra";

      return {
        name,
        amount,
        unit,
        source,
      };
    })
    .filter(
      (ingredient) =>
        ingredient.name.length > 0,
    );
}

function normalizeInstructions(
  rawInstructions: unknown,
  helpers: number,
): GeneratedInstruction[] {
  if (!Array.isArray(rawInstructions)) {
    return [];
  }

  const instructions =
    rawInstructions
      .map(
        (
          instruction,
          index,
        ): GeneratedInstruction | null => {
          /*
           * Backward compatibility:
           * If OpenAI unexpectedly returns a string,
           * we still create a valid structured step.
           */
          if (
            typeof instruction === "string"
          ) {
            return {
              title: `Step ${index + 1}`,
              description:
                instruction.trim(),
              assignedTo: [
                `Chef ${
                  helpers > 1
                    ? (index % helpers) + 1
                    : 1
                }`,
              ],
              parallelizable: false,
              durationMinutes: null,
            };
          }

          if (
            instruction === null ||
            typeof instruction !== "object" ||
            Array.isArray(instruction)
          ) {
            return null;
          }

          const record =
            instruction as Record<
              string,
              unknown
            >;

          const title = String(
            record["title"] ??
              `Step ${index + 1}`,
          ).trim();

          const description = String(
            record["description"] ?? "",
          ).trim();

          const durationValue = Number(
            record["durationMinutes"],
          );

          const durationMinutes =
            Number.isFinite(durationValue) &&
            durationValue >= 0
              ? durationValue
              : null;

          return {
            title,
            description,
            assignedTo: [
              `Chef ${
                helpers > 1
                  ? (index % helpers) + 1
                  : 1
              }`,
            ],
            parallelizable:
              record["parallelizable"] ===
              true,
            durationMinutes,
          };
        },
      )
      .filter(
        (
          instruction,
        ): instruction is GeneratedInstruction =>
          instruction !== null &&
          (
            instruction.title.length >
              0 ||
            instruction.description
              .length > 0
          ),
      );

  /*
   * The chef assignment is normalized deliberately.
   *
   * With two cooks:
   * Step 1 -> Chef 1
   * Step 2 -> Chef 2
   * Step 3 -> Chef 1
   * Step 4 -> Chef 2
   *
   * With three cooks:
   * Step 1 -> Chef 1
   * Step 2 -> Chef 2
   * Step 3 -> Chef 3
   * Step 4 -> Chef 1
   *
   * This prevents all generated tasks from accidentally
   * being assigned to Chef 1.
   */
  return instructions.map(
    (instruction, index) => ({
      ...instruction,
      assignedTo: [
        `Chef ${
          helpers > 1
            ? (index % helpers) + 1
            : 1
        }`,
      ],
    }),
  );
}

function normalizeNutrition(
  rawNutrition: unknown,
): GeneratedNutrition {
  const emptyNutrition: GeneratedNutrition =
    {
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
    };

  if (
    rawNutrition === null ||
    typeof rawNutrition !== "object" ||
    Array.isArray(rawNutrition)
  ) {
    return emptyNutrition;
  }

  const nutrition =
    rawNutrition as Record<
      string,
      unknown
    >;

  const readNumber = (
    key: string,
  ): number | null => {
    const value = Number(
      nutrition[key],
    );

    return Number.isFinite(value)
      ? value
      : null;
  };

  return {
    calories:
      readNumber("calories"),
    protein:
      readNumber("protein"),
    carbs:
      readNumber("carbs"),
    fat:
      readNumber("fat"),
  };
}

function normalizeRecipe(
  rawRecipe: unknown,
  userIngredients: InputIngredient[],
  servings: number,
  helpers: number,
  fallbackCuisine: string,
): GeneratedRecipe {
  if (
    rawRecipe === null ||
    typeof rawRecipe !== "object" ||
    Array.isArray(rawRecipe)
  ) {
    throw new Error(
      "OpenAI returned an invalid recipe.",
    );
  }

  const recipe =
    rawRecipe as Record<
      string,
      unknown
    >;

  const cookingTimeValue = Number(
    recipe["cooking_time"],
  );

  return {
    title: String(
      recipe["title"] ??
        "Generated Recipe",
    ).trim(),

    description: String(
      recipe["description"] ?? "",
    ).trim(),

    // Always use the cuisine selected by the user, not the AI's guess.
    cuisine: fallbackCuisine.trim().toLowerCase(),

    cooking_time:
      Number.isFinite(
        cookingTimeValue,
      ) &&
      cookingTimeValue > 0
        ? cookingTimeValue
        : 30,

    servings,

    helpers,

    ingredients:
      normalizeIngredients(
        recipe["ingredients"],
        userIngredients,
      ),

    instructions:
      normalizeInstructions(
        recipe["instructions"],
        helpers,
      ),

    nutrition:
      normalizeNutrition(
        recipe["nutrition"],
      ),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return Response.json(
      {
        error:
          "Only POST requests are allowed.",
      },
      {
        status: 405,
        headers: corsHeaders,
      },
    );
  }

  try {
    const apiKey = Deno.env.get(
      "OPENAI_API_KEY",
    );

    if (!apiKey) {
      return Response.json(
        {
          error:
            "OPENAI_API_KEY is missing.",
        },
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }

    const data = await req.json();

    const {
      ingredients = [],
      servings = 2,
      helpers = 1,
      cuisine = "fusion",
      timeCategory = "quick",
      diet = "none",
      generateCount = 3,
    } = data;

    if (
      !Array.isArray(ingredients) ||
      ingredients.length === 0
    ) {
      return Response.json(
        {
          error:
            "Please provide ingredients.",
        },
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    const userIngredients =
      ingredients as InputIngredient[];

    const count = Math.min(
      Math.max(
        Number(generateCount) || 3,
        1,
      ),
      5,
    );

    const safeServings = Math.max(
      1,
      Number(servings) || 1,
    );

    const safeHelpers = Math.min(
      Math.max(
        Number(helpers) || 1,
        1,
      ),
      3,
    );

    const prompt = `
Create exactly ${count} different recipes.

IMPORTANT LANGUAGE RULES:
- Write all human-readable recipe content in English.
- The title must be in English.
- The description must be in English.
- Ingredient names must be in English.
- Instruction titles must be in English.
- Instruction descriptions must be in English.
- Do not use German words in the generated recipe.
- Return only valid JSON.

USER'S AVAILABLE INGREDIENTS:
${JSON.stringify(userIngredients)}

RECIPE REQUIREMENTS:
- Servings: ${safeServings}
- Persons cooking: ${safeHelpers}
- Cuisine: ${cuisine}
- Time category: ${timeCategory}
- Diet: ${diet}

INGREDIENT RULES:
- Use the user's available ingredients whenever possible.
- Include every user ingredient that is actually used in the recipe.
- Ingredients supplied by the user must have source "user".
- Ingredients that were NOT supplied by the user but are required for the recipe must have source "extra".
- Basic additions such as olive oil, salt, pepper, herbs, spices, cheese, garlic, onion, or similar ingredients must be source "extra" unless the user explicitly supplied them.
- Do not classify an AI-added ingredient as source "user".
- Keep the user's supplied quantities where reasonable.
- The ingredient name may be translated to English, but its source must still remain "user".
- Every ingredient object must contain name, amount, unit and source.

COOK ASSIGNMENT RULES:
- There are exactly ${safeHelpers} persons cooking.
- Valid cook labels are "Chef 1" through "Chef ${safeHelpers}".
- Every preparation step must contain assignedTo.
- assignedTo must contain exactly one valid chef label.
- Never assign a step to a chef number greater than ${safeHelpers}.
- If there is only 1 person cooking, assign every step to "Chef 1".
- If there are 2 or more persons cooking, distribute useful work between the available chefs.
- Every available chef must receive at least one preparation step when there are enough steps.
- Do not assign every step to Chef 1 when multiple people are cooking.
- Assign independent preparation tasks to different chefs where possible.
- Steps that can happen at the same time should have parallelizable set to true where appropriate.
- Keep the final cooking order logical and safe.

NUTRITION RULES:
- Nutrition values must be approximate values PER SERVING.
- calories is energy in kcal per serving.
- protein is grams per serving.
- carbs is grams per serving.
- fat is grams per serving.

TIME RULES:
- cooking_time must be a number representing total cooking time in minutes.
- Respect the requested time category as closely as possible.

Return exactly this JSON structure:

{
  "recipes": [
    {
      "title": "Pasta with Spinach and Tomatoes",
      "description": "A simple Italian pasta dish with spinach and tomatoes.",
      "cuisine": "${cuisine}",
      "cooking_time": 25,
      "servings": ${safeServings},
      "helpers": ${safeHelpers},
      "ingredients": [
        {
          "name": "Pasta",
          "amount": 100,
          "unit": "g",
          "source": "user"
        },
        {
          "name": "Spinach",
          "amount": 100,
          "unit": "g",
          "source": "user"
        },
        {
          "name": "Tomatoes",
          "amount": 150,
          "unit": "g",
          "source": "user"
        },
        {
          "name": "Olive Oil",
          "amount": 2,
          "unit": "tablespoons",
          "source": "extra"
        }
      ],
      "instructions": [
        {
          "title": "Cook the pasta",
          "description": "Cook the pasta according to the package instructions until al dente.",
          "assignedTo": ["Chef 1"],
          "parallelizable": true,
          "durationMinutes": 10
        },
        {
          "title": "Prepare the vegetables",
          "description": "Prepare the spinach and tomatoes for the sauce.",
          "assignedTo": ["Chef ${safeHelpers > 1 ? 2 : 1}"],
          "parallelizable": true,
          "durationMinutes": 5
        },
        {
          "title": "Prepare the sauce",
          "description": "Cook the tomatoes and spinach with the extra ingredients.",
          "assignedTo": ["Chef 1"],
          "parallelizable": false,
          "durationMinutes": 8
        },
        {
          "title": "Combine and serve",
          "description": "Combine the pasta with the sauce and serve.",
          "assignedTo": ["Chef ${safeHelpers > 1 ? 2 : 1}"],
          "parallelizable": false,
          "durationMinutes": 5
        }
      ],
      "nutrition": {
        "calories": 350,
        "protein": 15,
        "carbs": 40,
        "fat": 12
      }
    }
  ]
}

FINAL RULES:
- Return exactly ${count} recipes.
- Respect ${safeServings} servings.
- Respect exactly ${safeHelpers} persons cooking.
- Keep the requested cuisine style.
- Keep the requested diet.
- Do not add ingredients that conflict with the requested diet.
- All human-readable recipe text must be English.
- Every ingredient must contain a valid source value of either "user" or "extra".
- Every instruction must contain title, description, assignedTo, parallelizable and durationMinutes.
- Return JSON only.
`;

    const openaiResponse =
      await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${apiKey}`,
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            model: "gpt-4o-mini",

            messages: [
              {
                role: "system",
                content:
                  "You are a cooking assistant for the Code à Cuisine application. Generate structured recipes in English. Carefully distinguish user-provided ingredients from extra ingredients and distribute preparation tasks between the requested number of chefs. Respond only with valid JSON.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],

            response_format: {
              type: "json_object",
            },
          }),
        },
      );

    const result =
      await openaiResponse.json();

    if (!openaiResponse.ok) {
      console.error(
        "OpenAI error:",
        result.error?.message,
      );

      return Response.json(
        {
          error:
            "The AI request failed. Please check the API key and available API credit.",
        },
        {
          status: 502,
          headers: corsHeaders,
        },
      );
    }

    const content =
      result.choices?.[0]
        ?.message?.content;

    if (!content) {
      throw new Error(
        "No response received from OpenAI.",
      );
    }

    const parsedResponse =
      JSON.parse(content);

    if (
      !parsedResponse ||
      !Array.isArray(
        parsedResponse.recipes,
      )
    ) {
      throw new Error(
        "OpenAI returned an invalid recipe response.",
      );
    }

    if (
      parsedResponse.recipes
        .length !== count
    ) {
      throw new Error(
        `Expected ${count} recipes but received ${parsedResponse.recipes.length}.`,
      );
    }

    /*
     * Final normalization:
     * Do not trust the AI response blindly.
     *
     * This guarantees:
     * - correct servings
     * - correct helper count
     * - structured ingredients
     * - user/extra classification
     * - structured instructions
     * - Chef 1 / Chef 2 / Chef 3 distribution
     * - normalized nutrition
     */
    const normalizedRecipes =
      parsedResponse.recipes.map(
        (recipe: unknown) =>
          normalizeRecipe(
            recipe,
            userIngredients,
            safeServings,
            safeHelpers,
            String(cuisine),
          ),
      );

    return Response.json(
      {
        recipes:
          normalizedRecipes,
      },
      {
        headers: corsHeaders,
      },
    );
  } catch (error) {
    console.error(
      "Recipe generation error:",
      error,
    );

    return Response.json(
      {
        error:
          "An error occurred while generating the recipes.",
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
});