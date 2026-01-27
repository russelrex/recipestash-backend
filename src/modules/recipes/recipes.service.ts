import { Injectable, NotFoundException } from '@nestjs/common';
import { Recipe } from './entities/recipe.entity';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

@Injectable()
export class RecipesService {
  private recipes: Recipe[] = [];

  async create(createRecipeDto: CreateRecipeDto): Promise<Recipe> {
    const recipe: Recipe = {
      _id: Date.now().toString(),
      ...createRecipeDto,
      isFavorite: createRecipeDto.isFavorite || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.recipes.push(recipe);
    return recipe;
  }

  async findAll(userId: string): Promise<Recipe[]> {
    return this.recipes.filter((recipe) => recipe.userId === userId);
  }

  async findOne(id: string): Promise<Recipe> {
    const recipe = this.recipes.find((r) => r._id === id);
    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }
    return recipe;
  }

  async findByCategory(userId: string, category: string): Promise<Recipe[]> {
    return this.recipes.filter(
      (recipe) =>
        recipe.userId === userId &&
        recipe.category.toLowerCase() === category.toLowerCase(),
    );
  }

  async findFavorites(userId: string): Promise<Recipe[]> {
    return this.recipes.filter(
      (recipe) => recipe.userId === userId && recipe.isFavorite === true,
    );
  }

  async search(userId: string, query: string): Promise<Recipe[]> {
    const lowerQuery = query.toLowerCase();
    return this.recipes.filter(
      (recipe) =>
        recipe.userId === userId &&
        (recipe.title.toLowerCase().includes(lowerQuery) ||
          recipe.description.toLowerCase().includes(lowerQuery) ||
          recipe.category.toLowerCase().includes(lowerQuery)),
    );
  }

  async update(id: string, updateRecipeDto: UpdateRecipeDto): Promise<Recipe> {
    const recipe = await this.findOne(id);
    Object.assign(recipe, { ...updateRecipeDto, updatedAt: new Date() });
    return recipe;
  }

  async toggleFavorite(id: string): Promise<Recipe> {
    const recipe = await this.findOne(id);
    recipe.isFavorite = !recipe.isFavorite;
    recipe.updatedAt = new Date();
    return recipe;
  }

  async remove(id: string): Promise<void> {
    const index = this.recipes.findIndex((r) => r._id === id);
    if (index === -1) {
      throw new NotFoundException('Recipe not found');
    }
    this.recipes.splice(index, 1);
  }

  async getStats(userId: string) {
    const userRecipes = this.recipes.filter((r) => r.userId === userId);
    const favorites = userRecipes.filter((r) => r.isFavorite);

    return {
      totalRecipes: userRecipes.length,
      favoriteRecipes: favorites.length,
      categoryCounts: this.getCategoryCounts(userRecipes),
    };
  }

  private getCategoryCounts(recipes: Recipe[]): Record<string, number> {
    return recipes.reduce((acc, recipe) => {
      acc[recipe.category] = (acc[recipe.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

