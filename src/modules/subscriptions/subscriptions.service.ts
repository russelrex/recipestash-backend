import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/entities/user.entity';
import { Payment, PaymentDocument } from './entities/payment.entity';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
  ) {}

  async getSubscription(userId: string) {
    console.log('📊 [SubscriptionsService] Getting subscription for:', userId);

    const user = await this.userModel.findById(userId).lean();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const payments = await this.paymentModel
      .find({ userId: userId as any })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const subscription = {
      plan: (user as any).plan || 'free',
      subscriptionEndsAt: (user as any).subscriptionEndsAt || null,
      subscriptionStatus: (user as any).subscriptionStatus || 'inactive',
    };

    console.log('✅ [SubscriptionsService] Subscription:', subscription);

    return {
      subscription,
      payments: this.mapPayments(payments),
    };
  }

  async getPaymentHistory(userId: string) {
    const payments = await this.paymentModel
      .find({ userId: userId as any })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return this.mapPayments(payments);
  }

  private mapPayments(payments: PaymentDocument[] | any[]) {
    return payments.map((p) => {
      const doc = p as any;
      return {
        id: doc._id.toString(),
        userId: doc.userId.toString(),
        provider: doc.provider,
        checkoutSessionId: doc.checkoutSessionId,
        amount: doc.amount,
        currency: doc.currency,
        status: doc.status,
        purpose: doc.purpose,
        createdAt: doc.createdAt?.toISOString(),
        paidAt: doc.paidAt?.toISOString(),
      };
    });
  }

  async activatePremium(userId: string, durationMonths: number = 1) {
    this.logger.log(`💎 Activating premium for user: ${userId}`);

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setMonth(endsAt.getMonth() + durationMonths);

    (user as any).plan = 'premium';
    (user as any).subscriptionEndsAt = endsAt;
    (user as any).subscriptionStatus = 'active';

    await user.save();

    this.logger.log(`✅ Premium activated until: ${endsAt}`);

    return {
      plan: (user as any).plan,
      subscriptionEndsAt: (user as any).subscriptionEndsAt.toISOString(),
      subscriptionStatus: (user as any).subscriptionStatus,
    };
  }

  async canCreateRecipe(
    userId: string,
  ): Promise<{ allowed: boolean; message?: string }> {
    console.log('🔍 [SubscriptionsService] Checking recipe creation limit');

    const user = await this.userModel.findById(userId);
    if (!user) {
      return { allowed: false, message: 'User not found' };
    }

    if (
      (user as any).plan === 'premium' &&
      (user as any).subscriptionStatus === 'active'
    ) {
      console.log('✅ Premium user - unlimited recipes');
      return { allowed: true };
    }

    const recipeCount = await this.getRecipeCount(userId);
    console.log('📊 Recipe count:', recipeCount);

    if (recipeCount >= 10) {
      console.log('❌ Recipe limit reached');
      return {
        allowed: false,
        message:
          'You have reached the maximum of 10 recipes for free users. Please upgrade to Premium for unlimited recipes.',
      };
    }

    return { allowed: true };
  }

  private async getRecipeCount(userId: string): Promise<number> {
    const recipesCollection = this.userModel.db.collection('recipes');
    return recipesCollection.countDocuments({ ownerId: userId });
  }

  async updateSubscriptionStatuses() {
    this.logger.log('🔄 [SubscriptionsService] Updating subscription statuses');

    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    await this.userModel.updateMany(
      {
        plan: 'premium',
        subscriptionEndsAt: { $lt: now },
        subscriptionStatus: { $ne: 'expired' },
      },
      {
        $set: {
          subscriptionStatus: 'expired',
          plan: 'free',
        },
      },
    );

    await this.userModel.updateMany(
      {
        plan: 'premium',
        subscriptionEndsAt: { $lt: sevenDaysFromNow, $gte: now },
        subscriptionStatus: 'active',
      },
      {
        $set: {
          subscriptionStatus: 'expiring_soon',
        },
      },
    );

    this.logger.log('✅ [SubscriptionsService] Subscription statuses updated');
  }

  async markSubscriptionExpiringSoon(userId: string) {
    this.logger.log(`⚠️ Marking subscription as expiring soon: ${userId}`);

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    (user as any).subscriptionStatus = 'expiring_soon';
    await user.save();

    this.logger.log('✅ Subscription marked as expiring soon');
  }

  async cancelSubscription(userId: string) {
    this.logger.log(`❌ Canceling subscription for: ${userId}`);

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    (user as any).plan = 'free';
    (user as any).subscriptionStatus = 'inactive';
    (user as any).subscriptionEndsAt = new Date();

    await user.save();

    this.logger.log('✅ Subscription canceled and downgraded to free');
  }

  async expireSubscription(userId: string) {
    this.logger.log(`⏰ Expiring subscription for: ${userId}`);

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    (user as any).plan = 'free';
    (user as any).subscriptionStatus = 'expired';

    await user.save();

    this.logger.log('✅ Subscription expired and downgraded to free');
  }

  async scheduleSubscriptionEnd(userId: string, endDate: Date) {
    this.logger.log(
      `⏰ Scheduling subscription end for: ${userId} at ${endDate}`,
    );

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    (user as any).subscriptionEndsAt = endDate;
    (user as any).subscriptionStatus = 'expiring_soon';

    await user.save();

    this.logger.log('✅ Subscription end scheduled');
  }
}

