import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Recipe, RecipeDocument } from './entities/recipe.entity';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

@Injectable()
export class RecipesService {
  constructor(
    @InjectModel(Recipe.name)
    private readonly recipeModel: Model<RecipeDocument>,
  ) {}

  async create(createRecipeDto: CreateRecipeDto): Promise<Recipe> {
    const createdRecipe = new this.recipeModel({
      ...createRecipeDto,
      isFavorite: createRecipeDto.isFavorite ?? false,
    });

    return createdRecipe.save();
  }

  async findAll(userId: string): Promise<Recipe[]> {
    return this.recipeModel.find({ userId }).exec();
  }

  async findOne(id: string): Promise<Recipe> {
    const recipe = await this.recipeModel.findById(id).exec();
    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }
    return recipe;
  }

  async findByCategory(userId: string, category: string): Promise<Recipe[]> {
    return this.recipeModel
      .find({
        userId,
        category: new RegExp(`^${category}$`, 'i'),
      })
      .exec();
  }

  async findFavorites(userId: string): Promise<Recipe[]> {
    return this.recipeModel.find({ userId, isFavorite: true }).exec();
  }

  async search(userId: string, query: string): Promise<Recipe[]> {
    const lowerQuery = query.toLowerCase();
    return this.recipeModel
      .find({
        userId,
        $or: [
          { title: { $regex: lowerQuery, $options: 'i' } },
          { description: { $regex: lowerQuery, $options: 'i' } },
          { category: { $regex: lowerQuery, $options: 'i' } },
        ],
      })
      .exec();
  }

  async update(id: string, updateRecipeDto: UpdateRecipeDto): Promise<Recipe> {
    const recipe = await this.recipeModel
      .findByIdAndUpdate(id, { ...updateRecipeDto }, { new: true })
      .exec();
    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }
    return recipe;
  }

  async toggleFavorite(id: string): Promise<Recipe> {
    const recipe = await this.recipeModel.findById(id).exec();
    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }
    recipe.isFavorite = !recipe.isFavorite;
    return recipe.save();
  }

  async remove(id: string): Promise<void> {
    const res = await this.recipeModel.deleteOne({ _id: id }).exec();
    if (!res.deletedCount) {
      throw new NotFoundException('Recipe not found');
    }
  }

  async getStats(userId: string) {
    const userRecipes = await this.recipeModel.find({ userId }).exec();
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

