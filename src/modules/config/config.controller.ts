import { Controller, Get } from '@nestjs/common';
import { ImageUploadConfig } from '../../common/config/image-upload.config';

@Controller('config')
export class AppConfigController {
  @Get('image-upload')
  getImageUploadConfig() {
    return {
      success: true,
      data: {
        allowedFormats: ImageUploadConfig.allowedFormats,
        maxFileSize: ImageUploadConfig.maxFileSize,
        featuredImageMaxSize: ImageUploadConfig.featuredImageMaxSize,
        additionalImageMaxSize: ImageUploadConfig.additionalImageMaxSize,
        maxWidth: ImageUploadConfig.maxWidth,
        maxHeight: ImageUploadConfig.maxHeight,
        maxAdditionalImages: ImageUploadConfig.maxAdditionalImages,
        defaultQuality: ImageUploadConfig.defaultQuality,
      },
    };
  }
}
