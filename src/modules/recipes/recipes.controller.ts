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
} from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createRecipeDto: CreateRecipeDto, @Request() req) {
    createRecipeDto.userId = req.user.userId;

    const recipe = await this.recipesService.create(createRecipeDto);
    return {
      success: true,
      message: 'Recipe created successfully',
      data: recipe,
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
  ) {
    const recipe = await this.recipesService.update(id, updateRecipeDto);
    return {
      success: true,
      message: 'Recipe updated successfully',
      data: recipe,
    };
  }

  @Patch(':id/favorite')
  @UseGuards(JwtAuthGuard)
  async toggleFavorite(@Param('id') id: string) {
    const recipe = await this.recipesService.toggleFavorite(id);
    return {
      success: true,
      message: 'Favorite status updated',
      data: recipe,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    await this.recipesService.remove(id);
    return {
      success: true,
      message: 'Recipe deleted successfully',
    };
  }
}


