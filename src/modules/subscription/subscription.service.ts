import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/entities/user.entity';
import {
  SubscriptionReminder,
  SubscriptionReminderDocument,
} from './schemas/subscription-reminder.schema';
import { EmailService } from '../email/email.service';
import { addDays, differenceInDays } from 'date-fns';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(SubscriptionReminder.name)
    private reminderModel: Model<SubscriptionReminderDocument>,
    private emailService: EmailService,
  ) {}

  async checkExpiredSubscriptions() {
    const now = new Date();

    // Find expired subscriptions
    const expiredUsers = await this.userModel.find({
      plan: 'premium',
      subscriptionEndsAt: { $lte: now },
    });

    console.log(`⏰ Found ${expiredUsers.length} expired subscriptions`);

    // Downgrade to free
    for (const user of expiredUsers) {
      await this.userModel.findByIdAndUpdate(user._id, {
        plan: 'free',
        subscriptionStatus: 'expired',
      });

      // Send expiry notification
      await this.emailService.sendExpiryNotification(
        user.email,
        user.name || 'there',
      );

      console.log(`📧 Downgraded user ${user._id} to free plan`);
    }

    return expiredUsers.length;
  }

  async sendUpcomingExpiryReminders() {
    const now = new Date();
    const sevenDaysFromNow = addDays(now, 7);
    const oneDayFromNow = addDays(now, 1);

    // Find users expiring in 7 days
    const usersExpiring7Days = await this.userModel.find({
      plan: 'premium',
      subscriptionEndsAt: {
        $gte: now,
        $lte: sevenDaysFromNow,
      },
    });

    // Find users expiring in 1 day
    const usersExpiring1Day = await this.userModel.find({
      plan: 'premium',
      subscriptionEndsAt: {
        $gte: now,
        $lte: oneDayFromNow,
      },
    });

    let sevenDayRemindersSent = 0;
    let oneDayRemindersSent = 0;

    // Send 7-day reminders
    for (const user of usersExpiring7Days) {
      const alreadySent = await this.reminderModel.findOne({
        userId: user._id,
        type: '7_days',
        subscriptionEndsAt: user.subscriptionEndsAt,
      });

      if (!alreadySent) {
        const daysRemaining = user.subscriptionEndsAt
          ? differenceInDays(user.subscriptionEndsAt, now)
          : 7;

        if (!user.subscriptionEndsAt) continue;

        await this.emailService.sendRenewalReminder(
          user.email,
          user.name || 'there',
          user.subscriptionEndsAt,
          daysRemaining,
        );

        await this.reminderModel.create({
          userId: user._id,
          type: '7_days',
          subscriptionEndsAt: user.subscriptionEndsAt,
        });

        sevenDayRemindersSent++;
        console.log(`📧 Sent 7-day reminder to ${user.email}`);
      }
    }

    // Send 1-day reminders
    for (const user of usersExpiring1Day) {
      const alreadySent = await this.reminderModel.findOne({
        userId: user._id,
        type: '1_day',
        subscriptionEndsAt: user.subscriptionEndsAt,
      });

      if (!alreadySent) {
        if (!user.subscriptionEndsAt) continue;

        await this.emailService.sendRenewalReminder(
          user.email,
          user.name || 'there',
          user.subscriptionEndsAt,
          1,
        );

        await this.reminderModel.create({
          userId: user._id,
          type: '1_day',
          subscriptionEndsAt: user.subscriptionEndsAt,
        });

        // Update status
        await this.userModel.findByIdAndUpdate(user._id, {
          subscriptionStatus: 'expiring_soon',
        });

        oneDayRemindersSent++;
        console.log(`📧 Sent 1-day reminder to ${user.email}`);
      }
    }

    return {
      sevenDayReminders: sevenDayRemindersSent,
      oneDayReminders: oneDayRemindersSent,
    };
  }
}
