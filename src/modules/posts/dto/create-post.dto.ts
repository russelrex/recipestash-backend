import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;

  @IsString()
  @IsOptional()
  recipeId?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
