import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

async function bootstrap() {
  // Log startup info
  console.log('🚀 Starting RecipeStash Backend...');
  console.log('📍 NODE_ENV:', process.env.NODE_ENV || 'development');
  console.log('📍 PORT:', process.env.PORT || 3000);

  const app = await NestFactory.create(AppModule);

  // Increase body size limit for file uploads (10MB)
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Enable CORS for mobile app
  app.enableCors({
    origin: '*', // Allow all
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  // CRITICAL: Use Railway's PORT and bind to 0.0.0.0
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`✅ Application is running on http://0.0.0.0:${port}/api`);
  console.log(`📸 Upload endpoint: http://0.0.0.0:${port}/api/recipes/upload-image`);
}

bootstrap().catch((error) => {
  console.error('❌ Application failed to start:', error);
  process.exit(1);
});

