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

@Controller('recipes')
@UseGuards(JwtAuthGuard)
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post()
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
  async findAll(@Request() req) {
    const recipes = await this.recipesService.findAll(req.user.userId);
    return {
      success: true,
      data: recipes,
    };
  }

  @Get('stats')
  async getStats(@Request() req) {
    const stats = await this.recipesService.getStats(req.user.userId);
    return {
      success: true,
      data: stats,
    };
  }

  @Get('favorites')
  async findFavorites(@Request() req) {
    const recipes = await this.recipesService.findFavorites(req.user.userId);
    return {
      success: true,
      data: recipes,
    };
  }

  @Get('category/:category')
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
  async toggleFavorite(@Param('id') id: string) {
    const recipe = await this.recipesService.toggleFavorite(id);
    return {
      success: true,
      message: 'Favorite status updated',
      data: recipe,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.recipesService.remove(id);
    return {
      success: true,
      message: 'Recipe deleted successfully',
    };
  }
}


