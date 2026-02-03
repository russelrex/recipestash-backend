import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(50, { message: 'Name must not exceed 50 characters' })
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'Bio must not exceed 200 characters' })
  bio?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string; // base64 data URI | '' → clear
}
