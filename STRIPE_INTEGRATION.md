# Stripe Integration Guide - Complete Setup

## Company Information

**Company Name:** Ana Rey MartÃ­nez  
**Tax ID (CIF/NIF):** 75768495D  
**Country:** EspaÃ±a (Spain)  
**Fiscal Address:** Carretera del marquesado. Calle gaviota 1B  
**Legal Contact Phone:** +34639374077  
**Billing Email:** anarey@sacrart.com  
**Administrative Contact:** Ana Rey  

## Stripe API Keys (LIVE)

**Publishable Key:**
```
pk_live_YOUR_PUBLISHABLE_KEY_HERE
```

**Secret Key:**
```
sk_live_YOUR_SECRET_KEY_HERE
```

**Webhook Secret:** (To be configured in Stripe Dashboard)

**Currency:** EUR (Euro)

## Step 1: Configure Environment Variables

Add these to your Laravel `.env` file:

```env
# Stripe API Keys (LIVE)
STRIPE_KEY=pk_live_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_SECRET=sk_live_YOUR_SECRET_KEY_HERE

# Stripe Webhook Secret (Get from Stripe Dashboard after creating webhook)
STRIPE_WEBHOOK_SECRET=

# Currency
STRIPE_CURRENCY=eur

# Company Information (Optional - defaults are set in config/stripe.php)
STRIPE_COMPANY_NAME=Ana Rey MartÃ­nez
STRIPE_TAX_ID=75768495D
STRIPE_ADDRESS_LINE1=Carretera del marquesado. Calle gaviota 1B
STRIPE_ADDRESS_COUNTRY=ES
STRIPE_COMPANY_PHONE=+34639374077
STRIPE_COMPANY_EMAIL=anarey@sacrart.com
STRIPE_CONTACT_PERSON=Ana Rey

# Success/Cancel URLs (Optional - defaults provided)
STRIPE_SUCCESS_URL=http://YOUR_DOMAIN/payment/success
STRIPE_CANCEL_URL=http://YOUR_DOMAIN/payment/cancel
```

After updating `.env`, clear the config cache:
```bash
php artisan config:clear
```

## Step 2: Create Products and Prices in Stripe Dashboard

### 2.1 Create Products

