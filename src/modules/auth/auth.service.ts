import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const email = registerDto?.email ?? 'unknown';
    this.logger.log(`[Register] Creating user for email: ${email}`);
    try {
      const user = await this.usersService.create(
        registerDto.name,
        registerDto.email,
        registerDto.password,
      );

      const userId = (user as any)._id?.toString?.() ?? (user as any).id;
      const token = this.generateToken(userId, user.name);

      this.logger.log(`[Register] User created successfully, userId: ${userId}`);
      return {
        success: true,
        message: 'Registration successful',
        data: {
          user: new UserResponseDto(user),
          token,
        },
      };
    } catch (error: any) {
      if (error instanceof ConflictException) {
        this.logger.warn(
          `[Register] Conflict for email: ${email} - ${error.message}`,
        );
        throw error;
      }
      this.logger.error(
        `[Register] Unexpected error for email: ${email} - ${error?.message ?? String(error)}`,
        error?.stack ?? '',
      );
      throw new ConflictException(
        error?.message ?? 'Registration failed',
      );
    }
  }

  async login(loginDto: LoginDto) {
    const email = loginDto?.email ?? 'unknown';
    this.logger.log(`[Login] Looking up user for email: ${email}`);

    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      this.logger.warn(`[Login] No user found for email: ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      user,
      loginDto.password,
    );

    if (!isPasswordValid) {
      this.logger.warn(`[Login] Invalid password for email: ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    const userId = (user as any)._id?.toString?.() ?? (user as any).id;
    await this.usersService.updateLastLogin(userId);

    const token = this.generateToken(userId, user.name);
    this.logger.log(`[Login] Token generated for userId: ${userId}`);

    return {
      success: true,
      message: 'Login successful',
      data: {
        user: new UserResponseDto(user),
        token,
      },
    };
  }

  async getUserProfile(userId: string) {
    const user = await this.usersService.findOne(userId);
    return {
      success: true,
      data: new UserResponseDto(user),
    };
  }

  async validateToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.usersService.findOne(decoded.sub);

      return {
        success: true,
        valid: true,
        data: {
          user: new UserResponseDto(user),
        },
      };
    } catch {
      return {
        success: false,
        valid: false,
        data: {
          user: null,
        },
      };
    }
  }

  async getUserFromToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.usersService.findOne(decoded.sub);
      return this.usersService.sanitizeUser(user);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private generateToken(userId: string, name: string): string {
    const payload = { sub: userId, name };
    return this.jwtService.sign(payload);
  }
}
