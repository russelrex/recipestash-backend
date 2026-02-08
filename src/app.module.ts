import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RecipesModule } from './modules/recipes/recipes.module';
import { PostsModule } from './modules/posts/posts.module';
import { FollowsModule } from './modules/follows/follows.module';
import { AppConfigModule } from './modules/config/config.module';
import { S3Module } from './common/services/s3.module';
import { CacheModule } from './common/cache/cache.module';
import { AppController } from './app.controller';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // In production (Railway), read from environment variables directly
      // In development, also try .env.local file
      envFilePath: process.env.NODE_ENV === 'production' ? undefined : '.env.local',
      // Always load from process.env (Railway sets these directly)
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // Check both MONGODB_URL and MONGODB_URI (Railway might use either)
        const mongoUri =
          configService.get<string>('MONGODB_URL') ||
          configService.get<string>('MONGODB_URI') ||
          process.env.MONGODB_URL ||
          process.env.MONGODB_URI ||
          null;

        if (!mongoUri) {
          // Log available env vars for debugging (without sensitive data)
          const envKeys = Object.keys(process.env).filter(key => 
            key.toUpperCase().includes('MONGO') || key.toUpperCase().includes('DATABASE')
          );
          console.error('MongoDB connection error - Available MongoDB-related env vars:', envKeys);
          throw new Error(
            'MONGODB_URI or MONGODB_URL environment variable is required. ' +
            'Please set one of these variables in your Railway environment settings.'
          );
        }

        const dbName = 
          configService.get<string>('MONGODB_NAME') ||
          process.env.MONGODB_NAME ||
          '';

        console.log('MongoDB connection configured:', {
          uri: mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'), // Hide credentials in logs
          dbName: dbName || '(default)',
        });

        return {
          uri: mongoUri,
          dbName: dbName,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          connectTimeoutMS: 10000,
          maxPoolSize: 10,
          minPoolSize: 2,
          heartbeatFrequencyMS: 10000,
        };
      },
      inject: [ConfigService],
    }),
    CacheModule,
    S3Module,
    AuthModule,
    UsersModule,
    RecipesModule,
    PostsModule,
    FollowsModule,
    AppConfigModule,
  ],
})
export class AppModule {}
