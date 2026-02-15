import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { User, UserDocument } from '../users/entities/user.entity';
import { PaymongoService } from '../paymongo/paymongo.service';
import { EmailService } from '../email/email.service';
import { addDays } from 'date-fns';

@Injectable()
export class BillingService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private paymongoService: PaymongoService,
    private emailService: EmailService,
  ) {}

  async createCheckout(userId: string, userEmail: string) {
    // 1. Create pending payment record
    const payment = await this.paymentModel.create({
      userId: new Types.ObjectId(userId),
      amount: 9900, // ₱99.00 in centavos
      currency: 'PHP',
      status: 'pending',
      purpose: 'subscription_monthly',
    });

    // 2. Create PayMongo checkout session
    const checkout = await this.paymongoService.createCheckoutSession({
      userId,
      userEmail,
      amountPhp: 99,
      paymentId: payment._id.toString(),
    });

    // 3. Update payment with checkout session ID
    payment.checkoutSessionId = checkout.checkoutSessionId;
    payment.metadata = checkout.metadata;
    await payment.save();

    return {
      checkoutUrl: checkout.checkoutUrl,
      paymentId: payment._id.toString(),
      checkoutSessionId: checkout.checkoutSessionId,
    };
  }

  async handleWebhookPaymentSuccess(checkoutSessionId: string) {
    // 1. Find payment record
    const payment = await this.paymentModel.findOne({ checkoutSessionId });

    if (!payment) {
      throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
    }

    // 2. Idempotency check
    if (payment.status === 'paid') {
      console.log('✅ Payment already processed:', payment._id);
      return { success: true, message: 'Already processed' };
    }

    // 3. Calculate subscription end date (30 days from now)
    const subscriptionEndsAt = addDays(new Date(), 30);

    // 4. Update payment and user in transaction
    const session = await this.paymentModel.db.startSession();
    session.startTransaction();

    try {
      // Mark payment as paid
      payment.status = 'paid';
      payment.paidAt = new Date();
      await payment.save({ session });

      // Activate subscription
      await this.userModel.findByIdAndUpdate(
        payment.userId,
        {
          plan: 'premium',
          subscriptionEndsAt,
          subscriptionStatus: 'active',
        },
        { session },
      );

      await session.commitTransaction();

      // 5. Send confirmation email
      const user = await this.userModel.findById(payment.userId);

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      await this.emailService.sendPaymentSuccess(
        user.email,
        user.name || 'there',
        subscriptionEndsAt,
      );

      console.log('✅ Subscription activated for user:', payment.userId);

      return { success: true, userId: payment.userId.toString() };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getSubscriptionStatus(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const payments = await this.paymentModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(10);

    return {
      subscription: {
        plan: user.plan || 'free',
        subscriptionEndsAt: user.subscriptionEndsAt,
        subscriptionStatus: user.subscriptionStatus || 'inactive',
        daysRemaining: user.subscriptionEndsAt
          ? Math.max(
              0,
              Math.ceil(
                (user.subscriptionEndsAt.getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24),
              ),
            )
          : null,
      },
      payments: payments.map((p) => ({
        id: p._id,
        amount: p.amount,
        status: p.status,
        createdAt: p.get('createdAt'),
        paidAt: p.paidAt,
      })),
    };
  }

  async getPaymentHistory(userId: string) {
    return this.paymentModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 });
  }
}
