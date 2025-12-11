<?php

/**
 * Stripe Setup Verification Script
 * 
 * Run this script to verify your Stripe configuration:
 * php check_stripe_setup.php
 */

require __DIR__ . '/vendor/autoload.php';

use Illuminate\Support\Facades\Config;

// Load Laravel configuration
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "\n=== Stripe Configuration Verification ===\n\n";

// Check environment variables
$checks = [
    'STRIPE_KEY' => env('STRIPE_KEY'),
    'STRIPE_SECRET' => env('STRIPE_SECRET'),
    'STRIPE_WEBHOOK_SECRET' => env('STRIPE_WEBHOOK_SECRET'),
    'STRIPE_CURRENCY' => env('STRIPE_CURRENCY', 'eur'),
];

echo "Environment Variables:\n";
echo str_repeat('-', 50) . "\n";
foreach ($checks as $key => $value) {
    $status = $value ? '✓' : '✗';
    $display = $key === 'STRIPE_SECRET' && $value 
        ? substr($value, 0, 20) . '...' . substr($value, -10) 
        : ($key === 'STRIPE_WEBHOOK_SECRET' && $value 
            ? substr($value, 0, 20) . '...' 
            : ($value ?: 'NOT SET'));
    echo "{$status} {$key}: {$display}\n";
}

// Check config values
echo "\nConfiguration Values:\n";
echo str_repeat('-', 50) . "\n";
$config = Config::get('stripe');
echo "✓ Secret Key: " . (Config::get('stripe.secret') ? 'SET' : 'NOT SET') . "\n";
echo "✓ Publishable Key: " . (Config::get('stripe.key') ? 'SET' : 'NOT SET') . "\n";
echo "✓ Webhook Secret: " . (Config::get('stripe.webhook_secret') ? 'SET' : 'NOT SET') . "\n";
echo "✓ Currency: " . Config::get('stripe.currency', 'eur') . "\n";

// Check company information
echo "\nCompany Information:\n";
echo str_repeat('-', 50) . "\n";
$company = Config::get('stripe.company', []);
echo "✓ Company Name: " . ($company['name'] ?? 'NOT SET') . "\n";
echo "✓ Tax ID: " . ($company['tax_id'] ?? 'NOT SET') . "\n";
echo "✓ Email: " . ($company['email'] ?? 'NOT SET') . "\n";
echo "✓ Phone: " . ($company['phone'] ?? 'NOT SET') . "\n";
echo "✓ Address: " . ($company['address']['line1'] ?? 'NOT SET') . "\n";
echo "✓ Country: " . ($company['address']['country'] ?? 'NOT SET') . "\n";

// Test Stripe connection
echo "\nStripe Connection Test:\n";
echo str_repeat('-', 50) . "\n";
try {
    $secret = Config::get('stripe.secret');
    if (!$secret) {
        echo "✗ Cannot test connection: STRIPE_SECRET not set\n";
    } else {
        $stripe = new \Stripe\StripeClient($secret);
        $account = $stripe->accounts->retrieve();
        echo "✓ Connected to Stripe\n";
        echo "  Account ID: " . $account->id . "\n";
        echo "  Country: " . ($account->country ?? 'N/A') . "\n";
        echo "  Default Currency: " . ($account->default_currency ?? 'N/A') . "\n";
        echo "  Charges Enabled: " . ($account->charges_enabled ? 'Yes' : 'No') . "\n";
        echo "  Payouts Enabled: " . ($account->payouts_enabled ? 'Yes' : 'No') . "\n";
    }
} catch (\Exception $e) {
    echo "✗ Connection failed: " . $e->getMessage() . "\n";
}

// Check subscription plans
echo "\nSubscription Plans:\n";
echo str_repeat('-', 50) . "\n";
try {
    $plans = \App\Models\SubscriptionPlan::all();
    if ($plans->isEmpty()) {
        echo "⚠ No subscription plans found\n";
    } else {
        foreach ($plans as $plan) {
            $stripeStatus = $plan->stripe_price_id ? '✓' : '✗';
            echo "{$stripeStatus} {$plan->name}: ";
            echo "Price: €{$plan->price}/month, ";
            echo "Stripe Price ID: " . ($plan->stripe_price_id ?: 'NOT SET') . "\n";
        }
    }
} catch (\Exception $e) {
    echo "⚠ Could not check plans: " . $e->getMessage() . "\n";
}

echo "\n" . str_repeat('=', 50) . "\n";
echo "Verification Complete!\n\n";
echo "Next Steps:\n";
echo "1. Ensure all environment variables are set in .env\n";
echo "2. Configure webhook in Stripe Dashboard\n";
echo "3. Create Stripe products/prices for each plan\n";
echo "4. Add Stripe Price IDs to subscription plans\n";
echo "5. Test payment flow\n";
echo "\n";
