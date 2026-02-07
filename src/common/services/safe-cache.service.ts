import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

/**
 * Wrapper around cache-manager with fallback
 * If Redis is down, degrades gracefully to database-only
 */
@Injectable()
export class SafeCacheService {
  private readonly logger = new Logger(SafeCacheService.name);
  private isRedisAvailable = true;

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    this.checkRedisHealth();
  }

  /**
   * Get from cache with fallback
   */
  async get<T>(key: string): Promise<T | undefined> {
    if (!this.isRedisAvailable) {
      return undefined; // Skip cache, fetch from DB
    }

    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      this.logger.error(`Cache GET failed for ${key}: ${error.message}`);
      this.isRedisAvailable = false;
      this.scheduleHealthCheck();
      return undefined;
    }
  }

  /**
   * Set in cache with fallback
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.isRedisAvailable) {
      return; // Skip cache, data still in DB
    }

    try {
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      this.logger.error(`Cache SET failed for ${key}: ${error.message}`);
      this.isRedisAvailable = false;
      this.scheduleHealthCheck();
    }
  }

  /**
   * Delete from cache with fallback
   */
  async del(key: string): Promise<void> {
    if (!this.isRedisAvailable) {
      return; // No cache to delete from
    }

    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.error(`Cache DEL failed for ${key}: ${error.message}`);
      this.isRedisAvailable = false;
      this.scheduleHealthCheck();
    }
  }

  /**
   * Check Redis health on startup
   */
  private async checkRedisHealth(): Promise<void> {
    try {
      await this.cacheManager.set('health:check', true, 10);
      await this.cacheManager.get('health:check');
      this.isRedisAvailable = true;
      this.logger.log('Redis connection healthy');
    } catch (error) {
      this.isRedisAvailable = false;
      this.logger.warn('Redis connection failed, running without cache');
    }
  }

  /**
   * Schedule periodic health check
   */
  private scheduleHealthCheck(): void {
    setTimeout(() => {
      this.checkRedisHealth();
    }, 30000); // Check again in 30 seconds
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.isRedisAvailable;
  }
}
