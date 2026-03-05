import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { ImageValidationService } from './image-validation.service';
import {
  ImageUploadConfig,
  ImageUploadMessages,
} from '../config/image-upload.config';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;
  private readonly logger = new Logger(S3Service.name);

  constructor(
    private configService: ConfigService,
    private imageValidationService: ImageValidationService,
  ) {
    this.region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    this.bucketName =
      this.configService.get<string>('AWS_S3_BUCKET_NAME') || '';

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey:
          this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });
  }

  async uploadImage(
    imageData: string,
    folder: string = ImageUploadConfig.folders.additionalImages,
    imageType: 'featured' | 'additional' = 'additional',
  ): Promise<string> {
    try {
      // Check if S3 is configured
      if (!this.bucketName) {
        this.logger.error('AWS_S3_BUCKET_NAME is not configured');
        throw new BadRequestException(
          'S3 bucket is not configured. Please set AWS_S3_BUCKET_NAME in environment variables.',
        );
      }

      this.logger.log('Validating image before upload');
      // Validate image
      this.imageValidationService.validateBase64Image(imageData, imageType);

      // Extract base64 data and file extension
      const matches = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) {
        throw new BadRequestException('Invalid image data format');
      }

      const fileExtension = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      // Generate unique filename
      const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

      this.logger.log(
        `Uploading to S3: ${this.bucketName}/${fileName} (${buffer.length} bytes)`,
      );

      // Upload to S3
      // Note: ACL is removed because bucket has ObjectOwnership set to BucketOwnerEnforced
      // Public access should be controlled via bucket policy instead
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: `image/${fileExtension}`,
        CacheControl: 'max-age=31536000', // Cache for 1 year
        Metadata: {
          'original-size': buffer.length.toString(),
          'upload-date': new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      const imageUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`;

      this.logger.log('Image uploaded successfully');
      return imageUrl;
    } catch (error) {
      this.logger.error(
        'Error uploading to S3',
        (error as Error)?.stack || String(error),
      );
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        'Upload error details',
        JSON.stringify(
          {
            message: (error as any)?.message,
            name: (error as any)?.name,
          },
          null,
          2,
        ),
      );
      throw new BadRequestException(ImageUploadMessages.uploadFailed);
    }
  }

  async uploadMultipleImages(
    imagesData: string[],
    folder: string = ImageUploadConfig.folders.additionalImages,
  ): Promise<string[]> {
    // Validate array
    this.imageValidationService.validateImageArray(imagesData);

    // Upload all images
    const uploadPromises = imagesData.map((imageData) =>
      this.uploadImage(imageData, folder, 'additional'),
    );

    return await Promise.all(uploadPromises);
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const urlParts = fileUrl.split('.com/');
      if (urlParts.length < 2) return;

      const key = urlParts[1];

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      this.logger.error(
        'Error deleting file from S3',
        (error as Error)?.stack || String(error),
      );
    }
  }

  async deleteMultipleFiles(fileUrls: string[]): Promise<void> {
    const deletePromises = fileUrls.map((url) => this.deleteFile(url));
    await Promise.all(deletePromises);
  }
}
