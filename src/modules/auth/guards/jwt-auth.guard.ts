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
      const reason =
        (info as any)?.message || (err as any)?.message || 'Unknown error';
      // "No auth token" is expected when the client hits a protected route without a token
      // (e.g. before attaching the new token after login). Log as debug to avoid noise.
      const isMissingToken =
        typeof reason === 'string' &&
        (reason.toLowerCase().includes('no auth token') ||
          reason.toLowerCase().includes('jwt must be provided') ||
          reason.toLowerCase().includes('authorization'));
      if (isMissingToken) {
        this.logger.debug(`Authentication failed (no token): ${reason}`);
      } else {
        this.logger.warn(`Authentication failed in JwtAuthGuard: ${reason}`);
      }
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
