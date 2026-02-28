import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecipeStepDto {
  @IsNumber()
  stepNumber: number;

  @IsString()
  @IsNotEmpty({ message: 'Step description is required' })
  description: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class CreateRecipeDto {
  @IsString()
  @IsNotEmpty()
  ownerId: string;

  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @IsString({ each: true })
  ingredients: string[];

  @IsArray()
  @IsString({ each: true })
  instructions: string[];

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsNumber()
  prepTime: number;

  @IsNumber()
  cookTime: number;

  @IsNumber()
  servings: number;

  @IsEnum(['easy', 'medium', 'hard'])
  difficulty: 'easy' | 'medium' | 'hard';

  @IsString()
  @IsOptional()
  featuredImage?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  @IsOptional()
  images?: string[];

  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @IsNumber()
  @IsOptional()
  rating?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeStepDto)
  @IsOptional()
  steps?: RecipeStepDto[];
}
