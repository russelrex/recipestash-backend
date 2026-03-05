import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { S3Service } from '../../common/services/s3.service';
import { ImageUploadConfig } from '../../common/config/image-upload.config';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { RecipeScraperService } from './services/recipe-scraper.service';
import { ImportRecipeDto } from './dto/import-recipe.dto';
import { ScrapeRecipeDto } from './dto/scrape-recipe.dto';

@Controller('recipes')
export class RecipesController {
  private readonly logger = new Logger(RecipesController.name);

  constructor(
    private readonly recipesService: RecipesService,
    private readonly s3Service: S3Service,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly scraperService: RecipeScraperService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createRecipeDto: CreateRecipeDto, @Request() req) {
    const canCreate = await this.subscriptionsService.canCreateRecipe(
      req.user.userId,
    );

    if (!canCreate.allowed) {
      throw new BadRequestException({
        message: canCreate.message,
        code: 'RECIPE_LIMIT_REACHED',
        upgradeRequired: true,
      });
    }

    createRecipeDto.ownerId = req.user.userId;
    createRecipeDto.ownerName = req.user.name;
    createRecipeDto.userId = req.user.userId;
    const recipe = await this.recipesService.create(createRecipeDto);
    return {
      success: true,
      message: 'Recipe created successfully',
      data: recipe,
    };
  }

  // Scrape a recipe URL and return data only (no creation)
  @Post('scrape')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async scrapeRecipe(
    @Request() req,
    @Body() scrapeDto: ScrapeRecipeDto,
  ): Promise<{
    success: boolean;
    data: {
      title: string;
      description?: string;
      prepTime?: number;
      cookTime?: number;
      totalTime?: number;
      servings?: number;
      ingredients: string[];
      instructions: string[];
      imageUrl?: string;
      category?: string;
      cuisine?: string;
      author?: string;
      sourceUrl: string;
    };
  }> {
    this.logger.log(
      `🔍 Scrape request from user ${
        req.user?.userId || 'anonymous'
      } for URL: ${scrapeDto.url}`,
    );

    const scrapedData = await this.scraperService.scrapeRecipeFromUrl(
      scrapeDto.url,
    );

    return {
      success: true,
      data: scrapedData,
    };
  }

  // Import a single recipe by scraping a public URL
  @Post('import-url')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async importRecipeFromUrl(@Request() req, @Body() importDto: ImportRecipeDto) {
    const scrapedRecipe = await this.scraperService.scrapeRecipeFromUrl(importDto.url);

    const createPayload = {
      ownerId: req.user.userId,
      ownerName: req.user.name,
      userId: req.user.userId,
      title: scrapedRecipe.title,
      description: scrapedRecipe.description || 'Imported recipe',
      ingredients: scrapedRecipe.ingredients,
      instructions: scrapedRecipe.instructions,
      category: scrapedRecipe.category || 'Imported',
      prepTime: scrapedRecipe.prepTime ?? scrapedRecipe.totalTime ?? 0,
      cookTime: scrapedRecipe.cookTime ?? 0,
      servings: scrapedRecipe.servings ?? 1,
      difficulty: 'easy' as const,
      featuredImage: scrapedRecipe.imageUrl || undefined,
      images: [],
      isFavorite: false,
      featured: false,
      rating: undefined,
      steps: undefined,
    };

    const recipe = await this.recipesService.create(createPayload);

    return {
      success: true,
      message: 'Recipe imported successfully',
      data: recipe,
    };
  }

  // NEW ENDPOINT: Get all public recipes from all users
  @Get('public')
  @HttpCode(HttpStatus.OK)
  async getAllPublicRecipes(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('category') category?: string,
    @Query('search') search?: string,
  ): Promise<{
    success: boolean;
    data: any[];
    pagination: { page: number; limit: number; total: number };
  }> {
    this.logger.log('📚 Fetching all public recipes');
    this.logger.debug('📚 Query params', {
      page,
      limit,
      category,
      search,
    });

    const recipes = await this.recipesService.getAllPublicRecipes({
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      search,
    });

    this.logger.log(`✅ Found ${recipes.length} public recipes`);

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    return {
      success: true,
      data: recipes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: recipes.length,
      },
    };
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(@Request() req) {
    // If no user is authenticated, return empty array
    if (!req.user || !req.user.userId) {
      return {
        success: true,
        data: [],
      };
    }

    const recipes = await this.recipesService.findAll(req.user.userId);
    return {
      success: true,
      data: recipes,
    };
  }