1. Go to [Stripe Dashboard â†’ Products](https://dashboard.stripe.com/products)
2. Click **"+ Add product"**
3. Create products for each paid plan:

**Basic Plan:**
- **Name:** Basic Plan
- **Description:** Access to intermediate level content with HD streaming quality
- Click **"Save product"**

**Premium Plan:**
- **Name:** Premium Plan
- **Description:** Access to all content with 4K streaming quality and premium features
- Click **"Save product"**

### 2.2 Create Recurring Prices

For each product:

1. Click on the product
2. Click **"+ Add another price"** or **"Add price"**
3. Configure:
   - **Price:** 
     - Basic: â‚¬9.99
     - Premium: â‚¬19.99
   - **Billing period:** Monthly (recurring)
   - **Currency:** EUR (Euro)
4. Click **"Save price"**
5. **Copy the Price ID** (starts with `price_`)

**Important:** Make sure you're in **LIVE mode** (not test mode) when creating prices, since you're using live API keys.

## Step 3: Set Stripe Price IDs in Database

You need to link your subscription plans to Stripe prices. You have several options:

### Option A: Using Laravel Tinker (Recommended)

```bash
php artisan tinker
```

Then run:
```php
// Get the plans
$basic = App\Models\SubscriptionPlan::where('name', 'basic')->first();
$premium = App\Models\SubscriptionPlan::where('name', 'premium')->first();

// Update with your Stripe Price IDs (replace with actual IDs from Stripe)
$basic->update(['stripe_price_id' => 'price_YOUR_BASIC_PRICE_ID']);
$premium->update(['stripe_price_id' => 'price_YOUR_PREMIUM_PRICE_ID']);

// Verify
echo "Basic: " . $basic->stripe_price_id . "\n";
echo "Premium: " . $premium->stripe_price_id . "\n";
```

### Option B: Using Artisan Command (if available)

```bash
php artisan stripe:set-price-id basic price_YOUR_BASIC_PRICE_ID
php artisan stripe:set-price-id premium price_YOUR_PREMIUM_PRICE_ID
```

### Option C: Direct SQL

```sql
UPDATE subscription_plans SET stripe_price_id = 'price_YOUR_BASIC_PRICE_ID' WHERE name = 'basic';
UPDATE subscription_plans SET stripe_price_id = 'price_YOUR_PREMIUM_PRICE_ID' WHERE name = 'premium';
```

### Option D: Using Admin Panel

1. Login as admin: `http://YOUR_DOMAIN/en/admin`
2. Go to **Subscription Plans**
3. Edit each plan and add the Stripe Price ID

## Step 4: Configure Stripe Webhook

### 4.1 Create Webhook Endpoint in Stripe Dashboard

1. Go to [Stripe Dashboard â†’ Developers â†’ Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"+ Add endpoint"**
3. **Endpoint URL:** `https://YOUR_DOMAIN/api/payments/stripe/webhook`
4. **Description:** Laravel Subscription Webhook
5. **Events to send:** Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
6. Click **"Add endpoint"**
7. **Copy the Signing secret** (starts with `whsec_`)

### 4.2 Add Webhook Secret to .env

```env
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

Then clear config:
```bash
php artisan config:clear
```

## Step 5: Configure Stripe Tax Settings (For Spain)

Since your company is in Spain, you may need to configure tax settings:

1. Go to [Stripe Dashboard â†’ Settings â†’ Tax](https://dashboard.stripe.com/settings/tax)
2. Enable **Automatic tax** if required for Spain
3. Or manually configure tax rates for Spain (21% VAT for most services)

## Step 6: Verify Setup

### 6.1 Check Configuration

```bash
php artisan tinker
```

```php
// Check Stripe config
echo "Currency: " . config('stripe.currency') . "\n";
echo "Secret Key Set: " . (config('stripe.secret') ? 'Yes' : 'No') . "\n";
echo "Webhook Secret Set: " . (config('stripe.webhook_secret') ? 'Yes' : 'No') . "\n";

// Check plans
$plans = App\Models\SubscriptionPlan::whereIn('name', ['basic', 'premium'])->get();
foreach ($plans as $plan) {
    echo "Plan: {$plan->name} - Price: â‚¬{$plan->price} - Stripe Price ID: " . ($plan->stripe_price_id ?: 'NOT SET') . "\n";
}
```

### 6.2 Test Checkout Session Creation

```bash
php artisan tinker
```

```php
// Get a test user (or create one)
$user = App\Models\User::first();
$plan = App\Models\SubscriptionPlan::where('name', 'basic')->first();

// Check if plan has Stripe Price ID
if ($plan->stripe_price_id) {
    echo "âœ… Plan has Stripe Price ID: {$plan->stripe_price_id}\n";
} else {
    echo "âŒ Plan missing Stripe Price ID\n";
}
```

## Step 7: Frontend Configuration

The frontend should automatically use the Stripe integration. Ensure:

1. **API Base URL** is correct in `frontend/.env`:
   ```env
   VITE_API_BASE_URL=http://YOUR_VPS_IP:8000/api
   ```

2. **Success/Cancel URLs** are configured correctly in the frontend code (they should point to your frontend URLs)

## Step 8: Testing

### 8.1 Test Mode vs Live Mode

âš ï¸ **IMPORTANT:** You're using **LIVE** API keys. All transactions will be **REAL** charges!

For testing, consider:
1. Using Stripe test mode first (test keys start with `sk_test_` and `pk_test_`)
2. Or use small amounts for initial testing
3. Or use Stripe's test cards in live mode (if enabled)

### 8.2 Test Cards (if test mode enabled)

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0027 6000 3184`

### 8.3 Test Flow

1. Register a new user
2. Select a paid plan (Basic or Premium)
3. You should be redirected to Stripe Checkout
4. Complete payment
5. Check webhook events in Stripe Dashboard
6. Verify subscription is created in your database

## Step 9: Monitor Webhooks

1. Go to [Stripe Dashboard â†’ Developers â†’ Webhooks](https://dashboard.stripe.com/webhooks)
2. Click on your webhook endpoint
3. View **"Events"** tab to see incoming webhooks
4. Check for any failed deliveries

## Troubleshooting

### "Plan is not configured for Stripe billing"
- **Fix:** Set `stripe_price_id` for the plan (Step 3)

### "Stripe is not configured. Missing STRIPE_SECRET"
- **Fix:** Add `STRIPE_SECRET` to `.env` and run `php artisan config:clear`

### Webhook returns 500 error
- Check `storage/logs/laravel.log` for errors
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check webhook URL is accessible from internet

### Currency mismatch
- Ensure Stripe Price currency is EUR
- Verify `STRIPE_CURRENCY=eur` in `.env`

### Company information not showing on invoices
- Company info is added to metadata
- For full invoice customization, configure in Stripe Dashboard â†’ Settings â†’ Branding

## Security Notes

1. **Never commit `.env` file** to version control
2. **Keep webhook secret secure** - it's used to verify webhook authenticity
3. **Use HTTPS** for webhook endpoints in production
4. **Monitor webhook failures** in Stripe Dashboard
5. **Set up webhook retries** in Stripe Dashboard

## Next Steps

1. âœ… Configure `.env` with Stripe keys
2. âœ… Create products and prices in Stripe Dashboard
3. âœ… Set Stripe Price IDs in database
4. âœ… Configure webhook endpoint
5. âœ… Test checkout flow
6. âœ… Monitor webhook events
7. âœ… Set up invoice branding (optional)
8. âœ… Configure tax settings for Spain (if required)

## Support

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Dashboard](https://dashboard.stripe.com)
- Check Laravel logs: `storage/logs/laravel.log`
- Check Stripe logs: Stripe Dashboard â†’ Developers â†’ Logs

