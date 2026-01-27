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
    // eslint-disable-next-line no-console
    console.log('AuthService.register called with:', registerDto);
    const existingUser = await this.usersService.findByName(registerDto.name);

    if (existingUser) {
      throw new ConflictException('User with this name already exists');
    }

    const user = await this.usersService.create(registerDto);
    // eslint-disable-next-line no-console
    console.log('AuthService.register created user:', user);
    const token = this.generateToken(user._id, user.name);

    return {
      success: true,
      message: 'Registration successful',
      data: {
        user: this.usersService.sanitizeUser(user),
        token,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.validateUser(loginDto.name);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.usersService.updateLastLogin(user._id);

    const token = this.generateToken(user._id, user.name);

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
      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findOne(payload.sub);

      return {
        success: true,
        data: {
          user: this.usersService.sanitizeUser(user),
        },
      };
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private generateToken(userId: string, name: string): string {
    const payload = { sub: userId, name };
    return this.jwtService.sign(payload);
  }
}

