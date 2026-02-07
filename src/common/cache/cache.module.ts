import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheInvalidationService } from '../services/cache-invalidation.service';
import { CacheSyncService } from '../services/cache-sync.service';
import { SafeCacheService } from '../services/safe-cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get<string>('REDIS_PASSWORD');
        const redisDb = configService.get<number>('REDIS_DB', 0);

        try {
          return {
            store: await redisStore({
              socket: {
                host: redisHost,
                port: redisPort,
              },
              password: redisPassword || undefined,
              database: redisDb,
              ttl: 60 * 5, // Default TTL: 5 minutes
            }),
            isGlobal: true,
          };
        } catch (error) {
          console.warn('Redis connection failed, using in-memory cache:', error.message);
          // Fallback to in-memory cache if Redis is unavailable
          return {
            ttl: 60 * 5,
            isGlobal: true,
          };
        }
      },
    }),
  ],
  providers: [CacheInvalidationService, CacheSyncService, SafeCacheService],
  exports: [NestCacheModule, CacheInvalidationService, CacheSyncService, SafeCacheService],
})
export class CacheModule {}
