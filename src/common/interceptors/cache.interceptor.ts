import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  SetMetadata,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Reflector } from '@nestjs/core';

// Decorator metadata keys
export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';

// Decorators
export const CacheKey = (key: string) => SetMetadata(CACHE_KEY_METADATA, key);
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_METADATA, ttl);

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const cacheKey = this.reflector.get<string>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    );

    if (!cacheKey) {
      // No cache key = skip caching
      return next.handle();
    }

    const ttl =
      this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler()) ||
      300; // Default 5 minutes

    // Check cache
    const cachedValue = await this.cacheManager.get(cacheKey);

    if (cachedValue !== null && cachedValue !== undefined) {
      // Cache hit
      return of(cachedValue);
    }

    // Cache miss - execute handler and cache result
    return next.handle().pipe(
      tap(async (response) => {
        if (response) {
          try {
            await this.cacheManager.set(cacheKey, response, ttl);
          } catch (error) {
            // Fail silently - cache is optional
            console.error('Cache set failed:', error);
          }
        }
      }),
    );
  }
}
