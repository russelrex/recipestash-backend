import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class SubscriptionCron {
  constructor(private subscriptionService: SubscriptionService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT) // Runs at 00:00 daily
  async handleSubscriptionCheck() {
    console.log('🔄 Running subscription check cron job...');

    try {
      // Check expired subscriptions
      const expiredCount =
        await this.subscriptionService.checkExpiredSubscriptions();

      // Send renewal reminders
      const reminderStats =
        await this.subscriptionService.sendUpcomingExpiryReminders();

      console.log('✅ Cron job completed', {
        expiredCount,
        reminderStats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Cron job error:', error);
    }
  }

  // Optional: Run at noon as well for higher frequency
  @Cron(CronExpression.EVERY_DAY_AT_NOON)
  async handleMidDayCheck() {
    console.log('🔄 Running mid-day subscription check...');

    try {
      const expiredCount =
        await this.subscriptionService.checkExpiredSubscriptions();
      console.log(`✅ Mid-day check: ${expiredCount} subscriptions expired`);
    } catch (error) {
      console.error('❌ Mid-day check error:', error);
    }
  }
}
