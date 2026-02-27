import { Injectable, BadRequestException } from '@nestjs/common';
import {
  ImageUploadConfig,
  ImageUploadMessages,
} from '../config/image-upload.config';

interface ImageMetadata {
  format: string;
  width?: number;
  height?: number;
  size: number;
}

@Injectable()
export class ImageValidationService {
  validateBase64Image(
    base64Data: string,
    imageType: 'featured' | 'additional' = 'additional',
  ): void {
    // Extract format from base64 string
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      throw new BadRequestException('Invalid image data format');
    }

    const format = matches[1];
    const base64Content = matches[2];

    // Validate format
    if (!ImageUploadConfig.allowedExtensions.includes(format.toLowerCase())) {
      throw new BadRequestException(ImageUploadMessages.invalidFormat);
    }

    // Calculate file size
    const buffer = Buffer.from(base64Content, 'base64');
    const fileSize = buffer.length;

    // Validate file size
    const maxSize =
      imageType === 'featured'
        ? ImageUploadConfig.featuredImageMaxSize
        : ImageUploadConfig.additionalImageMaxSize;

    if (fileSize > maxSize) {
      throw new BadRequestException(
        imageType === 'featured'
          ? ImageUploadMessages.featuredImageTooLarge
          : ImageUploadMessages.additionalImageTooLarge,
      );
    }
  }

  validateImageArray(
    images: string[],
    maxCount: number = ImageUploadConfig.maxAdditionalImages,
  ): void {
    if (images.length > maxCount) {
      throw new BadRequestException(ImageUploadMessages.tooManyImages);
    }

    images.forEach((image, index) => {
      if (image.startsWith('data:image')) {
        this.validateBase64Image(image, 'additional');
      }
    });
  }

  getImageMetadata(base64Data: string): ImageMetadata {
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      throw new BadRequestException('Invalid image data format');
    }

    const format = matches[1];
    const base64Content = matches[2];
    const buffer = Buffer.from(base64Content, 'base64');

    return {
      format,
      size: buffer.length,
    };
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
