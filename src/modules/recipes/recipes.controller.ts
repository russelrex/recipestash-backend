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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { S3Service } from '../../common/services/s3.service';
import { ImageUploadConfig } from '../../common/config/image-upload.config';

@Controller('recipes')
export class RecipesController {
  constructor(
    private readonly recipesService: RecipesService,
    private readonly s3Service: S3Service,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createRecipeDto: CreateRecipeDto, @Request() req) {
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

  // NEW ENDPOINT: Get all public recipes from all users
  @Get('public')
  @HttpCode(HttpStatus.OK)
  async getAllPublicRecipes(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    console.log('📚 [Recipes] Fetching all public recipes');
    console.log('📚 [Recipes] Query params:', {
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

    console.log('✅ [Recipes] Found', recipes.length, 'public recipes');

    return {
      success: true,
      data: recipes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
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
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Request() req) {
    await this.recipesService.remove(id, req.user.userId);
    return {
      success: true,
      message: 'Recipe deleted successfully',
    };
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

  @Post('profile-picture')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    console.log(
      '\n📸 [RecipesController] ============ IMAGE UPLOAD REQUEST ============',
    );
    console.log('📸 [RecipesController] Received file upload request');
    console.log('📸 [RecipesController] File details:', {
      fieldname: file?.fieldname,
      originalname: file?.originalname,
      mimetype: file?.mimetype,
      size: file?.size,
    });

    if (!file) {
      console.error('❌ [RecipesController] No file provided in request');
      throw new BadRequestException('No file provided');
    }

    try {
      // Validate file type
      const allowedMimeTypes = ImageUploadConfig.allowedFormats;
      if (!allowedMimeTypes.includes(file.mimetype)) {
        console.error(
          '❌ [RecipesController] Invalid file type:',
          file.mimetype,
        );
        throw new BadRequestException(
          'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
        );
      }

      // Validate file size (5MB max)
      const maxSize = ImageUploadConfig.maxFileSize;
      if (file.size > maxSize) {
        console.error('❌ [RecipesController] File too large:', file.size);
        throw new BadRequestException(
          `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`,
        );
      }

      // Convert file buffer to base64 for S3Service
      const base64Data = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

      console.log('📤 [RecipesController] Uploading to S3...');
      const imageUrl = await this.s3Service.uploadImage(
        base64Data,
        ImageUploadConfig.folders.featuredImages,
        'featured',
      );

      console.log('✅ [RecipesController] Upload successful');
      console.log('✅ [RecipesController] Image URL:', imageUrl);

      return {
        url: imageUrl,
        filename: file.originalname,
        size: file.size,
      };
    } catch (error: any) {
      console.error('❌ [RecipesController] Upload failed:', error);
      throw error;
    }
  }

  @Post('step-image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async uploadStepImage(@UploadedFile() file: Express.Multer.File) {
    console.log(
      '\n📸 [RecipesController] ============ STEP IMAGE UPLOAD REQUEST ============',
    );
    console.log('📸 [RecipesController] Received step image upload request');
    console.log('📸 [RecipesController] File details:', {
      fieldname: file?.fieldname,
      originalname: file?.originalname,
      mimetype: file?.mimetype,
      size: file?.size,
    });

    if (!file) {
      console.error('❌ [RecipesController] No file provided in request');
      throw new BadRequestException('No file provided');
    }

    try {
      const allowedMimeTypes = ImageUploadConfig.allowedFormats;
      if (!allowedMimeTypes.includes(file.mimetype)) {
        console.error(
          '❌ [RecipesController] Invalid step image file type:',
          file.mimetype,
        );
        throw new BadRequestException(
          'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
        );
      }

      const maxSize = ImageUploadConfig.maxFileSize;
      if (file.size > maxSize) {
        console.error(
          '❌ [RecipesController] Step image file too large:',
          file.size,
        );
        throw new BadRequestException(
          `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`,
        );
      }

      const base64Data = `data:${file.mimetype};base64,${file.buffer.toString(
        'base64',
      )}`;

      console.log('📤 [RecipesController] Uploading step image to S3...');
      const imageUrl = await this.s3Service.uploadImage(
        base64Data,
        ImageUploadConfig.folders.additionalImages,
        'additional',
      );

      console.log('✅ [RecipesController] Step image upload successful');
      console.log('✅ [RecipesController] Step image URL:', imageUrl);

      return {
        url: imageUrl,
        filename: file.originalname,
        size: file.size,
      };
    } catch (error: any) {
      console.error('❌ [RecipesController] Step image upload failed:', error);
      throw error;
    }
  }
}
