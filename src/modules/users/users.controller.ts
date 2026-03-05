import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageUploadConfig } from '../../common/config/image-upload.config';
import { S3Service } from '../../common/services/s3.service';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly s3Service: S3Service,
  ) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    try {
      const user = await this.usersService.findOne(req.user.userId);
      return {
        success: true,
        data: new UserResponseDto(user),
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to fetch profile',
      };
    }
  }

  @Put('profile')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    try {
      this.logger.log(
        `✏️ Updating profile for user: ${req.user.userId}`,
      );
      this.logger.debug(
        `✏️ Update data: ${JSON.stringify(dto, null, 2)}`,
      );
      const user = await this.usersService.updateProfile(req.user.userId, dto);
      return {
        success: true,
        message: 'Profile updated successfully',
        data: new UserResponseDto(user),
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update profile',
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return {
      success: true,
      data: new UserResponseDto(user),
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  @Get('preferences/:id')
  @UseGuards(JwtAuthGuard)
  async getPreferences(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return {
      success: true,
      data: {
        notificationsEnabled: user.notificationsEnabled ?? true,
        dietaryRestrictions: user.dietaryRestrictions ?? [],
        measurementUnit: user.measurementUnit ?? 'metric',
        privacyProfilePublic: user.privacyProfilePublic ?? true,
      },
    };
  }

  @Put('preferences')
  @UseGuards(JwtAuthGuard)
  async updatePreferences(@Request() req, @Body() body: any) {
    const user = await this.usersService.updatePreferences(
      req.user.userId,
      body,
    );
    return {
      success: true,
      message: 'Preferences updated',
      data: {
        notificationsEnabled: user.notificationsEnabled ?? true,
        dietaryRestrictions: user.dietaryRestrictions ?? [],
        measurementUnit: user.measurementUnit ?? 'metric',
        privacyProfilePublic: user.privacyProfilePublic ?? true,
      },
    };
  }

  @Post('profile-picture')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    this.logger.log('📸 Image upload request received');
    this.logger.debug(
      `📸 File details: ${JSON.stringify(
        {
          fieldname: file?.fieldname,
          originalname: file?.originalname,
          mimetype: file?.mimetype,
          size: file?.size,
        },
        null,
        2,
      )}`,
    );

    if (!file) {
      this.logger.warn('❌ No file provided in image upload request');
      throw new BadRequestException('No file provided');
    }

    try {
      // Validate file type
      const allowedMimeTypes = ImageUploadConfig.allowedFormats;
      if (!allowedMimeTypes.includes(file.mimetype)) {
        this.logger.warn(
          `❌ Invalid profile image file type: ${file.mimetype}`,
        );
        throw new BadRequestException(
          'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
        );
      }

      // Validate file size (5MB max)
      const maxSize = ImageUploadConfig.maxFileSize;
      if (file.size > maxSize) {
        this.logger.warn(
          `❌ Profile image file too large: ${file.size} bytes`,
        );
        throw new BadRequestException(
          `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`,
        );
      }

      // Convert file buffer to base64 for S3Service
      const base64Data = `data:${file.mimetype};base64,${file.buffer.toString(
        'base64',
      )}`;

      this.logger.log('📤 Uploading profile image to S3...');
      const imageUrl = await this.s3Service.uploadImage(
        base64Data,
        ImageUploadConfig.folders.featuredImages,
        'featured',
      );

      this.logger.log('✅ Profile image upload successful');
      this.logger.debug(`✅ Profile image URL: ${imageUrl}`);

      return {
        url: imageUrl,
        filename: file.originalname,
        size: file.size,
      };
    } catch (error: any) {
      this.logger.error(
        '❌ Profile image upload failed',
        error?.stack || String(error),
      );
      throw error;
    }
  }
}
