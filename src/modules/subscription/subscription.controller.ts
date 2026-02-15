import {
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionService } from './subscription.service';

@Controller('cron')
export class SubscriptionController {
  constructor(
    private subscriptionService: SubscriptionService,
    private configService: ConfigService,
  ) {}

  @Get('subscription-check')
  async manualSubscriptionCheck(@Headers('authorization') auth: string) {
    // Verify cron secret
    const cronSecret = this.configService.get('CRON_SECRET');

    if (cronSecret) {
      const expectedAuth = `Bearer ${cronSecret}`;
      if (auth !== expectedAuth) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
    } else {
      console.warn(
        '⚠️ CRON_SECRET not set - allowing manual trigger without auth',
      );
    }

    console.log('🔄 Running manual subscription check...');

    const expiredCount =
      await this.subscriptionService.checkExpiredSubscriptions();
    const reminderStats =
      await this.subscriptionService.sendUpcomingExpiryReminders();

    return {
      success: true,
      expiredCount,
      reminderStats,
      timestamp: new Date().toISOString(),
    };
  }
}
