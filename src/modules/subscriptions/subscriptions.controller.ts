import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Param,
  Headers,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly paymentService: PaymentService,
  ) {}

  // Legacy: full subscription + recent payments
  @Get()
  @UseGuards(JwtAuthGuard)
  async getSubscription(@Request() req: any) {
    return this.subscriptionsService.getSubscription(req.user.userId);
  }

  // New: subscription-status endpoint used by frontend
  @Get('subscription-status')
  @UseGuards(JwtAuthGuard)
  async getSubscriptionStatus(@Request() req: any) {
    const { subscription } = await this.subscriptionsService.getSubscription(
      req.user.userId,
    );
    return subscription;
  }

  @Get('can-create-recipe')
  @UseGuards(JwtAuthGuard)
  async canCreateRecipe(@Request() req: any) {
    return this.subscriptionsService.canCreateRecipe(req.user.userId);
  }

  // New: payment-history endpoint used by frontend
  @Get('payment-history')
  @UseGuards(JwtAuthGuard)
  async getPaymentHistory(@Request() req: any) {
    const payments =
      await this.subscriptionsService.getPaymentHistory(req.user.userId);
    return { payments };
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async createCheckout(
    @Request() req: any,
    @Body() body: { 
      plan: 'monthly' | 'yearly';
      email?: string;
      name?: string;
    },
  ) {
    return this.paymentService.createCheckoutSession(
      req.user.userId,
      body.plan,
      body.email,
      body.name,
    );
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: any,
    @Headers('x-dodo-signature') signature: string,
  ) {
    return this.paymentService.handleWebhook(body, signature);
  }

  @Get('verify/:paymentId')
  @UseGuards(JwtAuthGuard)
  async verifyPayment(
    @Request() _req: any,
    @Param('paymentId') paymentId: string,
  ) {
    return this.paymentService.verifyPayment(paymentId);
  }
}

