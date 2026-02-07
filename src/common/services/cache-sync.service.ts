import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import Redis from 'ioredis';
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
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

    try {
      const redisConfig: any = {
        host: redisHost,
        port: redisPort,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      };

      if (redisPassword) {
        redisConfig.password = redisPassword;
      }

      // Create separate connections for pub/sub
      this.publisher = new Redis(redisConfig);
      this.subscriber = new Redis(redisConfig);

      // Subscribe to invalidation events
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
            this.logger.error('Error processing cache invalidation message:', error);
          }
        }
      });

      this.logger.log('Cache sync service initialized');
    } catch (error) {
      this.logger.warn('Failed to initialize cache sync service:', error.message);
      // Continue without pub/sub - single instance will work fine
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
      await this.publisher.publish(
        this.CHANNEL,
        JSON.stringify({ key })
      );
    } catch (error) {
      this.logger.error(`Error publishing invalidation for ${key}:`, error);
    }
  }

  async publishPatternInvalidation(pattern: string): Promise<void> {
    if (!this.publisher) {
      return;
    }

    try {
      await this.publisher.publish(
        this.CHANNEL,
        JSON.stringify({ pattern })
      );
    } catch (error) {
      this.logger.error(`Error publishing pattern invalidation for ${pattern}:`, error);
    }
  }

  private async deleteByPattern(pattern: string): Promise<void> {
    // This would need access to Redis client
    // For now, just log - actual deletion handled by CacheInvalidationService
    this.logger.debug(`Pattern invalidation requested: ${pattern}`);
  }
}
