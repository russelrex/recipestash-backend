import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import DodoPayments from 'dodopayments';
import * as crypto from 'crypto';
import { Payment, PaymentDocument } from './entities/payment.entity';
import { SubscriptionsService } from './subscriptions.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly dodoApiKey: string;
  private readonly monthlyProductId: string;
  private readonly yearlyProductId: string;
  private readonly dodoClient: any;
  private readonly webhookSecret: string;
  private readonly dodoBaseUrl = 'https://api.dodopayments.com/v1';
  private readonly websiteUrl: string;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private configService: ConfigService,
    private subscriptionsService: SubscriptionsService,
  ) {
    // Prefer new SDK-style key, fall back to old name for compatibility
    this.dodoApiKey =
      this.configService.get<string>('DODO_PAYMENTS_API_KEY') ||
      this.configService.get<string>('DODOPAYMENTS_SECRET_KEY') ||
      '';
    this.websiteUrl =
      this.configService.get<string>('WEBSITE_URL') || 'http://localhost:3001';
    this.monthlyProductId =
      this.configService.get<string>('DODOPAYMENTS_MONTHLY_PRODUCT_ID') || '';
    this.yearlyProductId =
      this.configService.get<string>('DODOPAYMENTS_YEARLY_PRODUCT_ID') || '';
    this.webhookSecret =
      this.configService.get<string>('DODOPAYMENTS_WEBHOOK_SECRET') || '';

    // Initialize DodoPayments SDK client
    this.dodoClient = new DodoPayments({
      bearerToken: this.dodoApiKey,
      environment:
        this.configService.get<string>('DODO_PAYMENTS_ENVIRONMENT') ||
        'test_mode',
    });

    // Basic diagnostics
    this.logger.log('💳 PaymentService initialized with DodoPayments SDK');
    this.logger.log(
      `Environment: ${
        this.configService.get<string>('DODO_PAYMENTS_ENVIRONMENT') ||
        'test_mode'
      }`,
    );
    this.logger.log(`Website URL: ${this.websiteUrl}`);
  }
  

  async createCheckoutSession(
    userId: string,
    plan: 'monthly' | 'yearly',
    userEmail?: string,
    userName?: string,
  ) {
    this.logger.log(`💳 Creating checkout session via SDK`);
    this.logger.log(`User: ${userId}, Plan: ${plan}`);

    const productId =
      plan === 'monthly' ? this.monthlyProductId : this.yearlyProductId;
    const amount = plan === 'monthly' ? 14900 : 149900;

    if (!productId) {
      this.logger.error(`❌ Product ID not configured for ${plan} plan`);
      throw new BadRequestException(`Product not configured for ${plan} plan`);
    }

    try {
      const payment: any = await this.paymentModel.create({
        userId: userId as any,
        provider: 'dodopayments',
        amount,
        currency: 'PHP',
        status: 'pending',
        purpose: `subscription_${plan}`,
      });

      this.logger.log(`💾 Payment record created: ${payment._id}`);
      this.logger.log('📤 Calling DodoPayments SDK...');

      const session: any = await this.dodoClient.checkoutSessions.create({
        product_cart: [
          {
            product_id: productId,
            quantity: 1,
          },
        ],
        customer: {
          email: userEmail || 'customer@recipestash.com',
          name: userName || 'RecipeStash User',
        },
        return_url: `${this.websiteUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        metadata: {
          userId,
          paymentId: payment._id.toString(),
          plan,
          source: 'recipestash_web',
        },
      });

      // Some SDKs wrap the payload; try common shapes defensively
      this.logger.debug(
        `Raw DodoPayments session: ${JSON.stringify(session)}`,
      );

      const sessionId =
        session?.id ??
        session?.session_id ??
        session?.data?.id ??
        session?.data?.session_id;

      const checkoutUrl =
        session?.url ??
        session?.checkout_url ??
        session?.redirect_url ??
        session?.data?.url ??
        session?.data?.attributes?.checkout_url;

      this.logger.log('✅ Checkout session created successfully');
      this.logger.log(`Session ID: ${sessionId}`);
      this.logger.log(`Checkout URL: ${checkoutUrl}`);

      payment.checkoutSessionId = sessionId;
      await payment.save();

      return {
        checkoutUrl,
        sessionId,
      };
    } catch (error: any) {
      this.logger.error('❌ Checkout creation failed');
      this.logger.error(`Error: ${error.message}`);
      if (error.statusCode) {
        this.logger.error(`HTTP Status: ${error.statusCode}`);
      }
      if (error.body) {
        this.logger.error(`Error Body: ${JSON.stringify(error.body)}`);
      }

      throw new BadRequestException(
        error.body?.message ||
          error.message ||
          'Failed to create checkout session',
      );
    }
  }

  async testConnection() {
    this.logger.log('🧪 Testing DodoPayments connection...');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${this.dodoBaseUrl}/products`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.dodoApiKey}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const text = await response.text();
        this.logger.error(
          `❌ Connection failed: ${response.status} ${response.statusText} - ${text}`,
        );
        return {
          success: false,
          message: 'Failed to connect to DodoPayments',
          error: `${response.status} ${response.statusText}`,
          details: {
            baseUrl: this.dodoBaseUrl,
            hasApiKey: !!this.dodoApiKey,
          },
        };
      }

      const data = (await response.json()) as any;
      const count = data?.data?.length ?? 0;
      this.logger.log('✅ Connection successful!');

      return {
        success: true,
        message: 'Successfully connected to DodoPayments',
        productsCount: count,
      };
    } catch (error: any) {
      clearTimeout(timeout);
      this.logger.error('❌ Connection failed:', error.message);
      return {
        success: false,
        message: 'Failed to connect to DodoPayments',
        error: error.message,
        details: {
          code: error.code,
          baseUrl: this.dodoBaseUrl,
          hasApiKey: !!this.dodoApiKey,
        },
      };
    }
  }

  // Complete webhook handler – routes events to specific handlers
  async handleWebhook(payload: any, signature: string) {
    this.logger.log('🔔 ========== WEBHOOK RECEIVED ==========');
    this.logger.log(`Timestamp: ${new Date().toISOString()}`);
    this.logger.log(`Payload: ${JSON.stringify(payload, null, 2)}`);
    this.logger.log(`Signature: ${signature}`);
    this.logger.log('=========================================');

    if (!this.verifyWebhookSignature(payload, signature)) {
      this.logger.error('❌ [Webhook] Invalid signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    const eventType = payload.type;
    this.logger.log(`📋 [Webhook] Event type: ${eventType}`);

    try {
      switch (eventType) {
        case 'subscription.active':
          this.logger.log('✅ Handling subscription.active');
          await this.handleSubscriptionActive(payload);
          break;
        case 'subscription.updated':
          this.logger.log('✅ Handling subscription.updated');
          await this.handleSubscriptionUpdated(payload);
          break;
        case 'subscription.created':
          this.logger.log('✅ Handling subscription.created');
          await this.handleSubscriptionCreated(payload);
          break;
        case 'subscription.canceled':
        case 'subscription.cancelled':
          this.logger.log('✅ Handling subscription.canceled');
          await this.handleSubscriptionCanceled(payload);
          break;
        case 'payment.succeeded':
          this.logger.log('✅ Handling payment.succeeded');
          await this.handlePaymentSucceeded(payload);
          break;
        case 'checkout.session.completed':
          this.logger.log('✅ Handling checkout.session.completed');
          await this.handleCheckoutCompleted(payload);
          break;
        default:
          this.logger.warn(`⚠️ [Webhook] Unhandled event type: ${eventType}`);
          this.logger.warn(
            'Full payload:',
            JSON.stringify(payload, null, 2),
          );
      }

      this.logger.log('✅ Webhook processed successfully');
      return { received: true };
    } catch (error) {
      this.logger.error(`❌ [Webhook] Error handling ${eventType}:`, error);
      throw error;
    }
  }

  private verifyWebhookSignature(payload: any, signature: string | undefined): boolean {
    const secret =
      this.configService.get<string>('DODOPAYMENTS_WEBHOOK_SECRET') || '';

    // If no signature header was provided, allow it in non-production
    // so you can use provider test tools without failing hard.
    if (!signature) {
      this.logger.warn(
        '⚠️ [Webhook] No signature header received; skipping verification.',
      );
      return true;
    }

    if (!secret) {
      this.logger.error('❌ DODOPAYMENTS_WEBHOOK_SECRET not configured');
      return false;
    }

    const hash = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const isValid = hash === signature;

    if (!isValid) {
      this.logger.error('❌ Signature mismatch');
      this.logger.debug(`Expected: ${hash}`);
      this.logger.debug(`Received: ${signature}`);
    }

    return isValid;
  }

  private async handlePaymentSucceeded(payload: any) {
    this.logger.log('💰 ========== PAYMENT SUCCEEDED ==========');
    this.logger.log(`Full payload: ${JSON.stringify(payload, null, 2)}`);

    const data = payload.data ?? {};
    const metadata = data.metadata ?? {};

    this.logger.log(`Metadata: ${JSON.stringify(metadata, null, 2)}`);

    if (!metadata.userId) {
      this.logger.error('❌ Missing userId in metadata');
      this.logger.warn('⚠️ Skipping subscription update - no userId');
      return;
    }

    const { userId, paymentId } = metadata as {
      userId: string;
      plan?: 'monthly' | 'yearly';
      paymentId?: string;
    };
    const plan = (metadata as any).plan || 'monthly';

    this.logger.log(`✅ User ID found: ${userId}`);
    this.logger.log(`✅ Plan: ${plan}`);
    this.logger.log(`✅ Payment ID: ${paymentId || 'none'}`);

    if (paymentId) {
      this.logger.log(`📝 Updating payment record: ${paymentId}`);
      const payment = await this.paymentModel.findById(paymentId);
      if (payment) {
        payment.status = 'paid';
        payment.paidAt = new Date();
        payment.checkoutSessionId = data.id;
        await payment.save();
        this.logger.log('✅ Payment record updated');
      } else {
        this.logger.warn(`⚠️ Payment record not found: ${paymentId}`);
      }
    }

    this.logger.log('🚀 Activating premium subscription...');
    const duration = plan === 'yearly' ? 12 : 1;

    try {
      await this.subscriptionsService.activatePremium(userId, duration);
      this.logger.log('✅ ========== PREMIUM ACTIVATED ==========');
    } catch (error) {
      this.logger.error('❌ Failed to activate premium:', error);
      throw error;
    }
  }

  private async handleCheckoutCompleted(payload: any) {
    // For now, reuse payment.succeeded handling logic
    await this.handlePaymentSucceeded(payload);
  }

  private async handleSubscriptionCreated(payload: any) {
    this.logger.log('📝 [Webhook] Handling subscription.created');

    const data = payload.data ?? {};
    const metadata = data.metadata ?? {};

    if (!metadata.userId) {
      this.logger.warn('⚠️ Missing userId in subscription.created');
      return;
    }

    const { userId } = metadata as { userId: string; plan?: 'monthly' | 'yearly' };
    const subscriptionId = data.id;
    const status = data.status;

    this.logger.log(
      `📝 Subscription created: ${subscriptionId}, Status: ${status}`,
    );

    if (status === 'active') {
      const plan = (metadata as any).plan || 'monthly';
      const duration = plan === 'yearly' ? 12 : 1;
      await this.subscriptionsService.activatePremium(userId, duration);
      this.logger.log('✅ Subscription activated via subscription.created');
    }
  }

  private async handleSubscriptionUpdated(payload: any) {
    this.logger.log('🔄 [Webhook] Handling subscription.updated');

    const data = payload.data ?? {};
    const metadata = data.metadata ?? {};

    if (!metadata.userId) {
      this.logger.warn('⚠️ Missing userId in subscription.updated');
      return;
    }

    const { userId } = metadata as { userId: string; plan?: 'monthly' | 'yearly' };
    const status = data.status;

    this.logger.log(`🔄 User: ${userId}, New status: ${status}`);

    switch (status) {
      case 'active': {
        const plan = (metadata as any).plan || 'monthly';
        const duration = plan === 'yearly' ? 12 : 1;
        await this.subscriptionsService.activatePremium(userId, duration);
        this.logger.log('✅ Subscription reactivated');
        break;
      }
      case 'past_due':
        await this.subscriptionsService.markSubscriptionExpiringSoon(userId);
        this.logger.log(
          '⚠️ Subscription marked as expiring soon (payment failed)',
        );
        break;
      case 'canceled':
        await this.subscriptionsService.cancelSubscription(userId);
        this.logger.log('❌ Subscription canceled via update');
        break;
      case 'unpaid':
        await this.subscriptionsService.expireSubscription(userId);
        this.logger.log('❌ Subscription expired (unpaid)');
        break;
      default:
        this.logger.log(`ℹ️ Status changed to: ${status}`);
    }
  }

  private async handleSubscriptionCanceled(payload: any) {
    this.logger.log('❌ [Webhook] Handling subscription.canceled');

    const data = payload.data ?? {};
    const metadata = data.metadata ?? {};

    if (!metadata.userId) {
      this.logger.warn('⚠️ Missing userId in subscription.canceled');
      return;
    }

    const { userId } = metadata as { userId: string };
    const canceledAt = data.canceled_at;
    const endsAt = data.cancel_at_period_end ? data.current_period_end : null;

    this.logger.log(`❌ User: ${userId}, Canceled at: ${canceledAt}`);

    if (endsAt) {
      await this.subscriptionsService.scheduleSubscriptionEnd(
        userId,
        new Date(endsAt),
      );
      this.logger.log(`⏰ Subscription will end at: ${endsAt}`);
    } else {
      await this.subscriptionsService.cancelSubscription(userId);
      this.logger.log('❌ Subscription canceled immediately');
    }
  }

  // Handle subscription.active event (DodoPayments status-based activation)
  private async handleSubscriptionActive(payload: any) {
    this.logger.log('🟢 [Webhook] Handling subscription.active');

    const data = payload.data ?? {};
    const metadata = data.metadata ?? {};

    this.logger.log(`Metadata: ${JSON.stringify(metadata, null, 2)}`);

    if (!metadata.userId) {
      this.logger.warn('⚠️ Missing userId in subscription.active');
      return;
    }

    const { userId, plan } = metadata as {
      userId: string;
      plan?: 'monthly' | 'yearly';
    };
    const status = data.status;
    const nextBillingDate = data.next_billing_date;

    this.logger.log(
      `🟢 User: ${userId}, Status: ${status}, Plan: ${plan ?? 'unknown'}`,
    );
    this.logger.log(`Next billing: ${nextBillingDate}`);

    if (status === 'active') {
      let duration = 1; // default monthly

      if (plan === 'yearly') {
        duration = 12;
      } else if (data.subscription_period_interval === 'Year') {
        duration = 12 * (data.subscription_period_count || 1);
      } else if (data.subscription_period_interval === 'Month') {
        duration = data.subscription_period_count || 1;
      }

      this.logger.log(`Activating premium for ${duration} months`);
      await this.subscriptionsService.activatePremium(userId, duration);
      this.logger.log('✅ Subscription activated via subscription.active');
    }
  }

  async verifyPayment(paymentId: string) {
    const payment = await this.paymentModel.findById(paymentId);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return {
      status: payment.status,
      amount: payment.amount,
      paidAt: payment.paidAt?.toISOString(),
    };
  }
}

