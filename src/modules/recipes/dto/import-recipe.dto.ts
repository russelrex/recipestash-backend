import { IsUrl, IsNotEmpty } from 'class-validator';

export class ImportRecipeDto {
  @IsNotEmpty({ message: 'URL is required' })
  @IsUrl({}, { message: 'Invalid URL format' })
  url: string;
}

