import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Recipe, RecipeDocument } from './entities/recipe.entity';
import { CreateRecipeDto, RecipeStepDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { S3Service } from '../../common/services/s3.service';
import { ImageUploadConfig } from '../../common/config/image-upload.config';
import { UsersService } from '../users/users.service';
import { CacheInvalidationService } from '../../common/services/cache-invalidation.service';
import { CACHE_TTL } from '../../config/cache.config';
import { CacheKeyBuilder } from '../../common/utils/cache-key.builder';

interface PublicRecipesQuery {
  page: number;
  limit: number;
  category?: string;
  search?: string;
}

@Injectable()
export class RecipesService {
  constructor(
    @InjectModel(Recipe.name)
    private readonly recipeModel: Model<RecipeDocument>,
    private readonly s3Service: S3Service,
    private readonly usersService: UsersService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private cacheInvalidation: CacheInvalidationService,
  ) {}

  /** Map frontend steps (description) to DB shape (instruction) */
  private mapStepsForDb(
    steps: Array<{ stepNumber: number; description: string; imageUrl?: string }>,
  ): Array<{ stepNumber: number; instruction: string; imageUrl?: string }> {
    return steps.map((s) => ({
      stepNumber: s.stepNumber,
      instruction: s.description,
      imageUrl: s.imageUrl,
    }));
  }

  /** Map recipe from DB (instruction) to API response (description) for frontend */
  private mapRecipeForResponse(recipe: any): any {
    if (!recipe) return recipe;
    const out = { ...recipe };
    if (out._id && out._id.toString) out._id = out._id.toString();
    if (Array.isArray(out.steps) && out.steps.length > 0) {
      out.steps = out.steps.map(
        (s: { stepNumber: number; instruction: string; imageUrl?: string }) => ({
          stepNumber: s.stepNumber,
          description: s.instruction,
          imageUrl: s.imageUrl,
        }),
      );
    }
    return out;
  }

  async create(createRecipeDto: CreateRecipeDto): Promise<Recipe> {
    // Upload featured image if provided (base64)
    let featuredImageUrl: string | undefined;
    if (
      createRecipeDto.featuredImage &&
      createRecipeDto.featuredImage.startsWith('data:image')
    ) {
      try {
        console.log('[RecipesService] Starting featured image upload to S3...');
        featuredImageUrl = await this.s3Service.uploadImage(
          createRecipeDto.featuredImage,
          ImageUploadConfig.folders.featuredImages,
          'featured',
        );

        console.log(
          '[RecipesService] Featured image uploaded successfully:',
          featuredImageUrl,
        );
      } catch (error) {
        console.error(
          '[RecipesService] Failed to upload featured image:',
          error,
        );
        // Re-throw the error to prevent recipe creation with failed upload
        throw error;
      }
    } else {
      featuredImageUrl = createRecipeDto.featuredImage;
    }

    // Upload additional images if provided (base64)
    let imageUrls: string[] = [];
    if (createRecipeDto.images && createRecipeDto.images.length > 0) {
      const base64Images = createRecipeDto.images.filter((img) =>
        img.startsWith('data:image'),
      );
      const regularUrls = createRecipeDto.images.filter(
        (img) => !img.startsWith('data:image'),
      );

      if (base64Images.length > 0) {
        try {
          console.log(
            `[RecipesService] Starting upload of ${base64Images.length} additional images to S3...`,
          );
          const uploadedUrls = await this.s3Service.uploadMultipleImages(
            base64Images,
            ImageUploadConfig.folders.additionalImages,
          );
          imageUrls = [...regularUrls, ...uploadedUrls];

          console.log(
            '[RecipesService] Additional images uploaded successfully:',
            uploadedUrls,
          );
        } catch (error) {
          console.error(
            '[RecipesService] Failed to upload additional images:',
            error,
          );
          // Re-throw the error to prevent recipe creation with failed upload
          throw error;
        }
      } else {
        imageUrls = regularUrls;
      }
    }

    const { steps: stepsFromDto, ...restDto } = createRecipeDto;
    const stepsForDb = stepsFromDto?.length
      ? this.mapStepsForDb(stepsFromDto)
      : undefined;

    const createdRecipe = new this.recipeModel({
      ...restDto,
      steps: stepsForDb,
      featuredImage: featuredImageUrl,
      images: imageUrls,
      isFavorite: createRecipeDto.isFavorite ?? false,
      featured: createRecipeDto.featured ?? false,
    });

    console.log('[RecipesService] Saving recipe to database...');
    const saved = await createdRecipe.save();

    // Invalidate cache
    await this.cacheInvalidation.invalidateRecipe(
      saved._id.toString(),
      saved.ownerId.toString(),
    );

    return this.mapRecipeForResponse(saved.toObject ? saved.toObject() : saved) as Recipe;
  }

  async findAll(ownerId: string): Promise<Recipe[]> {
    const cacheKey = CacheKeyBuilder.create()
      .service('users')
      .resource('recipes')
      .id(ownerId)
      .scope('list')
      .version('v1')
      .build();

    // Try cache
    const cached = await this.cacheManager.get<Recipe[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from DB
    const recipes = await this.recipeModel.find({ ownerId }).lean().exec();
    const mapped = (recipes as any[]).map((r) => this.mapRecipeForResponse(r));

    // Cache result
    await this.cacheManager.set(cacheKey, mapped, CACHE_TTL.USER_RECIPES);

    return mapped as Recipe[];
  }

  async getAllPublicRecipes(query: PublicRecipesQuery) {
    console.log(
      '🔍 [RecipesService] Fetching public recipes with query:',
      query,
    );

    const { page, limit, category, search } = query;
    const skip = (page - 1) * limit;

    // Build query filters
    const filters: any = {
      isPublic: true, // Only public recipes
    };

    // Filter by category
    if (category && category !== 'all') {
      filters.category = new RegExp(`^${category}$`, 'i');
    }

    // Search in title and description
    if (search) {
      filters.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    try {
      // Fetch recipes with user information
      const recipes = await this.recipeModel
        .find(filters)
        .sort({ createdAt: -1 }) // Newest first
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      console.log('✅ [RecipesService] Found', recipes.length, 'recipes');

      // Get unique owner IDs to fetch user details
      const ownerIds = [...new Set(recipes.map((r) => r.ownerId))];
      const users = await Promise.all(
        ownerIds.map(async (ownerId) => {
          try {
            const user = await this.usersService.findOne(ownerId);
            const userDoc = (user as any).toObject
              ? (user as any).toObject()
              : user;
            return {
              _id: ownerId,
              name: user.name,
              email: user.email,
              avatarUrl: user.avatarUrl || null,
              subscription: userDoc.subscription || {
                isPremium: userDoc.isPremium ?? false,
                tier: userDoc.subscriptionTier ?? 'free',
                status: 'active',
              },
            };
          } catch (error) {
            // If user not found, return basic info
            return {
              _id: ownerId,
              name:
                recipes.find((r) => r.ownerId === ownerId)?.ownerName ||
                'Unknown User',
              email: null,
              avatarUrl: null,
              subscription: {
                isPremium: false,
                tier: 'free',
                status: 'active',
              },
            };
          }
        }),
      );

      // Create a map for quick lookup
      const userMap = new Map(users.map((u) => [u._id, u]));

      // Transform data to include user info in clean format
      return recipes.map((recipe) => {
        const author = userMap.get(recipe.ownerId);
        const recipeDoc = recipe as any;
        return {
          _id: recipe._id,
          title: recipe.title,
          description: recipe.description,
          category: recipe.category,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          servings: recipe.servings,
          difficulty: recipe.difficulty,
          featuredImage: recipe.featuredImage || null,
          rating: recipe.rating || null,
          createdAt: recipeDoc.createdAt,
          updatedAt: recipeDoc.updatedAt,

          // User information
          author: {
            _id: author?._id || recipe.ownerId,
            name: author?.name || recipe.ownerName || 'Unknown User',
            avatarUrl: author?.avatarUrl || null,
            subscription: author?.subscription || {
              isPremium: false,
              tier: 'free',
              status: 'active',
            },
          },
        };
      });
    } catch (error) {
      console.error(
        '❌ [RecipesService] Error fetching public recipes:',
        error,
      );
      throw error;
    }
  }

  async findOne(id: string): Promise<Recipe> {
    const cacheKey = CacheKeyBuilder.create()
      .service('recipes')
      .resource('detail')
      .id(id)
      .scope('public')
      .version('v1')
      .build();

    // Try cache
    const cached = await this.cacheManager.get<Recipe>(cacheKey);
    if (cached) {
      return this.mapRecipeForResponse(cached) as Recipe;
    }

    // Fetch from DB
    const recipe = await this.recipeModel.findById(id).lean().exec();
    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    // Cache result
    await this.cacheManager.set(cacheKey, recipe, CACHE_TTL.RECIPE_DETAIL);

    return this.mapRecipeForResponse(recipe) as Recipe;
  }

  async findByCategory(ownerId: string, category: string): Promise<Recipe[]> {
    const recipes = await this.recipeModel
      .find({
        ownerId,
        category: new RegExp(`^${category}$`, 'i'),
      })
      .lean()
      .exec();
    return (recipes as any[]).map((r) => this.mapRecipeForResponse(r)) as Recipe[];
  }

  async findFavorites(ownerId: string): Promise<Recipe[]> {
    const recipes = await this.recipeModel
      .find({ ownerId, isFavorite: true })
      .lean()
      .exec();
    return (recipes as any[]).map((r) => this.mapRecipeForResponse(r)) as Recipe[];
  }

  async search(ownerId: string, query: string): Promise<Recipe[]> {
    const lowerQuery = query.toLowerCase();
    const recipes = await this.recipeModel
      .find({
        ownerId,
        $or: [
          { title: { $regex: lowerQuery, $options: 'i' } },
          { description: { $regex: lowerQuery, $options: 'i' } },
          { category: { $regex: lowerQuery, $options: 'i' } },
        ],
      })
      .lean()
      .exec();
    return (recipes as any[]).map((r) => this.mapRecipeForResponse(r)) as Recipe[];
  }

  async update(
    id: string,
    ownerId: string,
    updateRecipeDto: UpdateRecipeDto,
  ): Promise<Recipe> {
    const recipe = await this.findOne(id);

    if (recipe.ownerId !== ownerId) {
      throw new ForbiddenException('You can only update your own recipes');
    }

    // Handle featured image update
    if (
      updateRecipeDto.featuredImage &&
      updateRecipeDto.featuredImage.startsWith('data:image')
    ) {
      // Delete old featured image if exists
      if (recipe.featuredImage) {
        await this.s3Service.deleteFile(recipe.featuredImage);
      }
      // Upload new featured image
      (recipe as any).featuredImage = await this.s3Service.uploadImage(
        updateRecipeDto.featuredImage,
        ImageUploadConfig.folders.featuredImages,
        'featured',
      );
    } else if (updateRecipeDto.featuredImage !== undefined) {
      (recipe as any).featuredImage = updateRecipeDto.featuredImage;
    }

    // Handle additional images update
    if (updateRecipeDto.images) {
      const base64Images = updateRecipeDto.images.filter((img) =>
        img.startsWith('data:image'),
      );
      const regularUrls = updateRecipeDto.images.filter(
        (img) => !img.startsWith('data:image'),
      );

      // Delete old images that are not in the new list
      if (recipe.images && recipe.images.length > 0) {
        const imagesToDelete = recipe.images.filter(
          (img) => !regularUrls.includes(img),
        );
        if (imagesToDelete.length > 0) {
          await this.s3Service.deleteMultipleFiles(imagesToDelete);
        }
      }

      // Upload new base64 images
      if (base64Images.length > 0) {
        const uploadedUrls = await this.s3Service.uploadMultipleImages(
          base64Images,
          ImageUploadConfig.folders.additionalImages,
        );
        (recipe as any).images = [...regularUrls, ...uploadedUrls];
      } else {
        (recipe as any).images = regularUrls;
      }
    }

    const dtoWithMappedSteps = { ...updateRecipeDto };
    if (dtoWithMappedSteps.steps !== undefined) {
      (dtoWithMappedSteps as any).steps = this.mapStepsForDb(
        dtoWithMappedSteps.steps as RecipeStepDto[],
      );
    }

    Object.assign(recipe as any, dtoWithMappedSteps);

    const updatedDoc = await this.recipeModel
      .findByIdAndUpdate(id, { $set: recipe }, { new: true })
      .lean()
      .exec();

    // Invalidate cache
    await this.cacheInvalidation.invalidateRecipe(id, ownerId);

    return this.mapRecipeForResponse(updatedDoc) as Recipe;
  }

  async toggleFavorite(id: string, ownerId: string): Promise<Recipe> {
    const recipe = await this.findOne(id);

    if (recipe.ownerId !== ownerId) {
      throw new ForbiddenException('You can only favorite your own recipes');
    }

    (recipe as any).isFavorite = !recipe.isFavorite;
    return (recipe as any).save();
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const recipe = await this.findOne(id);

    if (recipe.ownerId !== ownerId) {
      throw new ForbiddenException('You can only delete your own recipes');
    }

    // Delete images from S3
    const imagesToDelete: string[] = [];
    if (recipe.featuredImage) {
      imagesToDelete.push(recipe.featuredImage);
    }
    if (recipe.images && recipe.images.length > 0) {
      imagesToDelete.push(...recipe.images);
    }

    if (imagesToDelete.length > 0) {
      await this.s3Service.deleteMultipleFiles(imagesToDelete);
    }

    await this.recipeModel.deleteOne({ _id: id }).exec();

    // Invalidate cache
    await this.cacheInvalidation.invalidateRecipe(id, ownerId);
  }

  async getStats(ownerId: string) {
    const userRecipes = await this.recipeModel.find({ ownerId }).exec();
    const favorites = userRecipes.filter((r) => r.isFavorite);

    return {
      totalRecipes: userRecipes.length,
      favoriteRecipes: favorites.length,
      categoryCounts: this.getCategoryCounts(userRecipes),
    };
  }

  private getCategoryCounts(recipes: Recipe[]): Record<string, number> {
    return recipes.reduce(
      (acc, recipe) => {
        acc[recipe.category] = (acc[recipe.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  async bulkCreate(
    userId: string,
    recipes: Array<{
      title: string;
      description: string;
      ingredients: string[];
      instructions: string[];
      category: string;
      prepTime: number;
      cookTime: number;
      servings: number;
      difficulty: 'easy' | 'medium' | 'hard';
    }>,
  ): Promise<Recipe[]> {
    const user = await this.usersService.findOne(userId);
    const created: Recipe[] = [];

    for (const dto of recipes) {
      const recipe = new this.recipeModel({
        ownerId: userId,
        ownerName: user.name,
        userId: userId,
        title: dto.title,
        description: dto.description,
        ingredients: dto.ingredients,
        instructions: dto.instructions,
        category: dto.category,
        prepTime: dto.prepTime,
        cookTime: dto.cookTime,
        servings: dto.servings,
        difficulty: dto.difficulty,
        featuredImage: undefined,
        images: [],
        isFavorite: false,
        featured: false,
      });
      const saved = await recipe.save();
      created.push(saved);
    }

    return created;
  }
}
