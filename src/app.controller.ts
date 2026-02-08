import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getIndex() {
    return {
      success: true,
      message: 'RecipeStash Backend is working!',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  getHealth() {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  // Debug endpoint - REMOVE IN PRODUCTION for security
  @Get('debug-env')
  getEnvDebug() {
    return {
      nodeEnv: process.env.NODE_ENV,
      hasMongoUrl: !!process.env.MONGODB_URL,
      hasMongoUri: !!process.env.MONGODB_URI,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasMongoName: !!process.env.MONGODB_NAME,
      port: process.env.PORT,
      allEnvKeys: Object.keys(process.env).filter(
        key => !key.startsWith('npm_') && !key.startsWith('PATH') && !key.startsWith('HOME')
      ).sort(),
    };
  }
}
