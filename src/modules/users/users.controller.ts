import { Body, Controller, Delete, Get, Param, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    try {
      const user = await this.usersService.findOne(req.user.userId);
      return {
        success: true,
        data: this.usersService.sanitizeUser(user),
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to fetch profile',
      };
    }
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    try {
      const user = await this.usersService.updateProfile(req.user.userId, dto);
      return {
        success: true,
        message: 'Profile updated successfully',
        data: this.usersService.sanitizeUser(user),
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
      data: user,
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

  @Get('preferences')
  @UseGuards(JwtAuthGuard)
  async getPreferences(@Request() req) {
    const user = await this.usersService.findOne(req.user.userId);
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
    const user = await this.usersService.updatePreferences(req.user.userId, body);
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
}

