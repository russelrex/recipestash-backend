# PayMongo Subscription - Quick Start Guide

## Prerequisites

✅ You already have:
- NestJS backend running
- MongoDB connected
- Authentication working
- User schema updated with subscription fields

## Step 1: Environment Variables

Add to your `.env` or `.env.local`:

```env
# PayMongo Keys (Get from https://dashboard.paymongo.com/)
PAYMONGO_SECRET_KEY=sk_test_your_key_here
PAYMONGO_PUBLIC_KEY=pk_test_your_key_here
PAYMONGO_WEBHOOK_SECRET=whsec_your_secret_here

# App URLs
APP_URL=http://localhost:3000
API_URL=http://localhost:3001

# Email (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=RecipeStash <noreply@recipestash.com>

# Cron Secret (Optional - for manual triggers)
CRON_SECRET=my-super-secret-cron-key
```

**Note:** If SMTP is not configured, emails will be logged to console instead.

## Step 2: Start the Server

```bash
# Development
pnpm run start:dev

# Production
pnpm run build
pnpm run start:prod
```

You should see:
```
✅ Application is running on http://0.0.0.0:3001/api
💳 Billing endpoint: http://0.0.0.0:3001/api/billing/checkout
🔔 Webhook endpoint: http://0.0.0.0:3001/api/billing/webhooks/paymongo
```

## Step 3: Test the API

### 3.1 Login and Get Token

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "russel@email.com",
    "password": "password123"
  }'
```

Save the token from the response.

### 3.2 Check Current Subscription Status

```bash
curl -X GET http://localhost:3001/api/billing/subscription-status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected response:
```json
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

### 3.3 Create Checkout Session

```bash
curl -X POST http://localhost:3001/api/billing/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "plan": "premium_monthly"
  }'
```

Response:
```json
{
  "checkoutUrl": "https://checkout.paymongo.com/...",
  "paymentId": "65f...",
  "checkoutSessionId": "cs_test_..."
}
```

**Open the `checkoutUrl` in your browser to complete payment!**

### 3.4 Simulate Webhook (For Testing)

After payment, PayMongo will send a webhook. To test locally:

```bash
curl -X POST http://localhost:3001/api/billing/webhooks/paymongo \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "id": "cs_test_your_checkout_session_id",
      "attributes": {
        "type": "checkout_session.payment.paid"
      }
    }
  }'
```

### 3.5 Check Subscription Again

```bash
curl -X GET http://localhost:3001/api/billing/subscription-status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Should now show:
```json
{
  "subscription": {
    "plan": "premium",
    "subscriptionEndsAt": "2026-03-17T...",
    "subscriptionStatus": "active",
    "daysRemaining": 30
  },
  "payments": [
    {
      "id": "65f...",
      "amount": 9900,
      "status": "paid",
      "createdAt": "2026-02-15...",
      "paidAt": "2026-02-15..."
    }
  ]
}
```

## Step 4: Test Cron Jobs

### Manual Trigger

```bash
# Without CRON_SECRET (if not set)
curl -X GET http://localhost:3001/api/cron/subscription-check

# With CRON_SECRET (if set)
curl -X GET http://localhost:3001/api/cron/subscription-check \
  -H "Authorization: Bearer my-super-secret-cron-key"
```

Response:
```json
{
  "success": true,
  "expiredCount": 0,
  "reminderStats": {
    "sevenDayReminders": 0,
    "oneDayReminders": 0
  },
  "timestamp": "2026-02-15T..."
}
```

### Test Subscription Expiry

1. Update a user's subscription to expire soon:

```bash
# Use MongoDB Compass or mongosh
db.users.updateOne(
  { email: "russel@email.com" },
  { 
    $set: { 
      plan: "premium",
      subscriptionEndsAt: new Date("2026-02-14"), // Past date
      subscriptionStatus: "active"
    }
  }
)
```

2. Run cron job manually:

```bash
curl -X GET http://localhost:3001/api/cron/subscription-check
```

3. Check user was downgraded:

