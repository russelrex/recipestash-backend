import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { format } from 'date-fns';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private emailEnabled: boolean;

  constructor(private configService: ConfigService) {
    const smtpHost = this.configService.get('SMTP_HOST');
    const smtpUser = this.configService.get('SMTP_USER');

    this.emailEnabled = !!smtpHost && !!smtpUser;

    if (this.emailEnabled) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(this.configService.get('SMTP_PORT') || '587'),
        secure: false,
        auth: {
          user: smtpUser,
          pass: this.configService.get('SMTP_PASSWORD'),
        },
      });
      console.log('✓ Email service enabled');
    } else {
      console.warn('⚠️ Email service disabled - SMTP not configured');
    }
  }

  async sendPaymentSuccess(to: string, name: string, expiryDate: Date) {
    if (!this.emailEnabled) {
      console.log('📧 [Mock Email] Payment success email to:', to);
      return;
    }

    const renewUrl = `${this.configService.get('APP_URL')}/dashboard/subscription`;

    await this.transporter.sendMail({
      from:
        this.configService.get('EMAIL_FROM') ||
        'RecipeStash <noreply@recipestash.com>',
      to,
      subject: '✅ Payment Successful - RecipeStash Premium Activated',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to RecipeStash Premium! 🎉</h2>
          <p>Hi ${name},</p>
          <p>Your payment was successful! Your Premium subscription is now active until <strong>${format(expiryDate, 'MMMM dd, yyyy')}</strong>.</p>
          
          <h3>What's included:</h3>
          <ul>
            <li>✅ Unlimited recipes</li>
            <li>✅ Offline access</li>
            <li>✅ No ads</li>
            <li>✅ Export/Import recipes</li>
            <li>✅ Meal planner & shopping lists</li>
            <li>✅ Recipe analytics</li>
            <li>✅ Priority support</li>
          </ul>
          
          <div style="margin: 30px 0;">
            <a href="${renewUrl}" style="background-color: #F97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Start Cooking
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            We'll send you a reminder before your subscription expires so you can renew if you'd like.
          </p>
        </div>
      `,
    });

    console.log('📧 Payment success email sent to:', to);
  }

  async sendRenewalReminder(
    to: string,
    name: string,
    expiryDate: Date,
    daysUntilExpiry: number,
  ) {
    if (!this.emailEnabled) {
      console.log(`📧 [Mock Email] ${daysUntilExpiry}-day reminder to:`, to);
      return;
    }

    const renewUrl = `${this.configService.get('APP_URL')}/dashboard/subscription`;

    await this.transporter.sendMail({
      from:
        this.configService.get('EMAIL_FROM') ||
        'RecipeStash <noreply@recipestash.com>',
      to,
      subject: `Your RecipeStash Premium expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hi ${name},</h2>
          <p>Your RecipeStash Premium subscription will expire on <strong>${format(expiryDate, 'MMMM dd, yyyy')}</strong> (in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}).</p>
          
          <p>To continue enjoying unlimited recipes, offline access, and all premium features, please renew your subscription.</p>
          
          <div style="margin: 30px 0;">
            <a href="${renewUrl}" style="background-color: #F97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Renew Now
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            If you don't renew, your account will be downgraded to the Free plan after expiry.
          </p>
        </div>
      `,
    });

    console.log(`📧 ${daysUntilExpiry}-day reminder sent to:`, to);
  }

  async sendExpiryNotification(to: string, name: string) {
    if (!this.emailEnabled) {
      console.log('📧 [Mock Email] Expiry notification to:', to);
      return;
    }

    const renewUrl = `${this.configService.get('APP_URL')}/dashboard/subscription`;

    await this.transporter.sendMail({
      from:
        this.configService.get('EMAIL_FROM') ||
        'RecipeStash <noreply@recipestash.com>',
      to,
      subject: 'Your RecipeStash Premium has expired',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hi ${name},</h2>
          <p>Your RecipeStash Premium subscription has expired.</p>
          
          <p>Your account has been downgraded to the Free plan. You can still:</p>
          <ul>
            <li>Save up to 4 recipes</li>
            <li>Browse community recipes</li>
            <li>Follow other users</li>
          </ul>
          
          <p>To unlock unlimited recipes and premium features again:</p>
          
          <div style="margin: 30px 0;">
            <a href="${renewUrl}" style="background-color: #F97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Resubscribe Now
            </a>
          </div>
        </div>
      `,
    });

    console.log('📧 Expiry notification sent to:', to);
  }
}
