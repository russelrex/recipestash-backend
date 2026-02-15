import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { SubscriptionService } from './subscription.service';
import { SubscriptionCron } from './subscription.cron';
import { SubscriptionController } from './subscription.controller';
import { User, UserSchema } from '../users/entities/user.entity';
import {
  SubscriptionReminder,
  SubscriptionReminderSchema,
} from './schemas/subscription-reminder.schema';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: SubscriptionReminder.name, schema: SubscriptionReminderSchema },
    ]),
    ScheduleModule.forRoot(),
    EmailModule,
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionCron],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