```bash
curl -X GET http://localhost:3001/api/billing/subscription-status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Should show:
```json
{
  "subscription": {
    "plan": "free",
    "subscriptionStatus": "expired",
    ...
  }
}
```

## Step 5: PayMongo Webhook Setup

### For Local Development (using ngrok)

1. Install ngrok:
```bash
# Download from https://ngrok.com/download
# Or use snap:
sudo snap install ngrok
```

2. Start ngrok:
```bash
ngrok http 3001
```

3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

4. Add webhook in PayMongo Dashboard:
   - Go to https://dashboard.paymongo.com/developers/webhooks
   - Click "Add Webhook"
   - URL: `https://abc123.ngrok.io/api/billing/webhooks/paymongo`
   - Events: Select:
     - `checkout_session.payment.paid`
     - `payment.paid`
     - `source.chargeable`
   - Click "Add"

### For Production (Railway/Vercel)

1. Get your production URL (e.g., `https://recipestash-backend.railway.app`)

2. Add webhook in PayMongo Dashboard:
   - URL: `https://recipestash-backend.railway.app/api/billing/webhooks/paymongo`
   - Events: Same as above

## Step 6: Test Real Payment

1. Get checkout URL from `/api/billing/checkout`
2. Open URL in browser
3. Select payment method (GCash Test Mode credentials):
   - Mobile: 09123456789
   - OTP: 123456
4. Complete payment
5. Check webhook logs in your terminal
6. Verify subscription activated

## Common Issues

### Issue: "Payment system is not configured"

**Solution:** Add `PAYMONGO_SECRET_KEY` to your .env file

### Issue: Webhook not receiving events

**Solution:**
1. Check ngrok is running and URL is correct
2. Verify webhook is added in PayMongo Dashboard
3. Check Railway logs for incoming requests
4. Make sure URL ends with `/api/billing/webhooks/paymongo`

### Issue: Emails not sending

**Solution:**
1. Email is optional - check console logs for email content
2. For Gmail, use App Password (not regular password)
3. Enable "Less secure app access" in Gmail settings
4. Or use a different SMTP service (SendGrid, Mailgun, etc.)

### Issue: Cron not running

**Solution:**
1. Cron runs automatically at midnight and noon
2. Check server timezone: `date` command
3. Test with manual trigger: `/api/cron/subscription-check`
4. Check logs for cron execution messages

## API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/billing/checkout` | ✓ | Create checkout session |
| GET | `/api/billing/subscription-status` | ✓ | Get subscription info |
| GET | `/api/billing/payment-history` | ✓ | Get payment history |
| POST | `/api/billing/webhooks/paymongo` | ✗ | PayMongo webhook handler |
| GET | `/api/cron/subscription-check` | ✗* | Manual cron trigger |

*Requires `CRON_SECRET` if configured

## Database Collections

### users
```javascript
{
  _id: ObjectId("..."),
  name: "Russel",
  email: "russel@email.com",
  password: "...",
  // NEW FIELDS:
  plan: "premium",
  subscriptionEndsAt: ISODate("2026-03-17"),
  subscriptionStatus: "active"
}
```

### payments
```javascript
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  checkoutSessionId: "cs_test_...",
  amount: 9900,
  currency: "PHP",
  status: "paid",
  purpose: "subscription_monthly",
  paidAt: ISODate("2026-02-15"),
  createdAt: ISODate("2026-02-15"),
  updatedAt: ISODate("2026-02-15")
}
```

### subscriptionreminders
```javascript
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  type: "7_days",
  subscriptionEndsAt: ISODate("2026-03-17"),
  sentAt: ISODate("2026-03-10"),
  createdAt: ISODate("2026-03-10")
}
```

## Cron Schedule

- **00:00 (Midnight)** - Full check: expire subscriptions + send reminders
- **12:00 (Noon)** - Quick check: expire subscriptions only

Logs:
```
🔄 Running subscription check cron job...
⏰ Found 2 expired subscriptions
📧 Downgraded user 65f... to free plan
📧 Sent 7-day reminder to user@example.com
✅ Cron job completed
```

## Next Steps

1. ✅ Test checkout flow end-to-end
2. ✅ Verify webhook receives events
3. ✅ Test subscription expiry
4. ✅ Test reminder emails
5. ✅ Deploy to production
6. ✅ Configure production webhook
7. ✅ Test with real PayMongo account

## Support

- PayMongo Docs: https://developers.paymongo.com/
- PayMongo Dashboard: https://dashboard.paymongo.com/
- Test Cards: https://developers.paymongo.com/docs/testing

---

**Ready to accept payments!** 🎉
