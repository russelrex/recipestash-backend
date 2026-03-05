import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      this.logger.warn(
        `Authentication failed in JwtAuthGuard: ${
          (info as any)?.message || (err as any)?.message || 'Unknown error'
        }`,
      );
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
