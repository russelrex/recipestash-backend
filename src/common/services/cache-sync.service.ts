import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import type Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CacheSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheSyncService.name);
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private readonly CHANNEL = 'cache:invalidation';

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Check if Redis is available
    const redisUrl =
      process.env.REDIS_URL ||
      process.env.REDIS_PRIVATE_URL ||
      this.configService.get<string>('REDIS_URL') ||
      this.configService.get<string>('REDIS_PRIVATE_URL');

    if (!redisUrl) {
      this.logger.log('Redis sync service disabled - no REDIS_URL found');
      return; // Exit early, don't try to connect
    }

    try {
      // Dynamic import to avoid crashes if ioredis not installed
      // Use require for ioredis as it's a CommonJS module
      const RedisModule = require('ioredis');
      const RedisClass = RedisModule.default || RedisModule;

      // Parse Redis URL if provided, otherwise use host/port
      let redisConfig: any;

      if (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://')) {
        // Use URL directly
        redisConfig = {
          url: redisUrl,
          retryStrategy: (times: number) => {
            if (times > 3) {
              this.logger.warn(
                'Redis connection failed after 3 retries, disabling sync',
              );
              return false; // Stop retrying
            }
            return Math.min(times * 50, 2000);
          },
        };
      } else {
        // Use host/port configuration
        const redisHost = this.configService.get<string>(
          'REDIS_HOST',
          'localhost',
        );
        const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

        redisConfig = {
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          retryStrategy: (times: number) => {
            if (times > 3) {
              this.logger.warn(
                'Redis connection failed after 3 retries, disabling sync',
              );
              return false;
            }
            return Math.min(times * 50, 2000);
          },
        };
      }

      // Create separate connections for pub/sub
      this.publisher = new RedisClass(redisConfig);
      this.subscriber = new RedisClass(redisConfig);

      // Subscribe to invalidation events
      if (this.subscriber) {
        await this.subscriber.subscribe(this.CHANNEL);

        this.subscriber.on('message', async (channel, message) => {
          if (channel === this.CHANNEL) {
            try {
              const { key, pattern } = JSON.parse(message);

              if (key) {
                await this.cacheManager.del(key);
                this.logger.debug(`Invalidated cache key: ${key}`);
              } else if (pattern) {
                await this.deleteByPattern(pattern);
              }
            } catch (error) {
              this.logger.error(
                'Error processing cache invalidation message:',
                error,
              );
            }
          }
        });

        this.logger.log('Cache sync service initialized');
      }
    } catch (error: any) {
      this.logger.warn(
        'Failed to initialize cache sync service:',
        error.message,
      );
      this.logger.warn(
        'Continuing without Redis pub/sub - single instance will work fine',
      );
      // Don't throw - let app continue without Redis sync
    }
  }

  async onModuleDestroy() {
    if (this.publisher) {
      await this.publisher.quit();
    }
    if (this.subscriber) {
      await this.subscriber.quit();
    }
  }

  /**
   * Publish invalidation event to all instances
   */
  async publishInvalidation(key: string): Promise<void> {
    if (!this.publisher) {
      return; // Pub/sub not available, skip
    }

    try {
      await this.publisher.publish(this.CHANNEL, JSON.stringify({ key }));
    } catch (error) {
      this.logger.error(`Error publishing invalidation for ${key}:`, error);
    }
  }

  async publishPatternInvalidation(pattern: string): Promise<void> {
    if (!this.publisher) {
      return;
    }

    try {
      await this.publisher.publish(this.CHANNEL, JSON.stringify({ pattern }));
    } catch (error) {
      this.logger.error(
        `Error publishing pattern invalidation for ${pattern}:`,
        error,
      );
    }
  }

  private async deleteByPattern(pattern: string): Promise<void> {
    // This would need access to Redis client
    // For now, just log - actual deletion handled by CacheInvalidationService
    this.logger.debug(`Pattern invalidation requested: ${pattern}`);
  }
}
