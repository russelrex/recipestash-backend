# PayMongo Subscription Integration

## Completed Implementation

This document describes the PayMongo subscription system integrated into RecipeStash backend.

## Features Implemented

✅ **User Subscription Management**
- Added subscription fields to User schema (plan, subscriptionEndsAt, subscriptionStatus)
- Support for 'free' and 'premium' plans

✅ **PayMongo Integration**
- PayMongo checkout session creation
- Support for GCash, PayMaya, GrabPay, and Card payments
- Webhook handling for payment events
- Webhook signature verification (placeholder for actual implementation)

✅ **Billing System**
- Create checkout sessions for ₱99/month premium subscription
- Track payment history
- Get subscription status with days remaining
- Handle payment success via webhooks
- Idempotent payment processing

✅ **Email Notifications**
- Payment success confirmation
- 7-day expiry reminder
- 1-day expiry reminder
- Subscription expired notification
- Graceful fallback when SMTP not configured

✅ **Automated Subscription Management**
- Cron job runs daily at midnight and noon
- Automatically expires subscriptions
- Sends renewal reminders (7 days and 1 day before expiry)
- Prevents duplicate reminder emails
- Manual cron trigger endpoint for testing

✅ **API Endpoints**
- `POST /api/billing/checkout` - Create payment checkout
- `GET /api/billing/subscription-status` - Get current subscription
- `GET /api/billing/payment-history` - Get payment history
- `POST /api/billing/webhooks/paymongo` - Handle PayMongo webhooks
- `GET /api/cron/subscription-check` - Manual subscription check

## Environment Variables Required

Add these to your `.env` file:

```env
# PayMongo
PAYMONGO_SECRET_KEY=sk_test_xxxxxx
PAYMONGO_PUBLIC_KEY=pk_test_xxxxxx
PAYMONGO_WEBHOOK_SECRET=whsec_xxxxx  # Optional

# App URLs
APP_URL=http://localhost:3000
API_URL=http://localhost:3001

# Email (Nodemailer) - Optional
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=RecipeStash <noreply@recipestash.com>

# Cron Job Secret (Optional)
CRON_SECRET=your-random-secret-for-cron
```

## Database Schema Changes

### User Schema (Updated)
```typescript
{
  // Existing fields...
  name: string;
  email: string;
  password: string;
  
  // NEW: Subscription fields
  plan: 'free' | 'premium';              // Default: 'free'
  subscriptionEndsAt?: Date;             // When subscription expires
  subscriptionStatus: 'active' | 'expiring_soon' | 'expired' | 'inactive';
}
```

