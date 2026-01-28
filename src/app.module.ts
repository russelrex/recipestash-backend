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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const mongoUri =
          configService.get<string>('MONGODB_URI') ??
          configService.get<string>('MONGODB_URL');

        if (!mongoUri) {
          throw new Error('MONGODB_URI or MONGODB_URL environment variable is required');
        }

        return {
          uri: mongoUri,
          dbName: 'recipestash',
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
    AuthModule,
    UsersModule,
    RecipesModule,
    PostsModule,
    FollowsModule,
  ],
})
export class AppModule {}
