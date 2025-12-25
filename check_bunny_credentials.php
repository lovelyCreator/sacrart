<?php

/**
 * Quick script to check Bunny.net API credentials
 * Run: php check_bunny_credentials.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== Bunny.net Credentials Check ===\n\n";

// Check .env file
$envPath = __DIR__ . '/.env';
if (!file_exists($envPath)) {
    echo "❌ .env file not found!\n";
    exit(1);
}

echo "✅ .env file exists\n\n";

// Check each credential
$credentials = [
    'BUNNY_API_KEY' => env('BUNNY_API_KEY'),
    'BUNNY_LIBRARY_ID' => env('BUNNY_LIBRARY_ID'),
    'BUNNY_CDN_URL' => env('BUNNY_CDN_URL'),
    'BUNNY_STREAM_URL' => env('BUNNY_STREAM_URL'),
];

$allSet = true;
foreach ($credentials as $key => $value) {
    if (empty($value)) {
        echo "❌ {$key}: NOT SET\n";
        $allSet = false;
    } else {
        // Mask sensitive values
        $displayValue = $key === 'BUNNY_API_KEY' 
            ? substr($value, 0, 8) . '...' . substr($value, -4)
            : $value;
        echo "✅ {$key}: {$displayValue}\n";
    }
}

echo "\n";

if (!$allSet) {
    echo "⚠️  Some credentials are missing. Please add them to your .env file.\n";
    echo "See CHECK_BUNNY_CREDENTIALS.md for instructions.\n";
    exit(1);
}

// Test API connection
echo "Testing API connection...\n";

try {
    $bunnyService = app(\App\Services\BunnyNetService::class);
    
    // Try to list videos (this will test the API key and library ID)
    $apiKey = config('services.bunny.api_key');
    $libraryId = config('services.bunny.library_id');
    
    $response = \Illuminate\Support\Facades\Http::withHeaders([
        'AccessKey' => $apiKey,
    ])->get("https://video.bunnycdn.com/library/{$libraryId}/videos?page=1&itemsPerPage=1");
    
    if ($response->successful()) {
        echo "✅ API connection successful!\n";
        echo "✅ Credentials are valid.\n";
    } else {
        $status = $response->status();
        $body = $response->body();
        echo "❌ API connection failed!\n";
        echo "   Status: {$status}\n";
        echo "   Response: {$body}\n";
        
        if ($status === 401) {
            echo "\n⚠️  Authentication failed. Please check your BUNNY_API_KEY.\n";
        } elseif ($status === 404) {
            echo "\n⚠️  Library not found. Please check your BUNNY_LIBRARY_ID.\n";
        }
        exit(1);
    }
} catch (\Exception $e) {
    echo "❌ Error testing API: {$e->getMessage()}\n";
    exit(1);
}

echo "\n✅ All credentials are configured correctly!\n";

