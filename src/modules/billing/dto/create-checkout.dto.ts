import { IsString, IsEnum } from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  @IsEnum(['premium_monthly'])
  plan: string;
}
