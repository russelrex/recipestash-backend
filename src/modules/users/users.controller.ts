import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Param,
  Post,
  Put,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';
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

  /**
   * Profile picture upload. Requires JWT. Accepts multipart/form-data with field "file".
   * Returns JSON { url, filename, size } on success. Always responds with JSON.
   */
  @Post('profile-picture')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: ImageUploadConfig.maxFileSize },
    }),
  )
  async uploadProfilePicture(
    @Request() req: { user: { userId: string } },
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ url: string; filename: string; size: number }> {
    try {
      this.logger.log(
        `[Profile picture] Upload request from user: ${req.user?.userId}`,
      );

      if (!file || !file.buffer) {
        this.logger.warn('[Profile picture] No file or buffer in request');
        throw new BadRequestException({
          message: 'No file provided. Send multipart/form-data with field "file".',
        });
      }

      const allowedMimeTypes = ImageUploadConfig.allowedFormats;
      if (!file.mimetype || !allowedMimeTypes.includes(file.mimetype)) {
        this.logger.warn(
          `[Profile picture] Invalid mimetype: ${file.mimetype}`,
        );
        throw new BadRequestException({
          message:
            'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
        });
      }

      const maxSize = ImageUploadConfig.maxFileSize;
      if (file.size > maxSize) {
        this.logger.warn(
          `[Profile picture] File too large: ${file.size} bytes`,
        );
        throw new BadRequestException({
          message: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`,
        });
      }

      const base64Data = `data:${file.mimetype};base64,${file.buffer.toString(
        'base64',
      )}`;

      this.logger.log('[Profile picture] Uploading to S3...');
      const imageUrl = await this.s3Service.uploadImage(
        base64Data,
        ImageUploadConfig.folders.profiles,
        'additional',
      );

      this.logger.log(
        `[Profile picture] Upload success for user: ${req.user?.userId}`,
      );

      return {
        url: imageUrl,
        filename: file.originalname || 'profile.jpg',
        size: file.size,
      };
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error?.status === 400 ||
        error?.status === 401
      ) {
        throw error;
      }
      this.logger.error(
        `[Profile picture] Upload failed: ${error?.message ?? String(error)}`,
        error?.stack ?? '',
      );
      throw new InternalServerErrorException({
        message:
          error?.message?.toString?.() ||
          'Profile picture upload failed. Please try again.',
      });
    }
  }
}
