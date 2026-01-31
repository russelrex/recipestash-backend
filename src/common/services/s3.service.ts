import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { ImageValidationService } from './image-validation.service';
import { ImageUploadConfig, ImageUploadMessages } from '../config/image-upload.config';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  constructor(
    private configService: ConfigService,
    private imageValidationService: ImageValidationService,
  ) {
    this.region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME') || '';

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
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
        // eslint-disable-next-line no-console
        console.error('[S3Service] AWS_S3_BUCKET_NAME is not configured');
        throw new BadRequestException('S3 bucket is not configured. Please set AWS_S3_BUCKET_NAME in environment variables.');
      }

      // eslint-disable-next-line no-console
      console.log('[S3Service] Validating image...');
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
      // eslint-disable-next-line no-console
      console.log(`[S3Service] Uploading to S3: ${this.bucketName}/${fileName} (${buffer.length} bytes)`);

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
      // eslint-disable-next-line no-console
      console.log('[S3Service] Image uploaded successfully:', imageUrl);
      return imageUrl;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[S3Service] Error uploading to S3:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      // eslint-disable-next-line no-console
      console.error('[S3Service] Upload error details:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
      });
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
    const uploadPromises = imagesData.map(imageData => 
      this.uploadImage(imageData, folder, 'additional')
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
      console.error('Error deleting file from S3:', error);
    }
  }

  async deleteMultipleFiles(fileUrls: string[]): Promise<void> {
    const deletePromises = fileUrls.map(url => this.deleteFile(url));
    await Promise.all(deletePromises);
  }
}