  @Get('stats')
  @UseGuards(OptionalJwtAuthGuard)
  async getStats(@Request() req) {
    // If no user is authenticated, return empty stats
    if (!req.user || !req.user.userId) {
      return {
        success: true,
        data: {
          totalRecipes: 0,
          favoriteRecipes: 0,
          categoryCounts: {},
        },
      };
    }

    const stats = await this.recipesService.getStats(req.user.userId);
    return {
      success: true,
      data: stats,
    };
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  async findFavorites(@Request() req) {
    const recipes = await this.recipesService.findFavorites(req.user.userId);
    return {
      success: true,
      data: recipes,
    };
  }

  @Get('category/:category')
  @UseGuards(JwtAuthGuard)
  async findByCategory(@Param('category') category: string, @Request() req) {
    const recipes = await this.recipesService.findByCategory(
      req.user.userId,
      category,
    );
    return {
      success: true,
      data: recipes,
    };
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  async search(@Query('q') query: string, @Request() req) {
    const recipes = await this.recipesService.search(req.user.userId, query);
    return {
      success: true,
      data: recipes,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const recipe = await this.recipesService.findOne(id);
    return {
      success: true,
      data: recipe,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateRecipeDto: UpdateRecipeDto,
    @Request() req,
  ) {
    const recipe = await this.recipesService.update(
      id,
      req.user.userId,
      updateRecipeDto,
    );
    return {
      success: true,
      message: 'Recipe updated successfully',
      data: recipe,
    };
  }

  @Patch(':id/favorite')
  @UseGuards(JwtAuthGuard)
  async toggleFavorite(@Param('id') id: string, @Request() req) {
    const recipe = await this.recipesService.toggleFavorite(
      id,
      req.user.userId,
    );
    return {
      success: true,
      message: 'Favorite status updated',
      data: recipe,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async deleteRecipe(@Param('id') recipeId: string, @Request() req) {
    this.logger.log(
      `🗑️ Delete recipe request. recipeId=${recipeId}, userId=${req.user.userId}`,
    );

    try {
      await this.recipesService.deleteRecipe(recipeId, req.user.userId);
      this.logger.log('✅ Recipe deleted successfully');
      return {
        message: 'Recipe deleted successfully',
        recipeId,
      };
    } catch (error: any) {
      this.logger.error('❌ Delete failed', error?.stack || String(error));
      throw error;
    }
  }

  @Post('import')
  @UseGuards(JwtAuthGuard)
  async importRecipes(@Body() body: { recipes: any[] }, @Request() req) {
    try {
      // Strip image fields from every entry so the import is text-only
      const sanitised = (body.recipes || []).map(
        ({
          featuredImage,
          images,
          _id,
          id,
          userId,
          isFavorite,
          createdAt,
          updatedAt,
          featured,
          ...rest
        }) => rest,
      );
      const created = await this.recipesService.bulkCreate(
        req.user.userId,
        sanitised,
      );
      return {
        success: true,
        message: `Imported ${created.length} recipe(s)`,
        data: created,
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Import failed' };
    }
  }
  
  @Post('step-image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async uploadStepImage(@UploadedFile() file: Express.Multer.File) {
    this.logger.log('📸 Step image upload request received');
    this.logger.debug('📸 Step image file details', {
      fieldname: file?.fieldname,
      originalname: file?.originalname,
      mimetype: file?.mimetype,
      size: file?.size,
    });

    if (!file) {
      this.logger.warn('❌ No file provided in step image upload request');
      throw new BadRequestException('No file provided');
    }

    try {
      const allowedMimeTypes = ImageUploadConfig.allowedFormats;
      if (!allowedMimeTypes.includes(file.mimetype)) {
        this.logger.warn(
          `❌ Invalid step image file type: ${file.mimetype}`,
        );
        throw new BadRequestException(
          'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
        );
      }

      const maxSize = ImageUploadConfig.maxFileSize;
      if (file.size > maxSize) {
        this.logger.warn(
          `❌ Step image file too large: ${file.size} bytes`,
        );
        throw new BadRequestException(
          `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`,
        );
      }

      const base64Data = `data:${file.mimetype};base64,${file.buffer.toString(
        'base64',
      )}`;

      this.logger.log('📤 Uploading step image to S3...');
      const imageUrl = await this.s3Service.uploadImage(
        base64Data,
        ImageUploadConfig.folders.additionalImages,
        'additional',
      );

      this.logger.log('✅ Step image upload successful');
      this.logger.debug(`✅ Step image URL: ${imageUrl}`);

      return {
        url: imageUrl,
        filename: file.originalname,
        size: file.size,
      };
    } catch (error: any) {
      this.logger.error(
        '❌ Step image upload failed',
        error?.stack || String(error),
      );
      throw error;
    }
  }
}
