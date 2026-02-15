import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymongoService } from '../paymongo/paymongo.service';

@Controller('billing')
export class BillingController {
  constructor(
    private billingService: BillingService,
    private paymongoService: PaymongoService,
  ) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckout(@Body() dto: CreateCheckoutDto, @Req() req) {
    const userId = req.user.userId;
    const userEmail = req.user.email;

    return this.billingService.createCheckout(userId, userEmail);
  }

  @Get('subscription-status')
  @UseGuards(JwtAuthGuard)
  async getSubscriptionStatus(@Req() req) {
    const userId = req.user.userId;
    return this.billingService.getSubscriptionStatus(userId);
  }

  @Get('payment-history')
  @UseGuards(JwtAuthGuard)
  async getPaymentHistory(@Req() req) {
    const userId = req.user.userId;
    return this.billingService.getPaymentHistory(userId);
  }

  @Post('webhooks/paymongo')
  @HttpCode(HttpStatus.OK)
  async handlePaymongoWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('paymongo-signature') signature: string,
  ) {
    const rawBody = req.rawBody?.toString() || JSON.stringify(req.body);
    const event =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    console.log(
      '📥 PayMongo Webhook:',
      event.data?.attributes?.type || event.type,
    );

    // Verify signature
    if (!this.paymongoService.verifyWebhookSignature(rawBody, signature)) {
      return { error: 'Invalid signature' };
    }

    // Determine event type
    const eventType = event.data?.attributes?.type || event.type;

    // Handle payment success
    const isPaidEvent =
      eventType?.includes('payment.paid') ||
      eventType?.includes('checkout_session.payment.paid') ||
      eventType === 'source.chargeable';

    if (isPaidEvent) {
      const checkoutSessionId =
        event.data?.id || event.data?.attributes?.data?.id;

      const result =
        await this.billingService.handleWebhookPaymentSuccess(
          checkoutSessionId,
        );

      return { received: true, processed: result.success };
    }

    return { received: true };
  }
}
