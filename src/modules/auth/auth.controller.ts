import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Headers,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    this.logger.log(
      `[Register] Attempt for email: ${registerDto?.email ?? 'unknown'}`,
    );
    try {
      const result = await this.authService.register(registerDto);
      this.logger.log(
        `[Register] Success for email: ${registerDto?.email ?? 'unknown'}`,
      );
      return result;
    } catch (error: any) {
      this.logger.error(
        `[Register] Failed for email: ${registerDto?.email ?? 'unknown'} - ${error?.message ?? String(error)}`,
        error?.stack ?? '',
      );
      return {
        success: false,
        message: error.message || 'Registration failed',
      };
    }
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    this.logger.log(
      `[Login] Attempt for email: ${loginDto?.email ?? 'unknown'}`,
    );
    try {
      const result = await this.authService.login(loginDto);
      this.logger.log(
        `[Login] Success for email: ${loginDto?.email ?? 'unknown'}`,
      );
      return result;
    } catch (error: any) {
      this.logger.error(
        `[Login] Failed for email: ${loginDto?.email ?? 'unknown'} - ${error?.message ?? String(error)}`,
        error?.stack ?? '',
      );
      return {
        success: false,
        message: error.message || 'Login failed',
      };
    }
  }

  @Post('validate')
  async validateToken(@Body('token') token: string) {
    if (!token) {
      return {
        success: false,
        valid: false,
        message: 'No token provided',
      };
    }
    return this.authService.validateToken(token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return this.authService.getUserProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@Request() req) {
    return {
      success: true,
      data: req.user,
    };
  }
}
