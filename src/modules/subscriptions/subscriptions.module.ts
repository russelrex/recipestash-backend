import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PaymentService } from './payment.service';
import { SubscriptionsCron } from './subscriptions.cron';
import { User, UserSchema } from '../users/entities/user.entity';
import { Payment, PaymentSchema } from './entities/payment.entity';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, PaymentService, SubscriptionsCron],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}

