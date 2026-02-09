import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheInvalidationService } from '../services/cache-invalidation.service';
import { CacheSyncService } from '../services/cache-sync.service';
import { SafeCacheService } from '../services/safe-cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        // Check if Redis is configured (Railway uses REDIS_URL or REDIS_PRIVATE_URL)
        const redisUrl = 
          process.env.REDIS_URL || 
          process.env.REDIS_PRIVATE_URL ||
          configService.get<string>('REDIS_URL') ||
          configService.get<string>('REDIS_PRIVATE_URL');

        // If no Redis, use in-memory cache
        if (!redisUrl) {
          console.log('⚠️  Redis not configured - using in-memory cache');
          console.log('💡 To enable Redis caching:');
          console.log('   1. Add Redis database in Railway');
          console.log('   2. Railway will auto-create REDIS_URL variable');
          console.log('   3. Restart this service');
          
          return {
            ttl: 300, // 5 minutes
            max: 100, // Max 100 items in memory
          };
        }

        // Try to connect to Redis
        try {
          console.log('🔌 Attempting to connect to Redis...');
          
          // Dynamic import to avoid crashes if redis not installed
          const { redisStore } = await import('cache-manager-redis-yet');
          
          const store = await redisStore({
            url: redisUrl,
            ttl: 300,
            // Connection options with retry strategy
            socket: {
              connectTimeout: 5000,
              reconnectStrategy: (retries: number) => {
                // Stop trying after 3 attempts
                if (retries > 3) {
                  console.warn('⚠️  Redis connection failed after 3 retries, using in-memory cache');
                  return false; // Stop retrying
                }
                // Retry after 1 second
                return 1000;
              },
            },
          });

          console.log('✅ Redis connected successfully');
          
          return {
            store,
            ttl: 300,
          };
        } catch (error: any) {
          console.warn('⚠️  Redis connection failed:', error.message);
          console.warn('⚠️  Falling back to in-memory cache');
          
          // Fallback to in-memory cache
          return {
            ttl: 300,
            max: 100,
          };
        }
      },
    }),
  ],
  providers: [CacheInvalidationService, CacheSyncService, SafeCacheService],
  exports: [NestCacheModule, CacheInvalidationService, CacheSyncService, SafeCacheService],
})
export class CacheModule {}
