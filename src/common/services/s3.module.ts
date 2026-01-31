import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3Service } from './s3.service';
import { ImageValidationService } from './image-validation.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [S3Service, ImageValidationService],
  exports: [S3Service, ImageValidationService],
})
export class S3Module {}
