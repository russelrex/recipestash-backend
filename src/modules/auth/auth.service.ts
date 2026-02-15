import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    try {
      const user = await this.usersService.create(
        registerDto.name,
        registerDto.email,
        registerDto.password,
      );

      const userId = (user as any)._id?.toString?.() ?? (user as any).id;
      const payload = { sub: userId, email: user.email, name: user.name };
      const token = this.generateToken(userId, user.name);

      return {
        success: true,
        message: 'Registration successful',
        data: {
          user: this.usersService.sanitizeUser(user),
          token,
        },
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new ConflictException('Registration failed');
    }
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      user,
      loginDto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const userId = (user as any)._id?.toString?.() ?? (user as any).id;
    await this.usersService.updateLastLogin(userId);

    const payload = { sub: userId, email: user.email, name: user.name };
    const token = this.generateToken(userId, user.name);

    return {
      success: true,
      message: 'Login successful',
      data: {
        user: this.usersService.sanitizeUser(user),
        token,
      },
    };
  }

  async getUserProfile(userId: string) {
    const user = await this.usersService.findOne(userId);
    return {
      success: true,
      data: this.usersService.sanitizeUser(user),
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
          user: this.usersService.sanitizeUser(user),
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
