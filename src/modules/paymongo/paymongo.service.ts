import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class PaymongoService {
  private readonly client: AxiosInstance;
  private readonly secretKey: string;

  constructor(private configService: ConfigService) {
    this.secretKey =
      this.configService.get<string>('PAYMONGO_SECRET_KEY') || '';

    if (!this.secretKey) {
      console.warn(
        '⚠️ PAYMONGO_SECRET_KEY not configured - payments will not work',
      );
    }

    this.client = axios.create({
      baseURL: 'https://api.paymongo.com/v1',
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });
  }

  private getAuthHeader(): string {
    if (!this.secretKey) return '';
    return 'Basic ' + Buffer.from(this.secretKey + ':').toString('base64');
  }

  async createCheckoutSession(params: {
    userId: string;
    userEmail: string;
    amountPhp: number;
    paymentId: string;
  }) {
    if (!this.secretKey) {
      throw new HttpException(
        'Payment system is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const amount = Math.round(params.amountPhp * 100); // Convert to centavos

    try {
      const response = await this.client.post('/checkout_sessions', {
        data: {
          attributes: {
            description: 'RecipeStash Premium - Monthly Subscription',
            line_items: [
              {
                name: 'RecipeStash Premium (30 days)',
                amount,
                currency: 'PHP',
                quantity: 1,
              },
            ],
            payment_method_types: ['gcash', 'paymaya', 'grab_pay', 'card'],
            success_url: `${this.configService.get('APP_URL')}/billing/success`,
            cancel_url: `${this.configService.get('APP_URL')}/billing/cancel`,
            metadata: {
              userId: params.userId,
              paymentId: params.paymentId,
              userEmail: params.userEmail,
            },
          },
        },
      });

      return {
        checkoutUrl: response.data.data.attributes.checkout_url,
        checkoutSessionId: response.data.data.id,
        metadata: response.data.data,
      };
    } catch (error: any) {
      console.error(
        'PayMongo checkout error:',
        error.response?.data || error.message,
      );
      throw new HttpException(
        'Failed to create checkout session',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const webhookSecret = this.configService.get<string>(
      'PAYMONGO_WEBHOOK_SECRET',
    );

    if (!webhookSecret) {
      console.warn(
        '⚠️ PAYMONGO_WEBHOOK_SECRET not set - skipping signature verification',
      );
      return true; // Allow in development
    }

    // Implement PayMongo's signature verification
    // This depends on PayMongo's webhook signature method
    // For now, we'll allow it in development

    return true; // Placeholder - implement actual verification based on PayMongo docs
  }
}
