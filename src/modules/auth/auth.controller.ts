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
    try {
      const result = await this.authService.register(registerDto);
      return result;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Registration failed',
      };
    }
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    try {
      this.logger.log(`Login attempt for: ${loginDto.email}`);
      const result = await this.authService.login(loginDto);

      this.logger.log('Login successful');
      return result;
    } catch (error: any) {
      this.logger.error(
        'Login error',
        (error as Error)?.stack || String(error),
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
