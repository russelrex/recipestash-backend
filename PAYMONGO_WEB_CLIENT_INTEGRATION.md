# PayMongo Subscription - Web Client Integration Guide

## Overview

This guide shows how to integrate the PayMongo subscription system into your React/Next.js web client.

## API Endpoints

### Base URL
- Development: `http://localhost:3001/api`
- Production: `https://your-app.railway.app/api`

## Authentication Required

All billing endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## API Reference

### 1. Get Subscription Status

**Endpoint:** `GET /api/billing/subscription-status`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```typescript
{
  subscription: {
    plan: 'free' | 'premium';
    subscriptionEndsAt: string | null;  // ISO date
    subscriptionStatus: 'active' | 'expiring_soon' | 'expired' | 'inactive';
    daysRemaining: number | null;
  };
  payments: Array<{
    id: string;
    amount: number;  // in centavos (9900 = ₱99.00)
    status: 'pending' | 'paid' | 'failed' | 'expired';
    createdAt: string;
    paidAt: string | null;
  }>;
}
```

**Example:**
```typescript
const response = await fetch('http://localhost:3001/api/billing/subscription-status', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
const data = await response.json();
console.log(data.subscription.plan); // 'free' or 'premium'
```

---

### 2. Create Checkout Session

**Endpoint:** `POST /api/billing/checkout`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body:**
```typescript
{
  plan: 'premium_monthly'
}
```

**Response:**
```typescript
{
  checkoutUrl: string;  // Redirect user to this URL
  paymentId: string;
  checkoutSessionId: string;
}
```

**Example:**
```typescript
const response = await fetch('http://localhost:3001/api/billing/checkout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    plan: 'premium_monthly',
  }),
});
const data = await response.json();

// Redirect user to PayMongo checkout
window.location.href = data.checkoutUrl;
```

---

### 3. Get Payment History

**Endpoint:** `GET /api/billing/payment-history`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```typescript
Array<{
  _id: string;
  userId: string;
  checkoutSessionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  purpose: string;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>
```

---

## React/Next.js Integration

### Setup API Service

**File:** `src/services/billing.service.ts`

```typescript
import { apiService } from './api.service';

export interface SubscriptionStatus {
  subscription: {
    plan: 'free' | 'premium';
    subscriptionEndsAt: string | null;
    subscriptionStatus: 'active' | 'expiring_soon' | 'expired' | 'inactive';
    daysRemaining: number | null;
  };
  payments: Payment[];
}

export interface Payment {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
}

export interface CheckoutResponse {
  checkoutUrl: string;
  paymentId: string;
  checkoutSessionId: string;
}

class BillingService {
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    return apiService.get<SubscriptionStatus>('/billing/subscription-status');
  }

  async createCheckout(plan: string = 'premium_monthly'): Promise<CheckoutResponse> {
    return apiService.post<CheckoutResponse>('/billing/checkout', { plan });
  }

  async getPaymentHistory(): Promise<Payment[]> {
    return apiService.get<Payment[]>('/billing/payment-history');
  }

  isPremium(subscription: SubscriptionStatus['subscription']): boolean {
    return subscription.plan === 'premium' && subscription.subscriptionStatus === 'active';
  }

  isExpiringSoon(subscription: SubscriptionStatus['subscription']): boolean {
    return subscription.subscriptionStatus === 'expiring_soon';
  }

  formatAmount(centavos: number): string {
    return `₱${(centavos / 100).toFixed(2)}`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

export const billingService = new BillingService();
```

---

## React Components

### 1. Subscription Status Component

