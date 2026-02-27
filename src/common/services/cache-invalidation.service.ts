import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type Redis from 'ioredis';

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);
  private redis: Redis | null = null;

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    // Access underlying Redis client for pattern operations
    try {
      const store =
        (this.cacheManager as any).store ||
        (this.cacheManager as any).stores?.[0];
      this.redis =
        store?.client || store?.getClient?.() || store?.store?.client;

      if (!this.redis) {
        this.logger.warn(
          'Redis client not available - pattern operations will be limited',
        );
      }
    } catch (error) {
      this.logger.warn('Could not access Redis client:', error.message);
    }
  }

  /**
   * Recipe Invalidation Rules
   */
  async invalidateRecipe(recipeId: string, userId: string): Promise<void> {
    const keysToDelete: string[] = [
      // Specific recipe
      `recipes:detail:${recipeId}:public:v1`,

      // User's recipe list
      `users:recipes:${userId}:list:v1`,
    ];

    // Find pattern-based keys
    const listKeys = await this.findKeysByPattern('recipes:list:*');
    const trendingKeys = await this.findKeysByPattern('recipes:trending:*');
    const searchKeys = await this.findKeysByPattern('search:recipes:*');

    keysToDelete.push(...listKeys, ...trendingKeys, ...searchKeys);

    await this.deleteKeys(keysToDelete);
    this.logger.debug(
      `Invalidated ${keysToDelete.length} cache keys for recipe ${recipeId}`,
    );
  }

  /**
   * User Profile Invalidation Rules
   */
  async invalidateUserProfile(userId: string): Promise<void> {
    const keysToDelete = [
      // Profile data
      `users:profile:${userId}:stats:v1`,
      `users:profile:${userId}:followers:v1`,
      `users:profile:${userId}:following:v1`,

      // User's recipes (profile changes might affect display)
      `users:recipes:${userId}:list:v1`,
    ];

    await this.deleteKeys(keysToDelete);
    this.logger.debug(`Invalidated cache keys for user profile ${userId}`);
  }

  /**
   * Post/Feed Invalidation Rules
   */
  async invalidatePost(postId: string, authorId: string): Promise<void> {
    const keysToDelete = [
      // Specific post
      `posts:detail:${postId}:public:v1`,

      // Author's posts
      `posts:list:${authorId}:v1`,
    ];

    // Find feed keys
    const feedKeys = await this.findKeysByPattern('posts:feed:*');
    const newsfeedKeys = await this.findKeysByPattern('posts:newsfeed:*');

    keysToDelete.push(...feedKeys, ...newsfeedKeys);

    await this.deleteKeys(keysToDelete);
    this.logger.debug(
      `Invalidated ${keysToDelete.length} cache keys for post ${postId}`,
    );
  }

  /**
   * Follow/Unfollow Invalidation Rules
   */
  async invalidateFollowRelationship(
    userId: string,
    targetUserId: string,
  ): Promise<void> {
    const keysToDelete = [
      // Both users' follower/following counts
      `users:profile:${userId}:stats:v1`,
      `users:profile:${targetUserId}:stats:v1`,

      // Follower/following lists
      `users:profile:${userId}:following:v1`,
      `users:profile:${targetUserId}:followers:v1`,

      // Feeds (following affects what appears in feed)
      ...(await this.findKeysByPattern(`posts:feed:${userId}:*`)),
    ];

    await this.deleteKeys(keysToDelete);
    this.logger.debug(
      `Invalidated cache keys for follow relationship ${userId} -> ${targetUserId}`,
    );
  }

  /**
   * Like Invalidation Rules
   */
  async invalidateLike(postId: string, recipeId?: string): Promise<void> {
    const keysToDelete = [
      // Post/recipe detail (like count changed)
      `posts:detail:${postId}:public:v1`,
    ];

    if (recipeId) {
      keysToDelete.push(`recipes:detail:${recipeId}:public:v1`);
    }

    await this.deleteKeys(keysToDelete);
  }

  /**
   * Helper: Find keys by pattern
   */
  private async findKeysByPattern(pattern: string): Promise<string[]> {
    if (!this.redis) {
      this.logger.warn('Redis client not available for pattern search');
      return [];
    }

    try {
      const keys: string[] = [];
      let cursor = '0';

      do {
        const [newCursor, foundKeys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = newCursor;
        keys.push(...foundKeys);
      } while (cursor !== '0');

      return keys;
    } catch (error) {
      this.logger.error(`Error finding keys by pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Helper: Delete multiple keys
   */
  private async deleteKeys(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    try {
      // Delete keys individually (cache-manager doesn't support batch delete)
      await Promise.all(keys.map((key) => this.cacheManager.del(key)));
    } catch (error) {
      this.logger.error(`Error deleting cache keys:`, error);
    }
  }

  /**
   * Nuclear option: Clear all caches
   * Use only in development or emergencies
   */
  async clearAllCaches(): Promise<void> {
    if (!this.redis) {
      this.logger.warn('Redis client not available for flush');
      return;
    }

    try {
      await this.redis.flushdb();
      this.logger.warn('All caches cleared');
    } catch (error) {
      this.logger.error('Error clearing all caches:', error);
    }
  }
}
