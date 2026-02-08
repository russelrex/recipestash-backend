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
}