**File:** `src/components/billing/SubscriptionStatus.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { billingService, SubscriptionStatus } from '../../services/billing.service';

export const SubscriptionStatusCard: React.FC = () => {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const data = await billingService.getSubscriptionStatus();
      setStatus(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading subscription status...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!status) return null;

  const { subscription } = status;
  const isPremium = billingService.isPremium(subscription);

  return (
    <div className="subscription-card">
      <h2>Your Subscription</h2>
      
      <div className={`plan-badge ${subscription.plan}`}>
        {subscription.plan === 'premium' ? '⭐ Premium' : '🆓 Free'}
      </div>

      {isPremium && subscription.subscriptionEndsAt && (
        <div className="subscription-details">
          <p>
            <strong>Status:</strong> {subscription.subscriptionStatus}
          </p>
          <p>
            <strong>Expires:</strong> {billingService.formatDate(subscription.subscriptionEndsAt)}
          </p>
          <p>
            <strong>Days Remaining:</strong> {subscription.daysRemaining}
          </p>

          {subscription.daysRemaining && subscription.daysRemaining <= 7 && (
            <div className="expiry-warning">
              ⚠️ Your subscription expires soon! Renew to keep premium features.
            </div>
          )}
        </div>
      )}

      {!isPremium && (
        <div className="free-plan-info">
          <p>Upgrade to Premium for:</p>
          <ul>
            <li>✅ Unlimited recipes</li>
            <li>✅ Offline access</li>
            <li>✅ No ads</li>
            <li>✅ Export/Import recipes</li>
            <li>✅ Priority support</li>
          </ul>
        </div>
      )}
    </div>
  );
};
```

---

### 2. Upgrade Button Component

**File:** `src/components/billing/UpgradeButton.tsx`

```tsx
import React, { useState } from 'react';
import { billingService } from '../../services/billing.service';

export const UpgradeButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      setError(null);

      const checkout = await billingService.createCheckout();
      
      // Redirect to PayMongo checkout
      window.location.href = checkout.checkoutUrl;
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError('Failed to create checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="upgrade-section">
      <button 
        onClick={handleUpgrade} 
        disabled={loading}
        className="upgrade-button"
      >
        {loading ? 'Creating checkout...' : 'Upgrade to Premium - ₱99/month'}
      </button>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};
```

---

### 3. Payment History Component

**File:** `src/components/billing/PaymentHistory.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { billingService, Payment } from '../../services/billing.service';

export const PaymentHistory: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const data = await billingService.getPaymentHistory();
      setPayments(data);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading payment history...</div>;

  return (
    <div className="payment-history">
      <h2>Payment History</h2>

      {payments.length === 0 ? (
        <p>No payments yet</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td>{billingService.formatDate(payment.createdAt)}</td>
                <td>{billingService.formatAmount(payment.amount)}</td>
                <td>
                  <span className={`status-badge ${payment.status}`}>
                    {payment.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
```

---

### 4. Success Page (After Payment)

**File:** `src/pages/billing/success.tsx` (Next.js) or `src/pages/BillingSuccess.tsx` (React)

```tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const BillingSuccess: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Wait a few seconds then redirect to dashboard
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="billing-success">
      <div className="success-icon">✅</div>
      <h1>Payment Successful!</h1>
      <p>Your Premium subscription has been activated.</p>
      <p>Thank you for upgrading to RecipeStash Premium!</p>
      
      <div className="premium-features">
        <h3>You now have access to:</h3>
        <ul>
          <li>✅ Unlimited recipes</li>
          <li>✅ Offline access</li>
          <li>✅ No ads</li>
          <li>✅ Export/Import recipes</li>
          <li>✅ Meal planner & shopping lists</li>
          <li>✅ Recipe analytics</li>
          <li>✅ Priority support</li>
        </ul>
      </div>

      <button onClick={() => navigate('/dashboard')}>
        Go to Dashboard
      </button>
    </div>
  );
};
```

---

### 5. Cancel Page

**File:** `src/pages/billing/cancel.tsx`

```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

export const BillingCancel: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="billing-cancel">
      <div className="cancel-icon">❌</div>
      <h1>Payment Cancelled</h1>
      <p>Your payment was cancelled. No charges have been made.</p>
      
      <div className="actions">
        <button onClick={() => navigate('/dashboard/subscription')}>
          Try Again
        </button>
        <button onClick={() => navigate('/dashboard')} className="secondary">
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};
```

---

## Full Subscription Page Example

**File:** `src/pages/SubscriptionPage.tsx`