### Payment Schema (New)
```typescript
{
  userId: ObjectId;
  provider: string;                      // 'paymongo'
  checkoutSessionId: string;             // PayMongo session ID
  paymentIntentId?: string;
  amount: number;                        // In centavos (e.g., 9900 = ₱99.00)
  currency: string;                      // 'PHP'
  status: 'pending' | 'paid' | 'failed' | 'expired';
  purpose: string;                       // 'subscription_monthly'
  metadata: Record<string, any>;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### SubscriptionReminder Schema (New)
```typescript
{
  userId: ObjectId;
  type: '7_days' | '1_day';
  subscriptionEndsAt: Date;
  sentAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## Testing the Implementation

### 1. Test Checkout Creation

```bash
# Login first to get token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "russel@email.com",
    "password": "password123"
  }'

# Use the token to create checkout
curl -X POST http://localhost:3001/api/billing/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "plan": "premium_monthly"
  }'

# Response will include checkoutUrl - open this in browser to complete payment
```

### 2. Test Subscription Status

```bash
curl -X GET http://localhost:3001/api/billing/subscription-status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Response:
{
  "subscription": {
    "plan": "free",
    "subscriptionEndsAt": null,
    "subscriptionStatus": "inactive",
    "daysRemaining": null
  },
  "payments": []
}
```

### 3. Test Webhook (Local Testing)

```bash
# Simulate PayMongo webhook
curl -X POST http://localhost:3001/api/billing/webhooks/paymongo \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "id": "cs_test_xxxxxx",
      "attributes": {
        "type": "checkout_session.payment.paid"
      }
    }
  }'
```

### 4. Test Manual Cron Job

```bash
# Without CRON_SECRET
curl -X GET http://localhost:3001/api/cron/subscription-check

# With CRON_SECRET (if configured)
curl -X GET http://localhost:3001/api/cron/subscription-check \
  -H "Authorization: Bearer your-cron-secret"
```

## Cron Job Schedule

The subscription checker runs automatically:
- **Midnight (00:00)** - Full check: expires subscriptions + sends reminders
- **Noon (12:00)** - Quick check: expires subscriptions only

To test without waiting:
1. Set a user's `subscriptionEndsAt` to past date
2. Call `/api/cron/subscription-check` manually
3. Check that user plan changed to 'free'

## PayMongo Webhook Setup

### Development (Local Testing)

1. Use ngrok to expose local server:
   ```bash
   ngrok http 3001
   ```

2. Add webhook in PayMongo Dashboard:
   - URL: `https://your-ngrok-url.ngrok.io/api/billing/webhooks/paymongo`
   - Events: `checkout_session.payment.paid`, `payment.paid`, `source.chargeable`

### Production (Railway)

1. Get your Railway app URL
2. Add webhook in PayMongo Dashboard:
   - URL: `https://your-app.railway.app/api/billing/webhooks/paymongo`
   - Events: Same as above

## Payment Flow

1. **User clicks "Upgrade to Premium"**
   - Frontend calls `POST /api/billing/checkout`
   - Backend creates Payment record (status: 'pending')
   - Backend calls PayMongo API to create checkout session
   - Returns checkout URL to frontend

2. **User completes payment on PayMongo**
   - User enters payment details (GCash, PayMaya, etc.)
   - PayMongo processes payment

3. **PayMongo sends webhook**
   - Webhook calls `POST /api/billing/webhooks/paymongo`
   - Backend updates Payment record (status: 'paid')
   - Backend updates User (plan: 'premium', subscriptionEndsAt: +30 days)
   - Backend sends confirmation email

4. **Subscription active**
   - User can access premium features
   - Cron job monitors expiry date

5. **7 days before expiry**
   - Cron job sends reminder email
   - Creates reminder record to prevent duplicates

6. **1 day before expiry**
   - Cron job sends urgent reminder
   - Updates subscriptionStatus to 'expiring_soon'

7. **After expiry**
   - Cron job downgrades to 'free'
   - Updates subscriptionStatus to 'expired'
   - Sends expiry notification email

## Files Created

### Modules
- `src/modules/paymongo/paymongo.service.ts`
- `src/modules/paymongo/paymongo.module.ts`
- `src/modules/email/email.service.ts`
- `src/modules/email/email.module.ts`
- `src/modules/billing/billing.service.ts`
- `src/modules/billing/billing.controller.ts`
- `src/modules/billing/billing.module.ts`
- `src/modules/billing/dto/create-checkout.dto.ts`
- `src/modules/billing/schemas/payment.schema.ts`
- `src/modules/subscription/subscription.service.ts`
- `src/modules/subscription/subscription.cron.ts`
- `src/modules/subscription/subscription.controller.ts`
- `src/modules/subscription/subscription.module.ts`
- `src/modules/subscription/schemas/subscription-reminder.schema.ts`

### Modified Files
- `src/modules/users/entities/user.entity.ts` - Added subscription fields
- `src/app.module.ts` - Added new modules
- `src/main.ts` - Enabled raw body for webhooks

## Dependencies Added

```json
{
  "axios": "^1.13.5",
  "nodemailer": "^8.0.1",
  "date-fns": "^4.1.0",
  "@types/nodemailer": "^7.0.9"
}
```

## Production Checklist

- [ ] Set PayMongo API keys (production keys)
- [ ] Set up PayMongo webhook with production URL
- [ ] Configure SMTP for email notifications
- [ ] Set APP_URL to production frontend URL
- [ ] Set CRON_SECRET for manual triggers
- [ ] Test payment flow end-to-end
- [ ] Test webhook receives events
- [ ] Test cron job runs successfully
- [ ] Monitor logs for errors
- [ ] Test subscription expiry flow

## Security Notes

1. **Webhook Signature Verification**: Currently using placeholder. Implement actual PayMongo signature verification for production.

2. **Cron Job Protection**: Set `CRON_SECRET` to protect manual cron trigger endpoint.

3. **Payment Idempotency**: Already implemented - duplicate webhooks won't process payment twice.

4. **Environment Variables**: Never commit API keys to git. Use Railway/Vercel environment variables.

## Troubleshooting

### Payment not activating after checkout
- Check webhook is configured correctly
- Check Railway logs for webhook events
- Verify Payment record exists in database
- Check checkoutSessionId matches

### Emails not sending
- Verify SMTP credentials
- Check Railway logs for email errors
- Test with Gmail App Password (not regular password)
- Email service falls back to console logs if SMTP not configured

### Cron not running
- Check Railway/Heroku supports cron jobs
- Verify ScheduleModule is imported
- Check server timezone (cron uses server time)
- Test with manual trigger endpoint

## Next Steps (Optional Enhancements)

1. **Add Yearly Subscription** - Implement ₱990/year plan
2. **Add Promo Codes** - Discount codes system
3. **Add Payment Method Management** - Save cards for faster checkout
4. **Add Subscription Cancellation** - Allow users to cancel auto-renewal
5. **Add Usage Analytics** - Track premium feature usage
6. **Add Receipt Generation** - PDF receipts for payments
7. **Add Refund System** - Handle refund requests

---

**Status**: ✅ Complete and ready for testing
**Last Updated**: 2026-02-15
