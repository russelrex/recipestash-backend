// import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { PassportStrategy } from '@nestjs/passport';
// import { ExtractJwt, Strategy } from 'passport-jwt';
// import { UsersService } from '../../users/users.service';

// @Injectable()
// export class JwtStrategy extends PassportStrategy(Strategy) {
//   constructor(private usersService: UsersService) {
//     // eslint-disable-next-line no-console
//     console.log('[JwtStrategy] env snapshot', {
//       jwtSecretDefined: !!process.env.JWT_SECRET,
//       jwtSecretPreview: process.env.JWT_SECRET
//         ? process.env.JWT_SECRET.slice(0, 4) + '...'
//         : null,
//       nodeEnv: process.env.NODE_ENV ?? null,
//     });

//     super({
//       jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//       ignoreExpiration: false,
//       secretOrKey:
//         process.env.JWT_SECRET || 'your-secret-key-change-in-production',
//     });
//   }

//   async validate(payload: any) {
//     if (!payload || !payload.sub) {
//       throw new UnauthorizedException('Invalid token payload');
//     }
    
//     try {
//       const user = await this.usersService.findOne(payload.sub);
//       if (!user) {
//         throw new UnauthorizedException('User not found');
//       }
//       return { userId: payload.sub, name: payload.name };
//     } catch (error) {
//       if (error instanceof UnauthorizedException) {
//         throw error;
//       }
//       throw new UnauthorizedException('Failed to validate user');
//     }
//   }
// }

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'your-secret-key'),
    });
  }

  async validate(payload: any) {
    // eslint-disable-next-line no-console
    console.log('[JwtStrategy] validate', {
      payload,
    });
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }
    
    try {
    const user = await this.usersService.findOne(payload.sub);
      // eslint-disable-next-line no-console
      console.log('[JwtStrategy] user', {
        user,
      });
    if (!user) {
        throw new UnauthorizedException('User not found');
    }
      return {
        userId: payload.sub,
        email: user.email,
        name: user.name,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Failed to validate user');
  }
}
}