```tsx
import React from 'react';
import { SubscriptionStatusCard } from '../components/billing/SubscriptionStatus';
import { UpgradeButton } from '../components/billing/UpgradeButton';
import { PaymentHistory } from '../components/billing/PaymentHistory';
import { useAuth } from '../context/AuthContext';

export const SubscriptionPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="subscription-page">
      <h1>Subscription Management</h1>

      <div className="subscription-content">
        {/* Current Status */}
        <SubscriptionStatusCard />

        {/* Upgrade Button (if not premium) */}
        {user?.plan !== 'premium' && <UpgradeButton />}

        {/* Payment History */}
        <PaymentHistory />
      </div>
    </div>
  );
};
```

---

## Feature Gating (Premium Content)

### Check if user is Premium

```tsx
import { useEffect, useState } from 'react';
import { billingService } from '../services/billing.service';

export const usePremium = () => {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPremium();
  }, []);

  const checkPremium = async () => {
    try {
      const status = await billingService.getSubscriptionStatus();
      setIsPremium(billingService.isPremium(status.subscription));
    } catch (err) {
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  };

  return { isPremium, loading };
};
```

### Premium-only Component

```tsx
import React from 'react';
import { usePremium } from '../hooks/usePremium';
import { UpgradeButton } from './billing/UpgradeButton';

export const PremiumFeature: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isPremium, loading } = usePremium();

  if (loading) return <div>Loading...</div>;

  if (!isPremium) {
    return (
      <div className="premium-gate">
        <div className="lock-icon">🔒</div>
        <h3>Premium Feature</h3>
        <p>This feature is only available for Premium members.</p>
        <UpgradeButton />
      </div>
    );
  }

  return <>{children}</>;
};
```

### Usage:

```tsx
<PremiumFeature>
  <AdvancedRecipeAnalytics />
</PremiumFeature>
```

---

## Styling Examples

**File:** `src/styles/subscription.css`

```css
.subscription-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.plan-badge {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  margin-bottom: 16px;
}

.plan-badge.free {
  background-color: #e5e7eb;
  color: #374151;
}

.plan-badge.premium {
  background-color: #fbbf24;
  color: #78350f;
}

.expiry-warning {
  background-color: #fef3c7;
  border: 1px solid #fbbf24;
  padding: 12px;
  border-radius: 8px;
  margin-top: 16px;
}

.upgrade-button {
  background-color: #f97316;
  color: white;
  padding: 16px 32px;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
}

.upgrade-button:hover {
  background-color: #ea580c;
}

.upgrade-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
}

.status-badge.paid {
  background-color: #d1fae5;
  color: #065f46;
}

.status-badge.pending {
  background-color: #fef3c7;
  color: #78350f;
}

.status-badge.failed {
  background-color: #fee2e2;
  color: #991b1b;
}

.premium-gate {
  text-align: center;
  padding: 48px 24px;
  background-color: #f9fafb;
  border-radius: 12px;
}

.lock-icon {
  font-size: 48px;
  margin-bottom: 16px;
}
```

---

## Testing Checklist

- [ ] User can view subscription status
- [ ] Free users see upgrade button
- [ ] Premium users see expiry date
- [ ] Clicking upgrade redirects to PayMongo
- [ ] After payment, user is redirected to success page
- [ ] Subscription status updates after payment
- [ ] Payment history shows all transactions
- [ ] Premium features are gated correctly
- [ ] Expiry warnings show when < 7 days remaining

---

## Production Deployment

### Environment Variables (Vercel/Netlify)

```env
REACT_APP_API_URL=https://recipestash-backend.railway.app/api
```

### CORS Configuration

Make sure your backend allows requests from your frontend domain:

```typescript
// backend src/main.ts
app.enableCors({
  origin: [
    'http://localhost:3000',
    'https://recipestash.vercel.app',
    'https://recipestash.netlify.app',
  ],
  credentials: true,
});
```

---

**Ready to integrate!** 🚀

For backend documentation, see:
- `PAYMONGO_SUBSCRIPTION_IMPLEMENTATION.md`
- `PAYMONGO_QUICKSTART.md`
