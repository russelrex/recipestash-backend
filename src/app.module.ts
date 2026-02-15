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
import { BillingModule } from './modules/billing/billing.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { PaymongoModule } from './modules/paymongo/paymongo.module';
import { EmailModule } from './modules/email/email.module';
import { AppController } from './app.controller';

@Module({
  controllers: [AppController],
  imports: [
    // CRITICAL FIX: ConfigModule must load environment variables properly for Railway
    ConfigModule.forRoot({
      isGlobal: true,
      // Railway uses environment variables directly, not .env files
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      // Ensure all environment variables are loaded
      cache: false,
      expandVariables: true,
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        // Log all available environment variables (for debugging)
        console.log('🔍 Environment Check:');
        console.log('NODE_ENV:', process.env.NODE_ENV);
        console.log('Available MongoDB variables:');
        console.log(
          '- MONGODB_URL:',
          process.env.MONGODB_URL ? '✓ SET' : '✗ NOT SET',
        );
        console.log(
          '- MONGODB_URI:',
          process.env.MONGODB_URI ? '✓ SET' : '✗ NOT SET',
        );
        console.log(
          '- MONGO_URL:',
          process.env.MONGO_URL ? '✓ SET' : '✗ NOT SET',
        );
        console.log(
          '- MONGODB_NAME:',
          process.env.MONGODB_NAME ? '✓ SET' : '✗ NOT SET',
        );

        // Try multiple variable names for compatibility
        const mongoUrl =
          process.env.MONGODB_URL ||
          process.env.MONGODB_URI ||
          process.env.MONGO_URL ||
          configService.get<string>('MONGODB_URL') ||
          configService.get<string>('MONGODB_URI') ||
          configService.get<string>('MONGO_URL');

        const dbName =
          process.env.MONGODB_NAME ||
          configService.get<string>('MONGODB_NAME') ||
          'recipestash';

        if (!mongoUrl) {
          const availableVars = Object.keys(process.env)
            .filter((key) => key.includes('MONGO') || key.includes('DATABASE'))
            .join(', ');

          console.error('❌ MongoDB connection failed');
          console.error(
            'Available database-related vars:',
            availableVars || 'NONE',
          );

          throw new Error(
            'MONGODB_URL environment variable is required. ' +
              'Please set it in Railway dashboard: Settings → Variables → Add Variable',
          );
        }

        console.log('✓ MongoDB URL found', mongoUrl);
        console.log('✓ Database name:', dbName);

        return {
          uri: mongoUrl,
          dbName: dbName,
          serverSelectionTimeoutMS: 10000,
          socketTimeoutMS: 45000,
          connectTimeoutMS: 10000,
          maxPoolSize: 10,
          minPoolSize: 2,
          heartbeatFrequencyMS: 10000,
          retryWrites: true,
          retryReads: true,
        };
      },
    }),
    CacheModule,
    S3Module,
    AuthModule,
    UsersModule,
    RecipesModule,
    PostsModule,
    FollowsModule,
    AppConfigModule,
    BillingModule,
    SubscriptionModule,
    PaymongoModule,
    EmailModule,
  ],
})
export class AppModule {}
